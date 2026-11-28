-- Legal consent separation & 48-hour Data Breach reporting table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_training_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parental_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cookie_consent TEXT DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS data_breach_reports (
  id TEXT PRIMARY KEY,
  reporter_email TEXT NOT NULL,
  reporter_name TEXT,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_scope TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  report_deadline_at TIMESTAMPTZ NOT NULL,
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breach_reports_status_created
  ON data_breach_reports (status, created_at DESC);
