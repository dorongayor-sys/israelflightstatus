const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'aviation.db');

let _db = null;

// Converts {name: 'foo'} → {'@name': 'foo'} for sql.js named param binding
function toNamedParams(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('@') || k.startsWith(':') || k.startsWith('$')) {
      out[k] = v;
    } else {
      out['@' + k] = v;
    }
  }
  return out;
}

// Normalise args passed to .get()/.all()/.run() to a format sql.js accepts
function normaliseArgs(args) {
  if (args.length === 0) return [];
  if (args.length === 1) {
    const a = args[0];
    if (Array.isArray(a)) return a;
    if (a !== null && typeof a === 'object') return toNamedParams(a);
    return [a];
  }
  return args; // multiple positional values
}

class Statement {
  constructor(database, sql) {
    this._database = database;
    this._sql = sql;
  }

  get(...args) {
    const params = normaliseArgs(args);
    const stmt = this._database._sqlDb.prepare(this._sql);
    try {
      stmt.bind(params);
      return stmt.step() ? stmt.getAsObject() : undefined;
    } finally {
      stmt.free();
    }
  }

  all(...args) {
    const params = normaliseArgs(args);
    const stmt = this._database._sqlDb.prepare(this._sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  run(...args) {
    const params = normaliseArgs(args);
    this._database._sqlDb.run(this._sql, params);
    if (!this._database._inTransaction) {
      this._database._save();
    }
    const res = this._database._sqlDb.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid = res[0]?.values[0]?.[0] ?? 0;
    return { lastInsertRowid };
  }
}

class Database {
  constructor(sqlDb) {
    this._sqlDb = sqlDb;
    this._inTransaction = false;
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  exec(sql) {
    this._sqlDb.exec(sql);
    this._save();
    return this;
  }

  // No-op: WAL mode isn't meaningful for WASM in-memory + file sync approach
  pragma() {}

  transaction(fn) {
    return (...args) => {
      this._inTransaction = true;
      this._sqlDb.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this._sqlDb.run('COMMIT');
        this._inTransaction = false;
        this._save();
        return result;
      } catch (e) {
        this._sqlDb.run('ROLLBACK');
        this._inTransaction = false;
        throw e;
      }
    };
  }

  _save() {
    const data = this._sqlDb.export();
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
}

async function initDb() {
  if (_db) return _db;

  fs.mkdirSync(dataDir, { recursive: true });

  const SQL = await initSqlJs();
  let sqlDb;

  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buf);
  } else {
    sqlDb = new SQL.Database();
  }

  _db = new Database(sqlDb);

  // Create schema
  sqlDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS airlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      iata_code TEXT,
      status TEXT NOT NULL DEFAULT 'flying',
      destinations TEXT DEFAULT '[]',
      cancellation_reason TEXT,
      cancellation_end_date TEXT,
      notes TEXT,
      website TEXT,
      sync_locked INTEGER NOT NULL DEFAULT 0,
      terminal TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      airline_id INTEGER,
      airline_name TEXT NOT NULL,
      action TEXT NOT NULL,
      field_changed TEXT,
      old_value TEXT,
      new_value TEXT,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrate: add sync_locked if missing
  try { sqlDb.exec('ALTER TABLE airlines ADD COLUMN sync_locked INTEGER NOT NULL DEFAULT 0'); } catch {}
  // Migrate: add terminal if missing
  try { sqlDb.exec('ALTER TABLE airlines ADD COLUMN terminal TEXT'); } catch {}
  // Migrate: add is_israeli if missing
  try { sqlDb.exec('ALTER TABLE airlines ADD COLUMN is_israeli INTEGER NOT NULL DEFAULT 0'); } catch {}
  // Ensure the 4 Israeli carriers are flagged (idempotent)
  sqlDb.exec("UPDATE airlines SET is_israeli = 1 WHERE name IN ('El Al', 'Israir', 'Arkia', 'Air Haifa')");
  // Migrate: add date_adjusted flag if missing
  try { sqlDb.exec('ALTER TABLE airlines ADD COLUMN date_adjusted INTEGER NOT NULL DEFAULT 0'); } catch {}
  // Migrate: add end_date_unconfirmed flag if missing
  try { sqlDb.exec('ALTER TABLE airlines ADD COLUMN end_date_unconfirmed INTEGER NOT NULL DEFAULT 0'); } catch {}
  // Shift cancellation_end_date back 1 day for any non-sync-locked airline not yet adjusted
  sqlDb.exec(`
    UPDATE airlines
    SET cancellation_end_date = date(cancellation_end_date, '-1 day'),
        date_adjusted = 1
    WHERE sync_locked = 0
      AND date_adjusted = 0
      AND cancellation_end_date IS NOT NULL
  `);

  // One-time: apply Israel Airports Authority press release dates (12 Apr 2026)
  // Covers airlines not in the Mako/Infogram scraper
  const prMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_pr_apr12_2026'").get();
  if (!prMigDone) {
    const prDates = [
      ['ET', '2026-04-15'], // Ethiopian Airlines — Wed 15.4 (press release beats Infogram 16.4)
      ['HU', '2026-04-16'], // Hainan Airlines — Thu 16.4
      ['WZ', '2026-04-17'], // Red Wings — Fri 17.4
      ['A9', '2026-04-17'], // Georgian Airways — Fri 17.4
      ['S5', '2026-04-17'], // FlyOne — Fri 17.4
    ];
    for (const [iata, date] of prDates) {
      _db.prepare(`
        UPDATE airlines SET cancellation_end_date = ?, date_adjusted = 1, updated_at = CURRENT_TIMESTAMP
        WHERE iata_code = ? AND sync_locked = 0
      `).run(date, iata);
    }
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_pr_apr12_2026', '1')");
  }

  // One-time: restore Bulgaria Air to not_flying, set 14/05/2026, unlock so auto-sync can update going forward
  const bulgariaMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_bulgaria_air_may14_2026_v4'").get();
  if (!bulgariaMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        status = 'not_flying',
        cancellation_end_date = '2026-05-14',
        notes = 'Bulgarian national carrier. Suspended until at least 14/05/2026. Route: TLV-Sofia.',
        date_adjusted = 1,
        sync_locked = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'FB'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_bulgaria_air_may14_2026', '1')");
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_bulgaria_air_may14_2026_v2', '1')");
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_bulgaria_air_may14_2026_v3', '1')");
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_bulgaria_air_may14_2026_v4', '1')");
  }

  // One-time: correct Air France suspension to 03/05/2026, unlock so auto-sync can update going forward
  const afMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_air_france_may03_2026_v2'").get();
  if (!afMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        cancellation_end_date = '2026-05-03',
        notes = 'Suspended until at least 03/05/2026. Route: TLV-Paris (CDG).',
        date_adjusted = 1,
        sync_locked = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'AF'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_air_france_may03_2026', '1')");
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_air_france_may03_2026_v2', '1')");
  }

  // One-time: restore TUS Airways to not_flying with correct date 14/04/2026 (per IAA Telegram)
  const tusMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_tus_apr14_2026'").get();
  if (!tusMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        status = 'not_flying',
        cancellation_end_date = '2026-04-14',
        date_adjusted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'U8'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_tus_apr18_2026', '1')");
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_tus_apr14_2026', '1')");
  }

  // One-time: update Uzbekistan Airways suspension to 20/04/2026 (was 14/04/2026)
  const hyMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_hy_apr20_2026'").get();
  if (!hyMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        cancellation_end_date = '2026-04-20',
        notes = 'Uzbek flag carrier. Suspended until at least 20/04/2026. Route: TLV-Tashkent.',
        date_adjusted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'HY'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_hy_apr20_2026', '1')");
  }

  // One-time: fix incorrectly listed airlines (status/notes corrections)
  const correctionsMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_corrections_apr13_2026'").get();
  if (!correctionsMigDone) {
    // Belavia — suspended since 2022 sanctions, not flying
    _db.prepare(`UPDATE airlines SET status = 'not_flying', cancellation_reason = 'Sanctions / airspace closure', cancellation_end_date = NULL, notes = 'Belarusian national carrier. Suspended since 2022 due to international sanctions and airspace closure. Route: TLV-Minsk.', date_adjusted = 1, updated_at = CURRENT_TIMESTAMP WHERE iata_code = 'B2'`).run();
    // Croatia Airlines — suspended due to security situation
    _db.prepare(`UPDATE airlines SET status = 'not_flying', cancellation_reason = 'Security concerns', cancellation_end_date = NULL, notes = 'Croatian national carrier. Suspended due to security situation. Route: TLV-Zagreb.', date_adjusted = 1, updated_at = CURRENT_TIMESTAMP WHERE iata_code = 'OU'`).run();
    // Enter Air — charter, not operating regular TLV service
    _db.prepare(`UPDATE airlines SET status = 'not_flying', cancellation_reason = 'Security concerns', cancellation_end_date = NULL, notes = 'Polish charter airline. Not operating regular TLV service due to the war. Route: TLV-Warsaw.', date_adjusted = 1, updated_at = CURRENT_TIMESTAMP WHERE iata_code = 'ENT'`).run();
    // Air Samarkand — suspended until at least spring 2026
    _db.prepare(`UPDATE airlines SET status = 'not_flying', cancellation_reason = 'Security concerns', cancellation_end_date = NULL, notes = 'Suspended TLV service until at least spring 2026. Route: TLV-Samarkand.', date_adjusted = 1, updated_at = CURRENT_TIMESTAMP WHERE name LIKE 'Air Samarkand%'`).run();
    // Centrum Air — no confirmed return date
    _db.prepare(`UPDATE airlines SET cancellation_end_date = NULL, notes = 'Suspended with no confirmed return date. Routes: TLV-Tashkent and Samarkand.', date_adjusted = 1, updated_at = CURRENT_TIMESTAMP WHERE name = 'Centrum Air'`).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_corrections_apr13_2026', '1')");
  }

  // One-time: update Air India suspension to 31/05/2026
  const aiMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_ai_may31_2026'").get();
  if (!aiMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        cancellation_end_date = '2026-05-31',
        notes = 'Suspended until at least 31/05/2026. Route: TLV-Delhi.',
        date_adjusted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'AI'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_ai_may31_2026', '1')");
  }

  // One-time: update Delta Air Lines suspension to 05/09/2026
  const dlMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_dl_sep05_2026'").get();
  if (!dlMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        cancellation_end_date = '2026-09-05',
        notes = 'Suspended until at least 05/09/2026. Routes: New York (JFK), Atlanta, and Boston.',
        date_adjusted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'DL'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_dl_may05_2026', '1')");
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_dl_sep05_2026', '1')");
  }

  // One-time: update Aegean Airlines suspension to 26/06/2026
  const a3MigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_a3_jun26_2026'").get();
  if (!a3MigDone) {
    _db.prepare(`
      UPDATE airlines SET
        cancellation_end_date = '2026-06-26',
        notes = 'Greek national carrier. Suspended until at least 26/06/2026. Routes: Larnaca, Athens, Crete, Thessaloniki, Rhodes and other Mediterranean destinations.',
        date_adjusted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'A3'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_a3_jun26_2026', '1')");
  }

  // One-time: update United Airlines suspension to 07/09/2026
  const uaMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_ua_sep07_2026'").get();
  if (!uaMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        cancellation_end_date = '2026-09-07',
        notes = 'Suspended until at least 07/09/2026. Routes: TLV-Newark.',
        date_adjusted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'UA'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_ua_sep07_2026', '1')");
  }

  // One-time: update KLM suspension to 17/05/2026
  const klMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_kl_may17_2026'").get();
  if (!klMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        cancellation_end_date = '2026-05-17',
        notes = 'Operating flights from Ben Gurion to Amsterdam. Suspended until at least 17/05/2026 — check directly with airline for specific bookings.',
        date_adjusted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'KL'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_kl_may17_2026', '1')");
  }

  // One-time: restore TAROM suspension to 19/04/2026 (scraper corrupted to 17/04)
  const roMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_ro_apr19_2026'").get();
  if (!roMigDone) {
    _db.prepare(`
      UPDATE airlines SET
        cancellation_end_date = '2026-04-19',
        notes = 'Romanian national carrier. Suspended until at least 19/04/2026. Route: TLV-Bucharest.',
        date_adjusted = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = 'RO'
    `).run();
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_ro_apr19_2026', '1')");
  }

  // One-time: mark TAROM, Azal, and Cyprus Airways end dates as unconfirmed
  const unconfirmedMigDone = _db.prepare("SELECT value FROM sync_meta WHERE key = 'migration_unconfirmed_end_dates_apr13_2026'").get();
  if (!unconfirmedMigDone) {
    sqlDb.exec("UPDATE airlines SET end_date_unconfirmed = 1 WHERE iata_code IN ('RO', 'J2', 'CY')");
    sqlDb.exec("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('migration_unconfirmed_end_dates_apr13_2026', '1')");
  }

  _db._save();
  return _db;
}

function getDb() {
  if (!_db) throw new Error('Database not initialised — call initDb() first');
  return _db;
}

module.exports = { initDb, getDb };
