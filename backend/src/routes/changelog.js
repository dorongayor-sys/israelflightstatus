const express = require('express');
const { getDb } = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const entries = db.prepare('SELECT * FROM changelog ORDER BY changed_at DESC LIMIT ?').all(limit);
  res.json(entries);
});

module.exports = router;
