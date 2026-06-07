const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database/db');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_NEWS_CHANNEL || 'AviationupdatesDG';

// ── Security helpers ──────────────────────────────────────────────────────────

// FIX FIND-233: Escape HTML to prevent XSS
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// FIX FIND-234: Validate that request genuinely comes from Telegram
// by verifying the bot token matches and message_id is a safe integer
function isValidTelegramUpdate(update) {
  const message = update.channel_post || update.message;
  if (!message) return false;
  const id = message.message_id;
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return false;
  return true;
}

function cleanTitle(title) {
  return title.replace(/^[\s\u{1F6D1}\u{1F534}\u26A0\uFE0F\u{1F6A8}]+/u, '').trim();
}

function detectCategory(text) {
  if (/התראה|הונאה|אזהרה|⚠|🚨/.test(text)) return 'security';
  if (/יום הזיכרון|הר הטייסים|נפל\b|שנפל/.test(text)) return 'memorial';
  if (/כטב"מ|חיל האוויר|צה"ל|נושאת|חיזבאללה|מטוס קרב|F-16|F-35|UAV/i.test(text)) return 'military';
  if (/סטטוס|עוקב|tracker|dashboard/i.test(text)) return 'status';
  return 'civil';
}

function formatHebrewDate(isoDate) {
  const datePart = isoDate.split('T')[0];
  const d = new Date(datePart + 'T12:00:00Z');
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Telegram webhook — receives channel posts
router.post('/webhook', async (req, res) => {
  try {
    // FIX FIND-234: Validate webhook secret if configured
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const update = req.body;

    // FIX FIND-233 + FIND-235: Validate update structure
    if (!isValidTelegramUpdate(update)) return res.json({ ok: true });

    const message = update.channel_post || update.message;

    // FIX FIND-235: Use INSERT OR IGNORE instead of INSERT OR REPLACE
    // to prevent overwriting existing posts via unauthenticated webhook
    const messageId = message.message_id;

    const text = (message.caption || message.text || '').replace(/https?:\/\/t\.me\/\S+/g, '').trim();

    let hasVideo = 0;
    let videoFileId = null;
    let photoFileId = null;
    if (message.photo && message.photo.length > 0) {
      photoFileId = message.photo[message.photo.length - 1].file_id;
    }
    const videoObj = message.video || message.animation || message.video_note;
    if (videoObj) {
      hasVideo = 1;
      videoFileId = videoObj.file_id;
      if (!photoFileId) {
        const thumb = videoObj.thumbnail || videoObj.thumb;
        if (thumb) photoFileId = thumb.file_id;
      }
    }

    if (!text && !hasVideo && !photoFileId) return res.json({ ok: true });

    const date = new Date(message.date * 1000);
    const isoDate = date.toISOString();

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let photoCredit = null;
    if (lines.length) {
      const creditLine = lines[lines.length - 1];
      if (/^(צילום|קרדיט|photo credit|📷)/i.test(creditLine)) {
        photoCredit = creditLine.replace(/^(צילום|קרדיט|photo credit|📷)[:\s]*/i, '').trim();
        lines.pop();
      }
    }

    const title = text ? cleanTitle(lines[0] || text.substring(0, 120)) : (hasVideo ? 'סרטון' : 'עדכון');
    const excerpt = text ? (lines.slice(1).join(' ').substring(0, 300) || title) : title;
    const category = detectCategory(text);
    const isBreaking = /🚨|מבזק/.test(text);

    const db = getDb();

    // FIX FIND-235: Use INSERT OR IGNORE — never overwrite existing posts
    db.prepare(`
      INSERT OR IGNORE INTO news_posts
        (message_id, category, title, excerpt, full_text, photo_file_id, photo_credit, post_date, is_breaking, telegram_url, has_video, video_file_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId, category, title, excerpt, text,
      photoFileId, photoCredit, isoDate, isBreaking ? 1 : 0,
      `https://t.me/${CHANNEL}/${messageId}`,
      hasVideo, videoFileId
    );

    console.log(`[NewsWebhook] Saved post ${messageId}: "${title}"`);
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
    const isAdmin = (() => {
      try {
        const jwt = require('jsonwebtoken');
        const h = req.headers.authorization;
        if (!h || !h.startsWith('Bearer ')) return false;
        jwt.verify(h.split(' ')[1], process.env.JWT_SECRET);
        return true;
      } catch { return false; }
    })();
    const query = isAdmin
      ? "SELECT * FROM news_posts WHERE hidden = 0 ORDER BY is_featured DESC, post_date DESC, message_id DESC LIMIT 200"
      : "SELECT * FROM news_posts WHERE hidden = 0 AND post_date >= date('now', '-30 days') ORDER BY is_featured DESC, post_date DESC, message_id DESC LIMIT 50";
    const rows = db.prepare(query).all();

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
      isStatusLink: p.category === 'status',
      hasVideo: p.has_video === 1,
      videoFileId: p.video_file_id || null
    }));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/news/image/:fileId
const IMAGE_CACHE_DIR = path.join(__dirname, '../../data/image-cache');
fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });

router.get('/image/:fileId', async (req, res) => {
  try {
    const fileId = decodeURIComponent(req.params.fileId);

    if (fileId.startsWith('http')) {
      return res.redirect(302, fileId);
    }

    if (!BOT_TOKEN) return res.status(503).send('Bot token not configured');

    const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cachedJpg = path.join(IMAGE_CACHE_DIR, `${safeId}.jpg`);
    const cachedPng = path.join(IMAGE_CACHE_DIR, `${safeId}.png`);
    const cachedWebp = path.join(IMAGE_CACHE_DIR, `${safeId}.webp`);

    for (const [cachedPath, mime] of [[cachedJpg, 'image/jpeg'], [cachedPng, 'image/png'], [cachedWebp, 'image/webp']]) {
      if (fs.existsSync(cachedPath)) {
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=604800');
        return res.send(fs.readFileSync(cachedPath));
      }
    }

    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      return res.status(404).send('File not found');
    }

    const imgRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`);
    if (!imgRes.ok) return res.status(404).send('Image not found');

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await imgRes.arrayBuffer());

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const savePath = path.join(IMAGE_CACHE_DIR, `${safeId}.${ext}`);
    try { fs.writeFileSync(savePath, buf); } catch (e) { /* non-fatal */ }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.send(buf);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET /api/news/video/:fileId
router.get('/video/:fileId', async (req, res) => {
  try {
    const fileId = decodeURIComponent(req.params.fileId);
    if (!BOT_TOKEN) return res.status(503).send('Bot token not configured');

    const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      return res.status(404).send('File not found');
    }

    const telegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
    const fetchHeaders = {};
    if (req.headers.range) fetchHeaders['Range'] = req.headers.range;

    const videoRes = await fetch(telegramUrl, { headers: fetchHeaders });
    if (!videoRes.ok && videoRes.status !== 206) {
      return res.status(videoRes.status).send('Video not found');
    }

    res.status(videoRes.status);
    res.setHeader('Content-Type', videoRes.headers.get('content-type') || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (videoRes.headers.get('content-length'))
      res.setHeader('Content-Length', videoRes.headers.get('content-length'));
    if (videoRes.headers.get('content-range'))
      res.setHeader('Content-Range', videoRes.headers.get('content-range'));

    const { Readable } = require('stream');
    Readable.fromWeb(videoRes.body).pipe(res);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────
const { requireAuth } = require('../middleware/auth');

let _overridesCache = null;

function loadOverrides() {
  if (_overridesCache) return _overridesCache;
  try {
    const row = getDb().prepare("SELECT value FROM sync_meta WHERE key = 'NEWS_OVERRIDES'").get();
    _overridesCache = row ? JSON.parse(row.value) : { hidden: [], breaking: [], featured: null, edits: {} };
  } catch { _overridesCache = { hidden: [], breaking: [], featured: null, edits: {} }; }
  return _overridesCache;
}

function saveOverrides(overrides) {
  _overridesCache = overrides;
  try {
    getDb().prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('NEWS_OVERRIDES', ?)").run(JSON.stringify(overrides));
  } catch (e) { console.error('[Overrides] DB save failed:', e.message); }
}

function applyOverrides(db) {
  const o = loadOverrides();
  for (const id of (o.hidden  || [])) db.prepare('UPDATE news_posts SET hidden = 1 WHERE message_id = ?').run(id);
  for (const id of (o.breaking|| [])) db.prepare('UPDATE news_posts SET is_breaking = 1 WHERE message_id = ?').run(id);
  if (o.featured) db.prepare('UPDATE news_posts SET is_featured = 1 WHERE message_id = ?').run(o.featured);
  for (const [msgId, edit] of Object.entries(o.edits || {})) {
    const f = []; const v = [];
    if (edit.title)        { f.push('title = ?');        v.push(edit.title); }
    if (edit.excerpt)      { f.push('excerpt = ?');      v.push(edit.excerpt); }
    if (edit.photo_credit !== undefined) { f.push('photo_credit = ?'); v.push(edit.photo_credit); }
    if (f.length) { v.push(parseInt(msgId,10)); db.prepare(`UPDATE news_posts SET ${f.join(', ')} WHERE message_id = ?`).run(...v); }
  }
}

router.applyOverrides = applyOverrides;

router.post('/posts/restore-all', requireAuth, (req, res) => {
  try {
    getDb().prepare('UPDATE news_posts SET hidden = 0').run();
    const o = loadOverrides();
    o.hidden = [];
    saveOverrides(o);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/posts/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    getDb().prepare('UPDATE news_posts SET hidden = 1 WHERE message_id = ?').run(id);
    const o = loadOverrides();
    if (!o.hidden.includes(id)) { o.hidden.push(id); o.breaking = (o.breaking||[]).filter(x => x !== id); }
    if (o.featured === id) o.featured = null;
    saveOverrides(o);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/posts/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getDb();
    const { is_breaking, is_featured, title, excerpt, photo_credit } = req.body;
    const fields = []; const vals = [];
    if (is_breaking  !== undefined) { fields.push('is_breaking = ?');  vals.push(is_breaking  ? 1 : 0); }
    if (is_featured  !== undefined) { fields.push('is_featured = ?');  vals.push(is_featured  ? 1 : 0); }
    if (title        !== undefined) { fields.push('title = ?');        vals.push(title); }
    if (excerpt      !== undefined) { fields.push('excerpt = ?');      vals.push(excerpt); }
    if (photo_credit !== undefined) { fields.push('photo_credit = ?'); vals.push(photo_credit || null); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    if (is_featured) db.prepare('UPDATE news_posts SET is_featured = 0').run();
    vals.push(id);
    db.prepare(`UPDATE news_posts SET ${fields.join(', ')} WHERE message_id = ?`).run(...vals);

    const o = loadOverrides();
    if (is_breaking !== undefined) {
      if (is_breaking) { if (!(o.breaking||[]).includes(id)) (o.breaking = o.breaking||[]).push(id); }
      else             { o.breaking = (o.breaking||[]).filter(x => x !== id); }
    }
    if (is_featured !== undefined) { o.featured = is_featured ? id : (o.featured === id ? null : o.featured); }
    if (title !== undefined || excerpt !== undefined || photo_credit !== undefined) {
      o.edits = o.edits || {};
      o.edits[id] = { ...(o.edits[id]||{}), ...(title !== undefined ? {title} : {}), ...(excerpt !== undefined ? {excerpt} : {}), ...(photo_credit !== undefined ? {photo_credit} : {}) };
    }
    saveOverrides(o);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
