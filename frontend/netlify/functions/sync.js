const { getStore } = require('@netlify/blobs');
const jwt = require('jsonwebtoken');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!verifyToken(event)) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };

  const store = getStore({ name: 'aviation', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
  const now = new Date().toISOString();
  await store.set('last-sync', now);

  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, last_sync: now }) };
};
