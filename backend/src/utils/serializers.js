const { getPlanValidity } = require('./planValidity');

function serializePlan(plan) {
  return {
    id: plan.id,
    network: plan.network,
    bundleGb: Number(plan.bundle_gb),
    validity: getPlanValidity(plan.network, plan.validity),
    sellingPrice: Number(plan.selling_price),
    currency: plan.currency,
  };
}

const TERMINAL_DELIVERY_STATES = new Set(['delivered', 'failed', 'refunded']);

function isTerminal(order) {
  if (order.payment_status === 'failed' || order.payment_status === 'cancelled') return true;
  return TERMINAL_DELIVERY_STATES.has(order.delivery_status);
}

function serializeOrder(order, plan) {
  return {
    reference: order.reference,
    network: plan.network,
    bundleGb: Number(plan.bundle_gb),
    validity: getPlanValidity(plan.network, plan.validity),
    recipient: order.recipient,
    email: order.email,
    amount: Number(order.amount),
    currency: order.currency,
    paymentStatus: order.payment_status,
    deliveryStatus: order.delivery_status,
    terminal: isTerminal(order),
    createdAt: order.created_at,
  };
}

module.exports = { serializePlan, serializeOrder, isTerminal };
