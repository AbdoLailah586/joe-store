CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(120) PRIMARY KEY,
  order_id VARCHAR(120) NOT NULL,
  order_number VARCHAR(120) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(12) NOT NULL DEFAULT 'EGP',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  gateway_reference VARCHAR(200),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_transactions_order_idx ON payment_transactions(order_number);
CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON payment_transactions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id VARCHAR(120) PRIMARY KEY,
  order_id VARCHAR(120),
  order_number VARCHAR(120),
  phone VARCHAR(40) NOT NULL,
  notification_type VARCHAR(60) NOT NULL DEFAULT 'custom',
  message_text TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sender_email VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_notifications_created_idx ON whatsapp_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_notifications_order_idx ON whatsapp_notifications(order_id);

CREATE TABLE IF NOT EXISTS visitor_sessions (
  session_id VARCHAR(120) PRIMARY KEY,
  customer_id VARCHAR(100),
  customer_name VARCHAR(200),
  customer_phone VARCHAR(40),
  customer_email VARCHAR(255),
  source_channel VARCHAR(80) NOT NULL DEFAULT 'direct',
  source_label VARCHAR(120) NOT NULL DEFAULT 'دخول مباشر / تطبيق المتجر',
  utm_source VARCHAR(150),
  utm_medium VARCHAR(150),
  utm_campaign VARCHAR(200),
  referrer TEXT,
  device_type VARCHAR(60),
  landing_path TEXT,
  last_path TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS visitor_sessions_seen_idx ON visitor_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS visitor_sessions_customer_idx ON visitor_sessions(customer_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
