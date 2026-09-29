const logger = require('../utils/logger');
const { AppError, GENERIC_MESSAGE } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    logger.error('Handled application error', {
      path: req.originalUrl,
      code: err.code,
      httpStatus: err.httpStatus,
      technicalDetail: err.technicalDetail,
    });
    return res.status(err.httpStatus).json({ error: err.code, message: err.customerMessage });
  }

  logger.error('Unhandled error', {
    path: req.originalUrl,
    error: err.message,
    stack: err.stack,
  });
  return res.status(500).json({ error: 'internal_error', message: GENERIC_MESSAGE });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'not_found', message: 'This endpoint does not exist.' });
}

module.exports = { errorHandler, notFoundHandler };
