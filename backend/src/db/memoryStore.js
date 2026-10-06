const crypto = require('crypto');

/**
 * A minimal in-process substitute for the Postgres tables, used only
 * when DATABASE_URL is not set. Same shape as the SQL rows so that
 * repositories can share logic between both backends. Never used in
 * production — config/env.js requires DATABASE_URL when NODE_ENV=production.
 */
const tables = {
  plans: new Map(),
  orders: new Map(),
  payments: new Map(),
  deliveries: new Map(),
  webhook_events: new Map(),
  site_settings: new Map(),
};

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function insert(table, row) {
  const id = row.id || uuid();
  const record = { id, created_at: now(), updated_at: now(), ...row };
  tables[table].set(id, record);
  return { ...record };
}

function update(table, id, fields) {
  const existing = tables[table].get(id);
  if (!existing) return null;
  const updated = { ...existing, ...fields, updated_at: now() };
  tables[table].set(id, updated);
  return { ...updated };
}

function findById(table, id) {
  const row = tables[table].get(id);
  return row ? { ...row } : null;
}

function findOne(table, predicate) {
  for (const row of tables[table].values()) {
    if (predicate(row)) return { ...row };
  }
  return null;
}

function findMany(table, predicate) {
  const out = [];
  for (const row of tables[table].values()) {
    if (!predicate || predicate(row)) out.push({ ...row });
  }
  return out;
}

module.exports = { tables, uuid, insert, update, findById, findOne, findMany };
