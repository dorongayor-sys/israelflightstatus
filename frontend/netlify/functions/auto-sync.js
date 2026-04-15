const { schedule } = require('@netlify/functions');
const { runFullSync } = require('./_syncLogic');

exports.handler = schedule('*/20 * * * *', async () => {
  console.log('[AutoSync] Scheduled run starting...');
  await runFullSync();
  return { statusCode: 200 };
});
