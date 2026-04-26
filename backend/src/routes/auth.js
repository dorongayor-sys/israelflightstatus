const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');

const router = express.Router();

// ip -> { blockedUntil: timestamp }
const blocked = new Map();
const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour

function getIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

router.post('/login', async (req, res) => {
  const ip = getIp(req);

  const entry = blocked.get(ip);
  if (entry && Date.now() < entry.blockedUntil) {
    const minutesLeft = Math.ceil((entry.blockedUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.` });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  const valid = user && await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    blocked.set(ip, { blockedUntil: Date.now() + BLOCK_DURATION_MS });
    return res.status(401).json({ error: 'Invalid credentials. Your IP has been blocked for 1 hour.' });
  }

  // Successful login — clear any block
  blocked.delete(ip);

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, username: user.username });
});

module.exports = router;
