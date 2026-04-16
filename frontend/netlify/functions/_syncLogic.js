// Shared sync logic — used by both manual /sync endpoint and the scheduled function
const { getStore } = require('@netlify/blobs');

function getAviationStore() {
  return getStore({ name: 'aviation', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseDotDate(str) {
  if (!str) return null;
  let m = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (m) {
    const day = parseInt(m[1], 10), month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  m = str.match(/(\d{1,2})\.(\d{1,2})/);
  if (!m) return null;
  const day = parseInt(m[1], 10), month = parseInt(m[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Use Israel timezone for current date to avoid UTC midnight edge cases
  const israelToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const todayYear = parseInt(israelToday.slice(0, 4));
  const todayMonth = parseInt(israelToday.slice(5, 7));
  // Roll over to next year only if we're in the second half (Jul+) and date is in Jan-Mar,
  // indicating a date that wraps around year end. All other past dates stay in current year
  // so they are correctly treated as expired rather than being pushed 1 year into the future.
  const year = (todayMonth >= 7 && month <= 3) ? todayYear + 1 : todayYear;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function applyDate(airlines, iata, newDate, source) {
  const idx = airlines.findIndex(a => a.iata_code === iata && !a.sync_locked);
  if (idx === -1) return 0;
  const airline = airlines[idx];
  if (airline.cancellation_end_date && newDate < airline.cancellation_end_date) return 0;
  if (airline.cancellation_end_date === newDate) return 0;
  console.log(`[${source}] ${airline.name} (${iata}): ${airline.cancellation_end_date} → ${newDate}`);
  airlines[idx] = { ...airline, cancellation_end_date: newDate, updated_at: new Date().toISOString() };
  return 1;
}

// ── Telegram scraper ───────────────────────────────────────────────────────

const TELEGRAM_AIRLINE_MAP = [
  ['טוס איירווייז','U8'],['טוס','U8'],['אתיחאד','EY'],['אתיופיאן','ET'],
  ['חיינאן','HU'],['בולגרית','FB'],['בולגריה אייר','FB'],['סמארטווינגס','QS'],
  ['סקיי אקספרס','GQ'],['אייר פראנס','AF'],['לופטהנזה','LH'],['סוויס','LX'],
  ['אוסטריאן','OS'],['בריסל','SN'],['יורווינגס','EW'],['בריטיש','BA'],
  ['אמריקן','AA'],['יונייטד','UA'],['דלתא','DL'],['אייר קנדה','AC'],
  ['אייר אינדיה','AI'],['פליי דובאי','FZ'],['וויז אייר','W6'],["אג'יאן",'A3'],
  ['אייר פורטוגל','TP'],['אייר אירופה','UX'],['אייר בלטיק','BT'],
  ['סייפרוס','CY'],['בלו בירד','BZ'],['אנימה','IO'],["ג'ורג'יאן",'A9'],
  ['tus airways','U8'],['etihad','EY'],['ethiopian','ET'],['hainan','HU'],
  ['georgian airways','A9'],['flyone','5F'],['smartwings','QS'],['sky express','GQ'],
  ['bulgaria air','FB'],['air france','AF'],['lufthansa','LH'],['austrian','OS'],
  ['brussels','SN'],['eurowings','EW'],['british airways','BA'],['american airlines','AA'],
  ['united airlines','UA'],['delta','DL'],['air canada','AC'],['air india','AI'],
  ['flydubai','FZ'],['fly dubai','FZ'],['wizz','W6'],['aegean','A3'],
  ['ita airways','AZ'],['tap ','TP'],['air europe','UX'],['air baltic','BT'],
  ['cyprus airways','CY'],['blue bird','BZ'],['anima wings','IO'],
];

async function runTelegramSync(airlines) {
  try {
    const res = await fetch('https://t.me/s/iaarashut');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const re = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    const latestByIata = new Map();
    let m;
    while ((m = re.exec(html)) !== null) {
      const text = m[1].replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#\d+;/g,'').trim();
      const lines = text.split('\n');
      for (const line of lines) {
        const date = parseDotDate(line);
        if (!date) continue;
        const lineLower = line.toLowerCase();
        for (const [pattern, iata] of TELEGRAM_AIRLINE_MAP) {
          if (lineLower.includes(pattern.toLowerCase())) {
            if (!latestByIata.has(iata) || date > latestByIata.get(iata)) latestByIata.set(iata, date);
          }
        }
      }
    }

    let updated = 0;
    for (const [iata, date] of latestByIata) updated += applyDate(airlines, iata, date, 'TelegramSync');
    console.log(`[TelegramSync] Done — ${updated} update(s)`);
    return updated;
  } catch (err) {
    console.error(`[TelegramSync] Error: ${err.message}`);
    return 0;
  }
}

// ── Mako/Infogram scraper ──────────────────────────────────────────────────

const HEBREW_TO_IATA = {
  'אייר פראנס':'AF','אתיחאד':'EY','בלו בירד':'BZ','טוס איירווייז':'U8',
  'יונייטד איירליינס':'UA','אייר בלטיק':'BT','בולגריה אייר':'FB',
  'סייפרוס איירווייז':'CY','אייר סיישל':'HM','דלתא':'DL','וויז אייר':'W6',
  'לופטהנזה':'LH','סוויס':'LX','אוסטריאן':'OS','בריסל איירליינס':'SN',
  'יורווינגס':'EW','ITA':'AZ','אייר אירופה':'UX','LOT':'LO',"אג'יאן":'A3',
  'אמריקן איירליינס':'AA','פליי דובאי':'FZ','אייר אינדיה':'AI','אייר קנדה':'AC',
  'בריטיש איירווייז':'BA','איביריה אקספרס':'I2','KLM':'KL',
  'אתיופיאן איירליינס':'ET','סקיי אקספרס':'GQ','אייר פורטוגל':'TP','אנימה ווינגז':'IO',
};

async function runMakoSync(airlines) {
  try {
    const res = await fetch('https://e.infogram.com/e0e8f39e-cc26-408a-bc98-8f73c2b9bb5d');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const datePattern = /\d{1,2}\.\d{1,2}|אין צפי|סוף מאי/;
    const re = /"([\u05D0-\u05FA\w\s']+)"\s*,\s*"([^"]{1,20})"/g;
    let updated = 0, m;
    while ((m = re.exec(html)) !== null) {
      const name = m[1].trim(), val = m[2].trim();
      const iata = HEBREW_TO_IATA[name];
      if (!iata || !datePattern.test(val)) continue;
      let date = null;
      if (val === 'סוף מאי') date = '2026-05-31';
      else if (val !== 'אין צפי') date = parseDotDate(val);
      if (date) updated += applyDate(airlines, iata, date, 'MakoSync');
    }
    console.log(`[MakoSync] Done — ${updated} update(s)`);
    return updated;
  } catch (err) {
    console.error(`[MakoSync] Error: ${err.message}`);
    return 0;
  }
}

// ── Eshet scraper ──────────────────────────────────────────────────────────

const ESHET_AIRLINE_MAP = [
  ['אגיאן','A3'],['aegean','A3'],['אזרביג','J2'],['azerbaijan','J2'],
  ['איבריה אקספרס','I2'],['iberia express','I2'],['אייר אירופה','UX'],['air europe','UX'],
  ['אייר בלטיק','BT'],['air baltic','BT'],['אייר סיישל','HM'],['air seychelles','HM'],
  ['אייר פראנס','AF'],['air france','AF'],['אייר קנדה','AC'],['air canada','AC'],
  ['אתיחאד','EY'],['איתיחאד','EY'],['etihad','EY'],['אמריקן','AA'],['american','AA'],
  ['אתיופיאן','ET'],['ethiopian','ET'],['בולגריה','FB'],['bulgaria','FB'],
  ['בריטיש','BA'],['british','BA'],["ג'ורג'יאן",'A9'],["ג'אורג'יאן",'A9'],['georgian','A9'],
  ['דלתא','DL'],['delta','DL'],['וויז אייר','W6'],['wizz','W6'],
  ['טאפ','TP'],['tap ','TP'],['יונייטד','UA'],['united','UA'],
  ['טארום','RO'],['tarom','RO'],['טוס','U8'],['tus','U8'],
  ['lot','LO'],['לוט','LO'],['סייפרוס','CY'],['cyprus','CY'],
  ['סקיי אקספרס','GQ'],['sky express','GQ'],['פליי דובאי','FZ'],['flydubai','FZ'],['fly dubai','FZ'],
  ['פלייוואן','5F'],['פליי וואן','5F'],['flyone','5F'],
  ['לופטהנזה','LH'],['לופטהנזה','LX'],['לופטהנזה','OS'],['לופטהנזה','SN'],['לופטהנזה','EW'],
  ['lufthansa','LH'],['lufthansa','LX'],['lufthansa','OS'],['lufthansa','SN'],['lufthansa','EW'],
  ['ita','AZ'],['klm','KL'],
];

async function runEshetSync(airlines) {
  try {
    const res = await fetch('https://www.eshet.com/guide/war-flight-changes-and-cancellations/');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const re = /<p[^>]*direction\s*:\s*rtl[^>]*>([\s\S]*?)<\/p>/gi;
    let updated = 0, m;
    while ((m = re.exec(html)) !== null) {
      const text = m[1].replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#\d+;/g,'').replace(/&[a-z]+;/g,'').replace(/\u05F3/g,"'").trim();
      if (/מפעיל|החל מ|חוזר לטוס|חידש|חזרה לפעילות/i.test(text)) continue;
      const date = parseDotDate(text);
      if (!date) continue;
      const textLower = text.toLowerCase();
      for (const [pattern, iata] of ESHET_AIRLINE_MAP) {
        if (textLower.includes(pattern.toLowerCase())) updated += applyDate(airlines, iata, date, 'EshetSync');
      }
    }
    console.log(`[EshetSync] Done — ${updated} update(s)`);
    return updated;
  } catch (err) {
    console.error(`[EshetSync] Error: ${err.message}`);
    return 0;
  }
}

// ── Date-based status sync ─────────────────────────────────────────────────

function runDateBasedStatusSync(airlines) {
  // Use Israel timezone so the flip happens at midnight Israel time, not UTC midnight
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  let updated = 0;
  for (let i = 0; i < airlines.length; i++) {
    const a = airlines[i];
    if (a.status === 'not_flying' && !a.sync_locked && a.cancellation_end_date && a.cancellation_end_date <= today) {
      console.log(`[DateSync] ${a.name}: not_flying → flying (date ${a.cancellation_end_date} reached)`);
      airlines[i] = { ...a, status: 'flying', updated_at: new Date().toISOString() };
      updated++;
    }
  }
  return updated;
}

// ── Main entry point ───────────────────────────────────────────────────────

async function runFullSync() {
  const store = getAviationStore();

  let airlines = await store.get('airlines', { type: 'json' });
  if (!airlines || !Array.isArray(airlines)) airlines = [];

  // Run all scrapers (they mutate the airlines array in place via applyDate)
  await runTelegramSync(airlines);
  await runMakoSync(airlines);
  await runEshetSync(airlines);
  runDateBasedStatusSync(airlines);

  const now = new Date().toISOString();
  await store.set('airlines', JSON.stringify(airlines));
  await store.set('last-sync', now);

  console.log(`[Sync] Complete at ${now}`);
  return { ok: true, last_sync: now };
}

module.exports = { runFullSync };
