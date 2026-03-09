const express = require('express');
const bcrypt = require('bcryptjs');
const { userOps } = require('../db');
const { generateToken, verifyToken } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 2–20 characters' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username may only contain letters, numbers, underscores, and hyphens' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check uniqueness
    const existingEmail = userOps.findByEmail.get(email.toLowerCase());
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUsername = userOps.findByUsername.get(username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = userOps.create.run({
      username,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      provider: 'local',
      provider_id: null,
      avatar_url: null,
    });

    const user = {
      id: result.lastInsertRowid,
      username,
      email: email.toLowerCase(),
    };

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = userOps.findByEmail.get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.provider !== 'local') {
      return res.status(401).json({ error: `This account uses ${user.provider} login` });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me — verify token and return user info
router.get('/me', verifyToken, (req, res) => {
  try {
    const user = userOps.findById.get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ------------------------------------------------------------------
// Passport.js structure (wired for future Google/Facebook OAuth)
// ------------------------------------------------------------------
// When you're ready to add social login, install passport, passport-google-oauth20,
// passport-facebook, and connect-session-knex, then uncomment below.
//
// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
//
// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: '/api/auth/google/callback',
// }, async (accessToken, refreshToken, profile, done) => {
//   let user = userOps.findByEmail.get(profile.emails[0].value);
//   if (!user) {
//     const result = userOps.create.run({
//       username: profile.displayName.replace(/\s+/g, '_').slice(0, 20),
//       email: profile.emails[0].value,
//       password_hash: '',
//       provider: 'google',
//       provider_id: profile.id,
//       avatar_url: profile.photos[0]?.value || null,
//     });
//     user = { id: result.lastInsertRowid, username: profile.displayName, email: profile.emails[0].value };
//   }
//   const token = generateToken(user);
//   return done(null, { user, token });
// }));
//
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback', passport.authenticate('google', { session: false }),
//   (req, res) => res.redirect(`/?token=${req.user.token}`)
// );

module.exports = router;
