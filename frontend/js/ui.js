(function () {
  const ICONS = { success: '✓', error: '!', info: 'i' };
  let overlay = null;
  let card = null;
  let lastFocused = null;
  let currentDismissible = true;

  function ensureModalDom() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'presentation');

    card = document.createElement('div');
    card.className = 'modal-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.tabIndex = -1;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay && currentDismissible) hideModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open') && currentDismissible) {
        hideModal();
      }
      if (e.key === 'Tab' && overlay.classList.contains('open')) {
        trapTab(e);
      }
    });
  }

  function trapTab(e) {
    const focusable = card.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /**
   * showModal({ icon, title, body, actions, dismissible })
   * actions: [{ label, variant: 'primary'|'secondary', onClick }]
   */
  function showModal({ icon = 'info', title, body, actions = [], dismissible = true }) {
    ensureModalDom();
    lastFocused = document.activeElement;
    currentDismissible = dismissible;

    card.innerHTML = '';

    if (dismissible) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', hideModal);
      card.appendChild(closeBtn);
    }

    const iconEl = document.createElement('div');
    iconEl.className = `modal-icon ${icon}`;
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = ICONS[icon] || '';
    card.appendChild(iconEl);

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = title;
    card.appendChild(titleEl);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'modal-body';
    bodyEl.textContent = body;
    card.appendChild(bodyEl);

    if (actions.length > 0) {
      const actionsEl = document.createElement('div');
      actionsEl.className = 'modal-actions';
      actions.forEach((action) => {
        const btn = document.createElement('button');
        btn.className = `btn btn-${action.variant || 'primary'}`;
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          if (action.onClick) action.onClick();
        });
        actionsEl.appendChild(btn);
      });
      card.appendChild(actionsEl);
    }

    overlay.classList.add('open');
    requestAnimationFrame(() => card.focus());
  }

  function hideModal() {
    if (!overlay) return;
    overlay.classList.remove('open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function setButtonLoading(btn, loadingText) {
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = loadingText;
  }

  function clearButtonLoading(btn) {
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    btn.disabled = false;
  }

  function formatMoney(amount, currency) {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }

  function formatPhoneDisplay(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length !== 10) return phone;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  window.DataInnUI = {
    showModal,
    hideModal,
    setButtonLoading,
    clearButtonLoading,
    formatMoney,
    formatPhoneDisplay,
  };
})();
