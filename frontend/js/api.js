(function () {
  const BASE = window.DATASIKA_CONFIG.API_BASE;

  async function request(path, options) {
    let response;
    try {
      response = await fetch(BASE + path, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
    } catch (networkErr) {
      const err = new Error("We couldn't reach the server. Check your connection and try again.");
      err.isNetworkError = true;
      throw err;
    }

    let body = null;
    try {
      body = await response.json();
    } catch {
      // non-JSON response body — fall through with body = null
    }

    if (!response.ok) {
      const message = (body && body.message) || 'Something went wrong. Please try again.';
      const err = new Error(message);
      err.status = response.status;
      err.code = body && body.error;
      throw err;
    }

    return body;
  }

  const DataInnAPI = {
    getPlans: () => request('/plans'),
    createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
    getOrder: (reference) => request(`/orders/${encodeURIComponent(reference)}`),
    getOrderStatus: (reference) => request(`/orders/${encodeURIComponent(reference)}/status`),
    getPaymentConfig: () => request('/payments/config'),
    initializePayment: (reference) => request('/payments/initialize', { method: 'POST', body: JSON.stringify({ reference }) }),
    verifyPayment: (reference) => request(`/payments/verify/${encodeURIComponent(reference)}`),
  };

  window.DataInnAPI = DataInnAPI;
})();
