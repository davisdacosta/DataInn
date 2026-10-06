const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '/api' : 'https://datainn-ghana.onrender.com/api')).replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    const { headers: requestHeaders, ...fetchOptions } = options;
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...requestHeaders,
      },
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
  getStorefrontSettings: () => request('/storefront/settings'),
  getPaymentConfig: () => request('/payments/config'),
  createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getOrder: (reference) => request(`/orders/${encodeURIComponent(reference)}`),
  getOrderStatus: (reference) => request(`/orders/${encodeURIComponent(reference)}/status`),
  initializePayment: (reference) => request('/payments/initialize', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  }),
  verifyPayment: (reference) => request(`/payments/verify/${encodeURIComponent(reference)}`),
  adminLogin: (email, password) => request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  getAdminSettings: (token) => request('/admin/settings', {
    headers: { Authorization: `Bearer ${token}` },
  }),
  updateAdminSettings: (token, settings) => request('/admin/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ settings }),
  }),
};