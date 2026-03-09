/**
 * In-memory game state manager.
 * Games are keyed by room code (6-char uppercase string).
 */

const { gameOps } = require('./db');
const { fetchQuestions, sanitizeQuestion } = require('./questions');

const QUESTION_DURATION_MS = 20000; // 20 seconds per question
const MAX_POINTS = 1000;
const MIN_POINTS = 100;

// games: Map<roomCode, GameState>
const games = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (games.has(code));
  return code;
}

function createGame({ hostId, hostUsername, hostAvatar, category, difficulty, numQuestions, gameMode, dbGameId }) {
  const roomCode = generateRoomCode();

  const game = {
    roomCode,
    dbGameId,
    hostId,
    category,
    difficulty,
    numQuestions,
    gameMode,   // 'solo' | 'shared' | 'hybrid'
    status: 'waiting', // waiting | starting | playing | between-rounds | finished
    players: new Map(), // userId -> { id, username, avatar, score, socketId, hasAnswered, lastAnswer }
    questions: [],
    currentQuestionIndex: -1,
    questionTimer: null,
    questionStartTime: null,
    answers: new Map(), // `${questionIndex}-${userId}` -> answer data
  };

  // Add host as first player
  game.players.set(hostId, {
    id: hostId,
    username: hostUsername,
    avatar: hostAvatar,
    score: 0,
    socketId: null,
    hasAnswered: false,
    lastAnswer: null,
    isHost: true,
  });

  games.set(roomCode, game);
  return game;
}

function getGame(roomCode) {
  return games.get(roomCode.toUpperCase()) || null;
}

function deleteGame(roomCode) {
  const game = games.get(roomCode.toUpperCase());
  if (game && game.questionTimer) {
    clearTimeout(game.questionTimer);
  }
  games.delete(roomCode.toUpperCase());
}

function addPlayer(roomCode, { userId, username, avatar, socketId }) {
  const game = getGame(roomCode);
  if (!game) return { error: 'Room not found' };
  if (game.status !== 'waiting') return { error: 'Game has already started' };
  if (game.players.size >= 20) return { error: 'Room is full (max 20 players)' };

  if (!game.players.has(userId)) {
    game.players.set(userId, {
      id: userId,
      username,
      avatar,
      score: 0,
      socketId,
      hasAnswered: false,
      lastAnswer: null,
      isHost: false,
    });
    // Persist player to DB
    try {
      gameOps.addPlayer.run(game.dbGameId, userId);
    } catch (e) {
      // ignore duplicate insert errors
    }
  } else {
    // Reconnect — update socket id
    game.players.get(userId).socketId = socketId;
  }

  return { game, player: game.players.get(userId) };
}

function updatePlayerSocket(roomCode, userId, socketId) {
  const game = getGame(roomCode);
  if (!game) return;
  const player = game.players.get(userId);
  if (player) player.socketId = socketId;
}

function getPlayersArray(game) {
  return Array.from(game.players.values()).map(p => ({
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    score: p.score,
    isHost: p.isHost,
    hasAnswered: p.hasAnswered,
  }));
}

async function startGame(roomCode) {
  const game = getGame(roomCode);
  if (!game) return { error: 'Game not found' };
  if (game.status !== 'waiting') return { error: 'Game already started' };
  if (game.players.size < 1) return { error: 'Need at least 1 player' };

  game.status = 'starting';

  try {
    const questions = await fetchQuestions({
      amount: game.numQuestions,
      category: game.category,
      difficulty: game.difficulty,
    });
    game.questions = questions;
  } catch (err) {
    game.status = 'waiting';
    return { error: err.message };
  }

  gameOps.updateStatus.run('playing', roomCode);
  return { game };
}

function calculatePoints(responseTimeMs) {
  // Faster answer = more points. Linear scale from MAX to MIN over 20 seconds.
  const ratio = Math.max(0, 1 - responseTimeMs / QUESTION_DURATION_MS);
  return Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * ratio);
}

function submitAnswer(roomCode, userId, answer) {
  const game = getGame(roomCode);
  if (!game) return { error: 'Game not found' };
  if (game.status !== 'playing') return { error: 'Not in active game' };

  const player = game.players.get(userId);
  if (!player) return { error: 'Player not in game' };

  const qi = game.currentQuestionIndex;
  const answerKey = `${qi}-${userId}`;

  if (game.answers.has(answerKey)) {
    return { error: 'Already answered' };
  }

  const responseTimeMs = Date.now() - game.questionStartTime;
  const question = game.questions[qi];
  const isCorrect = answer === question.correctAnswer;
  const pointsEarned = isCorrect ? calculatePoints(responseTimeMs) : 0;

  const answerData = {
    userId,
    questionIndex: qi,
    answer,
    isCorrect,
    pointsEarned,
    responseTimeMs,
  };

  game.answers.set(answerKey, answerData);
  player.hasAnswered = true;
  player.lastAnswer = answerData;

  if (isCorrect) {
    player.score += pointsEarned;
    // Update DB score
    try {
      gameOps.updateScore.run(pointsEarned, game.dbGameId, userId);
    } catch (e) {}
  }

  // Save answer to DB
  try {
    gameOps.saveAnswer.run({
      game_id: game.dbGameId,
      user_id: userId,
      question_index: qi,
      answer,
      is_correct: isCorrect ? 1 : 0,
      points_earned: pointsEarned,
      response_time_ms: responseTimeMs,
    });
  } catch (e) {}

  return { isCorrect, pointsEarned, correctAnswer: question.correctAnswer };
}

function allPlayersAnswered(game) {
  // Host-only (shared screen) doesn't need to answer
  for (const [, player] of game.players) {
    if (game.gameMode === 'shared' && player.isHost) continue;
    if (!player.hasAnswered) return false;
  }
  return true;
}

function getScoreboard(game) {
  return Array.from(game.players.values())
    .sort((a, b) => b.score - a.score)
    .map((p, rank) => ({
      rank: rank + 1,
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      lastPoints: p.lastAnswer ? p.lastAnswer.pointsEarned : 0,
      isCorrect: p.lastAnswer ? p.lastAnswer.isCorrect : false,
    }));
}

function resetAnswersForNextQuestion(game) {
  for (const player of game.players.values()) {
    player.hasAnswered = false;
    player.lastAnswer = null;
  }
}

function nextQuestion(game) {
  game.currentQuestionIndex++;
  resetAnswersForNextQuestion(game);

  if (game.currentQuestionIndex >= game.questions.length) {
    return null; // game over
  }

  game.questionStartTime = Date.now();
  return sanitizeQuestion(game.questions[game.currentQuestionIndex]);
}

function finishGame(roomCode) {
  const game = getGame(roomCode);
  if (!game) return;
  game.status = 'finished';
  try {
    gameOps.finish.run('finished', roomCode);
    // Final score sync
    for (const [userId, player] of game.players) {
      // Score is already updated per-answer, but ensure final state is consistent
    }
  } catch (e) {}
  return getScoreboard(game);
}

module.exports = {
  createGame,
  getGame,
  deleteGame,
  addPlayer,
  updatePlayerSocket,
  getPlayersArray,
  startGame,
  submitAnswer,
  allPlayersAnswered,
  getScoreboard,
  nextQuestion,
  finishGame,
  QUESTION_DURATION_MS,
};
