const { pool, hasDatabase } = require('./pool');
const mem = require('./memoryStore');

async function listActive() {
  if (hasDatabase()) {
    const { rows } = await pool.query('SELECT * FROM plans WHERE active = true ORDER BY network, bundle_gb ASC');
    return rows;
  }
  return mem.findMany('plans', (p) => p.active).sort((a, b) => a.bundle_gb - b.bundle_gb);
}

async function findById(id) {
  if (hasDatabase()) {
    const { rows } = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
    return rows[0] || null;
  }
  return mem.findById('plans', id);
}

async function findByProviderProductId(providerProductId) {
  if (hasDatabase()) {
    const { rows } = await pool.query('SELECT * FROM plans WHERE provider_product_id = $1', [providerProductId]);
    return rows[0] || null;
  }
  return mem.findOne('plans', (p) => p.provider_product_id === providerProductId);
}

/**
 * Insert a plan discovered from the DataSika catalog, or update its
 * provider_price/network/bundle_gb/validity if it already exists.
 * selling_price is only set on first insert (via sellingPriceFn) —
 * an existing plan's selling_price is left alone so admin edits to
 * margin are never silently overwritten by a catalog refresh.
 */
async function upsertFromCatalogItem(item, sellingPriceFn) {
  const existing = await findByProviderProductId(item.product_id);

  if (existing) {
    if (hasDatabase()) {
      const { rows } = await pool.query(
        `UPDATE plans SET network = $1, bundle_gb = $2, validity = $3, provider_price = $4, currency = $5
         WHERE id = $6 RETURNING *`,
        [item.network, item.bundle_gb, item.validity, item.price, item.currency, existing.id]
      );
      return rows[0];
    }
    return mem.update('plans', existing.id, {
      network: item.network,
      bundle_gb: item.bundle_gb,
      validity: item.validity,
      provider_price: item.price,
      currency: item.currency,
    });
  }

  const sellingPrice = sellingPriceFn(item.price);
  if (hasDatabase()) {
    const { rows } = await pool.query(
      `INSERT INTO plans (provider_product_id, network, bundle_gb, validity, provider_price, selling_price, currency, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
      [item.product_id, item.network, item.bundle_gb, item.validity, item.price, sellingPrice, item.currency]
    );
    return rows[0];
  }
  return mem.insert('plans', {
    provider_product_id: item.product_id,
    network: item.network,
    bundle_gb: item.bundle_gb,
    validity: item.validity,
    provider_price: item.price,
    selling_price: sellingPrice,
    currency: item.currency,
    active: true,
  });
}

module.exports = { listActive, findById, findByProviderProductId, upsertFromCatalogItem };
