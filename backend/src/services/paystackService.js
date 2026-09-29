const axios = require('axios');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

const client = axios.create({
  baseURL: config.paystack.baseUrl,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${config.paystack.secretKey}`,
    'Content-Type': 'application/json',
  },
});

function handleAxiosError(err, context) {
  if (err.response) {
    logger.error('Paystack request failed', { context, httpStatus: err.response.status, body: err.response.data });
    throw new AppError(502, 'paystack_error', "We couldn't start the payment. Please try again.", JSON.stringify(err.response.data));
  }
  logger.error('Paystack request errored with no response', { context, error: err.message });
  throw new AppError(503, 'paystack_unreachable', "We're temporarily unable to reach the payment network. Please try again shortly.", err.message);
}

/** GHS amount (e.g. 24.00) -> Paystack's smallest currency unit (pesewas). */
function toSubunit(amountGhs) {
  return Math.round(Number(amountGhs) * 100);
}

// Mock-mode ledger, keyed by reference, so verifyTransaction can report
// a consistent simulated result for a transaction we "initialized".
const mockTransactions = new Map();

async function initializeTransaction({ email, amountGhs, reference, callbackUrl }) {
  if (config.mockMode) {
    mockTransactions.set(reference, { email, amountGhs, status: 'success' });
    logger.info('Mock Paystack transaction initialized', { reference, amountGhs });
    return {
      authorization_url: `${config.frontendUrl}/success.html?ref=${reference}&mock=1`,
      access_code: `mock_access_${reference}`,
      reference,
    };
  }

  try {
    const { data } = await client.post('/transaction/initialize', {
      email,
      amount: toSubunit(amountGhs),
      reference,
      callback_url: callbackUrl,
      currency: 'GHS',
    });
    return data.data; // { authorization_url, access_code, reference }
  } catch (err) {
    return handleAxiosError(err, 'initializeTransaction');
  }
}

async function verifyTransaction(reference) {
  if (config.mockMode) {
    const mock = mockTransactions.get(reference);
    if (!mock) throw new AppError(404, 'transaction_not_found', 'We could not find that payment.');
    return {
      reference,
      status: mock.status, // 'success'
      amount: toSubunit(mock.amountGhs),
      currency: 'GHS',
      channel: 'mock',
      paid_at: new Date().toISOString(),
    };
  }

  try {
    const { data } = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    return data.data; // { status, amount, currency, channel, paid_at, reference }
  } catch (err) {
    return handleAxiosError(err, 'verifyTransaction');
  }
}

module.exports = { initializeTransaction, verifyTransaction, toSubunit };
