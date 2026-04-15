const jwt = require('jsonwebtoken');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const { username, password } = JSON.parse(event.body || '{}');
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

  if (!username || !password) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Username and password required' }) };
  }

  if (username !== adminUsername || password !== adminPassword) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Invalid credentials' }) };
  }

  const token = jwt.sign({ username }, jwtSecret, { expiresIn: '24h' });
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ token, username }) };
};
