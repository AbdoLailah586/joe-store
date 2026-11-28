import { randomBytes } from 'node:crypto';
import { dispatchWhatsAppViaCrm, resolveCrmConfig } from './whatsappCrm.js';

export type AlertSeverity = 'info' | 'warn' | 'error' | 'critical';

/**
 * Wraps fetch with an AbortController timeout so slow third-party gateways never hang serverless invocations.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10000,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  if (init.signal) {
    return fetchImpl(url, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`External request timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Emits a structured JSON log without exposing sensitive credentials.
 */
export function logStructured(level: AlertSeverity, event: string, details: Record<string, any> = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details
  };
  const line = JSON.stringify(payload);
  if (level === 'critical' || level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export async function ensureSystemAlertsTable(sql: any): Promise<void> {
  if (!sql?.query) return;
  await sql.query(`
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
  `);
}

/**
 * Records an operational alert in structured logs and DB, and optionally notifies admins via WhatsApp.
 */
export async function recordOperationalAlert(
  sql: any,
  params: {
    severity: AlertSeverity;
    source: string;
    message: string;
    orderNumber?: string;
    gatewayTxnId?: string;
    metadata?: Record<string, any>;
    settings?: any;
    notifyAdmin?: boolean;
  }
): Promise<void> {
  logStructured(params.severity, params.source, {
    message: params.message,
    orderNumber: params.orderNumber,
    gatewayTxnId: params.gatewayTxnId,
    metadata: params.metadata
  });

  try {
    if (typeof sql === 'function') {
      await ensureSystemAlertsTable(sql).catch(() => {});
      const id = `alt-${Date.now()}-${randomBytes(4).toString('hex')}`;
      await sql`
        INSERT INTO system_alerts (id, severity, source, message, order_number, gateway_txn_id, metadata)
        VALUES (
          ${id},
          ${params.severity},
          ${String(params.source).slice(0, 100)},
          ${String(params.message).slice(0, 2000)},
          ${params.orderNumber ? String(params.orderNumber).slice(0, 120) : null},
          ${params.gatewayTxnId ? String(params.gatewayTxnId).slice(0, 160) : null},
          ${JSON.stringify(params.metadata || {})}::jsonb
        );
      `.catch(() => {});
    }
  } catch {}

  if (params.notifyAdmin) {
    try {
      const crm = resolveCrmConfig(params.settings);
      if (crm.configured && crm.adminAlertRecipients.length > 0) {
        const alertText = [
          `🚨 *تنبيه تشغيلي عاجل (${params.severity.toUpperCase()}) - JOE Store*`,
          `المصدر: ${params.source}`,
          params.orderNumber ? `رقم الطلب: #${params.orderNumber}` : '',
          params.gatewayTxnId ? `مرجع البوابة: ${params.gatewayTxnId}` : '',
          `التفاصيل: ${params.message}`
        ].filter(Boolean).join('\n');

        await Promise.allSettled(
          crm.adminAlertRecipients.map((recipient: string) =>
            dispatchWhatsAppViaCrm(sql, {
              recipient,
              text: alertText,
              type: 'custom',
              orderNumber: params.orderNumber,
              settings: params.settings
            })
          )
        );
      }
    } catch {}
  }
}
