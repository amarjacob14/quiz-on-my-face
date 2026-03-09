import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import styles from './Home.module.css';

const GAME_MODES = [
  {
    id: 'solo',
    label: 'Solo Device',
    description: 'Every quizzer for themselves. May the best brain win.',
    icon: '📱',
  },
  {
    id: 'shared',
    label: 'Shared Screen',
    description: 'One big screen, one buzzer in your pocket. Very Jackbox. Very classy.',
    icon: '📺',
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    description: 'Big screen AND your phone. Double the trivia, double the embarrassment.',
    icon: '🔀',
  },
];

const DIFFICULTIES = [
  { id: 'any', label: 'Any Difficulty' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export default function Home() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('create');
  const [categories, setCategories] = useState([]);

  const [gameMode, setGameMode] = useState('solo');
  const [category, setCategory] = useState('any');
  const [difficulty, setDifficulty] = useState('any');
  const [numQuestions, setNumQuestions] = useState(10);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    authFetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, [authFetch]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await authFetch('/api/games', {
        method: 'POST',
        body: JSON.stringify({ category, difficulty, numQuestions, gameMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create game');
      navigate(`/lobby/${data.roomCode}`);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError('Room code must be 6 characters');
      return;
    }
    setJoinError('');
    setJoining(true);
    try {
      const res = await authFetch(`/api/games/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Room not found');
      navigate(`/lobby/${code}`);
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className={styles.homePage}>
      <header className={styles.header}>
        <div className="logo">Quiz on My Face</div>
        <div className={styles.userInfo}>
          <span className={styles.username}>{user?.username}</span>
          <button className="btn btn-secondary" onClick={logout} style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
            Sign out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'create' ? styles.tabActive : ''}`}
            onClick={() => setTab('create')}
          >
            Create Game
          </button>
          <button
            className={`${styles.tab} ${tab === 'join' ? styles.tabActive : ''}`}
            onClick={() => setTab('join')}
          >
            Join Game
          </button>
        </div>

        {tab === 'create' && (
          <form onSubmit={handleCreate} className={styles.formSection} key="create">
            {createError && (
              <div className="card" style={{ borderColor: 'var(--danger)', color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>
                {createError}
              </div>
            )}

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Game Mode</h3>
              <div className={styles.modeGrid}>
                {GAME_MODES.map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    className={`${styles.modeCard} ${gameMode === mode.id ? styles.modeCardActive : ''}`}
                    onClick={() => setGameMode(mode.id)}
                  >
                    <span className={styles.modeIcon}>{mode.icon}</span>
                    <span className={styles.modeLabel}>{mode.label}</span>
                    <span className={styles.modeDesc}>{mode.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Questions</h3>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Difficulty</label>
                <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Number of Questions</label>
                <div className={styles.segmentedControl}>
                  {[10, 20, 30].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.segment} ${numQuestions === n ? styles.segmentActive : ''}`}
                      onClick={() => setNumQuestions(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={creating}>
              {creating
                ? <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                : 'Create Game Room'}
            </button>
          </form>
        )}

        {tab === 'join' && (
          <form onSubmit={handleJoin} className={styles.formSection} key="join">
            <div className={styles.joinHero}>
              <p className={styles.joinHint}>Get the code from your quizmaster. No code, no quiz.</p>
            </div>

            {joinError && (
              <div className="card" style={{ borderColor: 'var(--danger)', color: '#fca5a5', background: 'rgba(239,68,68,0.1)' }}>
                {joinError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="joinCode">Room Code</label>
              <input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABCDEF"
                maxLength={6}
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                }}
                disabled={joining}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={joining || joinCode.length !== 6}>
              {joining
                ? <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                : 'Join Game'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
