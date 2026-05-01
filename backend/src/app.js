require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./database/db');

const authRoutes = require('./routes/auth');
const airlineRoutes = require('./routes/airlines');
const changelogRoutes = require('./routes/changelog');
const newsRoutes = require('./routes/news');
const { startAutoSync, runMakoSync, runTelegramSync, runEshetSync, runNewsChannelSync } = require('./autoSync');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/airlines', airlineRoutes);
app.use('/api/changelog', changelogRoutes);
app.use('/api/news', newsRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/sync', async (req, res) => {
  try {
    await runMakoSync();
    await runTelegramSync();
    await runEshetSync();
    await runNewsChannelSync();
    const { getDb } = require('./database/db');
    const db = getDb();
    const row = db.prepare('SELECT value FROM sync_meta WHERE key = ?').get('last_sync');
    res.json({ ok: true, last_sync: row ? row.value : null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/last-sync', (req, res) => {
  try {
    const { getDb } = require('./database/db');
    const db = getDb();
    const row = db.prepare('SELECT value FROM sync_meta WHERE key = ?').get('last_sync');
    res.json({ last_sync: row ? row.value : null });
  } catch {
    res.json({ last_sync: null });
  }
});

async function main() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Aviation Updates API running on http://localhost:${PORT}`);
  });
  startAutoSync();
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
