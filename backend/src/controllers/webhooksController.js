const webhookService = require('../services/webhookService');
const { asyncHandler } = require('../utils/helpers');
const logger = require('../utils/logger');

const datasikaWebhook = asyncHandler(async (req, res) => {
  try {
    const result = await webhookService.processDatasikaWebhook(req.rawBody, req.get('x-datasika-signature'));
    res.status(200).json({ received: true, duplicate: !!result.duplicate });
  } catch (err) {
    if (err.httpStatus === 401) return res.status(401).json({ error: 'invalid_signature' });
    if (err.httpStatus === 400) return res.status(400).json({ error: 'invalid_payload' });
    logger.error('DataSika webhook processing failed', { error: err.message });
    res.status(200).json({ received: true });
  }
});

module.exports = { datasikaWebhook };
