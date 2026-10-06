const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { config, validateConfig } = require('./config/env');
const { hasDatabase } = require('./db/pool');
const { syncPlansFromCatalog } = require('./db/catalogSync');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const plansRoutes = require('./routes/plans');
const ordersRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const webhooksRoutes = require('./routes/webhooks');
const storefrontRoutes = require('./routes/storefront');
const adminRoutes = require('./routes/admin');

validateConfig();

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: config.isProduction ? config.frontendUrl.split(',').map((s) => s.trim()) : true,
  })
);

app.use(morgan(config.isProduction ? 'combined' : 'dev'));

// Capture the exact raw request body bytes on every request (small JSON
// bodies only — 100kb cap) so the two webhook routes can verify their
// HMAC signatures against the ORIGINAL bytes, never a re-stringified
// version. Non-webhook routes just use req.body as normal.
app.use(
  express.json({
    limit: '100kb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mockMode: config.mockMode, env: config.nodeEnv });
});

app.use('/api/plans', plansRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/webhooks', webhooksRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

/**
 * The in-memory store is per-process, so a separate `npm run db:seed`
 * invocation would populate a different process's memory than this one
 * — leaving /api/plans empty forever. Auto-seed it here instead, only
 * when there's no real database to persist to. Never runs against
 * Postgres — that's the CLI script's job, run once and left alone.
 */
async function autoSeedInMemoryStoreIfNeeded() {
  if (hasDatabase()) return;
  try {
    const { created } = await syncPlansFromCatalog();
    logger.info('Auto-seeded in-memory plan catalog on startup', { created });
  } catch (err) {
    logger.warn('Could not auto-seed the in-memory catalog — /api/plans may be empty until this succeeds', {
      error: err.message,
    });
  }
}

async function start() {
  await autoSeedInMemoryStoreIfNeeded();
  app.listen(config.port, () => {
    logger.info('Server started', { port: config.port, env: config.nodeEnv, mockMode: config.mockMode });
  });
}

start();

module.exports = app;
