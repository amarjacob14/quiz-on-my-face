import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocketContext } from '../contexts/SocketContext.jsx';
import styles from './Lobby.module.css';

export default function Lobby() {
  const { roomCode } = useParams();
  const { user, authFetch } = useAuth();
  const { socketRef } = useSocketContext();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const joinedRef = useRef(false);

  const isHost = gameState?.hostId === user?.id;

  const joinRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || joinedRef.current) return;

    const event = isHost || gameState?.hostId === user?.id ? 'host-join' : 'join-room';
    // We don't know isHost yet on first call, use join-room for everyone
    // The server handles both; host re-joins via host-join separately
    socket.emit('join-room', { roomCode }, (res) => {
      if (res?.error) {
        setError(res.error);
        return;
      }
      joinedRef.current = true;
      if (res?.game) {
        setGameState(res.game);
        setPlayers(res.game.players || []);
      }
    });
  }, [roomCode, socketRef, user?.id, gameState?.hostId, isHost]);

  useEffect(() => {
    // Load initial game state via REST
    authFetch(`/api/games/${roomCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setGameState(data);
        setPlayers(data.players || []);
      })
      .catch(() => setError('Failed to load game'));
  }, [roomCode, authFetch]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !gameState) return;

    if (!joinedRef.current) {
      joinRoom();
    }

    function onPlayerJoined({ players: updatedPlayers }) {
      setPlayers(updatedPlayers);
    }

    function onPlayerLeft({ players: updatedPlayers }) {
      setPlayers(updatedPlayers);
    }

    function onGameStarting({ countdown: cd }) {
      setStarting(true);
      setCountdown(cd);
      let c = cd;
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        c -= 1;
        setCountdown(c);
        if (c <= 0) clearInterval(countdownRef.current);
      }, 1000);
    }

    function onQuestion() {
      clearInterval(countdownRef.current);
      // Navigate players to their respective views
      if (gameState?.gameMode === 'shared' && gameState?.hostId === user?.id) {
        navigate(`/host/${roomCode}`, { replace: true });
      } else {
        navigate(`/game/${roomCode}`, { replace: true });
      }
    }

    function onKicked() {
      navigate('/', { replace: true });
    }

    socket.on('player-joined', onPlayerJoined);
    socket.on('player-left', onPlayerLeft);
    socket.on('game-starting', onGameStarting);
    socket.on('question', onQuestion);
    socket.on('kicked', onKicked);

    return () => {
      socket.off('player-joined', onPlayerJoined);
      socket.off('player-left', onPlayerLeft);
      socket.off('game-starting', onGameStarting);
      socket.off('question', onQuestion);
      socket.off('kicked', onKicked);
    };
  }, [socketRef, gameState, roomCode, navigate, user?.id, joinRoom]);

  // Reconnect socket listener
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    function onReconnect() {
      joinedRef.current = false;
      joinRoom();
    }
    socket.on('connect', onReconnect);
    return () => socket.off('connect', onReconnect);
  }, [socketRef, joinRoom]);

  function handleStart() {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('start-game', { roomCode }, (res) => {
      if (res?.error) setError(res.error);
    });
  }

  function handleOpenHostScreen() {
    window.open(`/host/${roomCode}`, '_blank', 'noopener');
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode).catch(() => {});
  }

  if (error) {
    return (
      <div className="page-center">
        <div className="card" style={{ textAlign: 'center', maxWidth: 360, width: '100%' }}>
          <p style={{ color: '#fca5a5', marginBottom: 16 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    );
  }

  const difficultyLabel = gameState.difficulty === 'any' ? 'Any difficulty' : gameState.difficulty;
  const categoryLabel = gameState.category === 'any' ? 'Any category' : gameState.category;

  return (
    <div className={styles.lobbyPage}>
      {starting && countdown !== null && (
        <div className={styles.countdownOverlay}>
          <div className={styles.countdownNumber}>{countdown > 0 ? countdown : 'GO!'}</div>
          <p>Game starting...</p>
        </div>
      )}

      <header className={styles.header}>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ padding: '8px 14px', fontSize: '0.875rem' }}>
          ← Back
        </button>
        <div className="logo">Quiz on My Face</div>
        <div style={{ width: 80 }} />
      </header>

      <div className={styles.content}>
        <div className={styles.roomCodeSection}>
          <p className={styles.roomCodeLabel}>Room Code</p>
          <div className={styles.roomCodeRow}>
            <div className="room-code">{roomCode}</div>
            <button className="btn btn-secondary" onClick={copyCode} title="Copy code">
              Copy
            </button>
          </div>
          <p className={styles.shareHint}>Drop this in the group chat. You know the one.</p>
        </div>

        <div className={styles.gameInfo}>
          <div className={styles.infoChip}>
            {gameState.numQuestions} questions
          </div>
          <div className={styles.infoChip}>{categoryLabel}</div>
          <div className={styles.infoChip}>{difficultyLabel}</div>
          <div className={styles.infoChip} style={{ textTransform: 'capitalize' }}>
            {gameState.gameMode} mode
          </div>
        </div>

        <div className={styles.playersSection}>
          <h3 className={styles.playersTitle}>
            Players <span className={styles.playerCount}>{players.length}</span>
          </h3>
          <ul className="player-list">
            {players.map((p) => (
              <li key={p.id} className="player-item">
                <div className="player-avatar">
                  {p.username[0].toUpperCase()}
                </div>
                <span className="player-name">{p.username}</span>
                {p.isHost && <span className="host-badge">Host</span>}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <div className={styles.hostActions}>
            {(gameState.gameMode === 'shared' || gameState.gameMode === 'hybrid') && (
              <button className="btn btn-secondary btn-full" onClick={handleOpenHostScreen}>
                Open Host Screen (new tab)
              </button>
            )}
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleStart}
              disabled={starting || players.length < 1}
            >
              {starting ? 'Starting...' : 'Start Game'}
            </button>
            <p className={styles.hostHint}>
              {players.length < 2 ? 'Waiting for more brains to arrive...' : 'Full house! Let\'s get quizzing.'}
            </p>
          </div>
        ) : (
          <div className={styles.waitingMsg}>
            <div className={styles.waitingDots}>
              <span /><span /><span />
            </div>
            <p>Quizmaster is sharpening their pencil...</p>
          </div>
        )}
      </div>
    </div>
  );
}
