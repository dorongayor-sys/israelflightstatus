const express = require('express');
const { getDb } = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseAirline(a) {
  if (!a) return a;
  return { ...a, destinations: JSON.parse(a.destinations || '[]'), is_israeli: !!a.is_israeli, end_date_unconfirmed: !!a.end_date_unconfirmed };
}

function logChange(db, airlineId, airlineName, action, fieldChanged, oldValue, newValue) {
  db.prepare(`
    INSERT INTO changelog (airline_id, airline_name, action, field_changed, old_value, new_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(airlineId, airlineName, action, fieldChanged ?? null, oldValue ?? null, newValue ?? null);
}

// GET /api/airlines — public
router.get('/', (req, res) => {
  const db = getDb();
  const airlines = db.prepare('SELECT * FROM airlines ORDER BY name ASC').all();
  res.json(airlines.map(parseAirline));
});

// GET /api/airlines/:id — public
router.get('/:id', (req, res) => {
  const db = getDb();
  const airline = db.prepare('SELECT * FROM airlines WHERE id = ?').get(req.params.id);
  if (!airline) return res.status(404).json({ error: 'Airline not found' });
  res.json(parseAirline(airline));
});

// POST /api/airlines — protected
router.post('/', requireAuth, (req, res) => {
  const { name, iata_code, status, destinations, cancellation_reason, cancellation_end_date, notes, website, sync_locked, terminal } = req.body;
  if (!name || !status) return res.status(400).json({ error: 'Name and status are required' });
  if (!['flying', 'not_flying', 'partial'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO airlines (name, iata_code, status, destinations, cancellation_reason, cancellation_end_date, notes, website, sync_locked, terminal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    iata_code?.trim().toUpperCase() || null,
    status,
    JSON.stringify(destinations || []),
    cancellation_reason?.trim() || null,
    cancellation_end_date || null,
    notes?.trim() || null,
    website?.trim() || null,
    sync_locked ? 1 : 0,
    terminal?.trim() || null
  );

  const created = db.prepare('SELECT * FROM airlines WHERE id = ?').get(result.lastInsertRowid);
  logChange(db, created.id, created.name, 'created', null, null, status);

  res.status(201).json(parseAirline(created));
});

// PUT /api/airlines/:id — protected
router.put('/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, iata_code, status, destinations, cancellation_reason, cancellation_end_date, notes, website, sync_locked, terminal } = req.body;

  const db = getDb();
  const existing = db.prepare('SELECT * FROM airlines WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Airline not found' });

  if (status && !['flying', 'not_flying', 'partial'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  const newStatus = status || existing.status;
  const newName = name?.trim() || existing.name;

  if (newStatus !== existing.status) {
    logChange(db, id, newName, 'updated', 'status', existing.status, newStatus);
  }

  db.prepare(`
    UPDATE airlines SET
      name = ?,
      iata_code = ?,
      status = ?,
      destinations = ?,
      cancellation_reason = ?,
      cancellation_end_date = ?,
      notes = ?,
      website = ?,
      sync_locked = ?,
      terminal = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newName,
    iata_code !== undefined ? (iata_code?.trim().toUpperCase() || null) : existing.iata_code,
    newStatus,
    JSON.stringify(destinations !== undefined ? destinations : JSON.parse(existing.destinations || '[]')),
    cancellation_reason !== undefined ? (cancellation_reason?.trim() || null) : existing.cancellation_reason,
    cancellation_end_date !== undefined ? (cancellation_end_date || null) : existing.cancellation_end_date,
    notes !== undefined ? (notes?.trim() || null) : existing.notes,
    website !== undefined ? (website?.trim() || null) : existing.website,
    sync_locked !== undefined ? (sync_locked ? 1 : 0) : 1,
    terminal !== undefined ? (terminal?.trim() || null) : existing.terminal,
    id
  );

  const updated = db.prepare('SELECT * FROM airlines WHERE id = ?').get(id);
  res.json(parseAirline(updated));
});

// DELETE /api/airlines/:id — protected
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM airlines WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Airline not found' });

  logChange(db, existing.id, existing.name, 'deleted', null, existing.status, null);
  db.prepare('DELETE FROM airlines WHERE id = ?').run(req.params.id);

  res.json({ message: 'Airline deleted successfully' });
});

module.exports = router;
