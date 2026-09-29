const orderService = require('../services/orderService');
const paymentService = require('../services/paymentService');
const webhookService = require('../services/webhookService');
const { serializeOrder } = require('../utils/serializers');
const { asyncHandler } = require('../utils/helpers');
const logger = require('../utils/logger');

/** Public, non-secret info the frontend needs to render the payment step. */
const getPaymentConfig = asyncHandler(async (req, res) => {
  res.json(await paymentService.getPublicConfig());
});

const initializePayment = asyncHandler(async (req, res) => {
  const { reference } = req.body || {};
  if (!reference) return res.status(400).json({ error: 'reference_required', message: 'An order reference is required.' });

  const order = await orderService.getOrderByReference(reference);
  const result = await paymentService.initializePayment(order);
  res.json(result);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderByReference(req.params.reference);
  const updatedOrder = await paymentService.verifyAndFulfil(order);
  const { plan } = await orderService.getOrderDetail(updatedOrder.reference);
  res.json({ order: serializeOrder(updatedOrder, plan) });
});

/**
 * Raw-body webhook. Must respond fast — signature verification and event
 * recording are the only synchronous work; delivery-status updates are a
 * single fast DB write, not an external call, so we do them inline before
 * responding rather than adding queue infrastructure this MVP doesn't need.
 */
const paystackWebhook = asyncHandler(async (req, res) => {
  try {
    const result = await webhookService.processPaystackWebhook(req.rawBody, req.get('x-paystack-signature'));
    res.status(200).json({ received: true, duplicate: !!result.duplicate });
  } catch (err) {
    if (err.httpStatus === 401) return res.status(401).json({ error: 'invalid_signature' });
    if (err.httpStatus === 400) return res.status(400).json({ error: 'invalid_payload' });
    logger.error('Paystack webhook processing failed', { error: err.message });
    // Still 200 so Paystack doesn't hammer retries for an error on our
    // side after the event was already safely recorded; genuine
    // signature/payload problems are handled above.
    res.status(200).json({ received: true });
  }
});

module.exports = { getPaymentConfig, initializePayment, verifyPayment, paystackWebhook };
