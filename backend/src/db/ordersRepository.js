const { pool, hasDatabase } = require('./pool');
const mem = require('./memoryStore');

async function create({ reference, planId, recipient, email, amount, currency }) {
  if (hasDatabase()) {
    const { rows } = await pool.query(
      `INSERT INTO orders (reference, plan_id, recipient, email, amount, currency, payment_status, delivery_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'pending') RETURNING *`,
      [reference, planId, recipient, email, amount, currency]
    );
    return rows[0];
  }
  return mem.insert('orders', {
    reference,
    plan_id: planId,
    recipient,
    email,
    amount,
    currency,
    payment_status: 'pending',
    delivery_status: 'pending',
    datasika_order_id: null,
    datasika_idempotency_key: null,
  });
}

async function findByReference(reference) {
  if (hasDatabase()) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE reference = $1', [reference]);
    return rows[0] || null;
  }
  return mem.findOne('orders', (o) => o.reference === reference);
}

async function findById(id) {
  if (hasDatabase()) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0] || null;
  }
  return mem.findById('orders', id);
}

async function findByDatasikaOrderId(datasikaOrderId) {
  if (hasDatabase()) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE datasika_order_id = $1', [datasikaOrderId]);
    return rows[0] || null;
  }
  return mem.findOne('orders', (o) => o.datasika_order_id === datasikaOrderId);
}

const UPDATABLE_FIELDS = ['payment_status', 'delivery_status', 'datasika_order_id', 'datasika_idempotency_key'];

async function update(id, fields) {
  const keys = Object.keys(fields).filter((k) => UPDATABLE_FIELDS.includes(k));
  if (keys.length === 0) return findById(id);

  if (hasDatabase()) {
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map((k) => fields[k]);
    const { rows } = await pool.query(`UPDATE orders SET ${setClause} WHERE id = $1 RETURNING *`, [id, ...values]);
    return rows[0] || null;
  }
  const patch = {};
  keys.forEach((k) => (patch[k] = fields[k]));
  return mem.update('orders', id, patch);
}

module.exports = { create, findByReference, findById, findByDatasikaOrderId, update };
