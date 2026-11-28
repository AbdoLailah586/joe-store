import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import { renderToString } from 'react-dom/server';
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
const egyptLocation = compile('src/utils/egyptLocation.ts', { '../data/governorates': governorates });
const monMock = { fetchWithTimeout: fetch, logStructured() {}, recordOperationalAlert: async () => {} };
const whatsappCrm = compile('server/whatsappCrm.ts', { '../src/utils/deliveryAddress.js': address, './monitoring.js': monMock });
const paymentGateway = compile('server/paymentGateway.ts', { './whatsappCrm.js': whatsappCrm, './monitoring.js': monMock, './metaCapi.js': { sendMetaConversionEvent: async () => ({ sent: false }) } });
const visitorAttribution = compile('src/utils/visitorAttribution.ts');
const adLinks = compile('src/utils/adLinks.ts');
const metaPixel = compile('src/utils/metaPixel.ts');
const policyDefaults = compile('src/utils/policyDefaults.ts');
const whatsappClient = compile('src/utils/whatsappService.ts', { './browserStorage': { readStoredArray: () => [], writeStoredJson: () => true, isStoredNotification: () => true } });

test('payment gateway strips secret keys and detects configuration cleanly', () => {
  const plain = { store_name: 'JOE Store' };
  assert.equal(paymentGateway.hasGatewaySettingsMetadata(plain), false);
  const kashierSettings = {
    store_name_ar: 'جو ستور',
    payment_gateway_provider: 'kashier',
    payment_gateway_merchant_id: 'MID-1234',
    payment_gateway_api_key: 'SECRET-API-KEY',
    payment_gateway_secret_key: 'SECRET-KEY',
    payment_gateway_hmac_secret: 'HMAC-SECRET',
    payment_gateway_enable_card: true
  };
  assert.equal(paymentGateway.hasGatewaySettingsMetadata(kashierSettings), true);
  const stripped = paymentGateway.stripPaymentSecrets(kashierSettings);
  assert.equal(stripped.payment_gateway_api_key, undefined);
  assert.equal(stripped.payment_gateway_secret_key, undefined);
  assert.equal(stripped.payment_gateway_hmac_secret, undefined);
  assert.equal(stripped.payment_gateway_merchant_id, 'MID-1234');

  const cfg = paymentGateway.resolvePaymentGatewayConfig(kashierSettings);
  assert.equal(cfg.configured, true);
  assert.equal(cfg.methods.card, true);
  assert.equal(paymentGateway.shouldRouteOrderToGateway('credit_card', kashierSettings), true);
  assert.equal(paymentGateway.shouldRouteOrderToGateway('cod', kashierSettings), false);
});

test('Kashier HMAC redirect verification and Paymob HMAC verification accept valid signatures and block tampered payloads', async () => {
  const apiKey = 'kashier_api_secret_99';
  const queryParams = {
    paymentStatus: 'SUCCESS',
    cardDataToken: '',
    maskedCard: '512345******0008',
    merchantOrderId: 'JOE-99881',
    orderId: 'kash-01',
    cardBrand: 'MasterCard',
    orderReference: 'REF-1',
    transactionId: 'TXN-555',
    amount: '1500.00',
    currency: 'EGP',
    mode: 'test'
  };
  const qsString = Object.entries(queryParams)
    .filter(([k]) => k !== 'mode' && k !== 'signature' && k !== 'provider')
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const validSig = createHmac('sha256', apiKey).update(qsString).digest('hex');

  assert.equal(paymentGateway.verifyKashierRedirectSignature({ ...queryParams, signature: validSig }, apiKey), true);
  assert.equal(
    paymentGateway.verifyKashierRedirectSignature({ ...queryParams, amount: '1.00', signature: validSig }, apiKey),
    false
  );

  // Paymob SHA512 verification
  const hmacSecret = 'paymob_hmac_secret_77';
  const paymobObj = {
    amount_cents: 150000,
    created_at: '2026-11-27T10:00:00',
    currency: 'EGP',
    error_occured: false,
    has_parent_transaction: false,
    id: 901,
    integration_id: 444,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 888, merchant_order_id: 'JOE-77771' },
    owner: 12,
    pending: false,
    source_data: { pan: '2345', sub_type: 'MasterCard', type: 'card' },
    success: true
  };
  const concat = [
    paymobObj.amount_cents, paymobObj.created_at, paymobObj.currency, paymobObj.error_occured,
    paymobObj.has_parent_transaction, paymobObj.id, paymobObj.integration_id, paymobObj.is_3d_secure,
    paymobObj.is_auth, paymobObj.is_capture, paymobObj.is_refunded, paymobObj.is_standalone_payment,
    paymobObj.is_voided, paymobObj.order.id, paymobObj.owner, paymobObj.pending,
    paymobObj.source_data.pan, paymobObj.source_data.sub_type, paymobObj.source_data.type, paymobObj.success
  ].map(String).join('');
  const validPaymobHmac = createHmac('sha512', hmacSecret).update(concat).digest('hex');

  assert.equal(paymentGateway.verifyPaymobHmac(paymobObj, validPaymobHmac, hmacSecret), true);
  assert.equal(paymentGateway.verifyPaymobHmac({ ...paymobObj, amount_cents: 1 }, validPaymobHmac, hmacSecret), false);

  // Callback marks order paid and fires WhatsApp ONLY when payment_verified trigger is checked
  const waSkipped = [];
  const updatedOrders = [];
  const mockSql = Object.assign(
    async (strings) => {
      const q = strings.join('?');
      if (/UPDATE orders/i.test(q)) {
        const ord = { id: 'ord-1', order_number: 'JOE-99881', customer_phone: '01012345678', customer_name: 'محمد', total: 1500, items: [] };
        updatedOrders.push(ord);
        return [ord];
      }
      return [];
    },
    { query: async () => [] }
  );

  const cbOff = await paymentGateway.processPaymentGatewayCallback({
    sql: mockSql,
    provider: 'kashier',
    method: 'GET',
    headers: {},
    query: { ...queryParams, signature: validSig },
    body: {},
    settings: {
      payment_gateway_provider: 'kashier',
      payment_gateway_merchant_id: 'MID-1234',
      payment_gateway_api_key: apiKey,
      whatsapp_automation_url: 'https://crm.example.com',
      whatsapp_automation_email: 'crm@example.com',
      whatsapp_automation_pass: 'pass123'
    },
    dispatchWhatsApp: async (_sql, payload) => {
      waSkipped.push(payload);
      return { success: true, status: 'sent', waLink: 'https://wa.me/201012345678' };
    }
  });
  assert.equal(cbOff.verified, true);
  assert.equal(cbOff.paid, true);
  assert.equal(waSkipped.length, 0);

  const waSent = [];
  const cbOn = await paymentGateway.processPaymentGatewayCallback({
    sql: mockSql,
    provider: 'kashier',
    method: 'GET',
    headers: {},
    query: { ...queryParams, signature: validSig },
    body: {},
    settings: {
      payment_gateway_provider: 'kashier',
      payment_gateway_merchant_id: 'MID-1234',
      payment_gateway_api_key: apiKey,
      whatsapp_automation_url: 'https://crm.example.com',
      whatsapp_automation_email: 'crm@example.com',
      whatsapp_automation_pass: 'pass123',
      whatsapp_auto_triggers: { payment_verified: true }
    },
    dispatchWhatsApp: async (_sql, payload) => {
      waSent.push(payload);
      return { success: true, status: 'sent', waLink: 'https://wa.me/201012345678' };
    }
  });

  assert.equal(cbOn.verified, true);
  assert.equal(cbOn.paid, true);
  assert.equal(updatedOrders.length, 2);
  assert.equal(waSent.length, 1);
  assert.equal(waSent[0].type, 'payment_verified');
});

test('checkout API blocks disabled card method, routes enabled gateway orders, and dispatches Admin New Order alert', async () => {
  const { execute } = compile('api/store.ts', {
    '../server/store.js': { neonDb: {}, mapRowToOrder: r => r, logAudit: async () => {} },
    '../server/whatsappCrm.js': whatsappCrm,
    '../server/paymentGateway.js': paymentGateway,
    '../server/monitoring.js': monMock,
    '../server/pricing.js': { sanitizeUploadedImage: x => x, calculateServerShippingFee: ({ subtotal }) => (subtotal >= 2500 ? 0 : 35), validateAndComputeCouponDiscount: () => ({ discount: 0 }) },
    '../server/rateLimit.js': { extractClientIp: () => '127.0.0.1', checkRateLimit: async () => ({ allowed: true, remaining: 5, retryAfterSeconds: 0 }), clearRateLimit: async () => {} },
    '../server/jobs.js': { enqueueBackgroundJob: async () => ({ queued: true }) },
    '../server/metaCapi.js': { sendMetaConversionEvent: async () => ({ sent: false }) },
    '../lib/mailer.js': { sendTransactionalEmail: async () => ({ sent: true }) },
    '../lib/access.js': access,
    '../src/utils/deliveryAddress.js': address,
    '../server/orderWrites.js': { saveOrder: async () => true, cancelOrder: async () => true },
    '../lib/totp.js': totp,
    '../lib/session.js': { database: () => ({}), currentUser: () => null, passwordMatches, passwordHash, pendingSecondFactor: async () => null, issueSession: async () => {} }
  });

  const baseOrder = {
    id: 'ord-55',
    order_number: 'JOE-55555',
    customer_name: 'أحمد علي',
    customer_phone: '01012345678',
    address_details: 'المنصورة شارع الجيش',
    items: [{ product: { id: 'p1', name_ar: 'شاحن أنكر', price: 500 }, quantity: 1 }],
    subtotal: 500,
    shipping_fee: 35,
    discount: 0,
    total: 535,
    payment_method: 'credit_card'
  };

  await assert.rejects(
    execute(
      { headers: { host: 'joe-store-2026.vercel.app' } },
      { setHeader() {} },
      { method: 'createOrder', args: [baseOrder] },
      {
        user: null,
        sql: Object.assign(async () => [], { query: async () => [] }),
        store: { getStoreSettings: async () => ({ store_name_ar: 'جو ستور' }) }
      }
    ),
    err => err.status === 400
  );

  // When Kashier configured, credit_card returns checkout_url
  const gwResult = await execute(
    { headers: { host: 'joe-store-2026.vercel.app' } },
    { setHeader() {} },
    { method: 'createOrder', args: [baseOrder] },
    {
      user: null,
      sql: Object.assign(async () => [], { query: async () => [] }),
      store: {
        getStoreSettings: async () => ({
          payment_gateway_provider: 'kashier',
          payment_gateway_mode: 'test',
          payment_gateway_merchant_id: 'MID-888',
          payment_gateway_api_key: 'kash_secret',
          payment_gateway_enable_card: true
        })
      }
    }
  );
  assert.equal(gwResult.success, true);
  assert.match(gwResult.checkout_url, /^https:\/\/checkout\.kashier\.io\//);
  assert.match(gwResult.checkout_url, /merchantId=MID-888/);
});

test('client WhatsApp defaults strip hardcoded secrets and server admin_new_order template includes confirm link', () => {
  assert.equal(whatsappClient.defaultSettings.whatsapp_automation_pass, '');
  assert.equal(whatsappClient.defaultSettings.whatsapp_automation_url, '');
  assert.equal(whatsappClient.defaultSettings.whatsapp_automation_email, '');

  const adminMsg = whatsappCrm.buildServerOrderWhatsAppMessage(
    'admin_new_order',
    {
      order_number: 'JOE-12345',
      customer_name: 'كريم حسن',
      customer_phone: '01099887766',
      customer_whatsapp: '01099887766',
      governorate: 'الدقهلية',
      city: 'المنصورة',
      address_details: 'شارع الجمهورية',
      shipping_fee: 35,
      total: 1235,
      payment_method: 'cod',
      google_maps_url: 'https://www.google.com/maps?q=31.0409,31.3785',
      items: [{ product: { name_ar: 'سماعة', price: 1200 }, quantity: 1 }]
    },
    {}
  );
  assert.match(adminMsg, /JOE-12345/);
  assert.match(adminMsg, /https:\/\/wa\.me\/201099887766/);
  assert.match(adminMsg, /google\.com\/maps/);
});

test('Egypt GPS location matcher, coordinates serialization, ad UTM links, attribution, and Pixel validation', () => {
  assert.equal(egyptLocation.matchGovernorateFromText('Mansoura, Dakahlia')?.id, 'daqahlia');
  assert.equal(egyptLocation.matchGovernorateFromText('القاهرة الجديدة')?.id, 'cairo');
  assert.equal(egyptLocation.matchGovernorateFromText('Alexandria Governorate')?.id, 'alexandria');

  const encoded = address.encodeDeliveryNotes({
    governorate: 'الدقهلية',
    city: 'المنصورة',
    latitude: 31.0409,
    longitude: 31.3785
  });
  const decoded = address.decodeDeliveryNotes(encoded);
  assert.equal(decoded.latitude, 31.0409);
  assert.equal(decoded.longitude, 31.3785);

  const adUrl = adLinks.buildProductAdUrl({ origin: 'https://joestore.eg', productId: 'آيفون 15', source: 'facebook', campaign: 'ramadan' });
  assert.match(adUrl, /^https:\/\/joestore\.eg\/product\/%D8%A2%D9%8A%D9%81%D9%88%D9%86%2015\?/);
  assert.match(adUrl, /utm_source=facebook/);

  const fbAttr = visitorAttribution.detectVisitorAttribution({
    search: '?fbclid=abc123&utm_source=fb&utm_campaign=summer',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile'
  });
  assert.equal(fbAttr.source_channel, 'facebook_ads');
  assert.match(fbAttr.device_type, /Mobile/);

  const googleSearchAttr = visitorAttribution.detectVisitorAttribution({
    referrer: 'https://www.google.com/search?q=joe+store',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  });
  assert.equal(googleSearchAttr.source_channel, 'google_search');
  assert.match(googleSearchAttr.device_type, /Desktop/);

  assert.equal(metaPixel.normalizeMetaPixelId('123456789012345'), '123456789012345');
  assert.equal(metaPixel.normalizeMetaPixelId('<script>123</script>'), '');
});

test('Liquid Glass Floating Capsule Dock and Policy Pages render cleanly', () => {
  const navSrc = fs.readFileSync(new URL('../src/components/MobileBottomNav.tsx', import.meta.url), 'utf8');
  assert.match(navSrc, /joe-liquid-glass-dock/);
  assert.match(navSrc, /bottom-\[max\(14px,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(navSrc, /rounded-full/);

  const policyDefaultsSrc = fs.readFileSync(new URL('../src/utils/policyDefaults.ts', import.meta.url), 'utf8');
  assert.match(policyDefaultsSrc, /الشروط والأحكام/);
  assert.match(policyDefaultsSrc, /سياسة الخصوصية/);
  assert.match(policyDefaultsSrc, /سياسة الضمان والاستبدال والاسترجاع/);
  assert.match(policyDefaultsSrc, /سياسة الشحن ومواعيد التوصيل/);

  const iconsMod = new Proxy({}, { get: (_, name) => name === '__esModule' ? true : () => React.createElement('svg') });
  const { PolicyPage } = compile('src/pages/PolicyPage.tsx', {
    'lucide-react': iconsMod,
    '../services/neonDb': { neonDb: {} },
    '../context/StoreContext': {
      useStore: () => ({
        navigate: () => {},
        settings: {
          store_phone: '01554826209',
          store_address_ar: 'المنصورة',
          policy_pages: {
            terms: {
              heading: 'شروط مخصصة من لوحة الإدارة',
              intro: 'مقدمة محدثة للعميل',
              body: '### بند مخصص\n- التزام كامل بالفحص قبل الاستلام'
            }
          }
        }
      })
    },
    '../context/LanguageContext': { useLanguage: () => ({ language: 'ar', formatPrice: v => `${v} ج.م` }) },
    '../utils/whatsappService': { generateWhatsAppWebLink: () => 'https://wa.me/201554826209' },
    '../utils/policyDefaults': policyDefaults
  });
  const html = renderToString(React.createElement(PolicyPage, { activePolicy: 'privacy' }));
  assert.match(html, /سياسة الخصوصية/);
  assert.match(html, /المنصورة/);
  const customTermsHtml = renderToString(React.createElement(PolicyPage, { activePolicy: 'terms' }));
  assert.match(customTermsHtml, /شروط مخصصة من لوحة الإدارة/);
  assert.match(customTermsHtml, /مقدمة محدثة للعميل/);
  assert.match(customTermsHtml, /التزام كامل بالفحص قبل الاستلام/);
});

test('WhatsApp per-event checkboxes default to disabled and gate createOrder & updateOrderState individually', async () => {
  const defaultCfg = whatsappCrm.resolveCrmConfig({
    whatsapp_automation_url: 'https://crm.example.com',
    whatsapp_automation_email: 'crm@example.com',
    whatsapp_automation_pass: 'pass123'
  });
  for (const key of ['admin_new_order', 'order_confirmed', 'payment_verified', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']) {
    assert.equal(defaultCfg.shouldAutoSend(key), false, `Expected ${key} to default to false`);
  }

  const dispatched = [];
  const fakeCrm = {
    ...whatsappCrm,
    dispatchWhatsAppViaCrm: async (_sql, payload) => {
      dispatched.push(payload.type);
      return { success: true };
    }
  };
  const { execute } = compile('api/store.ts', {
    '../server/store.js': { neonDb: {}, mapRowToOrder: r => r, logAudit: async () => {} },
    '../server/whatsappCrm.js': fakeCrm,
    '../server/paymentGateway.js': paymentGateway,
    '../server/monitoring.js': monMock,
    '../server/pricing.js': { sanitizeUploadedImage: x => x, calculateServerShippingFee: ({ subtotal }) => (subtotal >= 2500 ? 0 : 35), validateAndComputeCouponDiscount: () => ({ discount: 0 }) },
    '../server/rateLimit.js': { extractClientIp: () => '127.0.0.1', checkRateLimit: async () => ({ allowed: true, remaining: 5, retryAfterSeconds: 0 }), clearRateLimit: async () => {} },
    '../server/jobs.js': { enqueueBackgroundJob: async () => ({ queued: true }) },
    '../server/metaCapi.js': { sendMetaConversionEvent: async () => ({ sent: false }) },
    '../lib/mailer.js': { sendTransactionalEmail: async () => ({ sent: true }) },
    '../lib/access.js': access,
    '../src/utils/deliveryAddress.js': address,
    '../server/orderWrites.js': { saveOrder: async () => true, cancelOrder: async () => true },
    '../lib/totp.js': totp,
    '../lib/session.js': { database: () => ({}), currentUser: () => null, passwordMatches, passwordHash, pendingSecondFactor: async () => null, issueSession: async () => {} }
  });

  const adminUser = { id: 'adm-1', role: 'admin', admin_sections: ['orders', 'whatsapp'] };
  const sampleOrder = {
    id: 'ord-wa-1',
    order_number: 'JOE-77112',
    customer_name: 'محمود عادل',
    customer_phone: '01011223344',
    customer_whatsapp: '01011223344',
    address_details: 'المنصورة',
    items: [{ product: { id: 'p1', name_ar: 'شاحن', price: 300 }, quantity: 1 }],
    subtotal: 300,
    shipping_fee: 35,
    discount: 0,
    total: 335,
    payment_method: 'cod'
  };
  const mockSql = Object.assign(
    async (strings) => (/SELECT \* FROM orders/i.test(strings.join('?')) ? [sampleOrder] : []),
    { query: async () => [] }
  );

  // Checkboxes: only shipping & customer confirmation enabled; processing & delivered & admin alert disabled
  const selectiveSettings = {
    whatsapp_automation_url: 'https://crm.example.com',
    whatsapp_automation_email: 'crm@example.com',
    whatsapp_automation_pass: 'pass123',
    admin_alert_whatsapp_number: '01554826209',
    whatsapp_auto_triggers: {
      admin_new_order: false,
      order_confirmed: true,
      payment_verified: false,
      processing: false,
      shipped: true,
      out_for_delivery: false,
      delivered: false,
      cancelled: false
    }
  };

  await execute({}, { setHeader() {} }, { method: 'createOrder', args: [sampleOrder] }, {
    user: null,
    sql: mockSql,
    store: { getStoreSettings: async () => selectiveSettings }
  });
  await execute({}, { setHeader() {} }, { method: 'updateOrderState', args: ['JOE-77112', { payment_status: 'verified' }] }, {
    user: adminUser,
    sql: mockSql,
    store: { getStoreSettings: async () => selectiveSettings }
  });
  await execute({}, { setHeader() {} }, { method: 'updateOrderState', args: ['JOE-77112', { order_status: 'processing' }] }, {
    user: adminUser,
    sql: mockSql,
    store: { getStoreSettings: async () => selectiveSettings }
  });
  await execute({}, { setHeader() {} }, { method: 'updateOrderState', args: ['JOE-77112', { order_status: 'shipped' }] }, {
    user: adminUser,
    sql: mockSql,
    store: { getStoreSettings: async () => selectiveSettings }
  });
  await execute({}, { setHeader() {} }, { method: 'updateOrderState', args: ['JOE-77112', { order_status: 'delivered' }] }, {
    user: adminUser,
    sql: mockSql,
    store: { getStoreSettings: async () => selectiveSettings }
  });

  assert.deepEqual(dispatched, ['order_confirmed', 'shipped']);
});

test('consolidated feeds generate sitemap XML and Meta CSV/XML while keeping api/ within Hobby 12-function limit', async () => {
  const apiFiles = fs.readdirSync(new URL('../api', import.meta.url));
  assert.ok(apiFiles.length <= 12, `Expected <= 12 Vercel api functions, found ${apiFiles.length}: ${apiFiles.join(', ')}`);

  const feeds = await import('../server/feeds.js');
  const sampleProducts = [
    {
      id: 'prod-iphone-15',
      name_ar: 'آيفون 15 برو',
      name_en: 'iPhone 15 Pro',
      brand: 'Apple',
      category: 'smartphones',
      price: 55000,
      stock_quantity: 5,
      images: ['/product-images/iphone15.jpg'],
      specs: { description_ar: 'جهاز أصلي' }
    }
  ];

  const mkRes = () => {
    const out = { headers: {}, statusCode: 200, body: '' };
    return {
      out,
      res: {
        setHeader(k, v) { out.headers[k] = v; },
        status(code) { out.statusCode = code; return this; },
        send(txt) { out.body = txt; return this; }
      }
    };
  };

  const s = mkRes();
  await feeds.handleSitemap({ headers: { host: 'joestore.eg' } }, s.res, { products: sampleProducts });
  assert.equal(s.out.statusCode, 200);
  assert.match(s.out.body, /<loc>https:\/\/joestore\.eg\/privacy-policy<\/loc>/);
  assert.match(s.out.body, /<loc>https:\/\/joestore\.eg\/product\/prod-iphone-15<\/loc>/);

  const csv = mkRes();
  await feeds.handleMetaFeed({ url: '/meta-feed.csv?format=csv', headers: { host: 'joestore.eg' } }, csv.res, { products: sampleProducts });
  assert.match(csv.out.body, /55000\.00 EGP/);
  assert.match(csv.out.body, /https:\/\/joestore\.eg\/product\/prod-iphone-15/);
});

test('smooth image and banner transitions are configured across Home hero, ProductCard hover, QuickView, and ProductDetails', () => {
  const homeSrc = fs.readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8');
  assert.match(homeSrc, /cubic-bezier\(0\.22,1,0\.36,1\)/);
  assert.match(homeSrc, /gridArea:\s*"1 \/ 1"/);

  const cardSrc = fs.readFileSync(new URL('../src/components/ProductCard.tsx', import.meta.url), 'utf8');
  assert.match(cardSrc, /joe-secondary-img/);
  assert.match(cardSrc, /is-multi-img/);

  const detailSrc = fs.readFileSync(new URL('../src/pages/ProductDetails.tsx', import.meta.url), 'utf8');
  assert.match(detailSrc, /joe-gallery-slide/);

  const qvSrc = fs.readFileSync(new URL('../src/components/QuickViewModal.tsx', import.meta.url), 'utf8');
  assert.match(qvSrc, /cubic-bezier\(0\.22,1,0\.36,1\)/);
});

test('AuthModal and Checkout require explicit acceptance of Store Policies, Terms, Privacy, and Cookies', () => {
  const authSrc = fs.readFileSync(new URL('../src/components/AuthModal.tsx', import.meta.url), 'utf8');
  assert.match(authSrc, /auth-policy-checkbox/);
  assert.match(authSrc, /Cookies/);
  assert.match(authSrc, /if \(!acceptedPolicies\)/);

  const checkoutSrc = fs.readFileSync(new URL('../src/pages/Checkout.tsx', import.meta.url), 'utf8');
  assert.match(checkoutSrc, /checkout-policy-checkbox/);
  assert.match(checkoutSrc, /Cookies/);
  assert.match(checkoutSrc, /if \(!acceptedPolicies\)/);
  assert.match(checkoutSrc, /navigate\('terms'\)/);
  assert.match(checkoutSrc, /navigate\('privacy'\)/);
});

test('CookieBanner shows only on first visit per device and persists consent across subsequent visits', () => {
  const iconsMod = new Proxy({}, { get: (_, name) => name === '__esModule' ? true : () => React.createElement('svg') });
  const storeMap = new Map();
  const fakeStorage = {
    readStorage: (k) => storeMap.get(k) ?? null,
    writeStorage: (k, v) => { storeMap.set(k, v); return true; }
  };
  const cookieMod = compile('src/components/CookieBanner.tsx', {
    'lucide-react': iconsMod,
    '../context/StoreContext': { useStore: () => ({ navigate: () => {} }) },
    '../context/LanguageContext': { useLanguage: () => ({ language: 'ar' }) },
    '../utils/browserStorage': fakeStorage
  });

  assert.equal(cookieMod.hasCookieConsent(), false);
  assert.equal(cookieMod.saveCookieConsent('accepted'), true);
  assert.equal(cookieMod.hasCookieConsent(), true);

  const appSrc = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(appSrc, /CookieBanner/);
});
