const express = require('express');
const { userOps } = require('../db');
const { generateToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/guest — create or retrieve a guest user by username
router.post('/guest', (req, res) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const name = username.trim();

    if (name.length < 2 || name.length > 20) {
      return res.status(400).json({ error: 'Name must be 2–20 characters' });
    }

    if (!/^[a-zA-Z0-9_\- ]+$/.test(name)) {
      return res.status(400).json({ error: 'Name contains invalid characters' });
    }

    // Check if username already exists
    let user = userOps.findByUsername.get(name);

    if (!user) {
      // Create new guest user
      const result = userOps.create.run({
        username: name,
        email: `guest_${Date.now()}_${Math.random().toString(36).slice(2)}@guest.local`,
        password_hash: '',
        provider: 'guest',
        provider_id: null,
        avatar_url: null,
      });
      user = { id: result.lastInsertRowid, username: name };
    }

    const token = generateToken({ id: user.id, username: user.username });

    res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error('Guest login error:', err);
    res.status(500).json({ error: 'Server error' });
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

module.exports = router;
