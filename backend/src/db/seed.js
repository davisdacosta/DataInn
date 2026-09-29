/**
 * One-off CLI seed: `npm run db:seed`.
 *
 * Intended for real Postgres (DATABASE_URL set). In in-memory mode
 * (no DATABASE_URL), the server auto-seeds itself on startup instead —
 * see server.js and catalogSync.js — because a separate CLI process
 * can't populate the in-memory store the running server actually uses.
 */
const { config } = require('../config/env');
const { hasDatabase } = require('./pool');
const { syncPlansFromCatalog } = require('./catalogSync');
const logger = require('../utils/logger');

async function run() {
  if (!hasDatabase()) {
    console.log(
      'DATABASE_URL is not set — nothing to do here. The server auto-seeds its ' +
        'in-memory store on startup instead. Just run `npm start` / `npm run dev`.'
    );
    return;
  }

  logger.info('Fetching DataSika catalog for seeding', { mockMode: config.mockMode });
  const { created, updated } = await syncPlansFromCatalog();
  console.log(`Seed complete: ${created} new plan(s), ${updated} refreshed. Review selling_price for new plans before going live.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
