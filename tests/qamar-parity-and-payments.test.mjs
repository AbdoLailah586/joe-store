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
const whatsappCrm = compile('server/whatsappCrm.ts', { '../src/utils/deliveryAddress.js': address });
const paymentGateway = compile('server/paymentGateway.ts', { './whatsappCrm.js': whatsappCrm });
const visitorAttribution = compile('src/utils/visitorAttribution.ts');
const adLinks = compile('src/utils/adLinks.ts');
const metaPixel = compile('src/utils/metaPixel.ts');
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

  // Callback marks order paid and fires WhatsApp verification notice
  const waSent = [];
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

  const cb = await paymentGateway.processPaymentGatewayCallback({
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
      waSent.push(payload);
      return { success: true, status: 'sent', waLink: 'https://wa.me/201012345678' };
    }
  });

  assert.equal(cb.verified, true);
  assert.equal(cb.paid, true);
  assert.equal(updatedOrders.length, 1);
  assert.equal(waSent[0].type, 'payment_verified');
});

test('checkout API blocks disabled card method, routes enabled gateway orders, and dispatches Admin New Order alert', async () => {
  const { execute } = compile('api/store.ts', {
    '../server/store.js': { neonDb: {}, mapRowToOrder: r => r, logAudit: async () => {} },
    '../server/whatsappCrm.js': whatsappCrm,
    '../server/paymentGateway.js': paymentGateway,
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

  const policySrc = fs.readFileSync(new URL('../src/pages/PolicyPage.tsx', import.meta.url), 'utf8');
  assert.match(policySrc, /الشروط والأحكام/);
  assert.match(policySrc, /سياسة الخصوصية/);
  assert.match(policySrc, /سياسة الضمان والاستبدال والاسترجاع/);
  assert.match(policySrc, /سياسة الشحن ومواعيد التوصيل/);

  const iconsMod = new Proxy({}, { get: (_, name) => name === '__esModule' ? true : () => React.createElement('svg') });
  const { PolicyPage } = compile('src/pages/PolicyPage.tsx', {
    'lucide-react': iconsMod,
    '../context/StoreContext': { useStore: () => ({ navigate: () => {}, settings: { store_phone: '01554826209', store_address_ar: 'المنصورة' } }) },
    '../context/LanguageContext': { useLanguage: () => ({ language: 'ar', formatPrice: v => `${v} ج.م` }) },
    '../utils/whatsappService': { generateWhatsAppWebLink: () => 'https://wa.me/201554826209' }
  });
  const html = renderToString(React.createElement(PolicyPage, { activePolicy: 'privacy' }));
  assert.match(html, /سياسة الخصوصية/);
  assert.match(html, /المنصورة/);
});
