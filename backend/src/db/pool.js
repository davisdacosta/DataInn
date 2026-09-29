const { Pool } = require('pg');
const { config } = require('../config/env');
const logger = require('../utils/logger');

let pool = null;

if (config.databaseUrl) {
  pool = new Pool({
    connectionString: config.databaseUrl,
    // Ghana-hosted managed Postgres providers commonly require SSL; allow
    // it without a stricter CA check by default in non-production, and
    // require it to be explicitly reachable in production.
    ssl: config.databaseUrl.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    logger.error('Unexpected Postgres pool error', { error: err.message });
  });
} else {
  logger.warn(
    'DATABASE_URL is not set — running on the built-in in-memory store. ' +
      'Data will NOT persist across restarts. See README "Database modes".'
  );
}

/** True when a real Postgres pool is configured and in use. */
function hasDatabase() {
  return pool !== null;
}

module.exports = { pool, hasDatabase };
