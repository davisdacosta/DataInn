const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '/api' : 'https://datainn-ghana.onrender.com/api')).replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
      ...options,
    });
  } catch {
    throw new Error("We couldn't reach the server. Check your connection and try again.");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.message || 'Something went wrong. Please try again.');
  }

  return body;
}

export const api = {
  getPlans: () => request('/plans'),
  getPaymentConfig: () => request('/payments/config'),
  createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getOrder: (reference) => request(`/orders/${encodeURIComponent(reference)}`),
  getOrderStatus: (reference) => request(`/orders/${encodeURIComponent(reference)}/status`),
  initializePayment: (reference) => request('/payments/initialize', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  }),
  verifyPayment: (reference) => request(`/payments/verify/${encodeURIComponent(reference)}`),
};