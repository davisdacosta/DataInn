import { ArrowLeft } from 'lucide-react';

const SUPPORT_URL = 'https://wa.me/233240315280';

const privacySections = [
  {
    title: 'Information used for an order',
    paragraphs: [
      'When you place an order, DataInn handles the recipient phone number, email address, selected network and bundle, order reference, and order and delivery status. Payment processing also creates a transaction reference and payment status.',
      'The checkout form sends payment details to Paystack. DataInn uses Paystack’s response to verify payment; do not send card details to us over WhatsApp or email.',
    ],
  },
  {
    title: 'How information is used',
    paragraphs: [
      'We use order information to take and verify payment, dispatch the selected bundle, show order status, provide support, protect the service against abuse, and meet applicable legal or accounting requirements.',
      'The site stores your theme preference in your browser so it can remember your light or dark theme. The preference is saved locally as datainn-theme.',
    ],
  },
  {
    title: 'Service providers',
    paragraphs: [
      'Information is shared only as needed to provide the service. Paystack processes payments, and DataSika receives the product and recipient details needed to dispatch a bundle. Infrastructure providers may process information to host and operate the service.',
      'DataInn does not sell your personal information. These providers handle information under their own terms and privacy practices.',
    ],
  },
  {
    title: 'Retention and security',
    paragraphs: [
      'We keep order and payment records for as long as needed to complete orders, handle support and disputes, maintain required business records, and meet legal obligations. Retention can depend on the type of record and applicable requirements.',
      'We use reasonable safeguards to protect information. No online service can guarantee that transmission or storage is completely secure.',
    ],
  },
  {
    title: 'Your choices and requests',
    paragraphs: [
      'You may contact us to request access to or correction of information associated with an order. We may need to retain some records where required to complete a transaction, resolve a dispute, or meet legal obligations.',
    ],
    link: true,
  },
  {
    title: 'Changes to this policy',
    paragraphs: [
      'We may update this policy when the service or its data practices change. The latest version and its effective date will be published on this page.',
    ],
  },
];

const termsSections = [
  {
    title: 'Using DataInn',
    paragraphs: [
      'DataInn lets you purchase mobile data bundles for Ghanaian phone numbers. You do not need an account. By placing an order, you confirm that the recipient number and bundle details you submit are accurate and that you are authorized to make the purchase.',
    ],
  },
  {
    title: 'Prices and payment',
    paragraphs: [
      'The price shown at checkout is the amount requested for that order, in the currency displayed. Catalog availability and prices may change before an order is submitted.',
      'Payments are processed by Paystack. An order is not treated as paid until the payment is verified by our backend. Do not submit another payment for an order that is still processing; check its status using the order reference or contact support.',
    ],
  },
  {
    title: 'Delivery and order status',
    paragraphs: [
      'Bundle delivery is handled through DataSika and the relevant mobile network. Delivery may be asynchronous and can take time. An order can remain pending or processing while the provider confirms the result.',
      'Keep your order reference private. Anyone with the reference may be able to view the associated order status and details.',
    ],
  },
  {
    title: 'Failed orders and refunds',
    paragraphs: [
      'If delivery does not complete, we will review the order and resolve the customer payment as applicable under the payment provider’s process and applicable law. A credit to DataInn’s wholesale provider wallet is separate from a refund to a customer.',
      'Refund timing can depend on the payment method and provider. Contact support with your order reference if an order is marked failed or refunded and you need help.',
    ],
    link: true,
  },
  {
    title: 'Service availability and acceptable use',
    paragraphs: [
      'Catalog items may be unavailable, and DataInn or its providers may temporarily suspend parts of the service for maintenance, security, or operational reasons. Do not use the service for unlawful activity, fraud, or attempts to disrupt or gain unauthorized access to the service.',
      'Mobile networks, Paystack, and DataSika are independent providers. DataInn is not a mobile network operator or payment provider and does not control their systems or coverage.',
    ],
  },
  {
    title: 'Changes and applicable law',
    paragraphs: [
      'We may update these terms as the service changes. The current version will be published here. These terms are subject to applicable laws and do not limit rights that cannot legally be excluded.',
    ],
  },
];

export function LegalPage({ kind }) {
  const isPrivacy = kind === 'privacy';
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <article className="legal-page page-width">
      <a className="legal-back" href="/"><ArrowLeft size={15} /> Back to DataInn</a>
      <header className="legal-heading">
        <p className="eyebrow eyebrow-dark">DataInn / Legal</p>
        <h1>{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
        <p>Last updated September 30, 2026</p>
      </header>
      <div className="legal-content">
        {sections.map(({ title, paragraphs, link }) => (
          <section key={title}>
            <h2>{title}</h2>
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {link && <p>Contact <a href={SUPPORT_URL} target="_blank" rel="noreferrer">DataInn support on WhatsApp</a> and include your order reference when asking about an order.</p>}
          </section>
        ))}
      </div>
    </article>
  );
}