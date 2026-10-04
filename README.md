# DataInn — Data Bundle Storefront (Ghana)

A production-ready MVP storefront, **DataInn**, for selling MTN, Telecel and
AirtelTigo data bundles in Ghana. Customers pick a bundle, pay with Paystack,
and receive data with no manual intervention. No customer accounts — just
network, bundle, recipient number, email, pay.

**DataInn** is the brand customers see. **DataSika** is the upstream wholesale
API this app buys data bundles from — it's a provider integration, not a
brand shown to customers, and it never appears anywhere in the frontend.

## 1. What this project does

- **Frontend** (`frontend/`): a React storefront built with Vite — home page,
  a 7-step buy flow, order tracking, and success/failed result pages. Shared
  components, light/dark mode, responsive mobile navigation, and a WhatsApp
  contact button support future feature growth.
- **Backend** (`backend/`): a Node.js/Express API that is the _only_ thing
  that talks to DataSika and Paystack. It owns pricing, validation, the
  order/payment/delivery state machine, and webhook verification.

The business goal: a stranger visits the site, pays, and receives data —
without you touching anything.

## 2. Architecture

```
Browser (frontend/ — branded as DataInn)
   │  fetch() — JSON over HTTPS, CORS-enabled
   ▼
Express API (backend/)
   │                              │
   ▼                              ▼
Paystack (payment)          DataSika (data bundle delivery — wholesale API)
   │                              │
   └────────────► PostgreSQL ◄────┘
                 (or the built-in in-memory store in dev)
```

The frontend never calls DataSika or Paystack directly, and never sees a
secret key. It only ever calls **our own** backend.

## 3. Folder structure

```
project-root/
  frontend/
    index.html, buy.html, track.html, success.html, failed.html — Vite entry pages
    scripts/prerender.mjs — generates route-specific HTML after the Vite build
    src/
      App.jsx           — page selection, document titles, and theme state
      entry-server.jsx  — React renderer used by the prerender build
      api.js            — typed-by-contract fetch wrapper for the backend API
      components/       — shared navigation and theme controls
      pages/            — home, checkout, tracking, and order result views
      styles.css        — responsive design tokens and component styles
      utils.js          — formatting and legacy URL helpers
    assets/             — brand logo and favicon
    package.json        — frontend scripts and dependencies
    vite.config.js      — multipage build and local API proxy
    .env.example        — optional API base override
  backend/
    src/
      server.js               — Express app entrypoint
      config/env.js            — env loading + startup validation
      routes/                  — plans, orders, payments, webhooks
      controllers/             — one per route file
      services/
        datasikaService.js     — all DataSika HTTP calls (+ mock mode)
        paystackService.js     — all Paystack HTTP calls (+ mock mode)
        orderService.js        — pricing, order creation
        paymentService.js      — initialize/verify, amount validation
        deliveryService.js     — DataSika dispatch, double-fulfilment guard
        webhookService.js      — signature verification, idempotent processing
      middleware/               — error handler, rate limiter
      utils/                    — logger, errors, helpers, serializers
      db/
        schema.sql              — PostgreSQL schema
        migrate.js, seed.js     — `npm run db:migrate` / `db:seed` (Postgres only — see "Database modes")
        catalogSync.js          — shared catalog-sync logic (used by seed.js AND server.js's auto-seed)
        pool.js + *Repository.js — Postgres-or-in-memory data access
        memoryStore.js          — the in-memory backend used when DATABASE_URL is unset
    .env.example
    .gitignore
    package.json
  README.md (this file)
```

## 4. Install dependencies

```bash
cd backend
npm install
```

Install frontend dependencies separately:

```bash
cd frontend
npm install
```

## 5. Run the frontend

From the project root, start Vite for local development:

```bash
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). The development
server proxies `/api` to `http://localhost:5000`, so run the backend as well.
The root `npm run build` and `npm run preview` commands also forward to the frontend package.
Set `VITE_API_BASE` in `frontend/.env.local` only if you need a different API
base URL. For static hosting, run `npm run build` and publish `frontend/dist/`.
React pages are prerendered during the build and hydrated in the browser for
interactivity. The build keeps `.html` files for compatibility and callbacks,
and also writes clean route directories such as `dist/buy/index.html`.
The site uses clean routes (`/buy`, `/track`, `/success`, `/failed`, `/privacy`,
and `/terms`). On Render, use these static-site rewrite rules in the Dashboard
to ensure direct visits and refreshes serve the prerendered pages:

| Source | Destination | Action |
| --- | --- | --- |
| `/buy` | `/buy.html` | Rewrite |
| `/track` | `/track.html` | Rewrite |
| `/success` | `/success.html` | Rewrite |
| `/failed` | `/failed.html` | Rewrite |
| `/privacy` | `/privacy.html` | Rewrite |
| `/terms` | `/terms.html` | Rewrite |

The crawl files are published at `/robots.txt` and `/sitemap.xml`.

## 6. Run the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev          # or: npm start
```

That's it for local/mock development — with no `DATABASE_URL` set, the
server seeds its own in-memory `plans` catalog automatically on startup
(see "Database modes"). Only run the two commands below if you've set a
real `DATABASE_URL`:

```bash
npm run db:migrate   # applies schema.sql to your Postgres database
npm run db:seed      # populates `plans` from the DataSika catalog
```

The API listens on `PORT` (default `5000`). `GET /health` reports status
and whether mock mode is on.

## 7. Configuring `.env`

Copy `.env.example` to `.env` and fill in what you have. Nothing in `.env`
is ever sent to the browser — the only exception is `PAYSTACK_PUBLIC_KEY`,
which the backend hands to the frontend at runtime via
`GET /api/payments/config` (it's meant to be public).

| Variable                  | Purpose                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `PORT`                    | backend port                                                                                                |
| `NODE_ENV`                | `development` or `production`                                                                               |
| `MOCK_MODE`               | `true` to run without real credentials (see below) — forced `false` whenever `NODE_ENV=production`          |
| `FRONTEND_URL`            | your deployed frontend origin(s), comma-separated — used for CORS and Paystack's callback URL in production |
| `DATASIKA_API_KEY`        | from your DataSika developer portal                                                                         |
| `DATASIKA_BASE_URL`       | DataSika's API base — already set correctly                                                                 |
| `DATASIKA_WEBHOOK_SECRET` | from the DataSika developer console, once you register a webhook (see below)                                |
| `PAYSTACK_SECRET_KEY`     | from your Paystack dashboard — server-side only                                                             |
| `PAYSTACK_PUBLIC_KEY`     | from your Paystack dashboard — safe to expose                                                               |
| `DATABASE_URL`            | your Postgres connection string — see "Database modes"                                                      |
| `RATE_LIMIT_*`            | tune per-key limits if needed                                                                               |

## 8. Adding your DataSika API key

1. Get an approved API key from DataSika.
2. Put it in `backend/.env` as `DATASIKA_API_KEY=dsk_live_...`.
3. Set `MOCK_MODE=false`.
4. Pull the **real** catalog: if you're on Postgres, run `npm run db:seed`;
   if you're still on the in-memory store, just restart the server — it
   re-syncs automatically. Either way, this only sets `selling_price` on
   newly discovered plans — review it before going live; DataSika's price
   is your cost, not your customer's price.

## 9. Adding your DataSika webhook secret

1. In the DataSika developer console, register a webhook endpoint pointing
   at `https://your-domain.com/api/webhooks/datasika`.
2. Copy the signing secret (`whsec_...`) into `backend/.env` as
   `DATASIKA_WEBHOOK_SECRET`.
3. That's it — the endpoint already verifies `X-DataSika-Signature` as an
   HMAC-SHA256 of the exact raw request body, rejects anything that doesn't
   match, and never processes an unverified event.

**On the payload shape:** the signature mechanism is documented and fully
implemented. The exact JSON field names DataSika uses inside the webhook
body were not part of the supplied documentation, so `webhookService.js`
uses a small, clearly-marked adapter (`parseDatasikaEvent`) that looks for
the field names most webhook payloads of this shape use (`order_id` /
`orderId`, `status`, `event_id`, `event`). If DataSika's real payload uses
different field names, that one function is where to update it — nothing
else needs to change.

## 10. Adding your Paystack credentials

Put `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` in `.env`, set
`MOCK_MODE=false`. Paystack webhooks are verified using Paystack's
documented mechanism (HMAC-SHA512 of the raw body with your secret key,
sent as `x-paystack-signature`) — this is Paystack's own public standard,
not something invented for this project.

## 11. Configuring PostgreSQL ("Database modes")

This app runs in one of two modes, chosen automatically by whether
`DATABASE_URL` is set:

- **`DATABASE_URL` set** → every repository (`src/db/*Repository.js`) talks
  to real Postgres via the `pg` pool in `src/db/pool.js`.
- **`DATABASE_URL` unset** → the same repositories fall back to an
  in-memory store (`src/db/memoryStore.js`) with the _identical_ interface.
  Nothing in your services or controllers changes. This is for local
  development/testing only — data does not persist across restarts, and
  `config/env.js` refuses to start this way when `NODE_ENV=production`.
  Because this store lives inside one Node process, `server.js` seeds its
  `plans` catalog **automatically on every startup** in this mode — a
  separate `npm run db:seed` process would populate a different
  process's memory than the one actually serving requests, so it isn't
  used here. You don't need to run anything extra; `npm run dev` alone
  gives you a working `/api/plans`.

To use real Postgres (where `npm run db:seed` is a one-off you run
yourself, since the data now persists):

```bash
createdb datasika_mvp
# set DATABASE_URL=postgres://user:pass@host:5432/datasika_mvp in .env
cd backend
npm run db:migrate
npm run db:seed
```

`schema.sql` is idempotent (`CREATE TABLE IF NOT EXISTS`) and was tested
against a real PostgreSQL 16 instance as part of building this project.

## 12. How payment flow works

1. Frontend collects network → bundle → recipient → email, then shows a
   review step using the **plan's `selling_price` from our database** —
   never a client-supplied number.
2. On "Confirm & pay": `POST /api/orders` creates a `pending` order server-
   side (the amount is looked up from `plans` by `planId`, never trusted
   from the client), then `POST /api/payments/initialize` starts a Paystack
   transaction for that exact amount.
3. The frontend opens Paystack's inline popup (or, in mock mode, simulates
   it) and then calls `GET /api/payments/verify/:reference`.
4. The backend verifies with Paystack directly (never trusts the popup's
   own callback), checks the transaction status **and amount** match our
   order, and only then marks `payment_status = success`.

## 13. How DataSika delivery works

Once payment is verified, `deliveryService.fulfil()` calls DataSika's
`POST /api-buy-data` with a **deterministic Idempotency-Key** derived from
our own order reference (`order-<reference>`), stored on the order so a
retry after a crash/timeout reuses the same key instead of risking a
duplicate charge. The buy call returns a `Pending` order immediately;
delivery is asynchronous from there — the frontend polls
`GET /api/orders/:reference/status`, which is backed by
`GET /api-order-status` as an authoritative fallback whenever the state
isn't already terminal.

## 14. How the DataSika wallet is used

DataSika charges every `api-buy-data` call to your DataSika wallet balance,
not to the customer directly — the customer pays _you_ via Paystack, and
you pay DataSika from your wallet. Top up your wallet on DataSika's portal;
`insufficient_balance` and `spend_cap_exceeded` are handled as ordinary
provider errors with a customer-safe message (see `utils/errors.js`).

## 15. How webhooks work

Two independent webhook endpoints, each raw-body-verified before anything
is trusted:

- `POST /api/payments/webhook` — Paystack. On a verified `charge.success`,
  runs the same `verifyAndFulfil` path as the manual verify endpoint, so a
  customer who closes their browser mid-payment still gets their data.
- `POST /api/webhooks/datasika` — DataSika. On a verified event, updates
  the matching order's delivery status. It **never** places a new
  DataSika purchase — only the initial `fulfil()` call does that.

Both are idempotent: every verified event is recorded in `webhook_events`
under a unique `(provider, event_key)` before being acted on, so a retried
delivery is recognised and skipped, not reprocessed.

## 16. Where I put each credential

All in `backend/.env` — never in frontend code, never committed (`.env` is
git-ignored):

- `DATASIKA_API_KEY`, `DATASIKA_WEBHOOK_SECRET`, `PAYSTACK_SECRET_KEY`,
  `DATABASE_URL` → server-side only, never sent anywhere.
- `PAYSTACK_PUBLIC_KEY` → server-side in `.env`, but handed to the frontend
  at runtime via `GET /api/payments/config` (this is how Paystack's own
  inline payment flow is designed to work).

## 17. How to switch from `MOCK_MODE=true` to real integrations

1. Set `MOCK_MODE=false` in `backend/.env`.
2. Fill in `DATASIKA_API_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`.
3. Set a real `DATABASE_URL` and run `npm run db:migrate`.
4. Run `npm run db:seed` to pull the **real** catalog, then review the
   `selling_price` this sets on any newly-added plans.
5. Register your DataSika webhook and set `DATASIKA_WEBHOOK_SECRET`.
6. Restart the server. `config/env.js` will refuse to start if anything
   required is still missing, and will tell you exactly what's missing —
   never printing the values themselves.

`MOCK_MODE` is also automatically forced to `false` whenever
`NODE_ENV=production`, however `.env` is set, so it can never accidentally
ship live.

## 18. How duplicate purchases are prevented

Three independent layers:

1. **Frontend**: checkout uses a confirmation modal and an in-memory
   payment-start guard, so a double-click cannot send duplicate payment
   initialization requests.
2. **`deliveryService.fulfil()`**: before ever calling DataSika, it checks
   whether the order already has a `datasika_order_id` or a
   `delivery_status` of `processing`/`delivered` — if so, it's a no-op.
   This makes it safe to call `fulfil()` from multiple places (manual
   verify, Paystack webhook, a retried request) without ever double-buying.
3. **DataSika's own Idempotency-Key contract**: the key we send is
   deterministic (`order-<our-reference>`) and stored on the order, so even
   a network-level retry of the exact same purchase call reuses the same
   key and gets the original order back rather than a new charge.

## Branding & UI

- **Logo**: the shared header and footer in `frontend/src/components/SiteLayout.jsx`
  use `frontend/assets/New-dataInn-logo.png`.
- **Colors & type**: shared design tokens and responsive styles live in
  `frontend/src/styles.css`; adjust those variables first when changing the theme.
- **Light/dark mode**: the shared `ThemeToggle` component uses the visitor's
  system preference initially, then persists the explicit choice as
  `datainn-theme` in `localStorage`.
- **Mobile navigation**: `SiteLayout` switches to a fixed four-item tab bar
  on narrow screens; active state follows the current page.
- **Order tracking**: `TrackPage` uses the existing
  `GET /api/orders/:reference` endpoint. The frontend migration does not
  require backend changes.
- **WhatsApp contact**: the shared floating link is in `SiteLayout.jsx` and
  points to `https://wa.me/233202209611`.

## Testing this yourself

```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/plans
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"planId":"<a plan id from /api/plans>","recipient":"0241234567","email":"you@example.com"}'
```

With `MOCK_MODE=true` you can run the entire flow — order → pay → deliver —
with zero real credentials; the mock DataSika provider even simulates the
real asynchronous delay (an order shows `processing` for a few seconds
before `delivered`).

## Security considerations

- Helmet, CORS restricted to `FRONTEND_URL` in production, 100kb JSON body
  cap, per-route rate limiting (tighter on writes).
- All pricing and phone/email validation is re-checked server-side —
  client-side checks are UX only.
- Webhook signatures are verified against the **raw** request body (never
  a re-serialized copy) using a constant-time comparison.
- The logger redacts `Authorization`, API keys, webhook secrets, and
  signature headers by key name, however deep they appear in a logged
  object.

## Production deployment considerations

- Set `NODE_ENV=production`, a real `DATABASE_URL`, and real credentials —
  the app will refuse to start otherwise.
- Put the backend behind HTTPS (a reverse proxy like Nginx or your host's
  load balancer) — Paystack and DataSika webhooks require HTTPS in
  practice.
- Set `FRONTEND_URL` to your real deployed frontend origin(s) so CORS
  isn't wide open.
- Run `npm run db:migrate` once against your production database before
  first deploy, and `npm run db:seed` to populate `plans` — then review
  `selling_price` per plan.
