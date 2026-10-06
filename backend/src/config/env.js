const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// MOCK_MODE can never be true in production, no matter what .env says.
const MOCK_MODE = !IS_PRODUCTION && String(process.env.MOCK_MODE).toLowerCase() === 'true';

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
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
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
  if (config.isProduction && !config.admin.email) missing.push('ADMIN_EMAIL');
  if (config.isProduction && !config.admin.password) missing.push('ADMIN_PASSWORD');
  if (config.isProduction && config.admin.password && config.admin.password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters in production.');
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
