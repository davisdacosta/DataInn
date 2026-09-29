const { pool, hasDatabase } = require('./pool');
const mem = require('./memoryStore');

async function create({ orderId, providerOrderId, status, providerResponse }) {
  if (hasDatabase()) {
    const { rows } = await pool.query(
      `INSERT INTO deliveries (order_id, provider_order_id, status, provider_response, attempts)
       VALUES ($1, $2, $3, $4, 1) RETURNING *`,
      [orderId, providerOrderId || null, status, providerResponse ? JSON.stringify(providerResponse) : null]
    );
    return rows[0];
  }
  return mem.insert('deliveries', {
    order_id: orderId,
    provider_order_id: providerOrderId || null,
    status,
    provider_response: providerResponse || null,
    attempts: 1,
    delivered_at: null,
  });
}

async function findLatestByOrderId(orderId) {
  if (hasDatabase()) {
    const { rows } = await pool.query(
      'SELECT * FROM deliveries WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    return rows[0] || null;
  }
  const rows = mem.findMany('deliveries', (d) => d.order_id === orderId);
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return rows[0] || null;
}

async function update(id, { status, providerResponse, deliveredAt, incrementAttempts }) {
  if (hasDatabase()) {
    const { rows } = await pool.query(
      `UPDATE deliveries
       SET status = COALESCE($1, status),
           provider_response = COALESCE($2, provider_response),
           delivered_at = COALESCE($3, delivered_at),
           attempts = attempts + $4
       WHERE id = $5 RETURNING *`,
      [status || null, providerResponse ? JSON.stringify(providerResponse) : null, deliveredAt || null, incrementAttempts ? 1 : 0, id]
    );
    return rows[0] || null;
  }
  const existing = mem.findById('deliveries', id);
  if (!existing) return null;
  return mem.update('deliveries', id, {
    status: status || existing.status,
    provider_response: providerResponse || existing.provider_response,
    delivered_at: deliveredAt || existing.delivered_at,
    attempts: existing.attempts + (incrementAttempts ? 1 : 0),
  });
}

module.exports = { create, findLatestByOrderId, update };
