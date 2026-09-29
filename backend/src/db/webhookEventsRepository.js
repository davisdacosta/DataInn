const { pool, hasDatabase } = require('./pool');
const mem = require('./memoryStore');

/**
 * Try to record a new webhook event. Returns the created row, or null
 * if (provider, eventKey) was already recorded — the caller should
 * treat null as "already processed, do nothing, return 2xx".
 * Relies on the unique index on (provider, event_key) so this is safe
 * even under concurrent/retried deliveries.
 */
async function recordIfNew({ provider, eventId, eventKey, eventType, payload }) {
  if (hasDatabase()) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO webhook_events (provider, event_id, event_key, event_type, payload, processed)
         VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
        [provider, eventId || null, eventKey, eventType || null, JSON.stringify(payload)]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') return null; // unique_violation -> duplicate delivery
      throw err;
    }
  }

  const already = mem.findOne('webhook_events', (e) => e.provider === provider && e.event_key === eventKey);
  if (already) return null;
  return mem.insert('webhook_events', {
    provider,
    event_id: eventId || null,
    event_key: eventKey,
    event_type: eventType || null,
    payload,
    processed: false,
    processed_at: null,
  });
}

async function markProcessed(id) {
  if (hasDatabase()) {
    await pool.query('UPDATE webhook_events SET processed = true, processed_at = now() WHERE id = $1', [id]);
    return;
  }
  mem.update('webhook_events', id, { processed: true, processed_at: new Date().toISOString() });
}

module.exports = { recordIfNew, markProcessed };
