import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, LoaderCircle, LockKeyhole, Smartphone, Wifi } from 'lucide-react';
import { api } from '../api.js';
import { CatalogSkeleton } from '../components/CatalogSkeleton.jsx';
import { formatMoney, formatPhone } from '../utils.js';

const steps = ['Network', 'Bundle', 'Recipient', 'Email', 'Review', 'Payment', 'Delivery'];
const networkMeta = {
  MTN: { short: 'M', className: 'mtn' },
  Telecel: { short: 'T', className: 'telecel' },
  AirtelTigo: { short: 'A', className: 'airteltigo' },
};

function stepName(step) {
  return ['Choose network', 'Choose bundle', 'Recipient number', 'Your email', 'Review order', 'Secure payment', 'Delivery status'][step];
}

export function CheckoutPage() {
  const [plans, setPlans] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [step, setStep] = useState(0);
  const [network, setNetwork] = useState('');
  const [plan, setPlan] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('Setting up your secure checkout…');
  const [notice, setNotice] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const paymentStarted = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getPlans(), api.getPaymentConfig()])
      .then(([planResult, config]) => {
        if (!alive) return;
        setPlans(planResult.plans || []);
        setPaymentConfig(config);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const networks = useMemo(() => [...new Set(plans.map((item) => item.network))], [plans]);
  const bundles = useMemo(() => plans
    .filter((item) => item.network === network)
    .sort((a, b) => a.bundleGb - b.bundleGb), [network, plans]);

  useEffect(() => {
    if (step !== 6 || !order?.reference) return undefined;
    let attempts = 0;
    let finished = false;
    let pending = false;
    const poll = async () => {
      if (pending || finished) return;
      pending = true;
      attempts += 1;
      try {
        const result = await api.getOrderStatus(order.reference);
        if (finished) return;
        setOrder(result.order);
        setNotice(attempts >= 20 && !result.order.terminal ? 'Delivery is taking longer than usual. Your order is recorded; we’ll keep checking.' : '');
        if (result.order.terminal) {
          finished = true;
          window.location.assign(result.order.deliveryStatus === 'delivered'
            ? `/success.html?ref=${encodeURIComponent(order.reference)}`
            : `/failed.html?ref=${encodeURIComponent(order.reference)}&reason=delivery`);
        }
      } catch {
        setNotice('We are having trouble refreshing the status. We’ll keep trying.');
      } finally {
        pending = false;
      }
    };
    poll();
    const timer = window.setInterval(poll, 3000);
    return () => {
      finished = true;
      window.clearInterval(timer);
    };
  }, [order?.reference, step]);

  function advance(nextStep) {
    setFieldError('');
    setError('');
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateRecipient() {
    if (!/^0\d{9}$/.test(recipient.trim())) {
      setFieldError('Enter a valid 10-digit Ghanaian phone number.');
      return;
    }
    advance(3);
  }

  function validateEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Enter a valid email address.');
      return;
    }
    advance(4);
  }

  async function loadPaystack() {
    if (window.PaystackPop) return;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-paystack]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load Paystack. Check your connection and try again.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.dataset.paystack = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load Paystack. Check your connection and try again.'));
      document.head.appendChild(script);
    });
  }

  async function verifyAndContinue(orderToVerify = order) {
    if (!orderToVerify) return;
    setPaymentMessage('Verifying your payment…');
    try {
      const result = await api.verifyPayment(orderToVerify.reference);
      setOrder(result.order);
      if (result.order.paymentStatus !== 'success') {
        window.location.assign(`/failed.html?ref=${encodeURIComponent(orderToVerify.reference)}&reason=payment`);
        return;
      }
      setPaymentMessage('Payment confirmed. Sending your bundle…');
      advance(6);
    } catch (err) {
      paymentStarted.current = false;
      setError(err.message);
      setStep(4);
    }
  }

  async function startPayment() {
    if (paymentStarted.current) return;
    paymentStarted.current = true;
    setConfirmOpen(false);
    setBusy(true);
    setError('');
    setPaymentMessage('Creating your order…');
    advance(5);
    try {
      let currentOrder = order;
      if (!currentOrder) {
        const created = await api.createOrder({ planId: plan.id, recipient: recipient.trim(), email: email.trim() });
        currentOrder = created.order;
        setOrder(currentOrder);
      }
      setPaymentMessage('Opening secure payment…');
      const payment = await api.initializePayment(currentOrder.reference);
      if (paymentConfig?.mockMode || !payment.publicKey) {
        setPaymentMessage('Completing test payment…');
        window.setTimeout(() => verifyAndContinue(currentOrder), 800);
        return;
      }
      await loadPaystack();
      let verified = false;
      const verifyOnce = () => {
        if (verified) return;
        verified = true;
        verifyAndContinue(currentOrder);
      };
      const handler = window.PaystackPop.setup({
        key: payment.publicKey,
        email: email.trim(),
        amount: Math.round(plan.sellingPrice * 100),
        currency: plan.currency,
        ref: payment.reference,
        onClose: verifyOnce,
        callback: verifyOnce,
      });
      setPaymentMessage('Waiting for payment…');
      handler.openIframe();
    } catch (err) {
      paymentStarted.current = false;
      setError(err.message);
      setStep(4);
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    if (step === 1) setNetwork('');
    if (step === 2) setPlan(null);
    advance(Math.max(0, step - 1));
  }

  return (
    <section className="checkout-page page-width">
      <div className="checkout-topline"><a href="/" className="back-home"><ArrowLeft size={16} /> Back to DataInn</a><span><LockKeyhole size={14} /> Secure checkout</span></div>
      <div className="checkout-layout">
        <div className="checkout-main">
          <div className="checkout-progress" aria-label={`Step ${Math.min(step + 1, 7)} of 7`}>
            <div className="progress-track"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
            <div className="progress-label"><span>STEP {String(step + 1).padStart(2, '0')} <i>/ 07</i></span><span>{steps[step]}</span></div>
          </div>
          <div className="checkout-heading"><p className="eyebrow eyebrow-dark">DataInn checkout</p><h1>{stepName(step)}</h1><p>{step === 0 ? 'Which network should receive the bundle?' : step === 1 ? 'Choose the size that works for you.' : step === 2 ? 'Enter the Ghanaian number that will receive the data.' : step === 3 ? 'We’ll send your receipt and order updates here.' : step === 4 ? 'Take a moment to check everything.' : step === 5 ? 'Your payment is handled securely by Paystack.' : 'Your bundle is on its way.'}</p></div>

          {loading && <CatalogSkeleton />}
          {!loading && error && step < 5 && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{error}</span><button type="button" className="text-button" onClick={() => window.location.reload()}>Retry</button></div>}
          {!loading && !error && plans.length === 0 && step === 0 && <div className="empty-panel"><Wifi size={22} /><p>Bundles aren’t available right now. Please check back shortly.</p></div>}

          {!loading && !error && step === 0 && plans.length > 0 && <div className="network-options">
            {networks.map((name) => {
              const meta = networkMeta[name] || { short: name.slice(0, 1).toUpperCase(), className: 'other' };
              return <button className={`network-option ${network === name ? 'selected' : ''}`} key={name} type="button" onClick={() => { setNetwork(name); setPlan(null); }} aria-pressed={network === name}>
                <span className={`network-symbol ${meta.className}`}>{meta.short}</span><span className="network-option-copy"><strong>{name}</strong><small>{plans.filter((item) => item.network === name).length} bundles available</small></span><span className="radio-mark" />
              </button>;
            })}
            <div className="step-actions"><span /><button className="button button-ink" type="button" disabled={!network} onClick={() => advance(1)}>Choose bundle <ArrowRight size={17} /></button></div>
          </div>}

          {!loading && !error && step === 1 && <div className="bundle-options">
            <button className="inline-back" type="button" onClick={goBack}><ArrowLeft size={15} /> Change network</button>
            {bundles.map((item) => <button className={`bundle-option ${plan?.id === item.id ? 'selected' : ''}`} type="button" key={item.id} onClick={() => setPlan(item)} aria-pressed={plan?.id === item.id}>
              <span className="bundle-gb">{item.bundleGb}<small>GB</small></span><span className="bundle-info"><strong>{item.validity}</strong><small>{item.network} data</small></span><span className="bundle-price">{formatMoney(item.sellingPrice, item.currency)}</span><span className="radio-mark" />
            </button>)}
            <div className="step-actions"><button className="button button-quiet" type="button" onClick={goBack}>Back</button><button className="button button-ink" type="button" disabled={!plan} onClick={() => advance(2)}>Continue <ArrowRight size={17} /></button></div>
          </div>}

          {step === 2 && <div className="checkout-form"><label htmlFor="recipient">Recipient phone number</label><div className={`input-wrap ${fieldError ? 'has-error' : ''}`}><span className="input-prefix">+233</span><input id="recipient" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="024 123 4567" maxLength={10} value={recipient} onChange={(event) => { setRecipient(event.target.value.replace(/\D/g, '').slice(0, 10)); setFieldError(''); }} /></div><small className="field-hint">10 digits, starting with 0. Double-check the recipient number.</small>{fieldError && <p className="field-error" role="alert">{fieldError}</p>}<div className="step-actions"><button className="button button-quiet" type="button" onClick={goBack}>Back</button><button className="button button-ink" type="button" onClick={validateRecipient}>Continue <ArrowRight size={17} /></button></div></div>}

          {step === 3 && <div className="checkout-form"><label htmlFor="email">Email address</label><input className={fieldError ? 'has-error' : ''} id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setFieldError(''); }} />{fieldError && <p className="field-error" role="alert">{fieldError}</p>}<small className="field-hint">We’ll send your receipt and order updates here.</small><div className="step-actions"><button className="button button-quiet" type="button" onClick={goBack}>Back</button><button className="button button-ink" type="button" onClick={validateEmail}>Review order <ArrowRight size={17} /></button></div></div>}

          {step === 4 && <div className="review-panel"><div className="review-rows"><div><span>Network</span><strong>{plan?.network}</strong></div><div><span>Bundle</span><strong>{plan?.bundleGb}GB</strong></div><div><span>Validity</span><strong>{plan?.validity}</strong></div><div><span>Recipient</span><strong>{formatPhone(recipient)}</strong></div><div><span>Email</span><strong className="review-email">{email}</strong></div></div><div className="review-total"><span>Total to pay</span><strong>{formatMoney(plan?.sellingPrice, plan?.currency)}</strong></div>{error && <div className="form-alert" role="alert"><CircleAlert size={18} />{error}</div>}<div className="step-actions"><button className="button button-quiet" type="button" onClick={goBack}>Back</button><button className="button button-lime" type="button" disabled={busy} onClick={() => setConfirmOpen(true)}>Continue to payment <ArrowRight size={17} /></button></div><p className="secure-note"><LockKeyhole size={13} /> You’ll confirm the charge before Paystack opens.</p></div>}

          {step === 5 && <div className="payment-state"><LoaderCircle className="spin payment-spinner" size={38} /><h2>{paymentMessage}</h2><p>Please keep this page open while we confirm the order.</p>{error && <div className="form-alert" role="alert">{error}<button className="text-button" type="button" onClick={() => advance(4)}>Return to review</button></div>}</div>}

          {step === 6 && <div className="payment-state delivery-state"><span className="delivery-check"><Check size={25} /></span><p className="eyebrow eyebrow-dark">Payment successful</p><h2>Sending {plan?.bundleGb}GB {plan?.network}</h2><p>To <strong>{formatPhone(recipient)}</strong></p><div className="delivery-status"><span className="status-pulse" /> Status: {order?.deliveryStatus || 'Processing'}</div>{notice && <div className="form-alert notice-alert" role="status">{notice} <a href="/track.html">Track this order <ChevronRight size={14} /></a></div>}<small>Your order reference: {order?.reference}</small></div>}

          {confirmOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirmOpen(false)}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><span className="modal-icon"><Smartphone size={21} /></span><h2 id="confirm-title">Confirm your order</h2><p>{formatMoney(plan?.sellingPrice, plan?.currency)} will send {plan?.bundleGb}GB {plan?.network} data to {formatPhone(recipient)}.</p><div className="modal-actions"><button className="button button-quiet" type="button" onClick={() => setConfirmOpen(false)}>Review details</button><button className="button button-ink" type="button" disabled={busy} onClick={startPayment}>Confirm & pay</button></div></section></div>}
        </div>

        <aside className="checkout-aside">
          <div className="aside-heading"><span className="aside-icon"><Smartphone size={17} /></span><span>ORDER SUMMARY</span></div>
          {plan ? <><div className="aside-bundle"><span className={`network-symbol ${networkMeta[plan.network]?.className || 'other'}`}>{networkMeta[plan.network]?.short || plan.network.slice(0, 1)}</span><div><strong>{plan.bundleGb}GB {plan.network}</strong><small>{plan.validity}</small></div></div><div className="aside-rule" /><div className="aside-total"><span>Total</span><strong>{formatMoney(plan.sellingPrice, plan.currency)}</strong></div></> : <div className="aside-empty"><Wifi size={19} /><p>Your bundle details will appear here as you choose.</p></div>}
          <div className="aside-guarantees"><p><Check size={14} /> Clear price before payment</p><p><Check size={14} /> Secure Paystack checkout</p><p><Check size={14} /> Order status tracking</p></div>
        </aside>
      </div>
      <p className="checkout-legal"><LockKeyhole size={13} /> Your payment details are handled securely by Paystack.</p>
    </section>
  );
}