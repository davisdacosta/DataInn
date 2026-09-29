const plansRepository = require('../db/plansRepository');
const ordersRepository = require('../db/ordersRepository');
const deliveriesRepository = require('../db/deliveriesRepository');
const { AppError } = require('../utils/errors');
const { isValidGhPhone, isValidEmail, generateOrderReference } = require('../utils/helpers');

/**
 * Create a pending order. The amount charged is ALWAYS the plan's
 * selling_price looked up server-side — a planId is the only pricing
 * input we ever trust from the client.
 */
async function createOrder({ planId, recipient, email }) {
  if (!planId) throw new AppError(400, 'plan_id_required', 'Choose a bundle to continue.');
  if (!isValidGhPhone(recipient)) throw new AppError(400, 'invalid_recipient', 'Enter a valid 10-digit Ghanaian phone number.');
  if (!isValidEmail(email)) throw new AppError(400, 'invalid_email', 'Enter a valid email address.');

  const plan = await plansRepository.findById(planId);
  if (!plan || !plan.active) throw new AppError(404, 'plan_unavailable', 'This bundle is no longer available. Please choose another.');

  const order = await ordersRepository.create({
    reference: generateOrderReference(),
    planId: plan.id,
    recipient: recipient.trim(),
    email: email.trim().toLowerCase(),
    amount: plan.selling_price,
    currency: plan.currency,
  });

  return { order, plan };
}

async function getOrderByReference(reference) {
  const order = await ordersRepository.findByReference(reference);
  if (!order) throw new AppError(404, 'order_not_found', 'We could not find that order.');
  return order;
}

/** Full picture of an order for the frontend: order + plan + latest delivery. */
async function getOrderDetail(reference) {
  const order = await getOrderByReference(reference);
  const plan = await plansRepository.findById(order.plan_id);
  const delivery = await deliveriesRepository.findLatestByOrderId(order.id);
  return { order, plan, delivery };
}

module.exports = { createOrder, getOrderByReference, getOrderDetail };
