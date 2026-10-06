const crypto = require('crypto');
const { config } = require('../config/env');
const { AppError } = require('../utils/errors');

const SESSION_TTL_SECONDS = 4 * 60 * 60;

function configured() {
  return Boolean(config.admin.email && config.admin.password);
}

function digest(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function safeEqual(left, right) {
  return crypto.timingSafeEqual(digest(left), digest(right));
}

function sign(payload) {
  return crypto.createHmac('sha256', config.admin.password).update(payload).digest('base64url');
}

function login(email, password) {
  if (!configured()) {
    throw new AppError(503, 'admin_not_configured', 'Admin access is not configured on the server.');
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const providedPassword = typeof password === 'string' ? password : '';
  if (!safeEqual(normalizedEmail, config.admin.email.trim().toLowerCase()) || !safeEqual(providedPassword, config.admin.password)) {
    throw new AppError(401, 'invalid_admin_credentials', 'Email or password is incorrect.');
  }

  const payload = Buffer.from(JSON.stringify({
    email: config.admin.email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresIn: SESSION_TTL_SECONDS };
}

function verify(token) {
  if (!configured() || typeof token !== 'string') return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;

  const expected = sign(payload);
  if (!safeEqual(signature, expected)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.email === config.admin.email.trim().toLowerCase()
      && Number.isInteger(session.exp)
      && session.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

module.exports = { login, verify };
