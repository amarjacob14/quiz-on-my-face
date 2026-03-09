import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocketContext } from '../contexts/SocketContext.jsx';
import Question from '../components/Question.jsx';
import AnswerButton from '../components/AnswerButton.jsx';
import Timer from '../components/Timer.jsx';
import Scoreboard from '../components/Scoreboard.jsx';
import styles from './HostScreen.module.css';

export default function HostScreen() {
  const { roomCode } = useParams();
  const { user } = useAuth();
  const { socketRef } = useSocketContext();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('waiting');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [duration, setDuration] = useState(20000);
  const [scoreboard, setScoreboard] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [timerKey, setTimerKey] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const joinedRef = useRef(false);

  const joinRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || joinedRef.current) return;
    socket.emit('host-join', { roomCode }, (res) => {
      if (res?.success) {
        joinedRef.current = true;
        const game = res.game;
        if (game) setTotalPlayers(game.players?.length || 0);
      }
    });
  }, [roomCode, socketRef]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    joinRoom();

    function onQuestion({ question, questionNumber: qn, totalQuestions: tq, duration: dur }) {
      setCurrentQuestion(question);
      setQuestionNumber(qn);
      setTotalQuestions(tq);
      setDuration(dur);
      setCorrectAnswer(null);
      setAnsweredCount(0);
      setPhase('question');
      setTimerKey((k) => k + 1);
    }

    function onRoundEnd({ correctAnswer: ca, scoreboard: sb }) {
      setCorrectAnswer(ca);
      setScoreboard(sb);
      setAnsweredCount(sb.length);
      setPhase('round-end');
    }

    function onGameEnd({ scoreboard: sb }) {
      setScoreboard(sb);
      setPhase('finished');
    }

    function onPlayerJoined({ players }) {
      setTotalPlayers(players.length);
    }

    // Track answers submitted (server doesn't broadcast individual answers, but we can count round-end)
    function onAnswerResult() {
      setAnsweredCount((c) => c + 1);
    }

    function onReconnect() {
      joinedRef.current = false;
      joinRoom();
    }

    socket.on('question', onQuestion);
    socket.on('round-end', onRoundEnd);
    socket.on('game-end', onGameEnd);
    socket.on('player-joined', onPlayerJoined);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('question', onQuestion);
      socket.off('round-end', onRoundEnd);
      socket.off('game-end', onGameEnd);
      socket.off('player-joined', onPlayerJoined);
      socket.off('connect', onReconnect);
    };
  }, [socketRef, roomCode, navigate, joinRoom]);

  if (phase === 'waiting') {
    return (
      <div className={styles.hostPage}>
        <div className={styles.waitingScreen}>
          <div className="logo" style={{ fontSize: '3rem' }}>Quiz on My Face</div>
          <div className={styles.roomCodeDisplay}>
            <p className={styles.roomCodeLabel}>Room Code</p>
            <div className="room-code" style={{ fontSize: '4rem', letterSpacing: '0.3em' }}>{roomCode}</div>
          </div>
          <p className={styles.waitingText}>Waiting for game to start...</p>
          {totalPlayers > 0 && (
            <p className={styles.playerCount}>{totalPlayers} player{totalPlayers !== 1 ? 's' : ''} in lobby</p>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    return (
      <div className={styles.hostPage}>
        <div className={styles.finishedScreen}>
          <div className={styles.trophyIcon}>🏆</div>
          <h1 className={styles.finishedTitle}>Game Over!</h1>
          <h2 className={styles.finishedSubtitle}>Final Leaderboard</h2>
          <div className={styles.finalScoreboard}>
            <Scoreboard players={scoreboard} large currentUserId={user?.id} />
          </div>
          {scoreboard[0] && (
            <div className={styles.winner}>
              <span className={styles.winnerCrown}>👑</span>
              <span className={styles.winnerName}>{scoreboard[0].username} wins!</span>
              <span className={styles.winnerScore}>{scoreboard[0].score.toLocaleString()} pts</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'round-end') {
    return (
      <div className={styles.hostPage}>
        <div className={styles.roundEndScreen}>
          <div className={styles.roundEndHeader}>
            <h2 className={styles.roundEndTitle}>Round {questionNumber} Results</h2>
            {correctAnswer && (
              <div className={styles.correctAnswerBox}>
                <span className={styles.correctAnswerLabel}>Correct Answer:</span>
                <span className={styles.correctAnswerText}>{correctAnswer}</span>
              </div>
            )}
          </div>
          <div className={styles.scoreboardWrap}>
            <Scoreboard players={scoreboard} large currentUserId={user?.id} />
          </div>
          <p className={styles.nextHint}>
            {questionNumber < totalQuestions ? 'Next question coming up...' : 'Calculating final results...'}
          </p>
        </div>
      </div>
    );
  }

  // Active question
  return (
    <div className={styles.hostPage}>
      <div className={styles.activeGame}>
        <div className={styles.topBar}>
          <div className={styles.roomCodeSmall}>{roomCode}</div>
          <div className={styles.timerWrap}>
            <Timer
              key={timerKey}
              duration={duration}
              running={phase === 'question'}
            />
          </div>
          <div className={styles.answerProgress}>
            <span className={styles.answeredNum}>{answeredCount}</span>
            <span className={styles.answeredTotal}>/{totalPlayers}</span>
            <span className={styles.answeredLabel}>answered</span>
          </div>
        </div>

        <div className={styles.questionWrap}>
          <Question
            question={currentQuestion}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            large
          />
        </div>

        <div className={styles.answersGrid}>
          {currentQuestion?.answers.map((answer, i) => (
            <AnswerButton
              key={answer}
              answer={answer}
              index={i}
              disabled
              state={
                correctAnswer
                  ? answer === correctAnswer
                    ? 'reveal-correct'
                    : 'reveal-wrong'
                  : null
              }
              large
            />
          ))}
        </div>
      </div>
    </div>
  );
}
