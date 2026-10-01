const axios = require('axios');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { fromDatasikaErrorCode, AppError } = require('../utils/errors');

const client = axios.create({
  baseURL: config.datasika.baseUrl,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${config.datasika.apiKey}`,
    'Content-Type': 'application/json',
  },
});

function getRetryAfterSeconds(headers, body) {
  const value = body?.retry_after ?? headers?.['retry-after'];
  if (value === undefined || value === null || value === '') return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return undefined;
  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

/** Convert any axios failure into our normalized AppError. */
function handleAxiosError(err, context) {
  if (err.response) {
    const body = err.response.data || {};
    const code = body.error || body.code || 'purchase_failed';
    logger.error('DataSika request failed', {
      context,
      httpStatus: err.response.status,
      providerCode: code,
      providerMessage: body.message,
    });
    throw fromDatasikaErrorCode(code, `${context}: HTTP ${err.response.status} ${JSON.stringify(body)}`, {
      retryAfter: getRetryAfterSeconds(err.response.headers, body),
    });
  }
  logger.error('DataSika request errored with no response (network/timeout)', {
    context,
    error: err.message,
  });
  throw new AppError(503, 'datasika_unreachable', "We're temporarily unable to reach the data delivery network. Please try again shortly.", err.message);
}

// ---------------------------------------------------------------------
// Mock-mode fixtures — used only when config.mockMode is true, so the
// whole app can be built and tested with zero real credentials.
// ---------------------------------------------------------------------
const MOCK_CATALOG = [
  { product_id: 'mock-mtn-1gb', network: 'MTN', bundle_gb: 1, price: 5.5, currency: 'GHS', validity: 'non-expiry' },
  { product_id: 'mock-mtn-2gb', network: 'MTN', bundle_gb: 2, price: 10.5, currency: 'GHS', validity: 'non-expiry' },
  { product_id: 'mock-mtn-5gb', network: 'MTN', bundle_gb: 5, price: 21.0, currency: 'GHS', validity: 'non-expiry' },
  { product_id: 'mock-mtn-10gb', network: 'MTN', bundle_gb: 10, price: 39.0, currency: 'GHS', validity: 'non-expiry' },
  { product_id: 'mock-telecel-1gb', network: 'Telecel', bundle_gb: 1, price: 6.0, currency: 'GHS', validity: '30 days' },
  { product_id: 'mock-telecel-5gb', network: 'Telecel', bundle_gb: 5, price: 22.5, currency: 'GHS', validity: '30 days' },
  { product_id: 'mock-telecel-10gb', network: 'Telecel', bundle_gb: 10, price: 41.0, currency: 'GHS', validity: '30 days' },
  { product_id: 'mock-at-1gb', network: 'AirtelTigo', bundle_gb: 1, price: 5.75, currency: 'GHS', validity: '30 days' },
  { product_id: 'mock-at-5gb', network: 'AirtelTigo', bundle_gb: 5, price: 21.5, currency: 'GHS', validity: '30 days' },
  { product_id: 'mock-at-10gb', network: 'AirtelTigo', bundle_gb: 10, price: 40.0, currency: 'GHS', validity: '30 days' },
];

// Mock orders live for the process lifetime so status polling behaves
// like the real, asynchronous provider (Pending -> delivered a few
// seconds later).
const mockOrders = new Map();
let mockOrderCounter = 0;

async function getCatalog() {
  if (config.mockMode) {
    return {
      services: { data_bundles: { available: true, items: MOCK_CATALOG } },
      enabled_services: ['data_bundles'],
    };
  }
  try {
    const { data } = await client.get('/api-catalog');
    return data;
  } catch (err) {
    return handleAxiosError(err, 'getCatalog');
  }
}

async function buyDataBundle({ productId, recipient, idempotencyKey }) {
  if (config.mockMode) {
    const product = MOCK_CATALOG.find((p) => p.product_id === productId);
    if (!product) throw fromDatasikaErrorCode('product_unavailable', `mock: unknown product_id ${productId}`);

    mockOrderCounter += 1;
    const orderId = `MOCK-${String(mockOrderCounter).padStart(6, '0')}`;
    mockOrders.set(orderId, { status: 'Pending', createdAt: Date.now() });

    logger.info('Mock DataSika purchase created', { orderId, productId, recipient, idempotencyKey });
    return {
      order_id: orderId,
      status: 'Pending',
      network: product.network,
      bundle_gb: product.bundle_gb,
      recipient,
      amount_charged: product.price,
      new_balance: 1000 - product.price,
    };
  }

  try {
    const { data } = await client.post(
      '/api-buy-data',
      { product_id: productId, recipient },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return data;
  } catch (err) {
    return handleAxiosError(err, 'buyDataBundle');
  }
}

async function getOrderStatus(orderId) {
  if (config.mockMode) {
    const mock = mockOrders.get(orderId);
    if (!mock) throw fromDatasikaErrorCode('order_not_found', `mock: unknown order_id ${orderId}`);

    // Simulate real-world async delivery: "delivered" ~4s after creation.
    const status = Date.now() - mock.createdAt > 4000 ? 'delivered' : 'processing';
    mock.status = status;
    return { order_id: orderId, status, recipient: 'mock', network: 'MTN', bundle_gb: 1, amount_charged: 0 };
  }

  try {
    const { data } = await client.get('/api-order-status', { params: { order_id: orderId } });
    return data;
  } catch (err) {
    return handleAxiosError(err, 'getOrderStatus');
  }
}

module.exports = { getCatalog, buyDataBundle, getOrderStatus };
