/* Run with: npm run db:migrate  (requires DATABASE_URL to be set) */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { config } = require('../config/env');

async function migrate() {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL is not set. Nothing to migrate — the app will use the in-memory store instead.');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = new Client({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log('Migration complete — schema is up to date.');
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
