const { getStore } = require('@netlify/blobs');
const staticData = require('../../src/data/airlines-static.json');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  const store = getStore({ name: 'aviation', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
  const data = await store.get('changelog', { type: 'json' });
  const changelog = data || staticData.changelog || [];
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify(changelog) };
};
