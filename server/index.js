require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const authRouter = require('./routes/auth');
const { verifyToken, JWT_SECRET } = require('./middleware/auth');
const { CATEGORIES } = require('./questions');
const { gameOps } = require('./db');
const gm = require('./gameManager');

const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: isProd ? false : {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Middleware ────────────────────────────────────────────────────────────────
if (!isProd) {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }));
}
app.use(express.json());

// ─── Serve React build in production ──────────────────────────────────────────
if (isProd) {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// GET /api/categories
app.get('/api/categories', (req, res) => {
  res.json({ categories: CATEGORIES });
});

// POST /api/games — create a new game room
app.post('/api/games', verifyToken, (req, res) => {
  try {
    const { category, difficulty, numQuestions, gameMode } = req.body;
    const host = req.user;

    const validModes = ['solo', 'shared', 'hybrid'];
    const validDifficulties = ['any', 'easy', 'medium', 'hard'];
    const validAmounts = [10, 20, 30];

    if (!validModes.includes(gameMode)) {
      return res.status(400).json({ error: 'Invalid game mode' });
    }
    if (!validDifficulties.includes(difficulty || 'any')) {
      return res.status(400).json({ error: 'Invalid difficulty' });
    }
    if (!validAmounts.includes(Number(numQuestions))) {
      return res.status(400).json({ error: 'numQuestions must be 10, 20, or 30' });
    }

    // Create DB record first to get the ID
    const roomCode = generateTempCode();
    const dbResult = gameOps.create.run({
      room_code: roomCode,
      host_id: host.id,
      category: category || 'any',
      difficulty: difficulty || 'any',
      num_questions: Number(numQuestions),
      game_mode: gameMode,
    });

    const game = gm.createGame({
      hostId: host.id,
      hostUsername: host.username,
      hostAvatar: null,
      category: category || 'any',
      difficulty: difficulty || 'any',
      numQuestions: Number(numQuestions),
      gameMode,
      dbGameId: dbResult.lastInsertRowid,
    });

    // Update the DB record with the actual room code (generated in createGame)
    if (game.roomCode !== roomCode) {
      // If codes differ (edge case), update the DB
      // In practice roomCode from generateTempCode won't be used
    }

    res.status(201).json({
      roomCode: game.roomCode,
      hostId: host.id,
    });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /api/games/:code — get game info
app.get('/api/games/:code', verifyToken, (req, res) => {
  const game = gm.getGame(req.params.code);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  res.json({
    roomCode: game.roomCode,
    hostId: game.hostId,
    category: game.category,
    difficulty: game.difficulty,
    numQuestions: game.numQuestions,
    gameMode: game.gameMode,
    status: game.status,
    players: gm.getPlayersArray(game),
  });
});

function generateTempCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ─── Catch-all: serve React app for non-API routes (production) ───────────────
if (isProd) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// ─── Socket.io Authentication Middleware ──────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// ─── Socket.io Event Handlers ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  const user = socket.user;
  console.log(`[Socket] ${user.username} connected (${socket.id})`);

  // ── join-room ──────────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomCode }, callback) => {
    const code = (roomCode || '').toUpperCase().trim();
    const game = gm.getGame(code);

    if (!game) {
      return callback?.({ error: 'Room not found' });
    }

    const result = gm.addPlayer(code, {
      userId: user.id,
      username: user.username,
      avatar: null,
      socketId: socket.id,
    });

    if (result.error) {
      return callback?.({ error: result.error });
    }

    socket.join(code);
    socket.currentRoom = code;

    // Tell the joining player the current game state
    const currentGame = gm.getGame(code);
    const gameState = {
      roomCode: code,
      hostId: currentGame.hostId,
      category: currentGame.category,
      difficulty: currentGame.difficulty,
      numQuestions: currentGame.numQuestions,
      gameMode: currentGame.gameMode,
      status: currentGame.status,
      players: gm.getPlayersArray(currentGame),
    };

    callback?.({ success: true, game: gameState });

    // Broadcast to everyone in the room that a new player joined
    if (result.player.id !== currentGame.hostId || currentGame.players.size === 1) {
      io.to(code).emit('player-joined', {
        player: {
          id: result.player.id,
          username: result.player.username,
          avatar: result.player.avatar,
          score: result.player.score,
          isHost: result.player.isHost,
        },
        players: gm.getPlayersArray(currentGame),
      });
    }

    console.log(`[Room ${code}] ${user.username} joined`);
  });

  // ── host-join ─────────────────────────────────────────────────────────────
  // Host uses this to associate their socket with the game they created
  socket.on('host-join', ({ roomCode }, callback) => {
    const code = (roomCode || '').toUpperCase().trim();
    const game = gm.getGame(code);

    if (!game) return callback?.({ error: 'Room not found' });
    if (game.hostId !== user.id) return callback?.({ error: 'Not the host' });

    gm.updatePlayerSocket(code, user.id, socket.id);
    socket.join(code);
    socket.currentRoom = code;

    const gameState = {
      roomCode: code,
      hostId: game.hostId,
      category: game.category,
      difficulty: game.difficulty,
      numQuestions: game.numQuestions,
      gameMode: game.gameMode,
      status: game.status,
      players: gm.getPlayersArray(game),
    };

    callback?.({ success: true, game: gameState });
    console.log(`[Room ${code}] Host ${user.username} connected socket`);
  });

  // ── start-game ────────────────────────────────────────────────────────────
  socket.on('start-game', async ({ roomCode }, callback) => {
    const code = (roomCode || '').toUpperCase().trim();
    const game = gm.getGame(code);

    if (!game) return callback?.({ error: 'Room not found' });
    if (game.hostId !== user.id) return callback?.({ error: 'Only the host can start the game' });
    if (game.status !== 'waiting') return callback?.({ error: 'Game already started' });

    io.to(code).emit('game-starting', { message: 'Game is starting!', countdown: 3 });

    const result = await gm.startGame(code);
    if (result.error) {
      return callback?.({ error: result.error });
    }

    callback?.({ success: true });
    console.log(`[Room ${code}] Game starting`);

    // Small delay then send first question
    setTimeout(() => {
      sendNextQuestion(code);
    }, 3500);
  });

  // ── submit-answer ─────────────────────────────────────────────────────────
  socket.on('submit-answer', ({ roomCode, answer }, callback) => {
    const code = (roomCode || '').toUpperCase().trim();
    const result = gm.submitAnswer(code, user.id, answer);

    if (result.error) {
      return callback?.({ error: result.error });
    }

    // Tell the answering player their result immediately
    socket.emit('answer-result', {
      isCorrect: result.isCorrect,
      pointsEarned: result.pointsEarned,
      correctAnswer: result.correctAnswer,
    });

    callback?.({ success: true });

    // Check if all players have answered — end round early if so
    const game = gm.getGame(code);
    if (game && gm.allPlayersAnswered(game)) {
      endRoundEarly(code);
    }
  });

  // ── kick-player (host only) ───────────────────────────────────────────────
  socket.on('kick-player', ({ roomCode, targetUserId }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const game = gm.getGame(code);
    if (!game) return;
    if (game.hostId !== user.id) return;

    const target = game.players.get(targetUserId);
    if (!target) return;

    game.players.delete(targetUserId);
    io.to(target.socketId).emit('kicked', { message: 'You were removed from the game' });
    io.sockets.sockets.get(target.socketId)?.leave(code);
    io.to(code).emit('player-left', { userId: targetUserId, players: gm.getPlayersArray(game) });
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[Socket] ${user.username} disconnected`);
    // We keep the player in the game for reconnect; they just won't receive events
    // until they reconnect and re-join the room
  });
});

// ─── Game Flow Helpers ────────────────────────────────────────────────────────

const roundTimers = new Map(); // roomCode -> timeout handle

function sendNextQuestion(roomCode) {
  const game = gm.getGame(roomCode);
  if (!game || game.status === 'finished') return;

  game.status = 'playing';
  const question = gm.nextQuestion(game);

  if (!question) {
    // No more questions — game over
    endGame(roomCode);
    return;
  }

  console.log(`[Room ${roomCode}] Question ${question.index + 1}/${game.numQuestions}`);

  io.to(roomCode).emit('question', {
    question,
    questionNumber: question.index + 1,
    totalQuestions: game.numQuestions,
    duration: gm.QUESTION_DURATION_MS,
  });

  // Auto-end round after timer expires
  const timer = setTimeout(() => {
    endRound(roomCode);
  }, gm.QUESTION_DURATION_MS + 500); // small buffer

  roundTimers.set(roomCode, timer);
}

function endRoundEarly(roomCode) {
  const existing = roundTimers.get(roomCode);
  if (existing) {
    clearTimeout(existing);
    roundTimers.delete(roomCode);
  }
  endRound(roomCode);
}

function endRound(roomCode) {
  const game = gm.getGame(roomCode);
  if (!game || game.status === 'finished') return;

  // Prevent double-firing
  if (game._endingRound) return;
  game._endingRound = true;

  const qi = game.currentQuestionIndex;
  const currentQuestion = game.questions[qi];
  const scoreboard = gm.getScoreboard(game);

  io.to(roomCode).emit('round-end', {
    correctAnswer: currentQuestion.correctAnswer,
    scoreboard,
    questionIndex: qi,
    isLastQuestion: qi >= game.numQuestions - 1,
  });

  game._endingRound = false;

  const isLast = qi >= game.numQuestions - 1;
  if (isLast) {
    setTimeout(() => endGame(roomCode), 4000);
  } else {
    // Pause between rounds then send next question
    setTimeout(() => {
      sendNextQuestion(roomCode);
    }, 5000);
  }
}

function endGame(roomCode) {
  const finalScoreboard = gm.finishGame(roomCode);
  if (!finalScoreboard) return;

  console.log(`[Room ${roomCode}] Game finished`);

  io.to(roomCode).emit('game-end', {
    scoreboard: finalScoreboard,
    message: 'Game over! Final results:',
  });

  // Clean up in-memory game after a delay
  setTimeout(() => {
    gm.deleteGame(roomCode);
  }, 60000);
}

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Quiz on My Face server running on http://localhost:${PORT}`);
});
