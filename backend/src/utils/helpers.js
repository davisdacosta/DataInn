const crypto = require('crypto');

/** Wrap an async Express handler so rejected promises reach errorHandler. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** 024 123 4567 -> valid. Anything else -> invalid. */
function isValidGhPhone(value) {
  return typeof value === 'string' && /^0\d{9}$/.test(value.trim());
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function randomToken(length = 6) {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, length);
}

/** Our own order reference, e.g. DATA-20260923-A1B2C3 */
function generateOrderReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `DATA-${date}-${randomToken(6)}`;
}

/**
 * The Idempotency-Key we send to DataSika for a given order. Derived
 * deterministically from our own order reference so that retrying the
 * same order (e.g. after a timeout) always reuses the same key, per
 * DataSika's idempotency contract — we never generate a second key for
 * an order we've already attempted to fulfil.
 */
function idempotencyKeyForOrder(reference) {
  return `order-${reference}`.toLowerCase();
}

module.exports = {
  asyncHandler,
  isValidGhPhone,
  isValidEmail,
  generateOrderReference,
  idempotencyKeyForOrder,
};
