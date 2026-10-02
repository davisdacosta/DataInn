import { useState } from 'react';
import { ArrowRight, CircleAlert, LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { formatMoney, formatPhone } from '../utils.js';

const statusCopy = {
  delivered: ['Delivered', 'Your data bundle has been sent to the recipient.'],
  processing: ['Processing', 'Your order is being prepared for delivery.'],
  pending: ['Processing', 'Your order is being prepared for delivery.'],
  failed: ['Delivery failed', 'We could not complete delivery. Your payment is being reviewed for refund.'],
  refunded: ['Refunded', 'This order has been refunded.'],
  refund_processing: ['Refund in progress', 'Your refund is being processed.'],
};

export function TrackPage() {
  const [reference, setReference] = useState(new URLSearchParams(window.location.search).get('ref') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const value = reference.trim();
    if (!value) {
      setError('Enter your order reference to continue.');
      return;
    }
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const result = await api.getOrderStatus(value);
      setOrder(result.order);
      const url = new URL(window.location.href);
      url.searchParams.set('ref', value);
      window.history.replaceState({}, '', url);
    } catch (err) {
      setError(err.message || 'We could not find that order. Check the reference and try again.');
    } finally {
      setLoading(false);
    }
  }

  const delivery = order && (statusCopy[order.deliveryStatus] || ['Processing', 'Your latest order status is being checked.']);
  const paymentFailed = order && ['failed', 'cancelled'].includes(order.paymentStatus);

  return (
    <section className="track-page page-width">
      <div className="track-intro"><p className="eyebrow eyebrow-dark">Order lookup</p><h1>Where’s your<br /><span>bundle?</span></h1><p>Enter the reference from your receipt or confirmation email to see the latest status.</p></div>
      <div className="track-content">
        <form className="track-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="order-reference">Order reference</label>
          <div className="track-input"><Search size={18} /><input id="order-reference" autoComplete="off" autoCapitalize="characters" placeholder="DATA-20260924-AB12CD" value={reference} onChange={(event) => { setReference(event.target.value); setError(''); }} /></div>
          {error && <p className="field-error" role="alert"><CircleAlert size={15} /> {error}</p>}
          <button className="button button-ink" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Looking up…</> : <>Track order <ArrowRight size={17} /></>}</button>
          <p className="track-privacy"><ShieldCheck size={14} /> Your order details are only visible to someone with its reference.</p>
        </form>

        {order && <section className={`track-result ${paymentFailed ? 'track-result-error' : ''}`} aria-live="polite">
          <div className="track-status"><span className={`status-light ${paymentFailed || order.deliveryStatus === 'failed' ? 'status-light-error' : ''}`} /><div><small>ORDER STATUS</small><h2>{paymentFailed ? 'Payment not completed' : delivery[0]}</h2></div></div>
          <p className="track-message">{paymentFailed ? 'Your payment could not be completed, so no data was sent.' : delivery[1]}</p>
          <div className="track-order-lines"><div><span>Bundle</span><strong>{order.bundleGb}GB {order.network}</strong></div><div><span>Recipient</span><strong>{formatPhone(order.recipient)}</strong></div><div><span>Order reference</span><strong>{order.reference}</strong></div><div><span>Amount</span><strong>{formatMoney(order.amount, order.currency)}</strong></div></div>
          {order.deliveryStatus !== 'delivered' && !paymentFailed && <button className="text-button refresh-button" type="button" onClick={handleSubmit}>Refresh status <ArrowRight size={14} /></button>}
        </section>}
      </div>
    </section>
  );
}