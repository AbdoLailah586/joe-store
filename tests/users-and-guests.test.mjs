import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createRequire } from 'node:module';
import * as access from '../lib/access.js';
import * as totp from '../lib/totp.js';
import { passwordHash, passwordMatches } from '../lib/session.js';

const require = createRequire(import.meta.url);

function compile(file, mocks = {}, transform = x => x) {
  const source = transform(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
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

test('visitorAttribution extracts utm_content, utm_term and click_id', () => {
  const va = compile('src/utils/visitorAttribution.ts');
  const out = va.detectVisitorAttribution({
    search: '?utm_source=fb&utm_medium=cpc&utm_campaign=eid&utm_content=video1&utm_term=iphone15&fbclid=fb-999',
    pathname: '/product/prod-1',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile)'
  });
  assert.equal(out.source_channel, 'facebook_ads');
  assert.equal(out.utm_content, 'video1');
  assert.equal(out.utm_term, 'iphone15');
  assert.equal(out.click_id, 'fb-999');
});

test('api/store enriches trackActivity with server IP and Vercel geo headers', async () => {
  let capturedActivity;
  const address = compile('src/utils/deliveryAddress.ts');
  const gw = compile('server/paymentGateway.ts', {
    './whatsappCrm.js': { buildServerOrderWhatsAppMessage: () => '', dispatchWhatsAppViaCrm: async () => ({}), resolveCrmConfig: () => ({ configured: false }) }
  });
  const { execute } = compile('api/store.ts', {
    '../server/store.js': { neonDb: {}, mapRowToOrder: r => r, logAudit: async () => {} },
    '../server/whatsappCrm.js': { buildServerOrderWhatsAppMessage: () => '', dispatchWhatsAppViaCrm: async () => ({}), resolveCrmConfig: () => ({ configured: false }) },
    '../server/paymentGateway.js': gw,
    '../lib/access.js': access,
    '../src/utils/deliveryAddress.js': address,
    '../server/orderWrites.js': {},
    '../lib/totp.js': totp,
    '../lib/session.js': { database: () => ({}), currentUser: () => null, passwordMatches, passwordHash, pendingSecondFactor: async () => null, issueSession: async () => {} }
  });

  await execute(
    {
      headers: {
        'x-forwarded-for': '41.42.43.44, 10.0.0.1',
        'x-vercel-ip-country': 'EG',
        'x-vercel-ip-city': 'Mansoura',
        'user-agent': 'TestBrowser/1.0'
      }
    },
    { setHeader() {} },
    {
      method: 'trackActivity',
      args: [{ sessionId: 'sess-geo-1', actionType: 'visit', metadata: { screen_size: '390x844' } }]
    },
    {
      user: null,
      sql: Object.assign(async () => [], { query: async () => [] }),
      store: {
        trackActivity: async act => {
          capturedActivity = act;
        }
      }
    }
  );

  assert.equal(capturedActivity.sessionId, 'sess-geo-1');
  assert.equal(capturedActivity.metadata.ip_address, '41.42.43.44');
  assert.equal(capturedActivity.metadata.geo_country, 'EG');
  assert.equal(capturedActivity.metadata.geo_city, 'Mansoura');
  assert.equal(capturedActivity.metadata.screen_size, '390x844');
});

test('server/store getGuestInsights reads search queries from metadata->>query and returns full signals', async () => {
  const queries = [];
  const sessionRow = {
    session_id: 'sess-guest-7',
    customer_id: null,
    customer_name: 'زائر شيك أوت',
    customer_phone: '01012345678',
    source_channel: 'facebook_ads',
    source_label: 'إعلان فيسبوك',
    metadata: { ip_address: '1.2.3.4', screen_size: '412x915' },
    first_seen_at: '2026-11-27T10:00:00Z',
    last_seen_at: '2026-11-27T10:25:00Z',
    visit_count: 3
  };
  const queue = [
    [sessionRow], // visitor_sessions
    [{ product_id: 'p1', viewed_at: '2026-11-27T10:10:00Z', name_ar: 'آيفون 15', price: 45000 }], // recent_views
    [{ query: 'آيفون 15', category: 'all', created_at: '2026-11-27T10:05:00Z' }], // searches
    [{ category: 'smartphones', count: 2, last_viewed_at: '2026-11-27T10:06:00Z' }], // category_views
    [], // cart_events
    [], // wishlist_events
    [], // timeline
    [{ session_id: 'sess-guest-7', items: [{ product: { id: 'p1', name_ar: 'آيفون 15', price: 45000 }, quantity: 1 }], subtotal: 45000, is_abandoned: false }], // active_carts
    [], // orders
    [], // product_reviews
    [] // support_tickets
  ];
  const sql = Object.assign(
    async (strings) => {
      queries.push(strings.join('?'));
      return queue.length ? queue.shift() : [];
    },
    { query: async () => [] }
  );
  const { neonDb } = compile('server/store.ts', {
    '@neondatabase/serverless': { neon: () => sql },
    '../src/utils/deliveryAddress.js': { decodeDeliveryNotes: () => ({}), encodeDeliveryNotes: () => '', formatDeliveryAddress: () => '' },
    './orderWrites.js': {},
    './whatsappCrm.js': {},
    './paymentGateway.js': {}
  });

  const insights = await neonDb.getGuestInsights('sess-guest-7');
  assert.equal(insights.visitor.session_id, 'sess-guest-7');
  assert.equal(insights.searches[0].query, 'آيفون 15');
  assert.equal(insights.recent_views.length, 1);
  assert.equal(insights.active_cart.subtotal, 45000);
  assert.ok(queries.some(q => q.includes("metadata->>'query'")), 'searches query must read metadata->>query');
});

test('UsersTab displays unregistered visitors and every MetricCard opens an explanatory DetailsDialog', () => {
  const openedSpecs = [];
  const icons = new Proxy({}, { get: (_, k) => (k === '__esModule' ? true : () => React.createElement('svg')) });
  const users = [
    { id: 'u1', name: 'المدير', email: 'abdolailah586@gmail.com', role: 'admin', provider: 'google', admin_permissions: [], created_at: '2026-11-01T10:00:00Z', last_seen_at: new Date().toISOString(), completed_orders_count: 2, total_spent: 5000, cart_items_count: 1, cart_subtotal: 1200 },
    { id: 'u2', name: 'موظف', email: 'staff@example.invalid', role: 'customer', provider: 'email', admin_permissions: ['orders'], created_at: '2026-11-02T10:00:00Z', completed_orders_count: 0, total_spent: 0, cart_items_count: 0, cart_subtotal: 0 }
  ];
  const guests = [
    { session_id: 'sess-g1', customer_name: 'زائر غير مسجل تجريبي', customer_phone: '01099887766', source_label: 'إعلان تيك توك', device_type: 'موبايل', views_count: 4, searches_count: 2, last_search_query: 'كفر ايفون', cart_items_count: 1, cart_subtotal: 350, last_seen_at: new Date().toISOString(), visit_count: 2, landing_path: '/', last_path: '/catalog' }
  ];

  // Mock React hooks in order so UsersTab renders synchronously with populated state
  const stateValues = [users, guests, false, '', 'all', '', '', null, 'customer', [], false, false, '', '', '', '', 'customer', [], false, null, null, false, 'views', null, 'overview'];
  let stateIdx = 0;
  const reactMock = {
    ...React,
    default: React,
    useState: (init) => [stateValues[stateIdx++] ?? (typeof init === 'function' ? init() : init), () => {}],
    useEffect: () => {},
    useRef: (init) => ({ current: init })
  };

  const { UsersTab } = compile('src/pages/admin/UsersTab.tsx', {
    react: reactMock,
    'lucide-react': icons,
    '../../services/neonDb': { neonDb: { getAllUsers: async () => users, getGuestVisitors: async () => guests } },
    '../../context/AuthContext': { useAuth: () => ({ user: users[0], isAdmin: true, canAccessSection: () => true }) },
    './AdminShell': { adminSections: [['overview', 'نظرة عامة', () => null, 'الإدارة'], ['guests', 'زوار بدون حساب', () => null, 'العملاء والتواصل']] },
    '../../components/DetailsDialog': {
      MetricCard: ({ title, value, onClick }) => React.createElement('button', { 'data-metric': title, onClick }, `${title}: ${value}`),
      useDetails: () => ({ openDetails: spec => openedSpecs.push(spec) })
    },
    '../../utils/whatsappService': { generateWhatsAppWebLink: () => 'https://wa.me/201099887766' },
    './GuestInsightsModal': { GuestInsightsModal: () => null }
  });

  const tree = UsersTab({ onNavigateSection: () => {} });
  const html = renderToString(tree);
  assert.match(html, /زائر غير مسجل تجريبي/);
  assert.match(html, /بدون حساب/);
  assert.match(html, /صفحة الزوار بدون حساب/);

  // Find all MetricCard elements and simulate clicking each one
  const cards = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.props && node.props.onClick && node.props.title && 'value' in node.props) cards.push(node);
    if (node.props?.children) walk(node.props.children);
  }
  walk(tree);
  assert.equal(cards.length, 6);
  for (const card of cards) {
    card.props.onClick();
  }
  assert.equal(openedSpecs.length, 6);
  for (const spec of openedSpecs) {
    assert.ok(spec.title && spec.description && Array.isArray(spec.facts) && Array.isArray(spec.rows) && spec.actions.length >= 1);
  }
});

test('AdminShell exposes guests section and GuestVisitorsTab loads dedicated UI', () => {
  const shellSrc = fs.readFileSync(new URL('../src/pages/admin/AdminShell.tsx', import.meta.url), 'utf8');
  assert.match(shellSrc, /\['guests',\s*'زوار بدون حساب'/);
  const guestTabSrc = fs.readFileSync(new URL('../src/pages/admin/GuestVisitorsTab.tsx', import.meta.url), 'utf8');
  assert.match(guestTabSrc, /JOE_Guest_Visitors/);
  assert.match(guestTabSrc, /openDetails/);
  assert.match(guestTabSrc, /GuestInsightsModal/);
});
