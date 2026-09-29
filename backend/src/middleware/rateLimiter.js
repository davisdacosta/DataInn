const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

function jsonRateLimitHandler(req, res) {
  res.status(429).json({
    error: 'rate_limited',
    message: 'Too many requests. Please wait a moment and try again.',
  });
}

const readLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRead,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const writeLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxWrite,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

module.exports = { readLimiter, writeLimiter };
