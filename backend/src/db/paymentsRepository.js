const { pool, hasDatabase } = require('./pool');
const mem = require('./memoryStore');

async function create({ orderId, paystackReference, amount, currency }) {
  if (hasDatabase()) {
    const { rows } = await pool.query(
      `INSERT INTO payments (order_id, paystack_reference, amount, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [orderId, paystackReference, amount]
    );
    return rows[0];
  }
  return mem.insert('payments', {
    order_id: orderId,
    paystack_reference: paystackReference,
    amount,
    currency,
    status: 'pending',
    channel: null,
    paid_at: null,
  });
}

async function findByReference(paystackReference) {
  if (hasDatabase()) {
    const { rows } = await pool.query('SELECT * FROM payments WHERE paystack_reference = $1', [paystackReference]);
    return rows[0] || null;
  }
  return mem.findOne('payments', (p) => p.paystack_reference === paystackReference);
}

async function updateByReference(paystackReference, { status, channel, paidAt }) {
  if (hasDatabase()) {
    const { rows } = await pool.query(
      `UPDATE payments SET status = $1, channel = COALESCE($2, channel), paid_at = COALESCE($3, paid_at)
       WHERE paystack_reference = $4 RETURNING *`,
      [status, channel || null, paidAt || null, paystackReference]
    );
    return rows[0] || null;
  }
  const existing = await findByReference(paystackReference);
  if (!existing) return null;
  return mem.update('payments', existing.id, {
    status,
    channel: channel || existing.channel,
    paid_at: paidAt || existing.paid_at,
  });
}

module.exports = { create, findByReference, updateByReference };
