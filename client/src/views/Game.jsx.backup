import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocketContext } from '../contexts/SocketContext.jsx';
import Question from '../components/Question.jsx';
import AnswerButton from '../components/AnswerButton.jsx';
import Timer from '../components/Timer.jsx';
import Scoreboard from '../components/Scoreboard.jsx';
import styles from './Game.module.css';

export default function Game() {
  const { roomCode } = useParams();
  const { user } = useAuth();
  const { socketRef } = useSocketContext();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('waiting'); // waiting | question | answered | round-end | finished
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [duration, setDuration] = useState(20000);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null); // { isCorrect, pointsEarned, correctAnswer }
  const [scoreboard, setScoreboard] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [timerKey, setTimerKey] = useState(0);
  const joinedRef = useRef(false);

  const joinRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || joinedRef.current) return;
    socket.emit('join-room', { roomCode }, (res) => {
      if (res?.success) joinedRef.current = true;
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
      setSelectedAnswer(null);
      setAnswerResult(null);
      setCorrectAnswer(null);
      setPhase('question');
      setTimerKey((k) => k + 1);
    }

    function onAnswerResult(result) {
      setAnswerResult(result);
      setCorrectAnswer(result.correctAnswer);
      setPhase('answered');
    }

    function onRoundEnd({ correctAnswer: ca, scoreboard: sb }) {
      setCorrectAnswer(ca);
      setScoreboard(sb);
      setPhase('round-end');
    }

    function onGameEnd({ scoreboard: sb }) {
      setFinalResults(sb);
      setPhase('finished');
      setTimeout(() => navigate(`/results/${roomCode}`, { state: { scoreboard: sb }, replace: true }), 2500);
    }

    function onKicked() {
      navigate('/', { replace: true });
    }

    function onReconnect() {
      joinedRef.current = false;
      joinRoom();
    }

    socket.on('question', onQuestion);
    socket.on('answer-result', onAnswerResult);
    socket.on('round-end', onRoundEnd);
    socket.on('game-end', onGameEnd);
    socket.on('kicked', onKicked);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('question', onQuestion);
      socket.off('answer-result', onAnswerResult);
      socket.off('round-end', onRoundEnd);
      socket.off('game-end', onGameEnd);
      socket.off('kicked', onKicked);
      socket.off('connect', onReconnect);
    };
  }, [socketRef, roomCode, navigate, joinRoom]);

  function handleAnswer(answer) {
    if (phase !== 'question' || selectedAnswer) return;
    const socket = socketRef.current;
    if (!socket) return;

    setSelectedAnswer(answer);
    socket.emit('submit-answer', { roomCode, answer }, (res) => {
      if (res?.error) console.error('Answer error:', res.error);
    });
  }

  function getAnswerState(answer) {
    if (phase === 'question') {
      return selectedAnswer === answer ? 'selected' : null;
    }
    if (phase === 'answered' || phase === 'round-end') {
      if (answer === correctAnswer) return 'reveal-correct';
      if (answer === selectedAnswer) return 'reveal-wrong';
      return null;
    }
    return null;
  }

  // Waiting for game to start
  if (phase === 'waiting') {
    return (
      <div className={styles.gamePage}>
        <div className={styles.waitingScreen}>
          <div className="spinner" />
          <p>Waiting for the next question...</p>
        </div>
      </div>
    );
  }

  // Between rounds
  if (phase === 'round-end') {
    const myEntry = scoreboard.find((p) => p.id === user?.id);
    return (
      <div className={styles.gamePage}>
        <div className={styles.roundEndScreen}>
          <h2 className={styles.roundEndTitle}>Round Results</h2>

          {myEntry && (
            <div className={`${styles.myResult} ${answerResult?.isCorrect ? styles.correct : styles.incorrect}`}>
              <div className={styles.myResultIcon}>
                {answerResult?.isCorrect ? '✓' : '✗'}
              </div>
              <div>
                <div className={styles.myResultPts}>
                  {answerResult?.isCorrect ? `+${answerResult.pointsEarned} pts` : 'No points'}
                </div>
                <div className={styles.myResultTotal}>Total: {myEntry.score.toLocaleString()} pts</div>
              </div>
            </div>
          )}

          {correctAnswer && (
            <div className={styles.correctAnswerBanner}>
              <span className={styles.correctAnswerLabel}>Correct answer:</span>
              <span className={styles.correctAnswerText}>{correctAnswer}</span>
            </div>
          )}

          <div className={styles.scoreboardWrap}>
            <h3 className={styles.scoreboardTitle}>Scoreboard</h3>
            <Scoreboard players={scoreboard} currentUserId={user?.id} />
          </div>

          <p className={styles.nextHint}>Next question coming up...</p>
        </div>
      </div>
    );
  }

  // Finished
  if (phase === 'finished') {
    return (
      <div className={styles.gamePage}>
        <div className={styles.waitingScreen}>
          <div className={styles.finishedIcon}>🏆</div>
          <h2>Game Over!</h2>
          <p>Loading final results...</p>
        </div>
      </div>
    );
  }

  // Active question
  return (
    <div className={styles.gamePage}>
      <div className={styles.questionSection}>
        <div className={styles.timerRow}>
          <Timer
            key={timerKey}
            duration={duration}
            running={phase === 'question'}
          />
        </div>

        <Question
          question={currentQuestion}
          questionNumber={questionNumber}
          totalQuestions={totalQuestions}
        />
      </div>

      <div className={styles.answersSection}>
        {currentQuestion?.answers.map((answer, i) => (
          <AnswerButton
            key={answer}
            answer={answer}
            index={i}
            onClick={handleAnswer}
            disabled={phase !== 'question' || !!selectedAnswer}
            state={getAnswerState(answer)}
          />
        ))}
      </div>

      {phase === 'answered' && answerResult && (
        <div className={`${styles.answerFeedback} ${answerResult.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
          {answerResult.isCorrect
            ? `Correct! +${answerResult.pointsEarned} pts`
            : `Wrong! The answer was: ${answerResult.correctAnswer}`}
        </div>
      )}

      {phase === 'question' && !selectedAnswer && (
        <p className={styles.tapHint}>Tap your answer!</p>
      )}
    </div>
  );
}
