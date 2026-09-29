/**
 * Sync `plans` from the DataSika catalog. Used by two callers:
 *  - `npm run db:seed` (src/db/seed.js) — a one-off CLI run, meant for
 *    real Postgres, where the data needs to be populated exactly once.
 *  - server.js's startup auto-seed — ONLY when there's no DATABASE_URL,
 *    because the in-memory store is per-process: a separate `db:seed`
 *    run would populate a different process's memory than the one
 *    actually serving requests, leaving /api/plans empty forever. See
 *    README "Database modes".
 *
 * DataSika's price is the wholesale (provider_price) cost — this never
 * sets selling_price for a plan that already exists, only on first
 * insert, using DEFAULT_MARKUP as a starting point. Adjust selling_price
 * per plan afterwards to set your real margin.
 */
const datasikaService = require('../services/datasikaService');
const plansRepository = require('./plansRepository');
const logger = require('../utils/logger');

const DEFAULT_MARKUP = 1.15; // +15% over provider_price on first import

function defaultSellingPrice(providerPrice) {
  return Math.round(Number(providerPrice) * DEFAULT_MARKUP * 100) / 100;
}

async function syncPlansFromCatalog() {
  const catalog = await datasikaService.getCatalog();
  const bundles = catalog?.services?.data_bundles;

  if (!bundles || !bundles.available || !Array.isArray(bundles.items)) {
    throw new Error('DataSika data_bundles catalog is unavailable or empty — nothing to seed.');
  }

  let created = 0;
  let updated = 0;

  for (const item of bundles.items) {
    const existing = await plansRepository.findByProviderProductId(item.product_id);
    await plansRepository.upsertFromCatalogItem(item, defaultSellingPrice);
    if (existing) updated += 1;
    else created += 1;
  }

  logger.info('Plan catalog sync complete', { created, updated, total: bundles.items.length });
  return { created, updated, total: bundles.items.length };
}

module.exports = { syncPlansFromCatalog };
