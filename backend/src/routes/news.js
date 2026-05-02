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
  const datePart = isoDate.split('T')[0];
  const d = new Date(datePart + 'T12:00:00Z');
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

    // Detect video/animation before the text check so video-only posts aren't dropped
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

    // Skip only if no text AND no media
    if (!text && !hasVideo && !photoFileId) return res.json({ ok: true });

    const date = new Date(message.date * 1000);
    const isoDate = date.toISOString(); // full UTC datetime for accurate "X hours ago"

    // Extract credit from last line if it starts with צילום/קרדיט/photo
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
    db.prepare(`
      INSERT OR REPLACE INTO news_posts
        (message_id, category, title, excerpt, full_text, photo_file_id, photo_credit, post_date, is_breaking, telegram_url, has_video, video_file_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      message.message_id, category, title, excerpt, text,
      photoFileId, photoCredit, isoDate, isBreaking ? 1 : 0,
      `https://t.me/${CHANNEL}/${message.message_id}`,
      hasVideo, videoFileId
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
      isStatusLink: p.category === 'status',
      hasVideo: p.has_video === 1,
      videoFileId: p.video_file_id || null
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

// GET /api/news/video/:fileId — stream video from Telegram
router.get('/video/:fileId', async (req, res) => {
  try {
    const fileId = decodeURIComponent(req.params.fileId);
    if (!BOT_TOKEN) return res.status(503).send('Bot token not configured');

    const fileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
    );
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      return res.status(404).send('File not found');
    }

    const telegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;

    // Forward range header so the browser can seek
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

// ── Admin routes (require JWT) ────────────────────────────────────────────
const { requireAuth } = require('../middleware/auth');

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const RENDER_API = 'https://api.render.com/v1';

// In-memory cache so we don't hit the API on every request
let _overridesCache = null;

async function loadOverrides() {
  if (_overridesCache) return _overridesCache;
  try {
    const r = await fetch(`${RENDER_API}/services/${RENDER_SERVICE_ID}/env-vars`, {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}` }
    });
    const vars = await r.json();
    const found = vars.find(v => v.envVar.key === 'NEWS_OVERRIDES');
    _overridesCache = found ? JSON.parse(found.envVar.value) : { hidden: [], breaking: [], featured: null, edits: {} };
  } catch { _overridesCache = { hidden: [], breaking: [], featured: null, edits: {} }; }
  return _overridesCache;
}

async function saveOverrides(overrides) {
  _overridesCache = overrides;
  try {
    // Fetch all current env vars, replace NEWS_OVERRIDES, PUT back
    const r = await fetch(`${RENDER_API}/services/${RENDER_SERVICE_ID}/env-vars`, {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}` }
    });
    const vars = await r.json();
    const all = vars.map(v => ({ key: v.envVar.key, value: v.envVar.value }));
    const idx = all.findIndex(v => v.key === 'NEWS_OVERRIDES');
    const val = JSON.stringify(overrides);
    if (idx >= 0) all[idx].value = val; else all.push({ key: 'NEWS_OVERRIDES', value: val });
    await fetch(`${RENDER_API}/services/${RENDER_SERVICE_ID}/env-vars`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(all)
    });
  } catch (e) { console.error('[Overrides] Render save failed:', e.message); }
}

async function applyOverrides(db) {
  const o = await loadOverrides();
  for (const id of (o.hidden  || [])) db.prepare('UPDATE news_posts SET hidden = 1 WHERE message_id = ?').run(id);
  for (const id of (o.breaking|| [])) db.prepare('UPDATE news_posts SET is_breaking = 1 WHERE message_id = ?').run(id);
  if (o.featured) db.prepare('UPDATE news_posts SET is_featured = 1 WHERE message_id = ?').run(o.featured);
  // Apply edits (title/excerpt/credit)
  for (const [msgId, edit] of Object.entries(o.edits || {})) {
    const f = []; const v = [];
    if (edit.title)        { f.push('title = ?');        v.push(edit.title); }
    if (edit.excerpt)      { f.push('excerpt = ?');      v.push(edit.excerpt); }
    if (edit.photo_credit !== undefined) { f.push('photo_credit = ?'); v.push(edit.photo_credit); }
    if (f.length) { v.push(parseInt(msgId,10)); db.prepare(`UPDATE news_posts SET ${f.join(', ')} WHERE message_id = ?`).run(...v); }
  }
}

// Called on startup from app.js
router.applyOverrides = applyOverrides;

// POST /api/news/posts/restore-all — unhide all soft-deleted posts
router.post('/posts/restore-all', requireAuth, async (req, res) => {
  try {
    getDb().prepare('UPDATE news_posts SET hidden = 0').run();
    const o = await loadOverrides();
    o.hidden = [];
    _overridesCache = o;
    await saveOverrides(o);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/news/posts/:id — soft delete
router.delete('/posts/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    getDb().prepare('UPDATE news_posts SET hidden = 1 WHERE message_id = ?').run(id);
    const o = await loadOverrides();
    if (!o.hidden.includes(id)) { o.hidden.push(id); o.breaking = (o.breaking||[]).filter(x => x !== id); }
    if (o.featured === id) o.featured = null;
    saveOverrides(o); // async, don't await — respond fast
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/news/posts/:id
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

    const o = await loadOverrides();
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
