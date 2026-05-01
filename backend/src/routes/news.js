const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_NEWS_CHANNEL || 'AviationupdatesDG';

function cleanTitle(title) {
  // Strip leading red/stop emojis (🛑, 🔴, ⚠️, 🚨) and surrounding whitespace
  return title.replace(/^[\s🛑🔴⚠️🚨]+/, '').trim();
}

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

    const text = (message.caption || message.text || '').replace(/https?:\/\/t\.me\/\S+/g, '').trim();
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

    const title = cleanTitle(lines[0] || text.substring(0, 120));
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
    // Pinned featured post first, then rest by date
    const rows = db.prepare(
      "SELECT * FROM news_posts WHERE hidden = 0 AND post_date >= date('now', '-4 days') ORDER BY is_featured DESC, post_date DESC, message_id DESC LIMIT 50"
    ).all();

    const hasPinned = rows.some(p => p.is_featured === 1);
    const posts = rows.map((p, i) => ({
      id: p.message_id,
      featured: hasPinned ? p.is_featured === 1 : i === 0,
      breaking: p.is_breaking === 1,
      category: p.category,
      title: p.title,
      excerpt: p.excerpt,
      date: p.post_date,
      displayDate: formatHebrewDate(p.post_date),
      photoFileId: p.photo_file_id || null,
      photoCredit: p.photo_credit || null,
      fullText: p.full_text || null,
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

// ── Admin routes (require JWT) ────────────────────────────────────────────
const { requireAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const OVERRIDES_PATH = path.join(__dirname, '../../data/admin_overrides.json');

function loadOverrides() {
  try { return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8')); } catch { return { hidden: [], breaking: [] }; }
}

function saveOverrides(overrides) {
  try {
    fs.mkdirSync(path.dirname(OVERRIDES_PATH), { recursive: true });
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides));
  } catch (e) { console.error('[Overrides] Save failed:', e.message); }
}

function applyOverrides(db) {
  const o = loadOverrides();
  for (const id of o.hidden)   db.prepare('UPDATE news_posts SET hidden = 1 WHERE message_id = ?').run(id);
  for (const id of o.breaking) db.prepare('UPDATE news_posts SET is_breaking = 1 WHERE message_id = ?').run(id);
}

// Called on startup from app.js
router.applyOverrides = applyOverrides;

// DELETE /api/news/posts/:id — soft delete
router.delete('/posts/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getDb();
    db.prepare('UPDATE news_posts SET hidden = 1 WHERE message_id = ?').run(id);
    const o = loadOverrides();
    if (!o.hidden.includes(id)) { o.hidden.push(id); o.breaking = o.breaking.filter(x => x !== id); }
    saveOverrides(o);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/news/posts/:id — update breaking flag and/or title/excerpt
router.patch('/posts/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getDb();
    const { is_breaking, is_featured, title, excerpt, photo_credit } = req.body;
    const fields = [];
    const vals = [];
    if (is_breaking !== undefined) { fields.push('is_breaking = ?');  vals.push(is_breaking ? 1 : 0); }
    if (is_featured !== undefined) { fields.push('is_featured = ?');  vals.push(is_featured ? 1 : 0); }
    if (title !== undefined)       { fields.push('title = ?');        vals.push(title); }
    if (excerpt !== undefined)     { fields.push('excerpt = ?');      vals.push(excerpt); }
    if (photo_credit !== undefined){ fields.push('photo_credit = ?'); vals.push(photo_credit || null); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    // Only one post can be featured at a time
    if (is_featured) db.prepare('UPDATE news_posts SET is_featured = 0').run();

    vals.push(id);
    db.prepare(`UPDATE news_posts SET ${fields.join(', ')} WHERE message_id = ?`).run(...vals);

    if (is_breaking !== undefined) {
      const o = loadOverrides();
      if (is_breaking) { if (!o.breaking.includes(id)) o.breaking.push(id); }
      else             { o.breaking = o.breaking.filter(x => x !== id); }
      saveOverrides(o);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
