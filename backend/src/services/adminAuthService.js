const crypto = require('crypto');
const { config } = require('../config/env');
const { AppError } = require('../utils/errors');

const SESSION_TTL_SECONDS = 4 * 60 * 60;

function configured() {
  return config.admin.users.length > 0;
}

function digest(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function safeEqual(left, right) {
  return crypto.timingSafeEqual(digest(left), digest(right));
}

function sign(payload, password) {
  return crypto.createHmac('sha256', password).update(payload).digest('base64url');
}

function login(email, password) {
  if (!configured()) {
    throw new AppError(503, 'admin_not_configured', 'Admin access is not configured on the server.');
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const providedPassword = typeof password === 'string' ? password : '';
  let authenticatedUser;
  for (const user of config.admin.users) {
    const emailMatches = safeEqual(normalizedEmail, user.email);
    const passwordMatches = safeEqual(providedPassword, user.password);
    if (emailMatches && passwordMatches) authenticatedUser = user;
  }
  if (!authenticatedUser) {
    throw new AppError(401, 'invalid_admin_credentials', 'Email or password is incorrect.');
  }

  const payload = Buffer.from(JSON.stringify({
    email: authenticatedUser.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url');
  return { token: `${payload}.${sign(payload, authenticatedUser.password)}`, expiresIn: SESSION_TTL_SECONDS };
}

function verify(token) {
  if (!configured() || typeof token !== 'string') return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const user = config.admin.users.find((admin) => admin.email === session.email);
    return Boolean(
      user
      && safeEqual(signature, sign(payload, user.password))
      && Number.isInteger(session.exp)
      && session.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

module.exports = { login, verify };
