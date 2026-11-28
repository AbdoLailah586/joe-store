import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { buildServerOrderWhatsAppMessage, dispatchWhatsAppViaCrm, resolveCrmConfig } from './whatsappCrm.js';
import { fetchWithTimeout, recordOperationalAlert } from './monitoring.js';
import { sendMetaConversionEvent } from './metaCapi.js';

export type PaymentGatewayProvider = 'none' | 'kashier' | 'paymob';
export type PaymentGatewayMode = 'test' | 'live';

export interface ResolvedGatewayConfig {
  provider: PaymentGatewayProvider;
  mode: PaymentGatewayMode;
  merchantId: string;
  apiKey: string;
  secretKey: string;
  publicKey: string;
  hmacSecret: string;
  cardIntegrationId: string;
  walletIntegrationId: string;
  instapayIntegrationId: string;
  enableCard: boolean;
  enableWallet: boolean;
  enableInstapay: boolean;
  hasApiKey: boolean;
  hasSecretKey: boolean;
  hasHmacSecret: boolean;
  envConfigured: boolean;
  configured: boolean;
  methods: {
    card: boolean;
    wallet: boolean;
    instapay: boolean;
  };
}

export function normalizeGatewayMethod(rawMethod: string): 'cod' | 'card' | 'wallet' | 'instapay' {
  const m = String(rawMethod || '').trim().toLowerCase();
  if (m === 'card' || m === 'credit_card') return 'card';
  if (m === 'vodafone_cash' || m === 'wallet') return 'wallet';
  if (m === 'instapay') return 'instapay';
  return 'cod';
}

export function hasGatewaySettingsMetadata(settings?: any): boolean {
  const s = settings && typeof settings === 'object' ? settings : {};
  return Boolean(
    s.payment_gateway_provider ||
      s.payment_gateway_merchant_id ||
      s.payment_gateway_api_key ||
      s.payment_gateway_secret_key ||
      s.payment_gateway_public_key ||
      process.env.PAYMENT_GATEWAY_PROVIDER ||
      process.env.KASHIER_MERCHANT_ID ||
      process.env.PAYMOB_SECRET_KEY
  );
}

export function resolvePaymentGatewayConfig(settings?: any): ResolvedGatewayConfig {
  const s = settings && typeof settings === 'object' ? settings : {};
  const envProvider = String(process.env.PAYMENT_GATEWAY_PROVIDER || '').trim().toLowerCase();
  const dbProvider = String(s.payment_gateway_provider || '').trim().toLowerCase();
  const rawProvider = dbProvider || envProvider || 'none';
  const provider: PaymentGatewayProvider =
    rawProvider === 'kashier' || rawProvider === 'paymob' ? rawProvider : 'none';

  const rawMode = String(s.payment_gateway_mode || process.env.PAYMENT_GATEWAY_MODE || 'test').trim().toLowerCase();
  const mode: PaymentGatewayMode = rawMode === 'live' ? 'live' : 'test';

  const merchantId = String(s.payment_gateway_merchant_id || process.env.KASHIER_MERCHANT_ID || '').trim();
  const apiKey = String(
    s.payment_gateway_api_key ||
      (provider === 'kashier' ? process.env.KASHIER_API_KEY : process.env.PAYMOB_API_KEY) ||
      ''
  ).trim();
  const secretKey = String(
    s.payment_gateway_secret_key ||
      (provider === 'kashier' ? process.env.KASHIER_SECRET_KEY : process.env.PAYMOB_SECRET_KEY) ||
      ''
  ).trim();
  const publicKey = String(s.payment_gateway_public_key || process.env.PAYMOB_PUBLIC_KEY || '').trim();
  const hmacSecret = String(s.payment_gateway_hmac_secret || process.env.PAYMOB_HMAC_SECRET || '').trim();

  const cardIntegrationId = String(s.payment_gateway_card_integration_id || process.env.PAYMOB_CARD_INTEGRATION_ID || '').trim();
  const walletIntegrationId = String(s.payment_gateway_wallet_integration_id || process.env.PAYMOB_WALLET_INTEGRATION_ID || '').trim();
  const instapayIntegrationId = String(s.payment_gateway_instapay_integration_id || process.env.PAYMOB_INSTAPAY_INTEGRATION_ID || '').trim();

  const enableCard = s.payment_gateway_enable_card !== false;
  const enableWallet = Boolean(s.payment_gateway_enable_wallet);
  const enableInstapay = Boolean(s.payment_gateway_enable_instapay);

  const envConfigured = Boolean(
    (provider === 'kashier' && process.env.KASHIER_MERCHANT_ID && process.env.KASHIER_API_KEY) ||
      (provider === 'paymob' && process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY)
  );

  const kashierReady = provider === 'kashier' && Boolean(merchantId && apiKey);
  const paymobHasAnyIntegration = Boolean(cardIntegrationId || walletIntegrationId || instapayIntegrationId);
  const paymobReady = provider === 'paymob' && Boolean(secretKey && publicKey && paymobHasAnyIntegration);
  const configured = kashierReady || paymobReady;

  const methods = {
    card: configured && enableCard && (provider === 'kashier' || Boolean(cardIntegrationId)),
    wallet: configured && enableWallet && (provider === 'kashier' || Boolean(walletIntegrationId)),
    instapay: configured && enableInstapay && (provider === 'kashier' || Boolean(instapayIntegrationId))
  };

  return {
    provider,
    mode,
    merchantId,
    apiKey,
    secretKey,
    publicKey,
    hmacSecret,
    cardIntegrationId,
    walletIntegrationId,
    instapayIntegrationId,
    enableCard,
    enableWallet,
    enableInstapay,
    hasApiKey: Boolean(apiKey),
    hasSecretKey: Boolean(secretKey),
    hasHmacSecret: Boolean(hmacSecret),
    envConfigured,
    configured,
    methods
  };
}

export function stripPaymentSecrets(settings: any) {
  if (!settings || typeof settings !== 'object') return settings;
  const copy = { ...settings };
  delete copy.payment_gateway_api_key;
  delete copy.payment_gateway_secret_key;
  delete copy.payment_gateway_hmac_secret;
  return copy;
}

export function toPublicPaymentGatewayState(settings?: any) {
  const cfg = resolvePaymentGatewayConfig(settings);
  return {
    provider: cfg.provider,
    mode: cfg.mode,
    configured: cfg.configured,
    methods: cfg.methods
  };
}

export function toAdminPaymentGatewayState(settings?: any) {
  const cfg = resolvePaymentGatewayConfig(settings);
  return {
    provider: cfg.provider,
    mode: cfg.mode,
    merchant_id: cfg.merchantId,
    public_key: cfg.publicKey,
    card_integration_id: cfg.cardIntegrationId,
    wallet_integration_id: cfg.walletIntegrationId,
    instapay_integration_id: cfg.instapayIntegrationId,
    enable_card: cfg.enableCard,
    enable_wallet: cfg.enableWallet,
    enable_instapay: cfg.enableInstapay,
    has_api_key: cfg.hasApiKey,
    has_secret_key: cfg.hasSecretKey,
    has_hmac_secret: cfg.hasHmacSecret,
    env_configured: cfg.envConfigured,
    configured: cfg.configured,
    methods: cfg.methods
  };
}

export function shouldRouteOrderToGateway(paymentMethod: string, settings?: any): boolean {
  const cfg = resolvePaymentGatewayConfig(settings);
  if (!cfg.configured) return false;
  const normalized = normalizeGatewayMethod(paymentMethod);
  if (normalized === 'card') return cfg.methods.card;
  if (normalized === 'wallet') return cfg.methods.wallet;
  if (normalized === 'instapay') return cfg.methods.instapay;
  return false;
}

export function buildKashierOrderHash(params: {
  merchantId: string;
  orderId: string;
  amount: string;
  currency?: string;
  apiKey: string;
}): string {
  const currency = params.currency || 'EGP';
  const path = `/?payment=${params.merchantId}.${params.orderId}.${params.amount}.${currency}`;
  return createHmac('sha256', params.apiKey).update(path).digest('hex');
}

function safeHexEqual(a: string, b: string): boolean {
  const left = String(a || '').trim().toLowerCase();
  const right = String(b || '').trim().toLowerCase();
  if (!left || left.length !== right.length || !/^[a-f0-9]+$/.test(left) || !/^[a-f0-9]+$/.test(right)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

export function verifyKashierRedirectSignature(query: Record<string, any>, apiKey: string): boolean {
  const signature = String(query?.signature || '').trim();
  if (!signature || !apiKey) return false;
  let queryString = '';
  for (const [key, val] of Object.entries(query)) {
    if (key === 'signature' || key === 'mode' || key === 'provider') continue;
    if (val === undefined || val === null) continue;
    queryString += `&${key}=${String(val)}`;
  }
  const finalStr = queryString.slice(1);
  const computed = createHmac('sha256', apiKey).update(finalStr).digest('hex');
  return safeHexEqual(computed, signature);
}

export function verifyKashierWebhookSignature(body: any, headerSig: string, apiKey: string): boolean {
  if (!headerSig || !apiKey || !body?.data || !Array.isArray(body?.data?.signatureKeys)) return false;
  const parts = body.data.signatureKeys
    .slice()
    .sort()
    .map((key: string) => `${key}=${body.data[key] ?? ''}`)
    .join('&');
  const computed = createHmac('sha256', apiKey).update(parts).digest('hex');
  return safeHexEqual(computed, headerSig);
}

const PAYMOB_HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success'
];

export function verifyPaymobHmac(obj: Record<string, any>, hmacHeaderOrQuery: string, hmacSecret: string): boolean {
  if (!obj || !hmacHeaderOrQuery || !hmacSecret) return false;
  const concatenated = PAYMOB_HMAC_FIELDS.map(path => {
    const parts = path.split('.');
    let cur: any = obj;
    for (const part of parts) cur = cur?.[part];
    if (cur === undefined || cur === null) return '';
    return String(cur);
  }).join('');
  const computed = createHmac('sha512', hmacSecret).update(concatenated).digest('hex');
  return safeHexEqual(computed, hmacHeaderOrQuery);
}

export async function ensurePaymentTransactionsTable(sql: any) {
  await sql.query(`
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
      idempotency_key VARCHAR(160),
      checkout_url TEXT,
      raw_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await sql.query(`ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(160);`).catch(() => {});
  await sql.query(`ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS checkout_url TEXT;`).catch(() => {});
}

export function resolveRequestOrigin(req: any, fallbackOrigin = 'https://joe-store-2026.vercel.app'): string {
  const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').trim();
  if (!host) return fallbackOrigin;
  const proto = String(req?.headers?.['x-forwarded-proto'] || (/^(localhost|127\.0\.0\.1)(:|$)/i.test(host) ? 'http' : 'https')).trim();
  return `${proto}://${host}`;
}

export async function createGatewayCheckoutSession(
  sql: any,
  params: {
    order: any;
    baseUrl: string;
    settings?: any;
    fetchFn?: typeof fetch;
  }
): Promise<{
  provider: PaymentGatewayProvider;
  mode: PaymentGatewayMode;
  checkoutUrl: string;
  transactionId: string;
}> {
  const cfg = resolvePaymentGatewayConfig(params.settings);
  if (!cfg.configured || cfg.provider === 'none') {
    throw new Error('بوابة الدفع الإلكتروني غير مفعلة بعد.');
  }

  const normalizedMethod = normalizeGatewayMethod(params.order?.payment_method);
  const amountNum = Number(params.order?.total || 0);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error('قيمة الطلب غير صالحة لبدء الدفع الإلكتروني.');
  }

  const txnId = `txn-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const orderNumber = String(params.order.order_number || params.order.id);
  const orderId = String(params.order.id || orderNumber);
  const idempotencyKey = params.order.idempotency_key ? String(params.order.idempotency_key).slice(0, 160) : null;
  const amountFixed = amountNum.toFixed(2);
  const cleanBase = params.baseUrl.replace(/\/+$/, '');
  const callbackBase = `${cleanBase}/api/payment-callback`;
  const fetchImpl = params.fetchFn || fetch;

  await ensurePaymentTransactionsTable(sql).catch(err => {
    void recordOperationalAlert(sql, {
      severity: 'warn',
      source: 'paymentGateway.ensureTable',
      message: String(err?.message || err),
      orderNumber
    });
  });

  if (idempotencyKey || orderNumber) {
    try {
      const existingTxn = await sql`
        SELECT id, checkout_url, status, provider
        FROM payment_transactions
        WHERE ((${idempotencyKey}::text IS NOT NULL AND idempotency_key = ${idempotencyKey}) OR upper(order_number) = ${orderNumber.toUpperCase()})
          AND status = 'pending'
          AND checkout_url IS NOT NULL
          AND created_at > NOW() - INTERVAL '30 minutes'
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      if (existingTxn?.[0]?.checkout_url) {
        return {
          provider: (existingTxn[0].provider || cfg.provider) as PaymentGatewayProvider,
          mode: cfg.mode,
          checkoutUrl: existingTxn[0].checkout_url,
          transactionId: existingTxn[0].id
        };
      }
    } catch {}
  }

  if (cfg.provider === 'kashier') {
    const allowedMethods =
      normalizedMethod === 'wallet'
        ? 'wallet'
        : normalizedMethod === 'instapay'
          ? 'bank_installments,wallet,card'
          : 'card,wallet';
    const hash = buildKashierOrderHash({
      merchantId: cfg.merchantId,
      orderId: orderNumber,
      amount: amountFixed,
      currency: 'EGP',
      apiKey: cfg.apiKey
    });
    const sp = new URLSearchParams({
      merchantId: cfg.merchantId,
      orderId: orderNumber,
      amount: amountFixed,
      currency: 'EGP',
      hash,
      mode: cfg.mode,
      merchantRedirect: `${callbackBase}?provider=kashier`,
      failureRedirect: `${callbackBase}?provider=kashier&payment_hint=failed`,
      serverWebhook: `${callbackBase}?provider=kashier`,
      allowedMethods,
      display: 'ar',
      type: 'external'
    });
    const checkoutUrl = `https://checkout.kashier.io/?${sp.toString()}`;
    await sql`
      INSERT INTO payment_transactions (id, order_id, order_number, provider, payment_method, amount, currency, status, gateway_reference, idempotency_key, checkout_url)
      VALUES (${txnId}, ${orderId}, ${orderNumber}, 'kashier', ${String(params.order.payment_method)}, ${amountNum}, 'EGP', 'pending', ${hash}, ${idempotencyKey}, ${checkoutUrl})
      ON CONFLICT (id) DO NOTHING;
    `.catch(err => {
      void recordOperationalAlert(sql, {
        severity: 'error',
        source: 'paymentGateway.insertKashierTxn',
        message: String(err?.message || err),
        orderNumber,
        settings: params.settings,
        notifyAdmin: true
      });
    });
    return { provider: 'kashier', mode: cfg.mode, checkoutUrl, transactionId: txnId };
  }

  const integrationIdRaw =
    normalizedMethod === 'wallet'
      ? cfg.walletIntegrationId || cfg.cardIntegrationId
      : normalizedMethod === 'instapay'
        ? cfg.instapayIntegrationId || cfg.cardIntegrationId
        : cfg.cardIntegrationId;
  const integrationId = Number(integrationIdRaw);
  if (!Number.isFinite(integrationId) || integrationId <= 0) {
    throw new Error('معرّف التكامل (Paymob Integration ID) غير مضبوط لطريقة الدفع المختارة.');
  }

  const fullName = String(params.order.customer_name || 'Customer').trim();
  const [firstName, ...restName] = fullName.split(/\s+/);
  const lastName = restName.join(' ') || firstName || 'Customer';

  const res = await fetchWithTimeout(
    'https://accept.paymob.com/v1/intention/',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${cfg.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(amountNum * 100),
        currency: 'EGP',
        payment_methods: [integrationId],
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: String(params.order.customer_phone || '01000000000'),
          email: String(params.order.customer_email || 'customer@joestore.eg'),
          street: String(params.order.address_details || 'NA'),
          city: String(params.order.city || params.order.governorate || 'Mansoura'),
          state: String(params.order.governorate || 'Dakahlia'),
          country: 'EG',
          apartment: 'NA',
          floor: 'NA',
          building: 'NA'
        },
        special_reference: orderNumber,
        notification_url: `${callbackBase}?provider=paymob`,
        redirection_url: `${callbackBase}?provider=paymob`
      })
    },
    12000,
    fetchImpl
  );
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.client_secret) {
    throw new Error(data?.detail || data?.message || 'تعذر إنشاء جلسة الدفع عبر Paymob.');
  }

  const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(cfg.publicKey)}&clientSecret=${encodeURIComponent(data.client_secret)}`;
  await sql`
    INSERT INTO payment_transactions (id, order_id, order_number, provider, payment_method, amount, currency, status, gateway_reference, idempotency_key, checkout_url, raw_payload)
    VALUES (${txnId}, ${orderId}, ${orderNumber}, 'paymob', ${String(params.order.payment_method)}, ${amountNum}, 'EGP', 'pending', ${String(data.id || '')}, ${idempotencyKey}, ${checkoutUrl}, ${JSON.stringify(data)}::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `.catch(err => {
    void recordOperationalAlert(sql, {
      severity: 'error',
      source: 'paymentGateway.insertPaymobTxn',
      message: String(err?.message || err),
      orderNumber,
      settings: params.settings,
      notifyAdmin: true
    });
  });

  return { provider: 'paymob', mode: cfg.mode, checkoutUrl, transactionId: txnId };
}

export async function processPaymentGatewayCallback(params: {
  sql: any;
  provider: string;
  method: string;
  query: Record<string, any>;
  body: any;
  headers: Record<string, any>;
  settings: any;
  dispatchWhatsApp?: typeof dispatchWhatsAppViaCrm;
}): Promise<{
  verified: boolean;
  paid: boolean;
  pending: boolean;
  orderNumber: string;
  gatewayTxnId: string;
  error?: string;
}> {
  const cfg = resolvePaymentGatewayConfig(params.settings);
  const provider = String(params.provider || cfg.provider || '').toLowerCase();

  let verified = false;
  let paid = false;
  let pending = false;
  let orderNumber = '';
  let gatewayTxnId = '';
  let gatewayPaidAmount: number | null = null;

  if (provider === 'kashier') {
    if (params.method === 'POST' && params.body?.data) {
      const headerSig = String(params.headers?.['x-kashier-signature'] || '');
      verified = verifyKashierWebhookSignature(params.body, headerSig, cfg.apiKey);
      const d = params.body.data;
      orderNumber = String(d.merchantOrderId || '');
      gatewayTxnId = String(d.transactionId || d.kashierOrderId || '');
      const rawAmt = Number(d.amount);
      if (Number.isFinite(rawAmt) && rawAmt > 0) gatewayPaidAmount = rawAmt;
      const status = String(d.status || '').toUpperCase();
      paid = verified && status === 'SUCCESS';
      pending = verified && status === 'PENDING';
    } else {
      verified = verifyKashierRedirectSignature(params.query, cfg.apiKey);
      orderNumber = String(params.query?.merchantOrderId || '');
      gatewayTxnId = String(params.query?.transactionId || params.query?.orderReference || '');
      const rawAmt = Number(params.query?.amount);
      if (Number.isFinite(rawAmt) && rawAmt > 0) gatewayPaidAmount = rawAmt;
      const status = String(params.query?.paymentStatus || '').toUpperCase();
      paid = verified && status === 'SUCCESS';
      pending = verified && status === 'PENDING';
    }
  } else if (provider === 'paymob') {
    const obj = params.method === 'POST' ? params.body?.obj || params.body : params.query;
    const hmacVal = String(params.query?.hmac || params.body?.hmac || '');
    if (params.method === 'GET' && params.query?.hmac) {
      const normalizedObj = {
        amount_cents: params.query.amount_cents,
        created_at: params.query.created_at,
        currency: params.query.currency,
        error_occured: params.query.error_occured,
        has_parent_transaction: params.query.has_parent_transaction,
        id: params.query.id,
        integration_id: params.query.integration_id,
        is_3d_secure: params.query.is_3d_secure,
        is_auth: params.query.is_auth,
        is_capture: params.query.is_capture,
        is_refunded: params.query.is_refunded,
        is_standalone_payment: params.query.is_standalone_payment,
        is_voided: params.query.is_voided,
        order: { id: params.query['order'] || params.query['order.id'] },
        owner: params.query.owner,
        pending: params.query.pending,
        source_data: {
          pan: params.query['source_data.pan'],
          sub_type: params.query['source_data.sub_type'],
          type: params.query['source_data.type']
        },
        success: params.query.success
      };
      verified = verifyPaymobHmac(normalizedObj, hmacVal, cfg.hmacSecret);
      orderNumber = String(params.query.merchant_order_id || params.query.special_reference || '');
      gatewayTxnId = String(params.query.id || '');
      const rawCents = Number(params.query.amount_cents);
      if (Number.isFinite(rawCents) && rawCents > 0) gatewayPaidAmount = rawCents / 100;
      paid = verified && String(params.query.success) === 'true' && String(params.query.pending) !== 'true';
      pending = verified && String(params.query.pending) === 'true';
    } else if (obj) {
      verified = verifyPaymobHmac(obj, hmacVal, cfg.hmacSecret);
      orderNumber = String(obj?.order?.merchant_order_id || obj?.special_reference || '');
      gatewayTxnId = String(obj?.id || '');
      const rawCents = Number(obj?.amount_cents);
      if (Number.isFinite(rawCents) && rawCents > 0) gatewayPaidAmount = rawCents / 100;
      paid = verified && Boolean(obj?.success) && !obj?.pending;
      pending = verified && Boolean(obj?.pending);
    }
  } else {
    return { verified: false, paid: false, pending: false, orderNumber: '', gatewayTxnId: '', error: 'Unsupported provider' };
  }

  if (!verified || !orderNumber) {
    await recordOperationalAlert(params.sql, {
      severity: 'warn',
      source: 'paymentGateway.callbackSignature',
      message: `فشل التحقق من توقيع بوابة الدفع (${provider}).`,
      orderNumber,
      gatewayTxnId
    });
    return { verified, paid: false, pending: false, orderNumber, gatewayTxnId, error: 'Signature verification failed' };
  }

  await ensurePaymentTransactionsTable(params.sql).catch(() => {});
  const txStatus = paid ? 'paid' : pending ? 'pending' : 'failed';
  await params.sql`
    UPDATE payment_transactions
    SET status = ${txStatus}, gateway_reference = COALESCE(NULLIF(${gatewayTxnId}, ''), gateway_reference),
        raw_payload = ${JSON.stringify(params.method === 'POST' ? params.body : params.query)}::jsonb,
        updated_at = NOW()
    WHERE order_number = ${orderNumber};
  `.catch(err => {
    void recordOperationalAlert(params.sql, {
      severity: 'error',
      source: 'paymentGateway.updateTransaction',
      message: String(err?.message || err),
      orderNumber,
      gatewayTxnId
    });
  });

  if (paid) {
    const rows = await params.sql`
      UPDATE orders
      SET payment_status = 'paid',
          payment_reference = COALESCE(NULLIF(${gatewayTxnId}, ''), payment_reference),
          status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
          updated_at = NOW()
      WHERE upper(order_number) = ${orderNumber.toUpperCase()} AND payment_status <> 'paid'
      RETURNING *;
    `;
    const updatedOrder = rows[0];
    if (updatedOrder) {
      const expectedTotal = Number(updatedOrder.total || 0);
      if (
        gatewayPaidAmount !== null &&
        Number.isFinite(expectedTotal) &&
        expectedTotal > 0 &&
        gatewayPaidAmount + 0.5 < expectedTotal
      ) {
        await params.sql`
          UPDATE orders SET payment_status = 'unpaid', updated_at = NOW() WHERE id = ${updatedOrder.id};
        `.catch(() => {});
        await recordOperationalAlert(params.sql, {
          severity: 'critical',
          source: 'paymentGateway.amountMismatch',
          message: `تعارض مبلغ الدفع! المدفوع في ${provider}: ${gatewayPaidAmount} ج.م بينما قيمة الطلب ${expectedTotal} ج.م.`,
          orderNumber,
          gatewayTxnId,
          metadata: { gatewayPaidAmount, expectedTotal, provider },
          settings: params.settings,
          notifyAdmin: true
        });
        return {
          verified: true,
          paid: false,
          pending: false,
          orderNumber,
          gatewayTxnId,
          error: 'Paid amount mismatch'
        };
      }

      let storeHelpers: any = null;
      try {
        storeHelpers = await import('./store.js');
      } catch {
        storeHelpers = null;
      }
      if (storeHelpers?.logAudit) {
        await storeHelpers.logAudit({
          actorName: `Gateway (${provider})`,
          action: 'PAYMENT_VERIFIED_GATEWAY',
          entity: 'order',
          entityId: orderNumber,
          after: { payment_status: 'paid', gatewayTxnId, provider, amount: gatewayPaidAmount }
        }).catch(err => {
          void recordOperationalAlert(params.sql, {
            severity: 'warn',
            source: 'paymentGateway.logAudit',
            message: String(err?.message || err),
            orderNumber,
            gatewayTxnId
          });
        });
      }

      const crm = resolveCrmConfig(params.settings);
      const ord = storeHelpers?.mapRowToOrder ? storeHelpers.mapRowToOrder(updatedOrder) : updatedOrder;
      if (params.settings?.meta_capi_enabled !== false) {
        await Promise.race([
          sendMetaConversionEvent({
            pixelId: params.settings?.meta_pixel_id,
            eventName: 'Purchase',
            eventId: ord.order_number || orderNumber,
            value: expectedTotal,
            orderNumber: ord.order_number || orderNumber,
            phone: ord.customer_whatsapp || ord.customer_phone,
            email: ord.customer_email,
            city: ord.city || ord.governorate,
            contentIds: Array.isArray(ord.items) ? ord.items.map((i: any) => String(i?.product?.id || '')).filter(Boolean) : []
          }),
          new Promise(resolve => setTimeout(resolve, 2000))
        ]).catch(() => {});
      }
      if (crm.configured && crm.shouldAutoSend('payment_verified') && (ord.customer_whatsapp || ord.customer_phone)) {
        const dispatch = params.dispatchWhatsApp || dispatchWhatsAppViaCrm;
        await dispatch(params.sql, {
          recipient: ord.customer_whatsapp || ord.customer_phone,
          text: buildServerOrderWhatsAppMessage('payment_verified', ord, params.settings),
          type: 'payment_verified',
          orderId: ord.id,
          orderNumber: ord.order_number,
          settings: params.settings
        }).catch(err => {
          void recordOperationalAlert(params.sql, {
            severity: 'error',
            source: 'paymentGateway.dispatchWhatsApp',
            message: String(err?.message || err),
            orderNumber,
            gatewayTxnId
          });
        });
      }
    } else {
      const existingCheck = await params.sql`
        SELECT id, status, payment_status, total
        FROM orders
        WHERE upper(order_number) = ${orderNumber.toUpperCase()}
        LIMIT 1;
      `.catch(() => []);
      const found = existingCheck?.[0];
      if (!found || found.status === 'cancelled') {
        await recordOperationalAlert(params.sql, {
          severity: 'critical',
          source: 'paymentGateway.paidWithoutActiveOrder',
          message: !found
            ? `دفعة ناجحة عبر ${provider} بقيمة ${gatewayPaidAmount ?? '؟'} ج.م للطلب #${orderNumber} ولكن الطلب غير مسجل في قاعدة البيانات!`
            : `دفعة ناجحة عبر ${provider} بقيمة ${gatewayPaidAmount ?? '؟'} ج.م للطلب الملغي #${orderNumber} (${found.status})! يرجى المراجعة والرد.`,
          orderNumber,
          gatewayTxnId,
          metadata: { provider, gatewayPaidAmount, existingStatus: found?.status || 'missing' },
          settings: params.settings,
          notifyAdmin: true
        });
      }
    }
  }

  return { verified: true, paid, pending, orderNumber, gatewayTxnId };
}
