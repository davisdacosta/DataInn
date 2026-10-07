const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// MOCK_MODE can never be true in production, no matter what .env says.
const MOCK_MODE = !IS_PRODUCTION && String(process.env.MOCK_MODE).toLowerCase() === 'true';

function loadAdminUsers() {
  const users = [];
  const legacyEmail = process.env.ADMIN_EMAIL || '';
  const legacyPassword = process.env.ADMIN_PASSWORD || '';

  if (legacyEmail || legacyPassword) {
    if (!legacyEmail || !legacyPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be provided together.');
    }
    users.push({ email: legacyEmail, password: legacyPassword });
  }

  if (process.env.ADMIN_USERS) {
    let configuredUsers;
    try {
      configuredUsers = JSON.parse(process.env.ADMIN_USERS);
    } catch {
      throw new Error('ADMIN_USERS must be a valid JSON array of admin credentials.');
    }
    if (!Array.isArray(configuredUsers)) {
      throw new Error('ADMIN_USERS must be a valid JSON array of admin credentials.');
    }
    users.push(...configuredUsers);
  }

  const normalizedUsers = users.map((user) => {
    if (
      !user
      || typeof user.email !== 'string'
      || !user.email.trim()
      || typeof user.password !== 'string'
      || !user.password
    ) {
      throw new Error('Each admin credential must include a non-empty email and password.');
    }
    return { email: user.email.trim().toLowerCase(), password: user.password };
  });

  if (new Set(normalizedUsers.map((user) => user.email)).size !== normalizedUsers.length) {
    throw new Error('Admin email addresses must be unique.');
  }
  return normalizedUsers;
}

const config = {
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  mockMode: MOCK_MODE,
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',

  datasika: {
    apiKey: process.env.DATASIKA_API_KEY || '',
    baseUrl: process.env.DATASIKA_BASE_URL || 'https://nrsfvhztpzwkadwciizp.supabase.co/functions/v1',
    webhookSecret: process.env.DATASIKA_WEBHOOK_SECRET || '',
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
  },

  databaseUrl: process.env.DATABASE_URL || '',

  admin: {
    users: loadAdminUsers(),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxWrite: parseInt(process.env.RATE_LIMIT_MAX_WRITE, 10) || 20,
    maxRead: parseInt(process.env.RATE_LIMIT_MAX_READ, 10) || 60,
  },
};

/**
 * Validate required configuration on startup. Throws (and the process
 * should exit) rather than limping along with half-valid config.
 * Never logs secret values — only which variable names are missing.
 */
function validateConfig() {
  const missing = [];

  if (!config.mockMode) {
    if (!config.datasika.apiKey) missing.push('DATASIKA_API_KEY');
    if (!config.paystack.secretKey) missing.push('PAYSTACK_SECRET_KEY');
    if (!config.paystack.publicKey) missing.push('PAYSTACK_PUBLIC_KEY');
    // Webhook secret is checked lazily by the webhook route itself, since
    // a server can legitimately run before webhooks are registered — but
    // we still warn loudly so it isn't forgotten.
    if (!config.datasika.webhookSecret) {
      // eslint-disable-next-line no-console
      console.warn(
        '[startup] DATASIKA_WEBHOOK_SECRET is not set. The /api/webhooks/datasika ' +
          'endpoint will reject every request until it is configured.'
      );
    }
  }

  if (config.isProduction && !config.databaseUrl) {
    missing.push('DATABASE_URL');
  }
  if (config.isProduction && config.admin.users.length === 0) {
    missing.push('ADMIN_EMAIL/ADMIN_PASSWORD or ADMIN_USERS');
  }
  if (config.isProduction && config.admin.users.some((user) => user.password.length < 12)) {
    throw new Error('Every admin password must be at least 12 characters in production.');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        (config.mockMode
          ? ''
          : 'Set MOCK_MODE=true in a non-production environment to develop without real credentials.')
    );
  }
}

module.exports = { config, validateConfig };
