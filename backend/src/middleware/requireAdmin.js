const { AppError } = require('../utils/errors');
const adminAuthService = require('../services/adminAuthService');

function requireAdmin(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!adminAuthService.verify(token)) {
    return next(new AppError(401, 'admin_auth_required', 'Please sign in again to manage the storefront.'));
  }
  return next();
}

module.exports = { requireAdmin };
