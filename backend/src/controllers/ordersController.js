const orderService = require('../services/orderService');
const deliveryService = require('../services/deliveryService');
const { serializeOrder } = require('../utils/serializers');
const { asyncHandler } = require('../utils/helpers');

const createOrder = asyncHandler(async (req, res) => {
  const { planId, recipient, email } = req.body || {};
  const { order, plan } = await orderService.createOrder({ planId, recipient, email });
  res.status(201).json({ order: serializeOrder(order, plan) });
});

const getOrder = asyncHandler(async (req, res) => {
  const { order, plan } = await orderService.getOrderDetail(req.params.reference);
  res.json({ order: serializeOrder(order, plan) });
});

const getOrderStatus = asyncHandler(async (req, res) => {
  let { order, plan } = await orderService.getOrderDetail(req.params.reference);

  // If payment succeeded and dispatch has happened, use DataSika's
  // status endpoint as the authoritative fallback in case a webhook
  // was missed or delayed — never overrides a terminal state.
  if (order.payment_status === 'success' && order.datasika_order_id) {
    order = await deliveryService.syncStatusFromProvider(order);
  }

  res.json({ order: serializeOrder(order, plan) });
});

module.exports = { createOrder, getOrder, getOrderStatus };
