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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!reference) return undefined;
    let alive = true;
    let attempts = 0;
    let timer;
    const retryDelays = [1500, 3000, 5000, 8000];

    async function checkOrder() {
      attempts += 1;
      let current;
      let checkError;
      try {
        ({ order: current } = await api.verifyPayment(reference));
      } catch (err) {
        checkError = err;
        try {
          ({ order: current } = await api.getOrder(reference));
        } catch {
          // The next bounded retry or the customer's manual retry can recover.
        }
      }

      if (!alive) return;
      if (current?.paymentStatus === 'success' && !['delivered', 'failed', 'refunded', 'refund_processing'].includes(current.deliveryStatus)) {
        try {
          ({ order: current } = await api.getOrderStatus(reference));
        } catch {
          // Payment is still confirmed even if delivery status is temporarily unavailable.
        }
      }
      if (!alive) return;

      if (current) {
        setOrder(current);
        setError('');
      } else {
        setError(checkError?.message || "We couldn't reach the server to confirm this payment.");
      }
      setLoading(false);

      const needsPaymentCheck = !current || current.paymentStatus === 'pending';
      const needsDeliveryCheck = current?.paymentStatus === 'success'
        && !['delivered', 'failed', 'refunded', 'refund_processing'].includes(current.deliveryStatus);
      if (needsPaymentCheck && attempts < 5) {
        timer = window.setTimeout(checkOrder, retryDelays[attempts - 1]);
      } else if (needsDeliveryCheck) {
        timer = window.setTimeout(checkOrder, 3000);
      }
    }

    checkOrder();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [reference, retryCount]);

  if (loading) return <SplashLoader label={kind === 'success' ? 'Confirming delivery' : 'Loading your order'} />;
  const paymentConfirmed = order?.paymentStatus === 'success';
  const delivered = paymentConfirmed && order?.deliveryStatus === 'delivered';
  const success = kind === 'success' && paymentConfirmed && !['failed', 'refunded', 'refund_processing'].includes(order?.deliveryStatus);
  let eyebrow = delivered ? 'Delivered to the recipient' : success ? 'Payment successful' : 'Order update';
  let heading = delivered ? 'Data delivered.' : success ? 'Payment confirmed.' : 'Still processing.';
  let message = delivered
    ? `${order.bundleGb}GB ${order.network} sent to ${formatPhone(order.recipient)}.`
    : success
      ? `Your payment is confirmed. We’re processing delivery of ${order.bundleGb}GB ${order.network} to ${formatPhone(order.recipient)}.`
      : 'Your payment status is being checked. Do not pay again while this order is pending.';

  if (!reference) {
    heading = 'No order reference.';
    message = 'Use the reference from your receipt to look up an order.';
  } else if (error) {
    eyebrow = 'Payment status';
    heading = 'We couldn’t confirm your payment yet.';
    message = 'We’re having trouble reaching the server. Do not make another payment yet. We’ll retry automatically; you can also check again using your order reference.';
  } else if (order?.paymentStatus === 'failed' || order?.paymentStatus === 'cancelled') {
    eyebrow = 'Payment status';
    heading = 'Payment not completed.';
    message = 'Our records do not show a completed payment, so no data was sent. Check your Paystack receipt or bank statement before trying again.';
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
      <div className="result-actions"><a className="button button-lime" href="/buy">Buy another bundle <ArrowRight size={17} /></a>{reference && <button className="button button-quiet" type="button" onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }}><RefreshCw size={16} /> Check status</button>}<a className="button button-quiet" href={reference ? `/track?ref=${encodeURIComponent(reference)}` : '/track'}>Track order</a></div>
    </section>
  );
}