import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as access from '../lib/access.js';
import { passwordHash, passwordMatches } from '../lib/session.js';
import * as totp from '../lib/totp.js';

const require = createRequire(import.meta.url);
function compile(file, mocks = {}) {
  const filename = fileURLToPath(new URL('../' + file, import.meta.url));
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => mocks[id] || require(id), module, module.exports);
  return module.exports;
}

const address = compile('src/utils/deliveryAddress.ts');
const { default: handler } = compile('api/store.ts', {
  '../server/store.js': { neonDb: {}, mapRowToOrder: r => r },
  '../lib/access.js': access,
  '../src/utils/deliveryAddress.js': address,
  '../server/orderWrites.js': {},
  '../lib/totp.js': totp,
  '../lib/session.js': {
    database: () => { throw new Error('Unexpected live database'); },
    currentUser: async () => ({ id: 'admin', role: 'admin', admin_permissions: ['products'] }),
    sameOrigin: () => true,
    passwordMatches,
    passwordHash,
    pendingSecondFactor: async () => null,
    issueSession: async () => {},
    endSession: async () => {}
  }
});

function createRes() {
  const headers = {};
  let statusCode = 200;
  let body = null;
  return {
    headers,
    get statusCode() { return statusCode; },
    get body() { return body; },
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    status(code) { statusCode = code; return this; },
    json(data) { body = data; return this; }
  };
}

test('GET /api/store?method=getProducts caches public projection and strips private fields even with admin cookie', async () => {
  const calls = [];
  const store = {
    getProducts: async p => {
      calls.push(p);
      return {
        total: 1,
        products: [{ id: 'p1', price: 100, cost_price: 70, source_name: 'secret', raw_source_stock: 5 }]
      };
    }
  };
  const res = createRes();
  await handler({
    method: 'GET',
    url: '/api/store?method=getProducts&limit=300&offset=0&includeHidden=true',
    headers: { cookie: 'joe_session=' + 'a'.repeat(64) }
  }, res, { store, sql: async () => [] });

  assert.equal(res.statusCode, 200);
  assert.match(res.headers['cache-control'], /s-maxage=30/);
  assert.match(res.headers['cache-control'], /stale-while-revalidate=120/);
  assert.equal(calls[0].includeHidden, false);
  assert.equal(calls[0].limit, 300);
  assert.equal(calls[0].offset, 0);
  assert.equal(res.body.result.products[0].cost_price, undefined);
  assert.equal(res.body.result.products[0].source_name, undefined);
});

test('GET /api/store?method=getProducts stays no-store on empty fallback result', async () => {
  const res = createRes();
  const store = { getProducts: async () => ({ products: [], total: 0 }) };
  await handler({ method: 'GET', url: '/api/store?method=getProducts&limit=300&offset=0', headers: {} }, res, { store, sql: async () => [] });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('GET /api/store?method=getStoreSettings caches settings on CDN', async () => {
  const res = createRes();
  const store = { getStoreSettings: async () => ({ store_name: 'JOE Store' }) };
  await handler({ method: 'GET', url: '/api/store?method=getStoreSettings', headers: {} }, res, { store, sql: async () => [] });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['cache-control'], /s-maxage=30/);
  assert.deepEqual(res.body.result, { store_name: 'JOE Store' });
});

test('GET /api/store rejects non-public methods with 405 and no-store', async () => {
  for (const method of ['getAllUsers', 'getOrders', 'createOrder', 'getSession', '']) {
    const res = createRes();
    await handler({ method: 'GET', url: `/api/store?method=${method}`, headers: {} }, res, { store: {}, sql: async () => [] });
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers['cache-control'], 'no-store');
  }
});

test('POST /api/store keeps Cache-Control: no-store even for getProducts', async () => {
  const res = createRes();
  const store = { getProducts: async () => ({ total: 1, products: [{ id: 'p1', cost_price: 70 }] }) };
  await handler({ method: 'POST', url: '/api/store', headers: {}, body: { method: 'getProducts', args: [{ includeHidden: true }] } }, res, { store, sql: async () => [] });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.body.result.products[0].cost_price, 70);
});

test('client neonDb uses GET for public catalog/settings and POST when includeHidden is true', async () => {
  const prior = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ result: { products: [], total: 0 } }) };
  };
  try {
    const { neonDb } = compile('src/services/neonDb.ts', { '../utils/deliveryAddress': {} });
    await neonDb.getProducts({ limit: 300, offset: 0 });
    await neonDb.getProducts({ includeHidden: true, limit: 300, offset: 0 });
    await neonDb.getStoreSettings();

    assert.equal(calls[0].url, '/api/store?method=getProducts&limit=300&offset=0');
    assert.equal(calls[0].options.method, 'GET');

    assert.equal(calls[1].url, '/api/store');
    assert.equal(calls[1].options.method, 'POST');

    assert.equal(calls[2].url, '/api/store?method=getStoreSettings');
    assert.equal(calls[2].options.method, 'GET');
  } finally {
    globalThis.fetch = prior;
  }
});
