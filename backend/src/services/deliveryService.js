const datasikaService = require('./datasikaService');
const ordersRepository = require('../db/ordersRepository');
const deliveriesRepository = require('../db/deliveriesRepository');
const plansRepository = require('../db/plansRepository');
const logger = require('../utils/logger');
const { idempotencyKeyForOrder } = require('../utils/helpers');

// DataSika's documented statuses map directly onto our delivery_status
// values, but we normalize case defensively since the docs show both
// "Pending" (on the buy response) and lowercase "pending" (on status).
const STATUS_ALIASES = {
  pending: 'pending',
  processing: 'processing',
  delivered: 'delivered',
  failed: 'failed',
  refunded: 'refunded',
  refund_processing: 'refund_processing',
};

function normalizeStatus(raw) {
  if (!raw) return 'pending';
  return STATUS_ALIASES[String(raw).toLowerCase()] || 'processing';
}

/**
 * Attempt to fulfil a paid order via DataSika. Safe to call more than
 * once for the same order: if it already has a datasika_order_id, or
 * delivery is already processing/delivered, this is a no-op that just
 * returns the current state — it NEVER places a second purchase.
 */
async function fulfil(order) {
  if (order.datasika_order_id || ['processing', 'delivered'].includes(order.delivery_status)) {
    logger.info('Fulfilment skipped — order already dispatched', {
      reference: order.reference,
      delivery_status: order.delivery_status,
      datasika_order_id: order.datasika_order_id,
    });
    return order;
  }

  const plan = await plansRepository.findById(order.plan_id);
  if (!plan) throw new Error(`Order ${order.reference} references a missing plan ${order.plan_id}`);

  // Deterministic idempotency key, stored so a retry (crash/timeout
  // recovery) reuses it instead of risking a duplicate charge.
  const idempotencyKey = order.datasika_idempotency_key || idempotencyKeyForOrder(order.reference);
  if (!order.datasika_idempotency_key) {
    await ordersRepository.update(order.id, { datasika_idempotency_key: idempotencyKey });
  }

  const result = await datasikaService.buyDataBundle({
    productId: plan.provider_product_id,
    recipient: order.recipient,
    idempotencyKey,
  });

  const status = normalizeStatus(result.status);

  await deliveriesRepository.create({
    orderId: order.id,
    providerOrderId: result.order_id,
    status,
    providerResponse: result,
  });

  const updated = await ordersRepository.update(order.id, {
    datasika_order_id: result.order_id,
    delivery_status: status,
  });

  logger.info('Order dispatched to DataSika', { reference: order.reference, datasika_order_id: result.order_id, status });
  return updated;
}

/**
 * Authoritative fallback: ask DataSika directly for an order's current
 * status and persist any change. Used by the status-polling endpoint
 * and as a safety net if a webhook was missed or delayed.
 */
async function syncStatusFromProvider(order) {
  if (!order.datasika_order_id) return order;
  if (['delivered', 'failed', 'refunded'].includes(order.delivery_status)) return order; // already terminal

  const result = await datasikaService.getOrderStatus(order.datasika_order_id);
  const status = normalizeStatus(result.status);

  if (status === order.delivery_status) return order;

  const delivery = await deliveriesRepository.findLatestByOrderId(order.id);
  if (delivery) {
    await deliveriesRepository.update(delivery.id, {
      status,
      providerResponse: result,
      deliveredAt: status === 'delivered' ? new Date().toISOString() : null,
      incrementAttempts: false,
    });
  }

  const updated = await ordersRepository.update(order.id, { delivery_status: status });
  logger.info('Order status synced from provider', { reference: order.reference, status });
  return updated;
}

module.exports = { fulfil, syncStatusFromProvider, normalizeStatus };
