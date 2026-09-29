(function () {
  const API = window.DataInnAPI;
  const UI = window.DataInnUI;
  const Validation = window.DataInnValidation;

  const STEPS = ['panel-network', 'panel-bundle', 'panel-recipient', 'panel-email', 'panel-review', 'panel-payment', 'panel-processing'];
  const dots = document.querySelectorAll('#step-indicator .dot');

  const state = {
    plans: [],
    network: null,
    plan: null,
    recipient: '',
    email: '',
    order: null, // set once /api/orders has been called
    paymentConfig: null,
    pollTimer: null,
    pollAttempts: 0,
  };

  function goToStep(panelId) {
    STEPS.forEach((id, i) => {
      const panel = document.getElementById(id);
      panel.hidden = id !== panelId;
      const dot = dots[i];
      const targetIndex = STEPS.indexOf(panelId);
      dot.classList.toggle('done', i < targetIndex);
      dot.classList.toggle('active', i === targetIndex);
    });
    document.getElementById('step-indicator').setAttribute('aria-valuenow', String(STEPS.indexOf(panelId) + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => goToStep(btn.dataset.back));
  });

  const NETWORK_DOT = { MTN: { cls: 'mtn', label: 'MTN' }, Telecel: { cls: 'telecel', label: 'TC' }, AirtelTigo: { cls: 'airteltigo', label: 'AT' } };

  // ---------------- Step 1: Network ----------------
  function renderNetworks() {
    const networks = [...new Set(state.plans.map((p) => p.network))];
    const wrap = document.getElementById('network-options');
    const emptyState = document.getElementById('network-empty');

    if (networks.length === 0) {
      emptyState.hidden = false;
      UI.showModal({
        icon: 'info',
        title: 'Data bundles unavailable',
        body: "We can't process data bundle orders right now. Please check back shortly.",
        actions: [{ label: 'Return home', variant: 'primary', onClick: () => { window.location.href = 'index.html'; } }],
        dismissible: false,
      });
      return;
    }

    wrap.innerHTML = '';
    networks.forEach((network) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'option-card';
      const dot = NETWORK_DOT[network] || { cls: '', label: network.slice(0, 2).toUpperCase() };
      card.innerHTML = `<span class="network-dot ${dot.cls}">${dot.label}</span><span class="option-title">${network}</span><span class="option-sub">${state.plans.filter((p) => p.network === network).length} bundles</span>`;
      card.addEventListener('click', () => {
        state.network = network;
        document.querySelectorAll('#network-options .option-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        document.getElementById('btn-network-next').disabled = false;
      });
      wrap.appendChild(card);
    });
  }

  document.getElementById('btn-network-next').addEventListener('click', () => {
    renderBundles();
    goToStep('panel-bundle');
  });

  // ---------------- Step 2: Bundle ----------------
  function renderBundles() {
    const wrap = document.getElementById('bundle-options');
    wrap.innerHTML = '';
    const bundles = state.plans.filter((p) => p.network === state.network).sort((a, b) => a.bundleGb - b.bundleGb);

    bundles.forEach((plan) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'bundle-row';
      row.innerHTML = `
        <span class="bundle-main">
          <span class="bundle-size">${plan.bundleGb}GB</span>
          <span class="bundle-validity">${plan.validity}</span>
        </span>
        <span class="bundle-price">${UI.formatMoney(plan.sellingPrice, plan.currency)}</span>
      `;
      row.addEventListener('click', () => {
        state.plan = plan;
        document.querySelectorAll('#bundle-options .bundle-row').forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');
        document.getElementById('btn-bundle-next').disabled = false;
      });
      wrap.appendChild(row);
    });
  }

  document.getElementById('btn-bundle-next').addEventListener('click', () => goToStep('panel-recipient'));

  // ---------------- Step 3: Recipient ----------------
  const recipientInput = document.getElementById('input-recipient');
  recipientInput.addEventListener('input', () => {
    recipientInput.value = recipientInput.value.replace(/\D/g, '').slice(0, 10);
  });

  document.getElementById('btn-recipient-next').addEventListener('click', () => {
    const value = recipientInput.value.trim();
    const valid = Validation.isValidGhPhone(value);
    recipientInput.classList.toggle('has-error', !valid);
    document.getElementById('error-recipient').classList.toggle('visible', !valid);
    if (!valid) return;
    state.recipient = value;
    goToStep('panel-email');
  });

  // ---------------- Step 4: Email ----------------
  const emailInput = document.getElementById('input-email');
  document.getElementById('btn-email-next').addEventListener('click', () => {
    const value = emailInput.value.trim();
    const valid = Validation.isValidEmail(value);
    emailInput.classList.toggle('has-error', !valid);
    document.getElementById('error-email').classList.toggle('visible', !valid);
    if (!valid) return;
    state.email = value;
    renderReview();
    goToStep('panel-review');
  });

  // ---------------- Step 5: Review ----------------
  function renderReview() {
    const list = document.getElementById('review-list');
    const rows = [
      ['Network', state.plan.network],
      ['Bundle', `${state.plan.bundleGb}GB`],
      ['Validity', state.plan.validity],
      ['Recipient', UI.formatPhoneDisplay(state.recipient)],
      ['Email', state.email],
    ];
    list.innerHTML = rows
      .map(([label, value]) => `<div class="review-row"><span class="label">${label}</span><span class="value">${value}</span></div>`)
      .join('');
    document.getElementById('review-total-amount').textContent = UI.formatMoney(state.plan.sellingPrice, state.plan.currency);
  }

  document.getElementById('btn-pay').addEventListener('click', () => {
    UI.showModal({
      icon: 'info',
      title: 'Confirm your order',
      body: `${UI.formatMoney(state.plan.sellingPrice, state.plan.currency)} will be charged to send ${state.plan.bundleGb}GB ${state.plan.network} data to ${UI.formatPhoneDisplay(state.recipient)}.`,
      actions: [
        { label: 'Cancel', variant: 'secondary', onClick: UI.hideModal },
        { label: 'Confirm & pay', variant: 'primary', onClick: () => { UI.hideModal(); startPayment(); } },
      ],
    });
  });

  // ---------------- Step 6: Payment ----------------
  async function startPayment() {
    const payBtn = document.getElementById('btn-pay');
    UI.setButtonLoading(payBtn, 'Creating order...');
    goToStep('panel-payment');
    setPaymentStatusText('Creating your order...');

    try {
      if (!state.order) {
        const { order } = await API.createOrder({ planId: state.plan.id, recipient: state.recipient, email: state.email });
        state.order = order;
      }

      setPaymentStatusText('Opening secure payment...');
      const initResult = await API.initializePayment(state.order.reference);

      if (state.paymentConfig.mockMode || !initResult.publicKey) {
        // No real Paystack in mock mode — simulate the popup completing.
        setPaymentStatusText('Simulating payment (mock mode)...');
        await sleep(900);
        await confirmPaymentAndDispatch();
        return;
      }

      openPaystackPopup(initResult);
    } catch (err) {
      showFatalError(err.message);
    }
  }

  function setPaymentStatusText(text) {
    document.getElementById('payment-status-text').textContent = text;
  }

  function loadPaystackScript() {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) return resolve();
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load the payment provider. Please check your connection.'));
      document.head.appendChild(script);
    });
  }

  async function openPaystackPopup(initResult) {
    try {
      await loadPaystackScript();
    } catch (err) {
      showFatalError(err.message);
      return;
    }

    const handler = window.PaystackPop.setup({
      key: initResult.publicKey,
      email: state.email,
      amount: Math.round(state.plan.sellingPrice * 100),
      currency: state.plan.currency,
      ref: initResult.reference,
      onClose: () => {
        // Popup dismissed without a definite result — verify server-side;
        // if nothing was paid, the order simply stays pending.
        confirmPaymentAndDispatch();
      },
      callback: () => {
        confirmPaymentAndDispatch();
      },
    });
    setPaymentStatusText('Waiting for payment...');
    handler.openIframe();
  }

  // ---------------- Step 7: Verify, dispatch, poll ----------------
  async function confirmPaymentAndDispatch() {
    setPaymentStatusText('Verifying payment...');
    try {
      const { order } = await API.verifyPayment(state.order.reference);
      state.order = order;

      if (order.paymentStatus !== 'success') {
        window.location.href = `failed.html?ref=${encodeURIComponent(order.reference)}&reason=payment`;
        return;
      }

      document.getElementById('processing-bundle').textContent = `${state.plan.bundleGb}GB ${state.plan.network}`;
      document.getElementById('processing-recipient').textContent = UI.formatPhoneDisplay(state.recipient);
      goToStep('panel-processing');
      pollDeliveryStatus();
    } catch (err) {
      showFatalError(err.message);
    }
  }

  function pollDeliveryStatus() {
    state.pollAttempts = 0;
    const MAX_ATTEMPTS_BEFORE_REASSURANCE = 20; // ~60s at 3s interval
    clearInterval(state.pollTimer);

    state.pollTimer = setInterval(async () => {
      state.pollAttempts += 1;
      try {
        const { order } = await API.getOrderStatus(state.order.reference);
        state.order = order;
        document.getElementById('processing-status').textContent = capitalize(order.deliveryStatus);

        if (order.terminal) {
          clearInterval(state.pollTimer);
          if (order.deliveryStatus === 'delivered') {
            window.location.href = `success.html?ref=${encodeURIComponent(order.reference)}`;
          } else {
            window.location.href = `failed.html?ref=${encodeURIComponent(order.reference)}&reason=delivery`;
          }
          return;
        }

        if (state.pollAttempts === MAX_ATTEMPTS_BEFORE_REASSURANCE) {
          UI.showModal({
            icon: 'info',
            title: 'Still on it',
            body: "This delivery is taking a little longer than usual. Your order is safely recorded and we'll keep checking in the background — you don't need to do anything.",
            actions: [{ label: 'OK, keep waiting', variant: 'primary', onClick: UI.hideModal }],
          });
        }
      } catch (err) {
        // A transient polling error shouldn't derail the user — keep trying.
        // eslint-disable-next-line no-console
        console.warn('Status poll failed', err.message);
      }
    }, 3000);
  }

  function showFatalError(message) {
    UI.showModal({
      icon: 'error',
      title: 'Something went wrong',
      body: message || 'An unexpected error occurred. Please try again.',
      actions: [{ label: 'OK', variant: 'primary', onClick: UI.hideModal }],
    });
    UI.clearButtonLoading(document.getElementById('btn-pay'));
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ---------------- Boot ----------------
  async function init() {
    try {
      const [plansResult, paymentConfig] = await Promise.all([API.getPlans(), API.getPaymentConfig()]);
      state.plans = plansResult.plans;
      state.paymentConfig = paymentConfig;
      renderNetworks();
    } catch (err) {
      UI.showModal({
        icon: 'error',
        title: "Couldn't load bundles",
        body: err.message || "We couldn't reach the server. Please try again.",
        actions: [{ label: 'Retry', variant: 'primary', onClick: () => window.location.reload() }],
        dismissible: false,
      });
    }
  }

  init();
})();
