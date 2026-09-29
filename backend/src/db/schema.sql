-- DataSika reseller MVP — PostgreSQL schema
-- Run with: psql "$DATABASE_URL" -f src/db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ============================================================
-- plans — our sellable catalog. provider_price and selling_price
-- are intentionally separate: DataSika's catalog price is what WE
-- pay; selling_price is what the customer pays.
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_product_id TEXT NOT NULL UNIQUE,
  network             TEXT NOT NULL CHECK (network IN ('MTN', 'Telecel', 'AirtelTigo')),
  bundle_gb           NUMERIC(6,2) NOT NULL,
  validity            TEXT NOT NULL,
  provider_price      NUMERIC(10,2) NOT NULL,
  selling_price       NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'GHS',
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON plans (active);
CREATE INDEX IF NOT EXISTS idx_plans_network ON plans (network);

-- ============================================================
-- orders — one row per customer purchase attempt.
-- payment_status and delivery_status are deliberately independent
-- state machines (payment can succeed while delivery is still
-- processing).
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                TEXT NOT NULL UNIQUE,
  plan_id                  UUID NOT NULL REFERENCES plans (id),
  recipient                TEXT NOT NULL,
  email                    TEXT NOT NULL,
  amount                   NUMERIC(10,2) NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'GHS',
  payment_status           TEXT NOT NULL DEFAULT 'pending'
                             CHECK (payment_status IN ('pending', 'success', 'failed', 'cancelled')),
  delivery_status          TEXT NOT NULL DEFAULT 'pending'
                             CHECK (delivery_status IN ('pending', 'processing', 'delivered', 'failed', 'refunded', 'refund_processing')),
  datasika_order_id        TEXT,
  datasika_idempotency_key TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders (reference);
CREATE INDEX IF NOT EXISTS idx_orders_datasika_order_id ON orders (datasika_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders (delivery_status);

-- ============================================================
-- payments — Paystack transaction records against an order.
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID NOT NULL REFERENCES orders (id),
  paystack_reference TEXT NOT NULL UNIQUE,
  amount             NUMERIC(10,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  channel            TEXT,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (paystack_reference);

-- ============================================================
-- deliveries — DataSika fulfilment attempts against an order.
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders (id),
  provider_order_id TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'refunded', 'refund_processing')),
  provider_response JSONB,
  attempts          INTEGER NOT NULL DEFAULT 0,
  delivered_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries (order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_provider_order_id ON deliveries (provider_order_id);

-- ============================================================
-- webhook_events — every verified webhook we received, for
-- idempotent processing and audit. `event_key` is what we
-- actually deduplicate on (see webhookService for how it's
-- derived when a provider doesn't send a stable event id).
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider     TEXT NOT NULL CHECK (provider IN ('datasika', 'paystack')),
  event_id     TEXT,
  event_key    TEXT NOT NULL,
  event_type   TEXT,
  payload      JSONB NOT NULL,
  processed    BOOLEAN NOT NULL DEFAULT false,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_dedupe ON webhook_events (provider, event_key);

-- Keep updated_at fresh automatically.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON deliveries;
CREATE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
