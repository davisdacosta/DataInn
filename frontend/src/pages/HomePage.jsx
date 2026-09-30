import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Check, CircleHelp, CreditCard, RefreshCw, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import { api } from '../api.js';
import { CatalogSkeleton } from '../components/CatalogSkeleton.jsx';

const networkMeta = {
  MTN: { short: 'M', className: 'mtn' },
  Telecel: { short: 'T', className: 'telecel' },
  AirtelTigo: { short: 'A', className: 'airteltigo' },
};

const faq = [
  ['How long does delivery take?', 'Most bundles arrive within a few minutes after payment. You can follow the status from the order tracking page.'],
  ['Do I need an account?', 'No account is needed. Provide the recipient number and your email at checkout.'],
  ['Can I buy for someone else?', 'Yes. Enter the Ghanaian number that should receive the bundle, then check it carefully before paying.'],
  ['What if delivery fails?', 'If we cannot complete delivery, the order is reviewed for an automatic refund. You can track progress with your order reference.'],
  ['Which payment methods are supported?', 'Payments are processed securely by Paystack, including supported cards and mobile money options.'],
];

export function HomePage() {
  const [plans, setPlans] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    let active = true;
    api.getPlans()
      .then(({ plans: catalogPlans }) => {
        if (active) setPlans(catalogPlans || []);
      })
      .catch((error) => {
        if (active) setCatalogError(error.message);
      })
      .finally(() => {
        if (active) setLoadingCatalog(false);
      });

    return () => { active = false; };
  }, []);

  const networkCounts = plans.reduce((counts, plan) => {
    counts.set(plan.network, (counts.get(plan.network) || 0) + 1);
    return counts;
  }, new Map());
  const networks = [...networkCounts].map(([name, count]) => ({
    name,
    count,
    ...networkMeta[name] || { short: name.slice(0, 1).toUpperCase(), className: 'other' },
  }));
  const featuredPlan = plans[0];

  return (
    <>
      <section className="hero-band">
        <div className="hero-grid page-width">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark"><Zap size={13} fill="currentColor" /></span> Ghana's data, on your terms</p>
            <h1>Send data.<br /><span>Keep moving.</span></h1>
            <p className="hero-description">Choose a bundle for any Ghanaian number. Pay securely, and we’ll take care of delivery.</p>
            <div className="hero-actions">
              <a className="button button-lime" href="/buy.html">Choose a bundle <ArrowRight size={17} /></a>
              <a className="text-link" href="#how-it-works">See how it works <ArrowDown size={15} /></a>
            </div>
            <div className="trust-line"><ShieldCheck size={17} /><span>Secure checkout</span><i /><span>No account needed</span><i /><span>Automatic status updates</span></div>
          </div>

          <div className="hero-art" aria-label="Example of a delivered data order">
            <div className="signal-orbit orbit-one" />
            <div className="signal-orbit orbit-two" />
            <div className="receipt-slip">
              <div className="receipt-top"><span className="receipt-label">DATA DELIVERY</span><span className="receipt-check"><Check size={15} /></span></div>
              <div className="receipt-amount">{featuredPlan ? <>{featuredPlan.bundleGb}<span>GB</span></> : 'Data'}</div>
              <div className="receipt-network">
                <span className={`mini-network ${networkMeta[featuredPlan?.network]?.className || 'other'}`}>
                  {networkMeta[featuredPlan?.network]?.short || featuredPlan?.network.slice(0, 1).toUpperCase() || 'D'}
                </span>
                <span>{featuredPlan ? `${featuredPlan.network} · ${featuredPlan.validity}` : 'Bundle catalog'}</span>
              </div>
              <div className="receipt-rule" />
              <div className="receipt-row"><span>Recipient</span><strong>024 ••• •567</strong></div>
              <div className="receipt-status"><span className="status-pulse" /> Bundle delivered <span>Just now</span></div>
            </div>
            <div className="floating-note note-secure"><ShieldCheck size={16} /><span>Payment protected</span></div>
            <div className="floating-note note-fast"><Zap size={16} /><span>Sent straight to their phone</span></div>
            <span className="hero-art-caption">A little more connected.</span>
          </div>
        </div>
        <div className="hero-bottom page-width"><span>DATAINN / GHANA</span><span>Bundles for the people who keep you going</span><a href="#networks">Explore networks <ArrowDown size={14} /></a></div>
      </section>

      <section className="network-section page-width" id="networks">
        <div className="section-heading section-heading-row">
          <div><p className="eyebrow eyebrow-dark">Pick your network</p><h2>Everyday bundles,<br />made easy.</h2></div>
          <p>Choose the network the recipient uses. Bundle sizes and current prices are shown before you pay.</p>
        </div>
        <div className="network-strip">
          {loadingCatalog && <CatalogSkeleton variant="home" />}
          {!loadingCatalog && catalogError && <p className="catalog-message" role="alert">Bundle catalog is temporarily unavailable. <a href="/buy.html">Try checkout</a></p>}
          {!loadingCatalog && !catalogError && networks.map((network, index) => (
            <a className={`network-choice ${network.className}`} href="/buy.html" key={network.name}>
              <span className="network-index">0{index + 1}</span>
              <span className={`network-symbol ${network.className}`}>{network.short}</span>
              <span className="network-copy"><strong>{network.name}</strong><small>{network.count} {network.count === 1 ? 'bundle' : 'bundles'} available</small></span>
              <ArrowRight className="network-arrow" size={19} />
            </a>
          ))}
          {!loadingCatalog && !catalogError && networks.length === 0 && <p className="catalog-message">Bundles aren’t available right now. Please check back shortly.</p>}
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="page-width how-inner">
          <div className="how-intro"><p className="eyebrow eyebrow-dark">Quick from start to sent</p><h2>Four small steps.<br /><span>One less thing to worry about.</span></h2><a className="button button-ink" href="/buy.html">Start an order <ArrowRight size={17} /></a></div>
          <div className="how-list">
            <article><span>01</span><div><h3>Choose a bundle</h3><p>Pick a network and the size that fits.</p></div><Smartphone size={20} /></article>
            <article><span>02</span><div><h3>Add recipient details</h3><p>Enter the phone number and email for updates.</p></div><Check size={20} /></article>
            <article><span>03</span><div><h3>Pay securely</h3><p>Complete checkout through Paystack.</p></div><CreditCard size={20} /></article>
            <article><span>04</span><div><h3>We send the data</h3><p>Follow delivery status on screen or by reference.</p></div><RefreshCw size={20} /></article>
          </div>
        </div>
      </section>

      <section className="promise-section page-width">
        <div className="promise-title"><p className="eyebrow eyebrow-dark">Simple by design</p><h2>Good service should<br />feel straightforward.</h2></div>
        <div className="promise-points">
          <div><span className="promise-number">01</span><h3>Know the price first</h3><p>See the total before you confirm payment. No account or hidden checkout fees.</p></div>
          <div><span className="promise-number">02</span><h3>Buy for anyone</h3><p>Send a bundle to your own phone or to a friend, family member, or colleague.</p></div>
          <div><span className="promise-number">03</span><h3>Stay in the loop</h3><p>Use your order reference to check payment and delivery progress whenever you need.</p></div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="page-width faq-layout">
          <div className="faq-heading"><p className="eyebrow eyebrow-dark"><CircleHelp size={14} /> A few answers</p><h2>Good to<br />know.</h2><p>Need a hand with an order? <a href="https://wa.me/233202209611" target="_blank" rel="noreferrer">Talk to us on WhatsApp <ArrowRight size={14} /></a></p></div>
          <div className="faq-list">{faq.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div>
        </div>
      </section>
      <section className="closing-band page-width"><p>Ready when you are.</p><a href="/buy.html">Find a bundle <ArrowRight size={17} /></a></section>
    </>
  );
}