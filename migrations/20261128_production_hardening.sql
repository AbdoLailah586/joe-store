-- JOE Store Production Hardening, Idempotency, Security & Performance Indexes Migration
-- Safe and idempotent (safe to re-run multiple times)

-- 1. Orders: pricing integrity, receipts, idempotency, invoices, and email/number lookup indexes
ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(160),
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency
  ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email_lower
  ON orders(lower(customer_email));

CREATE INDEX IF NOT EXISTS idx_orders_number_lower
  ON orders(lower(order_number));

-- 2. Payment Transactions: idempotency & cached checkout link
ALTER TABLE IF EXISTS payment_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(160),
  ADD COLUMN IF NOT EXISTS checkout_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_txn_idempotency
  ON payment_transactions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Catalog & CRM Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_catalog_sort
  ON products(is_active, is_featured DESC, created_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_activity_target
  ON customer_activity(target_id, action_type, created_at DESC);

-- 4. Distributed Rate Limiting Table (PostgreSQL fallback when Redis is unset)
CREATE TABLE IF NOT EXISTS security_rate_limits (
  rate_key VARCHAR(200) PRIMARY KEY,
  hits INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ
);

-- 5. Expiring Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(120) PRIMARY KEY,
  user_id VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(lower(email), expires_at DESC);

-- 6. Operational Alerts & Error Logs (visible to admin, sent to WhatsApp on payment discrepancies)
CREATE TABLE IF NOT EXISTS system_alerts (
  id VARCHAR(120) PRIMARY KEY,
  severity VARCHAR(20) NOT NULL DEFAULT 'error',
  source VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  order_number VARCHAR(120),
  gateway_txn_id VARCHAR(160),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON system_alerts(resolved, created_at DESC);

-- 7. Legal Compliance: 48-Hour Data Breach Reports + Consent/Preference Columns
CREATE TABLE IF NOT EXISTS data_breach_reports (
  id VARCHAR(120) PRIMARY KEY,
  reporter_name VARCHAR(200),
  reporter_contact VARCHAR(200) NOT NULL,
  summary TEXT NOT NULL,
  affected_scope TEXT,
  severity VARCHAR(30) NOT NULL DEFAULT 'medium',
  status VARCHAR(40) NOT NULL DEFAULT 'reported',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notify_deadline_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_breach_reports_created ON data_breach_reports(created_at DESC);

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_training_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cookie_consent VARCHAR(40),
  ADD COLUMN IF NOT EXISTS parental_consent_at TIMESTAMPTZ;
