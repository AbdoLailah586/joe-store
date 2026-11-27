import { database } from '../lib/session.js';
import { neonDb } from '../server/store.js';
import { processPaymentGatewayCallback } from '../server/paymentGateway.js';

export default async function handler(req: any, res: any, deps?: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const sql = deps?.sql || database();
  const store = deps?.store || neonDb;
  const reqUrl = new URL(req.url || '/api/payment-callback', 'http://localhost');
  const query: Record<string, any> = { ...Object.fromEntries(reqUrl.searchParams.entries()), ...(req.query || {}) };
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const provider = String(query.provider || body?.provider || '').trim().toLowerCase();

  let settings: any = {};
  try {
    settings = (await store.getStoreSettings()) || {};
  } catch {
    settings = {};
  }

  const result = await processPaymentGatewayCallback({
    sql,
    provider: provider || String(settings?.payment_gateway_provider || ''),
    method: req.method,
    query,
    body,
    headers: req.headers || {},
    settings,
    dispatchWhatsApp: deps?.dispatchWhatsApp
  });

  if (req.method === 'POST') {
    return res.status(result.verified ? 200 : 400).json({
      received: true,
      verified: result.verified,
      paid: result.paid,
      order_number: result.orderNumber
    });
  }

  const state = !result.verified
    ? 'unverified'
    : result.paid
      ? 'paid'
      : result.pending
        ? 'pending'
        : 'failed';
  const sp = new URLSearchParams();
  if (result.orderNumber) sp.set('order', result.orderNumber);
  sp.set('payment', state);
  res.setHeader('Location', `/order-success?${sp.toString()}`);
  return res.status(302).end();
}
