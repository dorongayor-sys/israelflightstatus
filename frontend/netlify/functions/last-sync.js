const { getStore } = require('@netlify/blobs');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

exports.handler = async (event) => {
  const store = getStore({ name: 'aviation', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_TOKEN });
  const lastSync = await store.get('last-sync');
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ last_sync: lastSync || null }) };
};
