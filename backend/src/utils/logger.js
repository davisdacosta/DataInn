const REDACTED = '[redacted]';

// Keys that must never reach stdout/stderr, however deep they appear.
const SENSITIVE_KEYS = new Set([
  'authorization',
  'api_key',
  'apikey',
  'datasika_api_key',
  'paystack_secret_key',
  'datasika_webhook_secret',
  'x-datasika-signature',
  'x-paystack-signature',
  'password',
  'secret',
  'token',
]);

function redact(value, depth = 0) {
  if (depth > 5 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : redact(val, depth + 1);
    }
    return out;
  }
  return value;
}

function format(level, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? redact(meta) : {}),
  };
  return JSON.stringify(entry);
}

const logger = {
  info(message, meta) {
    // eslint-disable-next-line no-console
    console.log(format('info', message, meta));
  },
  warn(message, meta) {
    // eslint-disable-next-line no-console
    console.warn(format('warn', message, meta));
  },
  error(message, meta) {
    // eslint-disable-next-line no-console
    console.error(format('error', message, meta));
  },
};

module.exports = logger;
