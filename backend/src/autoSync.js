const { getDb } = require('./database/db');

const MAKO_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes
const TELEGRAM_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes
const NEWS_SYNC_INTERVAL_MS = 1 * 60 * 1000; // every 1 minute

// ── News channel scraper (AviationupdatesDG) ──────────────────────────────

const NEWS_CHANNEL = process.env.TELEGRAM_NEWS_CHANNEL || 'AviationupdatesDG';

function cleanTitle(title) {
  return title.replace(/^[\s🛑🔴⚠️🚨]+/, '').trim();
}

function detectCategory(text) {
  if (/התראה|הונאה|אזהרה|⚠|🚨/.test(text)) return 'security';
  if (/יום הזיכרון|הר הטייסים|נפל\b|שנפל/.test(text)) return 'memorial';
  if (/כטב"מ|חיל האוויר|צה"ל|נושאת|חיזבאללה|מטוס קרב|F-16|F-35|UAV/i.test(text)) return 'military';
  if (/סטטוס|עוקב|tracker|dashboard/i.test(text)) return 'status';
  return 'civil';
}

async function runNewsChannelSync() {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHANNEL_ID = process.env.TELEGRAM_NEWS_CHANNEL_ID;

  if (BOT_TOKEN && CHANNEL_ID) {
    await runNewsChannelSyncBotApi(BOT_TOKEN, CHANNEL_ID);
    return;
  }

  console.log('[NewsSync] No BOT_TOKEN+CHANNEL_ID — relying on webhook for new posts');
  try {
    const newsRouter = require('./routes/news');
    if (typeof newsRouter.applyOverrides === 'function') newsRouter.applyOverrides(getDb());
  } catch (err) {
    console.error(`[NewsSync] applyOverrides error: ${err && err.message ? err.message : String(err)}`);
  }
}

async function runNewsChannelSyncBotApi(botToken, channelId) {
  try {
    console.log('[NewsSync] Fetching via Bot API...');
    const db = getDb();

    const latest = db.prepare('SELECT MAX(message_id) as max_id FROM news_posts').get();
    const afterId = (latest && latest.max_id) ? latest.max_id : 0;

    const url = `https://api.telegram.org/bot${botToken}/getUpdates?limit=100&allowed_updates=["channel_post"]`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Bot API HTTP ${res.status}`);
    const data = await res.json();

    if (!data.ok) throw new Error(`Bot API error: ${data.description}`);

    const updates = data.result || [];
    console.log(`[NewsSync] Got ${updates.length} updates from Bot API`);

    let saved = 0;
    for (const update of updates) {
      const message = update.channel_post;
      if (!message) continue;

      const chatId = String(message.chat.id);
      const chatUsername = message.chat.username;
      if (chatId !== String(channelId) && chatUsername !== NEWS_CHANNEL.replace('@', '')) continue;

      const messageId = message.message_id;
      if (messageId <= afterId) continue;

      const existing = db.prepare('SELECT id FROM news_posts WHERE message_id = ?').get(messageId);
      if (existing) continue;

      const text = (message.caption || message.text || '').replace(/https?:\/\/t\.me\/\S+/g, '').trim();

      let photoFileId = null;
      let hasVideo = 0;
      let videoFileId = null;

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

      if (!text && !hasVideo && !photoFileId) continue;

      const isoDate = new Date(message.date * 1000).toISOString();
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
      const isBreaking = /🚨|מבזק/.test(text) ? 1 : 0;

      db.prepare(`
        INSERT OR IGNORE INTO news_posts
          (message_id, category, title, excerpt, full_text, photo_file_id, photo_credit, post_date, is_breaking, telegram_url, has_video, video_file_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId, category, title, excerpt, text,
        photoFileId, photoCredit, isoDate, isBreaking,
        `https://t.me/${NEWS_CHANNEL}/${messageId}`,
        hasVideo, videoFileId
      );
      saved++;
    }

    console.log(`[NewsSync] Done — ${saved} new post(s) saved`);

    const newsRouter = require('./routes/news');
    if (typeof newsRouter.applyOverrides === 'function') newsRouter.applyOverrides(db);
  } catch (err) {
    console.error(`[NewsSync] Error: ${err && err.message ? err.message : String(err)}`);
  }
}

// ── Telegram channel scraper (Israel Airports Authority) ───────────────────

const TELEGRAM_CHANNEL_URL = 'https://t.me/s/iaarashut';

const TELEGRAM_AIRLINE_MAP = [
  ['טוס איירווייז', 'U8'],
  ['טוס', 'U8'],
  ['אתיחאד', 'EY'],
  ['אתיופיאן', 'ET'],
  ['חיינאן', 'HU'],
  ['בולגרית', 'FB'],
  ['בולגריה אייר', 'FB'],
  ['סמארטווינגס', 'QS'],
  ['סקיי אקספרס', 'GQ'],
  ['אייר פראנס', 'AF'],
  ['לופטהנזה', 'LH'],
  ['סוויס', 'LX'],
  ['אוסטריאן', 'OS'],
  ['בריסל', 'SN'],
  ['יורווינגס', 'EW'],
  ['בריטיש', 'BA'],
  ['אמריקן', 'AA'],
  ['יונייטד', 'UA'],
  ['דלתא', 'DL'],
  ['אייר קנדה', 'AC'],
  ['אייר אינדיה', 'AI'],
  ['פליי דובאי', 'FZ'],
  ["וויז אייר", 'W6'],
  ["אג'יאן", 'A3'],
  ['אייר פורטוגל', 'TP'],
  ['אייר אירופה', 'UX'],
  ['אייר בלטיק', 'BT'],
  ['סייפרוס', 'CY'],
  ['בלו בירד', 'BZ'],
  ['אנימה', 'IO'],
  ["ג'ורג'יאן", 'A9'],
  ['tus airways', 'U8'],
  ['etihad', 'EY'],
  ['ethiopian', 'ET'],
  ['hainan', 'HU'],
  ['red wings', 'WZ'],
  ['georgian airways', 'A9'],
  ['flyone', '5F'],
  ['smartwings', 'QS'],
  ['sky express', 'GQ'],
  ['bulgaria air', 'FB'],
  ['air france', 'AF'],
  ['lufthansa', 'LH'],
  ['austrian', 'OS'],
  ['brussels', 'SN'],
  ['eurowings', 'EW'],
  ['british airways', 'BA'],
  ['american airlines', 'AA'],
  ['united airlines', 'UA'],
  ['delta', 'DL'],
  ['air canada', 'AC'],
  ['air india', 'AI'],
  ['flydubai', 'FZ'],
  ['fly dubai', 'FZ'],
  ['wizz', 'W6'],
  ['aegean', 'A3'],
  ['ita airways', 'AZ'],
  ['tap ', 'TP'],
  ['air europe', 'UX'],
  ['air baltic', 'BT'],
  ['cyprus airways', 'CY'],
  ['blue bird', 'BZ'],
  ['anima wings', 'IO'],
];

function parseTelegramDate(str) {
  const m = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractTelegramMessages(html) {
  const messages = [];
  const re = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .trim();
    if (text) messages.push(text);
  }
  return messages;
}

function parseAirlineDatePairs(messageText) {
  const pairs = [];
  const lines = messageText.split(/\n/);

  for (const line of lines) {
    const date = parseTelegramDate(line);
    if (!date) continue;

    const lineLower = line.toLowerCase();
    for (const [pattern, iata] of TELEGRAM_AIRLINE_MAP) {
      if (lineLower.includes(pattern.toLowerCase())) {
        pairs.push({ iata, date });
      }
    }

    const codeMatches = line.matchAll(/\(([A-Z0-9]{2,4})\)/g);
    for (const cm of codeMatches) {
      const code = cm[1];
      if (!pairs.some((p) => p.iata === code && p.date === date)) {
        pairs.push({ iata: code, date });
      }
    }
  }

  return pairs;
}

async function runTelegramSync() {
  try {
    console.log('[TelegramSync] Fetching channel...');
    const res = await fetch(TELEGRAM_CHANNEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const messages = extractTelegramMessages(html);
    if (messages.length === 0) {
      console.warn('[TelegramSync] No message blocks found — page structure may have changed');
      return;
    }

    const latestByIata = new Map();
    for (const msg of messages) {
      const pairs = parseAirlineDatePairs(msg);
      for (const { iata, date } of pairs) {
        const existing = latestByIata.get(iata);
        if (!existing || date > existing) latestByIata.set(iata, date);
      }
    }

    const db = getDb();
    let updated = 0;

    for (const [iata, date] of latestByIata) {
      const airline = db.prepare(
        'SELECT * FROM airlines WHERE iata_code = ? AND sync_locked = 0'
      ).get(iata);
      if (!airline) continue;

      if (airline.cancellation_end_date && date < airline.cancellation_end_date) continue;

      if (airline.cancellation_end_date !== date) {
        db.prepare(
          'UPDATE airlines SET cancellation_end_date = ?, date_adjusted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(date, airline.id);
        console.log(`[TelegramSync] ${airline.name} (${iata}): cancellation_end_date → ${date}`);
        updated++;
      }
    }

    console.log(`[TelegramSync] Done — ${updated} update(s)`);
    db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', datetime('now') || 'Z')").run();
  } catch (err) {
    console.error(`[TelegramSync] Error: ${err && err.message ? err.message : String(err)}`);
  }
}

// ── Mako/Infogram date scraper ─────────────────────────────────────────────

const INFOGRAM_URL = 'https://e.infogram.com/e0e8f39e-cc26-408a-bc98-8f73c2b9bb5d';

const HEBREW_TO_IATA = {
  'אייר פראנס':       'AF',
  'אתיחאד':           'EY',
  'בלו בירד':         'BZ',
  'טוס איירווייז':    'U8',
  'יונייטד איירליינס':'UA',
  'אייר בלטיק':       'BT',
  'בולגריה אייר':     'FB',
  'סייפרוס איירווייז':'CY',
  'אייר סיישל':       'HM',
  'דלתא':             'DL',
  'וויז אייר':        'W6',
  'לופטהנזה':         'LH',
  'סוויס':            'LX',
  'אוסטריאן':         'OS',
  'בריסל איירליינס':  'SN',
  'יורווינגס':        'EW',
  'ITA':              'AZ',
  'אייר אירופה':      'UX',
  'LOT':              'LO',
  "אג'יאן":           'A3',
  'אמריקן איירליינס': 'AA',
  'פליי דובאי':       'FZ',
  'אייר אינדיה':      'AI',
  'אייר קנדה':        'AC',
  'בריטיש איירווייז': 'BA',
  'איביריה אקספרס':   'I2',
  'KLM':              'KL',
  'אתיופיאן איירליינס':'ET',
  'סקיי אקספרס':      'GQ',
  'אייר פורטוגל':     'TP',
  'אנימה ווינגז':     'IO',
};

function parseInfogramDate(str) {
  if (!str) return null;
  const s = str.trim();
  if (!s || s === 'אין צפי') return null;
  if (s === 'סוף מאי') return '2026-05-31';
  const m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const now = new Date();
  const year = month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractAirlineDates(html) {
  const datePattern = /\d{1,2}\.\d{1,2}|אין צפי|סוף מאי/;
  const re = /"([\u05D0-\u05FA\w\s']+)"\s*,\s*"([^"]{1,20})"/g;
  const results = new Map();
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    const val  = m[2].trim();
    if (HEBREW_TO_IATA[name] && datePattern.test(val)) {
      results.set(name, val);
    }
  }
  return results;
}

async function runMakoSync() {
  try {
    console.log('[MakoSync] Fetching Infogram...');
    const res = await fetch(INFOGRAM_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const pairs = extractAirlineDates(html);
    if (pairs.size === 0) {
      console.warn('[MakoSync] No airline/date pairs found — page structure may have changed');
      return;
    }

    const db = getDb();
    let updated = 0;

    for (const [hebrewName, dateStr] of pairs) {
      const iata = HEBREW_TO_IATA[hebrewName];
      const newDate = parseInfogramDate(dateStr);
      if (!newDate) continue;

      const airline = db.prepare(
        'SELECT * FROM airlines WHERE iata_code = ? AND sync_locked = 0'
      ).get(iata);
      if (!airline) continue;

      if (airline.cancellation_end_date && newDate < airline.cancellation_end_date) continue;

      if (airline.cancellation_end_date !== newDate) {
        db.prepare(
          'UPDATE airlines SET cancellation_end_date = ?, date_adjusted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(newDate, airline.id);
        console.log(`[MakoSync] ${airline.name}: ${airline.cancellation_end_date} → ${newDate}`);
        updated++;
      }
    }

    console.log(`[MakoSync] Done — ${updated} date(s) updated`);
    db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', datetime('now') || 'Z')").run();
  } catch (err) {
    console.error(`[MakoSync] Error: ${err && err.message ? err.message : String(err)}`);
  }
}

function runDateBasedStatusSync() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const db = getDb();

    const due = db.prepare(`
      SELECT * FROM airlines
      WHERE status = 'not_flying'
        AND sync_locked = 0
        AND cancellation_end_date IS NOT NULL
        AND cancellation_end_date < ?
    `).all(today);

    for (const airline of due) {
      db.prepare(
        'UPDATE airlines SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run('flying', airline.id);

      db.prepare(`
        INSERT INTO changelog (airline_id, airline_name, action, field_changed, old_value, new_value)
        VALUES (?, ?, 'updated', 'status', 'not_flying', 'flying')
      `).run(airline.id, airline.name);

      console.log(`[DateSync] ${airline.name}: not_flying → flying (date ${airline.cancellation_end_date} reached)`);
    }
  } catch (err) {
    console.error(`[DateSync] Error: ${err && err.message ? err.message : String(err)}`);
  }
}

// ── Eshet.com scraper ─────────────────────────────────────────────────────

const ESHET_URL = 'https://www.eshet.com/guide/war-flight-changes-and-cancellations/';
const ESHET_INTERVAL_MS = 15 * 60 * 1000;

const ESHET_AIRLINE_MAP = [
  ['אגיאן', 'A3'],
  ['aegean', 'A3'],
  ['אזרביג', 'J2'],
  ['azerbaijan', 'J2'],
  ['איבריה אקספרס', 'I2'],
  ['iberia express', 'I2'],
  ['אייר אירופה', 'UX'],
  ['air europe', 'UX'],
  ['אייר בלטיק', 'BT'],
  ['air baltic', 'BT'],
  ['אייר סיישל', 'HM'],
  ['air seychelles', 'HM'],
  ['אייר פראנס', 'AF'],
  ['air france', 'AF'],
  ['אייר קנדה', 'AC'],
  ['air canada', 'AC'],
  ['אתיחאד', 'EY'],
  ['איתיחאד', 'EY'],
  ['etihad', 'EY'],
  ['אמריקן', 'AA'],
  ['american', 'AA'],
  ['אתיופיאן', 'ET'],
  ['ethiopian', 'ET'],
  ['בולגריה', 'FB'],
  ['bulgaria', 'FB'],
  ['בריטיש', 'BA'],
  ['british', 'BA'],
  ["ג'ורג'יאן", 'A9'],
  ["ג'אורג'יאן", 'A9'],
  ['georgian', 'A9'],
  ['דלתא', 'DL'],
  ['delta', 'DL'],
  ['וויז אייר', 'W6'],
  ['wizz', 'W6'],
  ['טאפ', 'TP'],
  ['tap ', 'TP'],
  ['יונייטד', 'UA'],
  ['united', 'UA'],
  ['טארום', 'RO'],
  ['tarom', 'RO'],
  ['טוס', 'U8'],
  ['tus', 'U8'],
  ['lot', 'LO'],
  ['לוט', 'LO'],
  ['סייפרוס', 'CY'],
  ['cyprus', 'CY'],
  ['סקיי אקספרס', 'GQ'],
  ['sky express', 'GQ'],
  ['פליי דובאי', 'FZ'],
  ['flydubai', 'FZ'],
  ['fly dubai', 'FZ'],
  ['פלייוואן', '5F'],
  ['פליי וואן', '5F'],
  ['flyone', '5F'],
  ['לופטהנזה', 'LH'],
  ['לופטהנזה', 'LX'],
  ['לופטהנזה', 'OS'],
  ['לופטהנזה', 'SN'],
  ['לופטהנזה', 'EW'],
  ['lufthansa', 'LH'],
  ['lufthansa', 'LX'],
  ['lufthansa', 'OS'],
  ['lufthansa', 'SN'],
  ['lufthansa', 'EW'],
  ['ita', 'AZ'],
  ['klm', 'KL'],
];

function parseEshetDate(str) {
  if (!str) return null;
  let m = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  m = str.match(/(\d{1,2})\.(\d{1,2})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const now = new Date();
  const year = month >= now.getMonth() + 1 ? now.getFullYear() : now.getFullYear() + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function extractEshetParagraphs(html) {
  const results = [];
  const re = /<p[^>]*direction\s*:\s*rtl[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/&[a-z]+;/g, '')
      .replace(/\u05F3/g, "'")
      .trim();
    if (text) results.push(text);
  }
  return results;
}

async function runEshetSync() {
  try {
    console.log('[EshetSync] Fetching page...');
    const res = await fetch(ESHET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const paragraphs = extractEshetParagraphs(html);
    if (paragraphs.length === 0) {
      console.warn('[EshetSync] No RTL paragraphs found — page structure may have changed');
      return;
    }

    const db = getDb();
    let updated = 0;

    for (const text of paragraphs) {
      if (/מפעיל|החל מ|חוזר לטוס|חידש|חזרה לפעילות/i.test(text)) continue;

      const date = parseEshetDate(text);
      if (!date) continue;

      const textLower = text.toLowerCase();
      for (const [pattern, iata] of ESHET_AIRLINE_MAP) {
        if (!textLower.includes(pattern.toLowerCase())) continue;

        const airline = db.prepare(
          'SELECT * FROM airlines WHERE iata_code = ? AND sync_locked = 0'
        ).get(iata);
        if (!airline) continue;

        if (airline.cancellation_end_date && date < airline.cancellation_end_date) continue;

        if (airline.cancellation_end_date !== date) {
          db.prepare(
            'UPDATE airlines SET cancellation_end_date = ?, date_adjusted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          ).run(date, airline.id);
          console.log(`[EshetSync] ${airline.name} (${iata}): cancellation_end_date → ${date}`);
          updated++;
        }
      }
    }

    console.log(`[EshetSync] Done — ${updated} update(s)`);
    db.prepare("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', datetime('now') || 'Z')").run();
  } catch (err) {
    console.error(`[EshetSync] Error: ${err && err.message ? err.message : String(err)}`);
  }
}

function startAutoSync() {
  console.log('[AutoSync] Scheduler started');
  runDateBasedStatusSync();
  setInterval(runDateBasedStatusSync, 60 * 60 * 1000); // hourly

  runMakoSync();
  setInterval(runMakoSync, MAKO_INTERVAL_MS);

  runTelegramSync();
  setInterval(runTelegramSync, TELEGRAM_INTERVAL_MS);

  runEshetSync();
  setInterval(runEshetSync, ESHET_INTERVAL_MS);

  runNewsChannelSync();
  setInterval(runNewsChannelSync, NEWS_SYNC_INTERVAL_MS);
}

module.exports = { startAutoSync, runMakoSync, runTelegramSync, runEshetSync, runNewsChannelSync };
