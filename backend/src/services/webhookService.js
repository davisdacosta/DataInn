const crypto = require('crypto');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const webhookEventsRepository = require('../db/webhookEventsRepository');
const ordersRepository = require('../db/ordersRepository');
const deliveriesRepository = require('../db/deliveriesRepository');
const paymentService = require('./paymentService');
const deliveryService = require('./deliveryService');

/** Constant-time-safe compare of two hex digests of possibly different length. */
function safeHexEqual(a, b) {
  const bufA = Buffer.from(a || '', 'hex');
  const bufB = Buffer.from(b || '', 'hex');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---------------------------------------------------------------------
// DataSika — per web_hook_prompt.rtf: HMAC-SHA256 of the RAW body,
// hex-encoded, sent as X-DataSika-Signature.
// ---------------------------------------------------------------------
function verifyDatasikaSignature(rawBody, signatureHeader) {
  if (!config.datasika.webhookSecret) {
    logger.error('DATASIKA_WEBHOOK_SECRET is not configured — rejecting webhook');
    return false;
  }
  if (!signatureHeader || !rawBody) return false;
  const expected = crypto.createHmac('sha256', config.datasika.webhookSecret).update(rawBody).digest('hex');
  return safeHexEqual(expected, signatureHeader);
}

/**
 * The exact DataSika webhook payload schema was not part of the
 * supplied documentation beyond the signature mechanism — this is a
 * defensive adapter that looks for the field names most providers of
 * this shape use, rather than assuming one rigid schema. Update this
 * function once DataSika's exact payload spec is available.
 */
function parseDatasikaEvent(payload) {
  const data = payload.data || payload.order || payload;
  const providerOrderId = data.order_id || data.orderId || data.provider_order_id || null;
  const status = data.status || data.order_status || payload.status || null;
  const eventType = payload.event || payload.event_type || payload.type || null;
  const eventId = payload.event_id || payload.id || null;

  return { eventId, eventType, providerOrderId, status, raw: payload };
}

async function processDatasikaWebhook(rawBody, signatureHeader) {
  if (!verifyDatasikaSignature(rawBody, signatureHeader)) {
    logger.warn('Rejected DataSika webhook — invalid signature');
    const err = new Error('invalid_signature');
    err.httpStatus = 401;
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    const err = new Error('invalid_json');
    err.httpStatus = 400;
    throw err;
  }

  const parsed = parseDatasikaEvent(payload);
  // Prefer the provider's own event id for dedupe; fall back to a hash
  // of the exact raw body so an identical retried delivery is still
  // recognised as the same event, without inventing a fake event id.
  const eventKey = parsed.eventId || crypto.createHash('sha256').update(rawBody).digest('hex');

  const recorded = await webhookEventsRepository.recordIfNew({
    provider: 'datasika',
    eventId: parsed.eventId,
    eventKey,
    eventType: parsed.eventType,
    payload,
  });

  if (!recorded) {
    logger.info('Duplicate DataSika webhook ignored', { eventKey });
    return { duplicate: true };
  }

  if (!parsed.providerOrderId || !parsed.status) {
    logger.warn('DataSika webhook missing order id or status — recorded but not actionable', { eventKey });
    await webhookEventsRepository.markProcessed(recorded.id);
    return { duplicate: false, actionable: false };
  }

  const order = await ordersRepository.findByDatasikaOrderId(parsed.providerOrderId);
  if (!order) {
    logger.warn('DataSika webhook references an unknown order', { providerOrderId: parsed.providerOrderId });
    await webhookEventsRepository.markProcessed(recorded.id);
    return { duplicate: false, actionable: false };
  }

  const status = deliveryService.normalizeStatus(parsed.status);
  const delivery = await deliveriesRepository.findLatestByOrderId(order.id);
  if (delivery && !['delivered', 'failed', 'refunded'].includes(delivery.status)) {
    await deliveriesRepository.update(delivery.id, {
      status,
      providerResponse: payload,
      deliveredAt: status === 'delivered' ? new Date().toISOString() : null,
      incrementAttempts: false,
    });
    await ordersRepository.update(order.id, { delivery_status: status });
    logger.info('Order delivery status updated from DataSika webhook', { reference: order.reference, status });
  }

  await webhookEventsRepository.markProcessed(recorded.id);
  return { duplicate: false, actionable: true };
}

// ---------------------------------------------------------------------
// Paystack — documented mechanism: HMAC-SHA512 of the RAW body using
// the secret key, sent as x-paystack-signature.
// ---------------------------------------------------------------------
function verifyPaystackSignature(rawBody, signatureHeader) {
  if (!config.paystack.secretKey || !signatureHeader || !rawBody) return false;
  const expected = crypto.createHmac('sha512', config.paystack.secretKey).update(rawBody).digest('hex');
  return safeHexEqual(expected, signatureHeader);
}

async function processPaystackWebhook(rawBody, signatureHeader) {
  if (config.mockMode) {
    // In mock mode there is no real Paystack sending real signatures;
    // skip verification only here, never in a non-mock environment.
    logger.warn('MOCK_MODE: skipping Paystack signature verification');
  } else if (!verifyPaystackSignature(rawBody, signatureHeader)) {
    logger.warn('Rejected Paystack webhook — invalid signature');
    const err = new Error('invalid_signature');
    err.httpStatus = 401;
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    const err = new Error('invalid_json');
    err.httpStatus = 400;
    throw err;
  }

  const eventType = payload.event;
  const reference = payload.data && payload.data.reference;
  const eventKey = crypto.createHash('sha256').update(rawBody).digest('hex');

  const recorded = await webhookEventsRepository.recordIfNew({
    provider: 'paystack',
    eventId: null,
    eventKey,
    eventType,
    payload,
  });

  if (!recorded) {
    logger.info('Duplicate Paystack webhook ignored', { eventKey });
    return { duplicate: true };
  }

  if (eventType === 'charge.success' && reference) {
    const order = await ordersRepository.findByReference(reference);
    if (order) {
      await paymentService.verifyAndFulfil(order);
      logger.info('Order payment confirmed via Paystack webhook', { reference });
    } else {
      logger.warn('Paystack webhook references an unknown order reference', { reference });
    }
  }

  await webhookEventsRepository.markProcessed(recorded.id);
  return { duplicate: false, actionable: true };
}

module.exports = {
  verifyDatasikaSignature,
  parseDatasikaEvent,
  processDatasikaWebhook,
  verifyPaystackSignature,
  processPaystackWebhook,
};
