const { getStore } = require('@netlify/blobs');
const jwt = require('jsonwebtoken');
const staticData = require('../../src/data/airlines-static.json');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function getAirlines() {
  const store = getStore('aviation');
  const data = await store.get('airlines', { type: 'json' });
  if (data === null) {
    await store.set('airlines', JSON.stringify(staticData.airlines));
    return staticData.airlines;
  }
  return data;
}

function verifyToken(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  if (event.httpMethod === 'GET') {
    const airlines = await getAirlines();
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(airlines) };
  }

  if (event.httpMethod === 'POST') {
    if (!verifyToken(event)) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };

    const store = getStore('aviation');
    const airlines = await getAirlines();
    const body = JSON.parse(event.body || '{}');
    const { name, iata_code, status, destinations, cancellation_reason, cancellation_end_date, notes, website, sync_locked, terminal } = body;

    if (!name || !status) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Name and status are required' }) };

    const newId = Math.max(0, ...airlines.map(a => a.id)) + 1;
    const newAirline = {
      id: newId,
      name: name.trim(),
      iata_code: iata_code?.trim().toUpperCase() || null,
      status,
      destinations: destinations || [],
      cancellation_reason: cancellation_reason?.trim() || null,
      cancellation_end_date: cancellation_end_date || null,
      notes: notes?.trim() || null,
      website: website?.trim() || null,
      sync_locked: sync_locked ? 1 : 0,
      terminal: terminal?.trim() || null,
      is_israeli: ['El Al', 'Israir', 'Arkia', 'Air Haifa'].includes(name.trim()),
      end_date_unconfirmed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    airlines.push(newAirline);
    await store.set('airlines', JSON.stringify(airlines));

    const changelog = await store.get('changelog', { type: 'json' }) || [];
    changelog.unshift({ id: Date.now(), airline_id: newId, airline_name: name, action: 'created', field_changed: null, old_value: null, new_value: status, changed_at: new Date().toISOString() });
    await store.set('changelog', JSON.stringify(changelog));

    return { statusCode: 201, headers: HEADERS, body: JSON.stringify(newAirline) };
  }

  return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
