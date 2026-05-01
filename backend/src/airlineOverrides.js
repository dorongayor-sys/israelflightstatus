const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const RENDER_API = 'https://api.render.com/v1';

let _cache = null;

async function loadAirlineOverrides() {
  if (_cache) return _cache;
  try {
    const r = await fetch(`${RENDER_API}/services/${RENDER_SERVICE_ID}/env-vars`, {
      headers: { Authorization: `Bearer ${RENDER_API_KEY}` }
    });
    const vars = await r.json();
    const found = vars.find(v => v.envVar.key === 'AIRLINE_OVERRIDES');
    _cache = found
      ? JSON.parse(found.envVar.value)
      : { updates: {}, added: [], deleted: [] };
  } catch {
    _cache = { updates: {}, added: [], deleted: [] };
  }
  return _cache;
}

async function saveAirlineOverrides(overrides) {
  _cache = overrides;
  try {
    const r = await fetch(`${RENDER_API}/services/${RENDER_SERVICE_ID}/env-vars`, {
      headers: { Authorization: `Bearer ${RENDER_API_KEY}` }
    });
    const vars = await r.json();
    const all = vars.map(v => ({ key: v.envVar.key, value: v.envVar.value }));
    const idx = all.findIndex(v => v.key === 'AIRLINE_OVERRIDES');
    const val = JSON.stringify(overrides);
    if (idx >= 0) all[idx].value = val; else all.push({ key: 'AIRLINE_OVERRIDES', value: val });
    await fetch(`${RENDER_API}/services/${RENDER_SERVICE_ID}/env-vars`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(all)
    });
  } catch (e) {
    console.error('[AirlineOverrides] Render save failed:', e.message);
  }
}

async function applyAirlineOverrides(db) {
  const o = await loadAirlineOverrides();

  for (const [iata, data] of Object.entries(o.updates || {})) {
    const existing = db.prepare('SELECT id FROM airlines WHERE iata_code = ?').get(iata);
    if (!existing) continue;
    db.prepare(`
      UPDATE airlines SET
        name = ?, status = ?, destinations = ?, cancellation_reason = ?,
        cancellation_end_date = ?, notes = ?, website = ?, sync_locked = 1,
        terminal = ?, updated_at = CURRENT_TIMESTAMP
      WHERE iata_code = ?
    `).run(
      data.name, data.status,
      JSON.stringify(data.destinations || []),
      data.cancellation_reason || null,
      data.cancellation_end_date || null,
      data.notes || null,
      data.website || null,
      data.terminal || null,
      iata
    );
  }

  for (const airline of (o.added || [])) {
    const existing = db.prepare('SELECT id FROM airlines WHERE iata_code = ?').get(airline.iata_code);
    if (existing) continue;
    db.prepare(`
      INSERT INTO airlines
        (name, iata_code, status, destinations, cancellation_reason, cancellation_end_date,
         notes, website, sync_locked, terminal, is_israeli, date_adjusted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
    `).run(
      airline.name, airline.iata_code, airline.status,
      JSON.stringify(airline.destinations || []),
      airline.cancellation_reason || null,
      airline.cancellation_end_date || null,
      airline.notes || null,
      airline.website || null,
      airline.terminal || null,
      airline.is_israeli ? 1 : 0
    );
  }

  for (const iata of (o.deleted || [])) {
    db.prepare('DELETE FROM airlines WHERE iata_code = ?').run(iata);
  }

  const u = Object.keys(o.updates || {}).length;
  const a = (o.added || []).length;
  const d = (o.deleted || []).length;
  if (u || a || d) console.log(`[AirlineOverrides] Applied: ${u} updates, ${a} added, ${d} deleted`);
}

module.exports = { loadAirlineOverrides, saveAirlineOverrides, applyAirlineOverrides };
