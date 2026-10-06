const { pool, hasDatabase } = require('./pool');
const mem = require('./memoryStore');

const SETTINGS_KEY = 'storefront';
const defaults = {
  networks: { MTN: true, Telecel: true, AirtelTigo: false },
  mtnSpeed: {
    rating: 'within_6_hours',
    message: 'Expected within 6 hours — many orders arrive much sooner',
  },
  notices: {
    delivery: 'Delivery times may vary.',
    airtime: 'Phone must not owe airtime.',
    wrongNumber: 'No refunds for wrong numbers.',
    mtnVerification: 'A number ordering MTN data through us for the first time may show “Awaiting Verification” for a one-time check before it delivers — normally up to a week, sometimes a couple of weeks (future orders to that same number go through normally).',
  },
};

async function get() {
  if (hasDatabase()) {
    const { rows } = await pool.query('SELECT value FROM site_settings WHERE key = $1', [SETTINGS_KEY]);
    if (!rows[0]) {
      const { rows: inserted } = await pool.query(
        'INSERT INTO site_settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key RETURNING value',
        [SETTINGS_KEY, JSON.stringify(defaults)]
      );
      return inserted[0].value;
    }
    return rows[0].value;
  }

  return mem.findOne('site_settings', (setting) => setting.key === SETTINGS_KEY)?.value || structuredClone(defaults);
}

async function update(value) {
  if (hasDatabase()) {
    const { rows } = await pool.query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
       RETURNING value`,
      [SETTINGS_KEY, JSON.stringify(value)]
    );
    return rows[0].value;
  }

  const existing = mem.findOne('site_settings', (setting) => setting.key === SETTINGS_KEY);
  if (existing) return mem.update('site_settings', existing.id, { value }).value;
  return mem.insert('site_settings', { key: SETTINGS_KEY, value }).value;
}

module.exports = { defaults, get, update };
