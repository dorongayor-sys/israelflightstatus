const { getDb } = require('./database/db');

const MAKO_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes
const TELEGRAM_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes
const NEWS_SYNC_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

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
  try {
    console.log('[NewsSync] Fetching channel page...');
    const res = await fetch(`https://t.me/s/${NEWS_CHANNEL}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Split into per-message blocks using <div class="tgme_widget_message ..."> as delimiter
    const blockRe = /<div class="tgme_widget_message [^"]*"[^>]*data-post="[^/]+\/(\d+)"[\s\S]*?(?=<div class="tgme_widget_message [^"]*"[^>]*data-post="|$)/g;
    const textRe = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const photoRe = /tgme_widget_message_photo_wrap[^>]+style="[^"]*url\('([^']+)'\)/;
    const dateRe = /datetime="([^"]+)"/;

    function cleanHtml(raw) {
      return raw
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&#39;/g, "'")
        .replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, '')
        .replace(/https?:\/\/t\.me\/\S+/g, '')
        .replace(/\s+$/, '')
        .trim();
    }

    const db = getDb();
    let saved = 0;
    let m;

    while ((m = blockRe.exec(html)) !== null) {
      const messageId = parseInt(m[1], 10);
      const block = m[0];

      const dateMatch = dateRe.exec(block);
      const isoDate = dateMatch ? dateMatch[1].split('T')[0] : new Date().toISOString().split('T')[0];

      const textMatch = textRe.exec(block);
      const rawText = textMatch ? cleanHtml(textMatch[1]) : '';
      if (!rawText) continue;

      const photoMatch = photoRe.exec(block);
      const photoUrl = photoMatch ? photoMatch[1] : null;

      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let photoCredit = null;
      const creditLine = lines[lines.length - 1];
      if (/^(צילום|קרדיט|photo credit|📷)/i.test(creditLine)) {
        photoCredit = creditLine.replace(/^(צילום|קרדיט|photo credit|📷)[:\s]*/i, '').trim();
        lines.pop();
      }

      const title = cleanTitle(lines[0] || rawText.substring(0, 120));
      const excerpt = lines.slice(1).join(' ').substring(0, 300) || title;
      const category = detectCategory(rawText);
      const isBreaking = /🚨|מבזק/.test(rawText) ? 1 : 0;

      const existing = db.prepare('SELECT id FROM news_posts WHERE message_id = ?').get(messageId);
      if (existing) continue;

      db.prepare(`
        INSERT OR IGNORE INTO news_posts
          (message_id, category, title, excerpt, full_text, photo_file_id, photo_credit, post_date, is_breaking, telegram_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId, category, title, excerpt, rawText,
        photoUrl, photoCredit, isoDate, isBreaking,
        `https://t.me/${NEWS_CHANNEL}/${messageId}`
      );
      saved++;
    }

    console.log(`[NewsSync] Done — ${saved} new post(s) saved`);
  } catch (err) {
    console.error(`[NewsSync] Error: ${err.message}`);
  }
}

// ── Telegram channel scraper (Israel Airports Authority) ───────────────────

const TELEGRAM_CHANNEL_URL = 'https://t.me/s/iaarashut';

// Airline name substrings (Hebrew + English, lowercase) → IATA code.
// Checked against the message text case-insensitively.
const TELEGRAM_AIRLINE_MAP = [
  // Hebrew names / partial names
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
  ['ג\'ורג\'יאן', 'A9'],
  // English names (matched case-insensitively)
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

// Parse date format DD.M.YY or DD.M.YYYY (as used in Telegram posts)
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

// Extract plain-text message blocks from Telegram web page HTML
function extractTelegramMessages(html) {
  const messages = [];
  // Telegram wraps each message text in <div class="tgme_widget_message_text ...">
  const re = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    // Convert <br> to newlines, strip remaining tags
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

// Find (iata, date) pairs within a single message text.
// Strategy: split into lines; each line with a DD.M.YY date may name airline(s).
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

    // Also try bare IATA/ICAO codes in parentheses like "(VBB)", "(QS)", etc.
    const codeMatches = line.matchAll(/\(([A-Z0-9]{2,4})\)/g);
    for (const cm of codeMatches) {
      const code = cm[1];
      // Only add if not already covered by the name map above
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

    // Collect the LATEST date per airline across all messages (old messages must not win)
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

      // Never move the date backwards
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
    console.error(`[TelegramSync] Error: ${err.message}`);
  }
}

// ── Mako/Infogram date scraper ─────────────────────────────────────────────

const INFOGRAM_URL = 'https://e.infogram.com/e0e8f39e-cc26-408a-bc98-8f73c2b9bb5d';

// Hebrew name (as it appears in the Infogram) → IATA code
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
  // Regex extracts pairs like ["Hebrew name","DD.M"] directly from the raw JSON
  const datePattern = /\d{1,2}\.\d{1,2}|אין צפי|סוף מאי/;
  const re = /"([\u05D0-\u05FA\w\s']+)"\s*,\s*"([^"]{1,20})"/g;
  const results = new Map();
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    const val  = m[2].trim();
    if (HEBREW_TO_IATA[name] && datePattern.test(val)) {
      results.set(name, val); // Map deduplicates repeated occurrences
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
      if (!newDate) continue; // "no forecast" etc. — skip

      const airline = db.prepare(
        'SELECT * FROM airlines WHERE iata_code = ? AND sync_locked = 0'
      ).get(iata);
      if (!airline) continue;

      // Never move the date backwards
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
    console.error(`[MakoSync] Error: ${err.message}`);
  }
}

function runDateBasedStatusSync() {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
    console.error(`[DateSync] Error: ${err.message}`);
  }
}

// ── Eshet.com scraper ─────────────────────────────────────────────────────

const ESHET_URL = 'https://www.eshet.com/guide/war-flight-changes-and-cancellations/';
const ESHET_INTERVAL_MS = 15 * 60 * 1000;

// Each entry: [pattern (Hebrew or English, matched case-insensitively), IATA code]
// Lufthansa Group has 5 entries so all subsidiaries get updated together.
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
  // Lufthansa Group → update all 5 subsidiaries
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
  // DD.M.YY or DD.M.YYYY
  let m = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  // DD.M (no year)
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
      .replace(/\u05F3/g, "'") // normalize Hebrew geresh → apostrophe
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
      // Skip entries that indicate the airline is already flying
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

        // Never move the date backwards
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
    console.error(`[EshetSync] Error: ${err.message}`);
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
