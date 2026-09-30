import { useEffect, useState } from 'react';
import { ArrowRight, CircleAlert, CircleCheck, RefreshCw } from 'lucide-react';
import { api } from '../api.js';
import { SplashLoader } from '../components/SplashLoader.jsx';
import { formatMoney, formatPhone } from '../utils.js';

export function ResultPage({ kind }) {
  const reference = new URLSearchParams(window.location.search).get('ref');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(reference));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reference) return undefined;
    let alive = true;
    api.getOrder(reference)
      .then(({ order: current }) => {
        if (!alive) return;
        setOrder(current);
        if (kind === 'success' && current.deliveryStatus !== 'delivered') {
          window.location.replace(`/failed.html?ref=${encodeURIComponent(reference)}`);
        } else if (kind === 'failed' && current.deliveryStatus === 'delivered') {
          window.location.replace(`/success.html?ref=${encodeURIComponent(reference)}`);
        }
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [kind, reference]);

  if (loading) return <SplashLoader label={kind === 'success' ? 'Confirming delivery' : 'Loading your order'} />;
  const success = kind === 'success' && order?.deliveryStatus === 'delivered';
  let eyebrow = success ? 'Delivered to the recipient' : 'Order update';
  let heading = success ? 'Data delivered.' : 'Still processing.';
  let message = success
    ? `${order.bundleGb}GB ${order.network} sent to ${formatPhone(order.recipient)}.`
    : "This order hasn't finished processing yet. Refresh in a moment or use your reference to check its latest status.";

  if (!reference) {
    heading = 'No order reference.';
    message = 'Use the reference from your receipt to look up an order.';
  } else if (error) {
    heading = 'We couldn’t load this order.';
    message = `${error} If you were charged, contact support with your order reference.`;
  } else if (order?.paymentStatus === 'failed' || order?.paymentStatus === 'cancelled') {
    eyebrow = 'Payment status';
    heading = 'Payment not completed.';
    message = 'Your payment could not be completed, so no data was sent. You have not been charged.';
  } else if (order?.deliveryStatus === 'refunded' || order?.deliveryStatus === 'refund_processing') {
    eyebrow = 'Refund status';
    heading = 'Refund in progress.';
    message = 'Your payment is being reviewed and refunded where applicable. You can track the latest status using your reference.';
  } else if (order?.deliveryStatus === 'failed') {
    eyebrow = 'Delivery status';
    heading = 'Delivery didn’t complete.';
    message = 'We could not complete the data delivery. Your payment is being reviewed and refunded where applicable.';
  }

  return (
    <section className="result-page page-width">
      <div className={`result-mark ${success ? 'success' : 'failure'}`}>{success ? <CircleCheck size={34} /> : <CircleAlert size={34} />}</div>
      <p className="eyebrow eyebrow-dark">{eyebrow}</p>
      <h1>{heading}</h1>
      <p className="result-message">{message}</p>
      {order && <div className="result-details"><div><span>Network</span><strong>{order.network}</strong></div><div><span>Bundle</span><strong>{order.bundleGb}GB</strong></div><div><span>Recipient</span><strong>{formatPhone(order.recipient)}</strong></div><div><span>Paid</span><strong>{formatMoney(order.amount, order.currency)}</strong></div><div><span>Reference</span><strong>{order.reference}</strong></div></div>}
      <div className="result-actions"><a className="button button-lime" href="/buy.html">Buy another bundle <ArrowRight size={17} /></a><a className="button button-quiet" href={reference ? `/track.html?ref=${encodeURIComponent(reference)}` : '/track.html'}>{success ? <RefreshCw size={16} /> : null} Track order</a></div>
    </section>
  );
}