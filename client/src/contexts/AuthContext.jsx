import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('trivia_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('trivia_token');
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('trivia_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const guestLogin = useCallback(async (username) => {
    const res = await fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('trivia_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('trivia_token');
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback(
    (url, options = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
    },
    [token]
  );

  return (
    <AuthContext.Provider value={{ user, token, loading, guestLogin, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
