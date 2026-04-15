const { getStore } = require('@netlify/blobs');
const jwt = require('jsonwebtoken');
const staticData = require('../../src/data/airlines-static.json');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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

  const parts = event.path.split('/');
  const id = parseInt(parts[parts.length - 1]);

  if (event.httpMethod === 'GET') {
    const airlines = await getAirlines();
    const airline = airlines.find(a => a.id === id);
    if (!airline) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Not found' }) };
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(airline) };
  }

  if (!verifyToken(event)) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };

  const store = getStore('aviation');

  if (event.httpMethod === 'PUT') {
    const airlines = await getAirlines();
    const idx = airlines.findIndex(a => a.id === id);
    if (idx === -1) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Not found' }) };

    const existing = airlines[idx];
    const body = JSON.parse(event.body || '{}');
    const updated = { ...existing, ...body, id: existing.id, updated_at: new Date().toISOString() };
    airlines[idx] = updated;
    await store.set('airlines', JSON.stringify(airlines));

    if (body.status && body.status !== existing.status) {
      const changelog = await store.get('changelog', { type: 'json' }) || [];
      changelog.unshift({ id: Date.now(), airline_id: id, airline_name: updated.name, action: 'updated', field_changed: 'status', old_value: existing.status, new_value: body.status, changed_at: new Date().toISOString() });
      await store.set('changelog', JSON.stringify(changelog));
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(updated) };
  }

  if (event.httpMethod === 'DELETE') {
    const airlines = await getAirlines();
    const idx = airlines.findIndex(a => a.id === id);
    if (idx === -1) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Not found' }) };

    const deleted = airlines[idx];
    airlines.splice(idx, 1);
    await store.set('airlines', JSON.stringify(airlines));

    const changelog = await store.get('changelog', { type: 'json' }) || [];
    changelog.unshift({ id: Date.now(), airline_id: id, airline_name: deleted.name, action: 'deleted', field_changed: null, old_value: deleted.status, new_value: null, changed_at: new Date().toISOString() });
    await store.set('changelog', JSON.stringify(changelog));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ message: 'Deleted' }) };
  }

  return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
