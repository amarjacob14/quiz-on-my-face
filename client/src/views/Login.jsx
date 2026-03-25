import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import styles from './Auth.module.css';

export default function Login() {
  const { guestLogin } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const name = username.trim();
    if (name.length < 2 || name.length > 20) {
      setError('Name must be 2–20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(name)) {
      setError('Name can only contain letters, numbers, spaces, hyphens and underscores');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await guestLogin(name);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className="logo">Quiz on My Face</div>
          <h1 className={styles.authTitle}>What's your name?</h1>
          <p className={styles.authSubtitle}>No account needed. Just jump in.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Your name</label>
            <input
              id="username"
              type="text"
              autoComplete="off"
              placeholder="e.g. QuizMaster99"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading || username.trim().length < 2}
          >
            {loading
              ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              : "Let's Play →"}
          </button>
        </form>
      </div>
    </div>
  );
}
