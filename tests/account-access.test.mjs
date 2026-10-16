import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function compile(file, mocks = {}, transform = x => x) {
  const code = ts.transpileModule(transform(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8')), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => mocks[id] || require(id), module, module.exports);
  return module.exports;
}
const sample = { id: 'promoted-user', role: 'customer', email: 'user@example.invalid', name: 'User', provider: 'google', addresses: [{ id: 'keep-address' }], phone: '01000000000' };
const flush = () => new Promise(resolve => setImmediate(resolve));
function mount(cached, database) {
  let si = 0, ri = 0;
  const states = [], refs = [], effects = [];
  const react = { createContext: () => ({ Provider: () => null }), useCallback: fn => fn,
    useState(initial) { const i = si++; if (i >= states.length) states.push(typeof initial === 'function' ? initial() : initial); return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(current) { const i = ri++; return refs[i] || (refs[i] = { current }); }, useEffect: (fn, deps) => effects.push({ fn, deps }),
  };
  const storage = { readStoredJson: () => cached, readStoredArray: () => [], writeStoredJson() {}, removeStorage() {}, isStoredUser: () => true };
  const { AuthProvider } = compile('src/context/AuthContext.tsx', { react, '../services/neonDb': { neonDb: database }, '../utils/browserStorage': storage });
  const render = () => { si = 0; ri = 0; return AuthProvider({ children: null }).props.value; };
  return { render, effects };
}
function eventTarget() {
  const listeners = new Map();
  return { addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); }, emit(type) { for (const fn of listeners.get(type) || []) fn(); },
    count: type => listeners.get(type)?.size || 0,
  };
}

test('a cached customer receives their saved admin role without signing in again', async () => {
  const { render } = mount(sample, { getUserAccess: async id => { assert.equal(id, sample.id); return { success: true, exists: true, role: 'admin' }; } });
  const initial = render();
  assert.equal(initial.isAdmin, false);
  await initial.refreshAccess();
  const updated = render();
  assert.equal(updated.isAdmin, true); assert.equal(updated.user.role, 'admin');
  assert.deepEqual(updated.user.addresses, sample.addresses);
  assert.equal(updated.user.name, sample.name);
});
test('demotion is applied to an existing signed-in session as well', async () => {
  const { render } = mount({ ...sample, role: 'admin' }, { getUserAccess: async () => ({ success: true, exists: true, role: 'customer' }) });
  const initial = render(); assert.equal(initial.isAdmin, true);
  await initial.refreshAccess();
  assert.equal(render().isAdmin, false);
});
test('offline or failed access checks do not invent admin permission', async () => {
  const { render } = mount(sample, { getUserAccess: async () => { throw new Error('offline'); } });
  assert.equal(await render().refreshAccess(), false);
  const updated = render();
  assert.equal(updated.isAdmin, false); assert.ok(updated.accessRefreshError); assert.equal(updated.isAccessRefreshing, false);
});
test('concurrent refreshes share a request and a response after logout cannot restore a user', async () => {
  let resolve, calls = 0;
  const pending = new Promise(done => { resolve = done; });
  const { render } = mount(sample, { getUserAccess: () => { calls++; return pending; } });
  const context = render();
  const first = context.refreshAccess(), second = context.refreshAccess();
  assert.equal(first, second); assert.equal(calls, 1);
  context.logout(); render(); resolve({ success: true, exists: true, role: 'admin' });
  await first;
  assert.equal(render().user, null); assert.equal(render().isAdmin, false);
});
test('an older account response cannot change a newly signed-in account', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const other = { ...sample, id: 'other-user', email: 'other@example.invalid' };
  const { render } = mount(sample, { getUserAccess: () => pending, persistGoogleUser: async () => ({ success: true, user: other }) });
  const context = render();
  const request = context.refreshAccess();
  await context.loginWithGoogle({ credential: 'signed-test' }); render();
  resolve({ success: true, exists: true, role: 'admin' }); await request;
  assert.equal(render().user.id, other.id); assert.equal(render().isAdmin, false);
});
test('roles refresh on restore, focus, reconnect and visible intervals; listeners clean up', async () => {
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  const win = eventTarget(), doc = { ...eventTarget(), visibilityState: 'visible' };
  let tick, cleared = false, calls = 0;
  globalThis.window = { ...win, setInterval(fn, ms) { assert.equal(ms, 60_000); tick = fn; return 7; }, clearInterval(id) { assert.equal(id, 7); cleared = true; } };
  globalThis.document = doc;
  try {
    const { render, effects } = mount(sample, { getUserAccess: async () => { calls++; return { success: true, exists: true, role: 'admin' }; } });
    render();
    const cleanup = effects.find(e => String(e.fn).includes("addEventListener('focus'")).fn();
    await flush(); assert.equal(calls, 1); assert.equal(render().isAdmin, true);
    win.emit('focus'); await flush(); assert.equal(calls, 2);
    win.emit('online'); await flush(); assert.equal(calls, 3);
    doc.visibilityState = 'hidden'; tick(); await flush(); assert.equal(calls, 3);
    doc.visibilityState = 'visible'; doc.emit('visibilitychange'); await flush(); assert.equal(calls, 4);
    tick(); await flush(); assert.equal(calls, 5);
    cleanup(); assert.equal(win.count('focus'), 0); assert.equal(win.count('online'), 0); assert.equal(doc.count('visibilitychange'), 0); assert.equal(cleared, true);
  } finally { if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow; if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; }
});
test('role updates confirm the actual saved row; access lookup reads only the current account role', async () => {
  let returned = [], captured;
  const sql = async (strings, ...params) => { captured = { query: strings.join('?'), params }; return returned; };
  const { neonDb } = compile('src/services/neonDb.ts', { '@neondatabase/serverless': { neon: () => sql }, '../utils/deliveryAddress': {} }, source => source.replace(/const DB_URL\s*=[\s\S]*?const sql = neon\(DB_URL\);/, 'const sql = neon("mock://roles");'));
  assert.equal((await neonDb.updateUserRole('target', 'admin')).success, false);
  returned = [{ id: 'target', role: 'admin' }];
  assert.equal((await neonDb.updateUserRole('target', 'admin')).success, true);
  assert.match(captured.query, /RETURNING id, role/);
  const access = await neonDb.getUserAccess('target');
  assert.deepEqual(access, { success: true, exists: true, role: 'admin' });
  assert.match(captured.query, /SELECT id, role FROM users WHERE id =/);
  assert.deepEqual(captured.params, ['target']);
  assert.doesNotMatch(captured.query, /password|addresses|phone/);
});
