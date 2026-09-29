const paystackService = require('./paystackService');
const deliveryService = require('./deliveryService');
const ordersRepository = require('../db/ordersRepository');
const paymentsRepository = require('../db/paymentsRepository');
const plansRepository = require('../db/plansRepository');
const logger = require('../utils/logger');
const { config } = require('../config/env');
const { AppError } = require('../utils/errors');

/** Start a Paystack transaction for an already-created order. */
async function initializePayment(order) {
  if (order.payment_status === 'success') {
    throw new AppError(409, 'already_paid', 'This order has already been paid for.');
  }

  const callbackUrl = `${config.frontendUrl}/success.html?ref=${order.reference}`;
  const paystackData = await paystackService.initializeTransaction({
    email: order.email,
    amountGhs: order.amount,
    reference: order.reference,
    callbackUrl,
  });

  await paymentsRepository.create({
    orderId: order.id,
    paystackReference: order.reference,
    amount: order.amount,
    currency: order.currency,
  });

  return {
    authorizationUrl: paystackData.authorization_url,
    accessCode: paystackData.access_code,
    reference: order.reference,
    publicKey: config.paystack.publicKey,
  };
}

/**
 * Server-side source of truth for "did this order get paid". Called
 * both from the manual verify endpoint (after the Paystack popup
 * closes) and from the Paystack webhook handler — safe to call
 * repeatedly for the same order.
 */
async function verifyAndFulfil(order) {
  // Already confirmed and dispatched — nothing left to do (idempotent).
  if (order.payment_status === 'success' && (order.datasika_order_id || ['processing', 'delivered'].includes(order.delivery_status))) {
    return order;
  }

  const transaction = await paystackService.verifyTransaction(order.reference);

  if (transaction.status !== 'success') {
    if (order.payment_status !== 'failed') {
      await ordersRepository.update(order.id, { payment_status: 'failed' });
      await paymentsRepository.updateByReference(order.reference, { status: transaction.status === 'abandoned' ? 'cancelled' : 'failed' });
    }
    return ordersRepository.findByReference(order.reference);
  }

  const expectedSubunit = paystackService.toSubunit(order.amount);
  if (transaction.amount !== expectedSubunit) {
    logger.error('Paystack amount mismatch — refusing to fulfil', {
      reference: order.reference,
      expected: expectedSubunit,
      received: transaction.amount,
    });
    throw new AppError(409, 'amount_mismatch', 'We detected a payment mismatch for this order. Please contact support with your order reference.');
  }

  if (order.payment_status !== 'success') {
    await paymentsRepository.updateByReference(order.reference, {
      status: 'success',
      channel: transaction.channel,
      paidAt: transaction.paid_at || new Date().toISOString(),
    });
    await ordersRepository.update(order.id, { payment_status: 'success' });
  }

  const freshOrder = await ordersRepository.findByReference(order.reference);
  return deliveryService.fulfil(freshOrder);
}

async function getPublicConfig() {
  return { publicKey: config.paystack.publicKey, mockMode: config.mockMode };
}

module.exports = { initializePayment, verifyAndFulfil, getPublicConfig };
