const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_NEWS_CHANNEL || 'AviationupdatesDG';

function detectCategory(text) {
  if (/התראה|הונאה|אזהרה|⚠|🚨/.test(text)) return 'security';
  if (/יום הזיכרון|הר הטייסים|נפל\b|שנפל/.test(text)) return 'memorial';
  if (/כטב"מ|חיל האוויר|צה"ל|נושאת|חיזבאללה|מטוס קרב|F-16|F-35|UAV/i.test(text)) return 'military';
  if (/סטטוס|עוקב|tracker|dashboard/i.test(text)) return 'status';
  return 'civil';
}

function formatHebrewDate(isoDate) {
  const d = new Date(isoDate + 'T12:00:00Z');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Telegram webhook — receives channel posts
router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const update = req.body;
    const message = update.channel_post || update.message;
    if (!message) return res.json({ ok: true });

    const text = (message.caption || message.text || '').trim();
    if (!text) return res.json({ ok: true });

    const date = new Date(message.date * 1000);
    const isoDate = date.toISOString().split('T')[0];

    // Largest photo
    let photoFileId = null;
    if (message.photo && message.photo.length > 0) {
      photoFileId = message.photo[message.photo.length - 1].file_id;
    }

    // Extract credit from last line if it starts with צילום/קרדיט/photo
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let photoCredit = null;
    const creditLine = lines[lines.length - 1];
    if (/^(צילום|קרדיט|photo credit|📷)/i.test(creditLine)) {
      photoCredit = creditLine.replace(/^(צילום|קרדיט|photo credit|📷)[:\s]*/i, '').trim();
      lines.pop();
    }

    const title = lines[0] || text.substring(0, 120);
    const excerpt = lines.slice(1).join(' ').substring(0, 300) || title;
    const category = detectCategory(text);
    const isBreaking = /🚨|מבזק/.test(text);

    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO news_posts
        (message_id, category, title, excerpt, full_text, photo_file_id, photo_credit, post_date, is_breaking, telegram_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      message.message_id, category, title, excerpt, text,
      photoFileId, photoCredit, isoDate, isBreaking ? 1 : 0,
      `https://t.me/${CHANNEL}/${message.message_id}`
    );

    console.log(`[NewsWebhook] Saved post ${message.message_id}: "${title}"`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[NewsWebhook] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/news/posts
router.get('/posts', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM news_posts ORDER BY post_date DESC, message_id DESC LIMIT 50'
    ).all();

    const posts = rows.map((p, i) => ({
      id: p.message_id,
      featured: i === 0,
      breaking: p.is_breaking === 1,
      category: p.category,
      title: p.title,
      excerpt: p.excerpt,
      date: p.post_date,
      displayDate: formatHebrewDate(p.post_date),
      photoFileId: p.photo_file_id || null,
      photoCredit: p.photo_credit || null,
      telegramUrl: p.telegram_url,
      isStatusLink: p.category === 'status'
    }));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/news/image/:fileId — proxy from Telegram or redirect CDN URL
router.get('/image/:fileId', async (req, res) => {
  try {
    const fileId = decodeURIComponent(req.params.fileId);

    // CDN URL stored directly (from web scrape) — redirect
    if (fileId.startsWith('http')) {
      return res.redirect(302, fileId);
    }

    if (!BOT_TOKEN) return res.status(503).send('Bot token not configured');

    const fileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      return res.status(404).send('File not found');
    }

    const imgRes = await fetch(
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`
    );
    if (!imgRes.ok) return res.status(404).send('Image not found');

    res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buf = await imgRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
