import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import * as access from '../lib/access.js';
import * as totp from '../lib/totp.js';
import { passwordHash, passwordMatches } from '../lib/session.js';

const require = createRequire(import.meta.url);

function compile(file, mocks = {}) {
  const source = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    }
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => mocks[id] || require(id), module, module.exports);
  return module.exports;
}

const address = compile('src/utils/deliveryAddress.ts');
const governorates = compile('src/data/governorates.ts');
const pricing = compile('server/pricing.ts', {
  '../src/data/governorates.js': governorates,
  '../src/utils/deliveryAddress.js': address
});
const whatsappCrm = compile('server/whatsappCrm.ts', {
  '../src/utils/deliveryAddress.js': address,
  './monitoring.js': { fetchWithTimeout: fetch, logStructured() {}, recordOperationalAlert: async () => {} }
});

test('pricing rejects SVG XSS uploads and enforces server shipping and coupon math', () => {
  const svgXss = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj48L3N2Zz4=';
  assert.equal(pricing.sanitizeUploadedImage(svgXss), undefined);
  assert.equal(pricing.sanitizeUploadedImage('http://insecure.example/a.png'), undefined);
  assert.equal(
    pricing.sanitizeUploadedImage('data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA='),
    'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA='
  );

  // Free shipping kicks in at threshold, governorate tariff applies otherwise
  assert.equal(pricing.calculateServerShippingFee({ subtotal: 2500, governorate: 'القاهرة' }), 0);
  assert.equal(
    pricing.calculateServerShippingFee({ subtotal: 1000, governorate: 'القاهرة', settings: { free_shipping_threshold: 2500, shipping_fee_default: 35 } }),
    55
  );

  // Coupon discount cannot be forged without valid active coupon
  const forged = pricing.validateAndComputeCouponDiscount({
    subtotal: 3000,
    clientDiscount: 2999,
    settings: { coupons: [] }
  });
  assert.equal(forged.discount, 0);
  assert.ok(forged.error);

  const valid = pricing.validateAndComputeCouponDiscount({
    subtotal: 3000,
    couponCode: 'JOE10',
    phone: '01012345678',
    settings: {
      coupons: [{ id: 'c1', code: 'JOE10', discount_type: 'percentage', discount_value: 10, max_discount_amount: 200, is_active: true, used_by: [] }]
    }
  });
  assert.equal(valid.discount, 200);
  assert.equal(valid.couponCode, 'JOE10');
});

test('createOrder overrides client-tampered prices (3000 -> 1) and enforces idempotency replay', async () => {
  const savedOrders = [];
  const alerts = [];
  let dupHit = null;
  const mon = {
    fetchWithTimeout: fetch,
    logStructured() {},
    recordOperationalAlert: async (_sql, p) => { alerts.push(p); }
  };
  const gw = compile('server/paymentGateway.ts', {
    './whatsappCrm.js': whatsappCrm,
    './monitoring.js': mon,
    './metaCapi.js': { sendMetaConversionEvent: async () => ({ sent: false }) }
  });
  const { execute } = compile('api/store.ts', {
    '../server/store.js': {
      neonDb: {},
      mapRowToOrder: r => r,
      logAudit: async () => {}
    },
    '../server/whatsappCrm.js': whatsappCrm,
    '../server/paymentGateway.js': gw,
    '../server/monitoring.js': mon,
    '../server/pricing.js': pricing,
    '../server/rateLimit.js': { extractClientIp: () => '1.2.3.4', checkRateLimit: async () => ({ allowed: true, remaining: 5, retryAfterSeconds: 0 }), clearRateLimit: async () => {} },
    '../server/jobs.js': { enqueueBackgroundJob: async () => ({ queued: true }) },
    '../server/metaCapi.js': { sendMetaConversionEvent: async () => ({ sent: false }) },
    '../lib/mailer.js': { sendTransactionalEmail: async () => ({ sent: true }) },
    '../lib/access.js': access,
    '../src/utils/deliveryAddress.js': address,
    '../server/orderWrites.js': {
      saveOrder: async (_sql, order) => { savedOrders.push(order); return true; },
      cancelOrder: async () => ({ success: true })
    },
    '../lib/totp.js': totp,
    '../lib/session.js': { database: () => ({}), currentUser: () => null, passwordMatches, passwordHash, pendingSecondFactor: async () => null, issueSession: async () => {}, endSession: async () => {}, endAllSessions: async () => {} }
  });

  const sql = Object.assign(
    async (strings, ...params) => {
      const q = strings.join('?');
      if (/FROM orders[\s\S]*WHERE idempotency_key/i.test(q)) {
        return dupHit ? [dupHit] : [];
      }
      if (/FROM products WHERE id = ANY/i.test(q)) {
        return [{ id: 'jacket-3k', name_ar: 'جاكيت شتوي', price: 3000, stock_quantity: 5, is_active: true, images: ['/product-placeholder.svg'], brand: 'JOE' }];
      }
      return [];
    },
    { query: async () => [] }
  );

  const store = {
    getStoreSettings: async () => ({ store_name_ar: 'جو ستور', free_shipping_threshold: 2500, shipping_fee_default: 35, coupons: [] }),
    updateStoreSettings: async () => ({ success: true })
  };

  // 1) Client tempers item price (3000 -> 1): server rejects mismatched price
  await assert.rejects(
    execute(
      { headers: {} },
      { setHeader() {} },
      {
        method: 'createOrder',
        args: [{
          idempotency_key: 'idem-tamper-block',
          customer_name: 'عميل تجربة',
          customer_phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          street: 'الجامعة',
          address_details: 'المنصورة - حي الجامعة - شارع 10',
          payment_method: 'cod',
          subtotal: 1,
          shipping_fee: 0,
          discount: 0,
          total: 1,
          items: [{ product: { id: 'jacket-3k', price: 1 }, quantity: 1 }]
        }]
      },
      { user: { id: 'usr-1', email: 'buyer@example.com', role: 'customer', name: 'Buyer' }, sql, store }
    ),
    e => e.status === 400
  );

  // 2) Client sends genuine DB item price/subtotal (3000) but tampers discount=2999 & total=1:
  // Server MUST reject or override invalid unverified discount back to 0 and total to 3000!
  await assert.rejects(
    execute(
      { headers: {} },
      { setHeader() {} },
      {
        method: 'createOrder',
        args: [{
          idempotency_key: 'idem-discount-block',
          customer_name: 'عميل تجربة',
          customer_phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          street: 'الجامعة',
          address_details: 'المنصورة - حي الجامعة - شارع 10',
          payment_method: 'cod',
          subtotal: 3000,
          shipping_fee: 0,
          discount: 2999,
          total: 1,
          items: [{ product: { id: 'jacket-3k', price: 3000 }, quantity: 1 }]
        }]
      },
      { user: { id: 'usr-1', email: 'buyer@example.com', role: 'customer', name: 'Buyer' }, sql, store }
    ),
    e => e.status === 400
  );

  // 3) Tampered shipping fee is also rejected with HTTP 400
  await assert.rejects(
    execute(
      { headers: {} },
      { setHeader() {} },
      {
        method: 'createOrder',
        args: [{
          idempotency_key: 'idem-ship-tamper',
          customer_name: 'عميل تجربة',
          customer_phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          street: 'الجامعة',
          address_details: 'المنصورة - حي الجامعة - شارع 10',
          payment_method: 'cod',
          subtotal: 3000,
          shipping_fee: 99,
          discount: 0,
          total: 3099,
          items: [{ product: { id: 'jacket-3k', price: 3000 }, quantity: 1 }]
        }]
      },
      { user: { id: 'usr-1', email: 'buyer@example.com', role: 'customer', name: 'Buyer' }, sql, store }
    ),
    e => e.status === 400
  );

  // 4) Tampered final total (3000 -> 1) is also rejected cleanly before persistence
  await assert.rejects(
    execute(
      { headers: {} },
      { setHeader() {} },
      {
        method: 'createOrder',
        args: [{
          idempotency_key: 'idem-total-tamper',
          customer_name: 'عميل تجربة',
          customer_phone: '01012345678',
          governorate: 'الدقهلية',
          city: 'المنصورة',
          street: 'الجامعة',
          address_details: 'المنصورة - حي الجامعة - شارع 10',
          payment_method: 'cod',
          subtotal: 3000,
          shipping_fee: 0,
          discount: 0,
          total: 1,
          items: [{ product: { id: 'jacket-3k', price: 3000 }, quantity: 1 }]
        }]
      },
      { user: { id: 'usr-1', email: 'buyer@example.com', role: 'customer', name: 'Buyer' }, sql, store }
    ),
    e => e.status === 400
  );

  // 5) Genuine checkout succeeds with authoritative 3000 EGP total and replays idempotently
  const res1 = await execute(
    { headers: {} },
    { setHeader() {} },
    {
      method: 'createOrder',
      args: [{
        idempotency_key: 'idem-checkout-99',
        customer_name: 'عميل تجربة',
        customer_phone: '01012345678',
        governorate: 'الدقهلية',
        city: 'المنصورة',
        street: 'الجامعة',
        address_details: 'المنصورة - حي الجامعة - شارع 10',
        payment_method: 'cod',
        subtotal: 3000,
        shipping_fee: 0,
        discount: 0,
        total: 3000,
        items: [{ product: { id: 'jacket-3k', price: 3000 }, quantity: 1 }]
      }]
    },
    { user: { id: 'usr-1', email: 'buyer@example.com', role: 'customer', name: 'Buyer' }, sql, store }
  );

  assert.equal(res1.success, true);
  assert.equal(res1.subtotal, 3000);
  assert.equal(res1.total, 3000);
  assert.equal(savedOrders.length, 1);
  assert.equal(savedOrders[0].total, 3000);
  assert.equal(savedOrders[0].items[0].product.price, 3000);

  // Double-click replay with same idempotency_key returns existing order without writing again
  dupHit = {
    id: savedOrders[0].id,
    order_number: savedOrders[0].order_number,
    invoice_number: savedOrders[0].invoice_number,
    customer_email: 'buyer@example.com',
    customer_phone: '01012345678',
    subtotal: 3000,
    discount: 0,
    shipping_fee: 0,
    total: 3000,
    payment_method: 'cod'
  };
  const replay = await execute(
    { headers: {} },
    { setHeader() {} },
    {
      method: 'createOrder',
      args: [{ idempotency_key: 'idem-checkout-99', customer_name: 'عميل تجربة', customer_phone: '01012345678', governorate: 'الدقهلية', city: 'المنصورة', street: 'الجامعة', address_details: 'المنصورة - حي الجامعة', payment_method: 'cod', items: [{ product: { id: 'jacket-3k', price: 1 }, quantity: 1 }] }]
    },
    { user: { id: 'usr-1', email: 'buyer@example.com', role: 'customer', name: 'Buyer' }, sql, store }
  );
  assert.equal(replay.duplicate, true);
  assert.equal(replay.order_number, savedOrders[0].order_number);
  assert.equal(savedOrders.length, 1, 'duplicate click must not create a second order');

  // Another user attempting to replay same idempotency key is blocked with 409
  await assert.rejects(
    execute(
      { headers: {} },
      { setHeader() {} },
      {
        method: 'createOrder',
        args: [{ idempotency_key: 'idem-checkout-99', customer_name: 'مهاجم', customer_phone: '01999999999', governorate: 'القاهرة', city: 'القاهرة', street: 'x', address_details: 'addr', payment_method: 'cod', items: [{ product: { id: 'jacket-3k', price: 3000 }, quantity: 1 }] }]
      },
      { user: { id: 'usr-other', email: 'attacker@example.com', role: 'customer', name: 'Attacker' }, sql, store }
    ),
    e => e.status === 409
  );
});

test('paymentGateway flags underpayment mismatch and orphan payment alerts', async () => {
  const { createHmac } = await import('node:crypto');
  const alerts = [];
  const queries = [];
  const mon = {
    fetchWithTimeout: fetch,
    logStructured() {},
    recordOperationalAlert: async (_sql, p) => { alerts.push(p); }
  };
  const gw = compile('server/paymentGateway.ts', {
    './whatsappCrm.js': whatsappCrm,
    './monitoring.js': mon,
    './metaCapi.js': { sendMetaConversionEvent: async () => ({ sent: false }) }
  });

  const signWebhook = (dataObj, secret = 'k-test') => {
    const parts = dataObj.signatureKeys.slice().sort().map(k => `${k}=${dataObj[k] ?? ''}`).join('&');
    return createHmac('sha256', secret).update(parts).digest('hex');
  };

  // 1. Orphan payment (no order matches orderNumber -> critical alert recorded!)
  const orphanSql = Object.assign(async (strings) => {
    queries.push(strings.join('?'));
    return [];
  }, { query: async () => [] });

  const orphanData = {
    merchantOrderId: 'JOE-MISSING',
    transactionId: 'TXN-99',
    status: 'SUCCESS',
    amount: 3000,
    currency: 'EGP',
    signatureKeys: ['amount', 'currency', 'merchantOrderId', 'status', 'transactionId']
  };
  const orphanRes = await gw.processPaymentGatewayCallback({
    method: 'POST',
    sql: orphanSql,
    settings: { payment_gateway_provider: 'kashier', payment_gateway_api_key: 'k-test' },
    query: {},
    body: { data: orphanData },
    headers: { 'x-kashier-signature': signWebhook(orphanData) }
  });
  assert.equal(orphanRes.paid, true);
  assert.ok(alerts.some(a => a.source === 'paymentGateway.paidWithoutActiveOrder' && a.severity === 'critical'));

  // 2. Underpayment mismatch (order total 3000, paid 1 -> reverts payment_status & raises critical alert)
  alerts.length = 0;
  const mismatchSql = Object.assign(async (strings) => {
    const q = strings.join('?');
    queries.push(q);
    if (/UPDATE orders[\s\S]*RETURNING \*/i.test(q)) {
      return [{ id: 'ord-1', order_number: 'JOE-500', total: 3000, payment_status: 'paid' }];
    }
    return [];
  }, { query: async () => [] });

  const underData = {
    merchantOrderId: 'JOE-500',
    transactionId: 'TXN-UNDER',
    status: 'SUCCESS',
    amount: 1,
    currency: 'EGP',
    signatureKeys: ['amount', 'currency', 'merchantOrderId', 'status', 'transactionId']
  };
  const mismatchRes = await gw.processPaymentGatewayCallback({
    method: 'POST',
    sql: mismatchSql,
    settings: { payment_gateway_provider: 'kashier', payment_gateway_api_key: 'k-test' },
    query: {},
    body: { data: underData },
    headers: { 'x-kashier-signature': signWebhook(underData) }
  });
  assert.equal(mismatchRes.paid, false);
  assert.equal(mismatchRes.error, 'Paid amount mismatch');
  assert.ok(alerts.some(a => a.source === 'paymentGateway.amountMismatch' && a.severity === 'critical'));
});

test('electronic invoice builds sequential ID, CR/Tax metadata, VAT split, and offline QR data URI', () => {
  const invGen = compile('src/utils/invoiceGenerator.ts', {
    './deliveryAddress': address
  });
  const inv = invGen.buildElectronicInvoiceData(
    {
      id: 'ord-1',
      order_number: 'JOE-9901',
      invoice_number: 'INV-JOE-9901',
      created_at: '2026-11-28T10:00:00Z',
      customer_name: 'أحمد علي',
      customer_phone: '01012345678',
      governorate: 'الدقهلية',
      city: 'المنصورة',
      street: 'المشاية',
      payment_method: 'card',
      payment_status: 'paid',
      subtotal: 1140,
      discount: 0,
      shipping_fee: 0,
      total: 1140,
      items: [{ product: { name_ar: 'AirPods Pro', price: 1140 }, quantity: 1 }]
    },
    {
      store_name_ar: 'جو ستور',
      commercial_register: '98765',
      tax_id: '456-789-123',
      vat_rate: 14
    }
  );
  assert.equal(inv.invoiceNumber, 'INV-JOE-9901');
  assert.equal(inv.commercialRegister, '98765');
  assert.equal(inv.taxId, '456-789-123');
  assert.equal(inv.vatAmount, 140);
  assert.equal(inv.preVatSubtotal, 1000);
  assert.match(inv.qrDataUri, /^data:image\/svg\+xml;utf8,/);
});

test('DSAR deleteUser anonymizes orders/tickets/reviews & submitBreachReport records 48h deadline', async () => {
  const executedSql = [];
  const alerts = [];
  const mon = {
    fetchWithTimeout: fetch,
    logStructured() {},
    recordOperationalAlert: async (_sql, p) => { alerts.push(p); }
  };
  const { execute } = compile('api/store.ts', {
    '../server/store.js': { neonDb: {}, mapRowToOrder: r => r, logAudit: async () => {} },
    '../server/whatsappCrm.js': whatsappCrm,
    '../server/paymentGateway.js': compile('server/paymentGateway.ts', { './whatsappCrm.js': whatsappCrm, './monitoring.js': mon, './metaCapi.js': { sendMetaConversionEvent: async () => ({ sent: false }) } }),
    '../server/monitoring.js': mon,
    '../server/pricing.js': pricing,
    '../server/rateLimit.js': { extractClientIp: () => '9.9.9.9', checkRateLimit: async () => ({ allowed: true, remaining: 5, retryAfterSeconds: 0 }), clearRateLimit: async () => {} },
    '../server/jobs.js': { enqueueBackgroundJob: async () => ({ queued: true }) },
    '../server/metaCapi.js': { sendMetaConversionEvent: async () => ({ sent: false }) },
    '../lib/mailer.js': { sendTransactionalEmail: async () => ({ sent: true }) },
    '../lib/access.js': access,
    '../src/utils/deliveryAddress.js': address,
    '../server/orderWrites.js': {},
    '../lib/totp.js': totp,
    '../lib/session.js': { database: () => ({}), currentUser: () => null, passwordMatches, passwordHash, pendingSecondFactor: async () => null, issueSession: async () => {}, endSession: async () => {}, endAllSessions: async () => {} }
  });

  const sql = Object.assign(
    async (strings, ...params) => {
      const q = strings.join('?');
      executedSql.push({ q, params });
      if (/SELECT id, email FROM users WHERE id=/i.test(q)) {
        return [{ id: 'usr-del-1', email: 'victim@example.com' }];
      }
      if (/DELETE FROM users WHERE id=/i.test(q)) {
        return [{ id: 'usr-del-1' }];
      }
      return [];
    },
    { query: async () => [] }
  );

  const delRes = await execute(
    { headers: {} },
    { setHeader() {} },
    { method: 'deleteUser', args: ['usr-del-1'] },
    { user: { id: 'usr-del-1', email: 'victim@example.com', role: 'customer', name: 'Victim' }, sql, store: {} }
  );
  assert.equal(delRes.success, true);
  assert.ok(executedSql.some(s => /UPDATE\s+orders[\s\S]*REDACTED/i.test(s.q)), 'orders must be anonymized');
  assert.ok(executedSql.some(s => /DELETE FROM app_sessions/i.test(s.q)), 'sessions must be revoked');
  assert.ok(executedSql.some(s => /DELETE FROM customer_activity/i.test(s.q)), 'tracking must be purged');

  const breachRes = await execute(
    { headers: {} },
    { setHeader() {} },
    { method: 'submitBreachReport', args: [{ reporter_email: 'alert@example.com', incident_type: 'data_exposure', description: 'لاحظت عرض رابط حساس بالخطأ أثناء الفحص.' }] },
    { user: null, sql, store: {} }
  );
  assert.equal(breachRes.success, true);
  assert.ok(breachRes.report_deadline_at);
  assert.ok(alerts.some(a => a.source === 'legal.dataBreachReport' && a.severity === 'critical'));
});

test('Meta Pixel deduplicates Purchase events via eventID & CAPI includes EMQ fields on live origin', async () => {
  const fbqCalls = [];
  const headAttrs = [];
  const prevWin = globalThis.window;
  const prevDoc = globalThis.document;
  globalThis.document = {
    cookie: '_fbp=fb.1.1700000000000.123456789; _fbc=fb.1.1700000000001.AbCdEf_123',
    getElementById: () => ({ id: 'joe-meta-pixel-script' }),
    head: {
      appendChild(el) { headAttrs.push(el); },
      querySelector: () => null
    },
    createElement: () => {
      const attrs = {};
      return {
        setAttribute(k, v) { attrs[k] = v; },
        getAttribute(k) { return attrs[k]; },
        _attrs: attrs
      };
    }
  };
  globalThis.window = {
    fbq: (...args) => fbqCalls.push(args)
  };
  try {
    const metaPixel = compile('src/utils/metaPixel.ts');
    assert.equal(metaPixel.initMetaPixel('123456789012345'), true);
    metaPixel.trackMetaEvent('Purchase', { value: 2500, currency: 'EGP' }, 'JOE-99881');
    const purchaseCall = fbqCalls.find(c => c[0] === 'track' && c[1] === 'Purchase');
    assert.deepEqual(purchaseCall, ['track', 'Purchase', { value: 2500, currency: 'EGP' }, { eventID: 'JOE-99881' }]);

    const cookies = metaPixel.getMetaBrowserCookies();
    assert.equal(cookies.fbp, 'fb.1.1700000000000.123456789');
    assert.equal(cookies.fbc, 'fb.1.1700000000001.AbCdEf_123');

    metaPixel.disableMetaPixel();
    const countBefore = fbqCalls.length;
    metaPixel.trackMetaEvent('PageView');
    assert.equal(fbqCalls.length, countBefore, 'disabled Meta Pixel must not fire events');

    const seo = compile('src/utils/seo.ts');
    seo.syncSiteVerificationMeta('gsc-tok', '<meta name="facebook-domain-verification" content="fb-verify-xyz" />');
    assert.ok(headAttrs.some(el => el._attrs.name === 'facebook-domain-verification' && el._attrs.content === 'fb-verify-xyz'));
  } finally {
    globalThis.window = prevWin;
    globalThis.document = prevDoc;
  }

  let capturedPayload = null;
  const prevToken = process.env.META_CAPI_ACCESS_TOKEN;
  process.env.META_CAPI_ACCESS_TOKEN = 'test-capi-token';
  try {
    const capi = compile('server/metaCapi.ts', {
      './monitoring.js': {
        logStructured() {},
        fetchWithTimeout: async (_url, init) => {
          capturedPayload = JSON.parse(init.body);
          return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
        }
      }
    });
    const res = await capi.sendMetaConversionEvent({
      pixelId: '123456789012345',
      eventName: 'Purchase',
      eventId: 'JOE-99881',
      value: 2500,
      orderNumber: 'JOE-99881',
      phone: '01554826209',
      email: 'buyer@example.com',
      city: 'Mansoura',
      externalId: 'usr-123',
      fbp: 'fb.1.1700000000000.123456789',
      fbc: 'fb.1.1700000000001.AbCdEf_123',
      testEventCode: 'TEST12345'
    });
    assert.equal(res.sent, true);
    assert.equal(capturedPayload.test_event_code, 'TEST12345');
    assert.equal(capturedPayload.data[0].event_id, 'JOE-99881');
    assert.equal(capturedPayload.data[0].event_source_url, 'https://joe-store-2026.vercel.app/');
    assert.equal(capturedPayload.data[0].user_data.fbp, 'fb.1.1700000000000.123456789');
    assert.equal(capturedPayload.data[0].user_data.fbc, 'fb.1.1700000000001.AbCdEf_123');
    assert.ok(Array.isArray(capturedPayload.data[0].user_data.country) && capturedPayload.data[0].user_data.country[0].length === 64);
    assert.ok(Array.isArray(capturedPayload.data[0].user_data.external_id) && capturedPayload.data[0].user_data.external_id[0].length === 64);
  } finally {
    if (prevToken === undefined) delete process.env.META_CAPI_ACCESS_TOKEN;
    else process.env.META_CAPI_ACCESS_TOKEN = prevToken;
  }
});
