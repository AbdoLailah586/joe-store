import crypto from 'node:crypto';
import { fetchWithTimeout, logStructured } from './monitoring.js';

function sha256Lower(value?: string): string | undefined {
  const cleaned = String(value || '').trim().toLowerCase();
  if (!cleaned) return undefined;
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

function normalizePhoneForCapi(rawPhone?: string): string | undefined {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return undefined;
  const intl = digits.startsWith('20') ? digits : digits.startsWith('0') ? `2${digits}` : digits;
  return sha256Lower(intl);
}

export async function sendMetaConversionEvent(params: {
  pixelId?: string;
  eventName: 'Purchase' | 'InitiateCheckout' | 'ViewContent';
  eventId: string;
  value: number;
  currency?: string;
  orderNumber?: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
  externalId?: string;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
  contentIds?: string[];
  sourceUrl?: string;
  testEventCode?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const accessToken = String(process.env.META_CAPI_ACCESS_TOKEN || '').trim();
  const pixelId = String(params.pixelId || process.env.META_PIXEL_ID || '').replace(/\D/g, '').trim();
  if (!accessToken || !pixelId) {
    return { sent: false, reason: 'not_configured' };
  }

  const userData: Record<string, any> = {};
  const ph = normalizePhoneForCapi(params.phone);
  const em = sha256Lower(params.email);
  const ct = sha256Lower(params.city);
  const co = sha256Lower(params.country || 'eg');
  const ext = sha256Lower(params.externalId);
  if (ph) userData.ph = [ph];
  if (em) userData.em = [em];
  if (ct) userData.ct = [ct];
  if (co) userData.country = [co];
  if (ext) userData.external_id = [ext];
  if (params.fbp && /^fb\.\d+\.\d+\.[A-Za-z0-9_.-]{4,160}$/.test(params.fbp)) userData.fbp = params.fbp;
  if (params.fbc && /^fb\.\d+\.\d+\.[A-Za-z0-9_.-]{4,160}$/.test(params.fbc)) userData.fbc = params.fbc;
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.userAgent) userData.client_user_agent = params.userAgent;

  const testCode = String(params.testEventCode || process.env.META_CAPI_TEST_EVENT_CODE || '').trim();
  const payload: Record<string, any> = {
    data: [
      {
        event_name: params.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: 'website',
        event_source_url: params.sourceUrl || 'https://joe-store-2026.vercel.app/',
        user_data: userData,
        custom_data: {
          currency: params.currency || 'EGP',
          value: Number(params.value || 0),
          order_id: params.orderNumber,
          content_ids: params.contentIds || [],
          content_type: 'product',
        },
      },
    ],
  };
  if (testCode) {
    payload.test_event_code = testCode;
  }

  try {
    const endpoint = `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      6000
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logStructured('warn', 'meta_capi_failed', { status: res.status, eventName: params.eventName, detail: text.slice(0, 180) });
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err: any) {
    logStructured('warn', 'meta_capi_error', { message: err?.message || String(err), eventName: params.eventName });
    return { sent: false, reason: 'network_error' };
  }
}
