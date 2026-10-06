const paystackService = require('./paystackService');
const deliveryService = require('./deliveryService');
const ordersRepository = require('../db/ordersRepository');
const paymentsRepository = require('../db/paymentsRepository');
const plansRepository = require('../db/plansRepository');
const logger = require('../utils/logger');
const { config } = require('../config/env');
const { AppError } = require('../utils/errors');
const siteSettingsService = require('./siteSettingsService');

const PAYSTACK_FEE_PERCENT = 4;

function getPaymentAmounts(amount) {
  const baseAmountSubunit = paystackService.toSubunit(amount);
  const feeSubunit = Math.round(baseAmountSubunit * PAYSTACK_FEE_PERCENT / 100);
  return {
    baseAmountSubunit,
    feeSubunit,
    amountSubunit: baseAmountSubunit + feeSubunit,
  };
}

/** Start a Paystack transaction for an already-created order. */
async function initializePayment(order) {
  if (order.payment_status === 'success') {
    throw new AppError(409, 'already_paid', 'This order has already been paid for.');
  }
  const plan = await plansRepository.findById(order.plan_id);
  if (plan && !(await siteSettingsService.isNetworkEnabled(plan.network))) {
    throw new AppError(409, 'network_unavailable', `${plan.network} data is temporarily unavailable. Please choose another network.`);
  }

  const paymentAmounts = getPaymentAmounts(order.amount);
  const amountGhs = paymentAmounts.amountSubunit / 100;
  const callbackUrl = `${config.frontendUrl}/success?ref=${order.reference}`;
  const paystackData = await paystackService.initializeTransaction({
    email: order.email,
    amountGhs,
    reference: order.reference,
    callbackUrl,
  });

  await paymentsRepository.create({
    orderId: order.id,
    paystackReference: order.reference,
    amount: amountGhs,
    currency: order.currency,
  });

  return {
    authorizationUrl: paystackData.authorization_url,
    accessCode: paystackData.access_code,
    reference: order.reference,
    publicKey: config.paystack.publicKey,
    ...paymentAmounts,
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

  const expectedSubunit = getPaymentAmounts(order.amount).amountSubunit;
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
