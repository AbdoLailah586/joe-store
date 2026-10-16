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

// A queueable mock for the Neon tagged-template `sql` function: each call records
// its query/params and returns the next queued response (or [] if the queue is empty).
function mockSql() {
  const history = [];
  const queue = [];
  const sql = async (strings, ...params) => {
    const query = strings.join('?');
    history.push({ query, params });
    return queue.length ? queue.shift() : [];
  };
  return { sql, history, queue };
}

function loadNeonDb(sql) {
  return compile('src/services/neonDb.ts', { '@neondatabase/serverless': { neon: () => sql }, '../utils/deliveryAddress': {} },
    source => source.replace(/const DB_URL\s*=[\s\S]*?const sql = neon\(DB_URL\);/, 'const sql = neon("mock://dashboard-guide");'));
}

test('confirmPacking requires an exact SKU match and allows a reasoned manager override', async () => {
  const { sql, history, queue } = mockSql();
  const { neonDb } = loadNeonDb(sql);
  const items = [{ product: { id: 'p1', sku: 'SKU-1' }, quantity: 1 }, { product: { id: 'p2', sku: 'SKU-2' }, quantity: 2 }];

  queue.push([{ items, status: 'confirmed' }]); // SELECT items, status
  const mismatch = await neonDb.confirmPacking('order-1', ['SKU-1']);
  assert.equal(mismatch.success, false);
  assert.match(mismatch.error, /لا تطابق/);

  queue.push([{ items, status: 'confirmed' }]);
  const noReason = await neonDb.confirmPacking('order-1', ['SKU-1'], { override: true });
  assert.equal(noReason.success, false, 'override without a reason must still be rejected');

  history.length = 0;
  queue.push([{ items, status: 'confirmed' }]); // SELECT items, status
  queue.push([]); // the audit_log insert inside the override branch
  queue.push([]); // the UPDATE inside updateOrderStatus
  const overridden = await neonDb.confirmPacking('order-1', ['SKU-1'], { override: true, reason: 'عبوة واحدة ناقصة بموافقة المدير' });
  assert.equal(overridden.success, true);
  // The action name is a bound parameter, not inlined text, so check the params.
  const auditCall = history.find(call => /INSERT INTO audit_log/.test(call.query));
  assert.ok(auditCall, 'a mismatched-but-overridden pack must write an audit entry');
  assert.ok(auditCall.params.includes('PACKING_OVERRIDDEN'));

  history.length = 0;
  queue.push([{ items, status: 'confirmed' }]); // SELECT items, status
  queue.push([]); // UPDATE inside updateOrderStatus (no audit insert on a clean match)
  const matched = await neonDb.confirmPacking('order-1', ['SKU-2', 'sku-1']); // case-insensitive, order-insensitive
  assert.equal(matched.success, true);
  assert.ok(!history.some(call => /INSERT INTO audit_log/.test(call.query)), 'a clean match must not write an audit entry');
});

test('updateOrderStatus enforces the Payment Hold Gate only for unpaid non-COD shipments', async () => {
  const { sql, history, queue } = mockSql();
  const { neonDb } = loadNeonDb(sql);

  // COD orders ship freely regardless of payment_status.
  queue.push([{ payment_method: 'cod', payment_status: 'unpaid' }]);
  queue.push([]);
  const codResult = await neonDb.updateOrderStatus('order-1', 'shipped');
  assert.equal(codResult.success, true);

  // A prepaid, unconfirmed order is blocked without an override.
  queue.push([{ payment_method: 'instapay', payment_status: 'unpaid' }]);
  const blocked = await neonDb.updateOrderStatus('order-1', 'shipped');
  assert.equal(blocked.success, false);
  assert.equal(blocked.code, 'PAYMENT_HOLD');

  // The same order ships once payment is confirmed, no override needed.
  queue.push([{ payment_method: 'instapay', payment_status: 'paid' }]);
  queue.push([]);
  const paid = await neonDb.updateOrderStatus('order-1', 'shipped');
  assert.equal(paid.success, true);

  // An override with a reason is recorded in the audit log and allowed through.
  history.length = 0;
  queue.push([{ payment_method: 'instapay', payment_status: 'unpaid' }]);
  queue.push([]); // audit_log insert
  queue.push([]); // UPDATE orders
  const overridden = await neonDb.updateOrderStatus('order-1', 'shipped', { override: true, overrideReason: 'العميل أكد التحويل هاتفيًا' });
  assert.equal(overridden.success, true);
  const auditCall = history.find(call => /INSERT INTO audit_log/.test(call.query));
  assert.ok(auditCall, 'an override must be recorded in the audit log');
  assert.ok(auditCall.params.includes('PAYMENT_HOLD_OVERRIDDEN'));

  // An override flag with no reason text is not honoured.
  queue.push([{ payment_method: 'instapay', payment_status: 'unpaid' }]);
  const emptyReason = await neonDb.updateOrderStatus('order-1', 'shipped', { override: true, overrideReason: '   ' });
  assert.equal(emptyReason.success, false);
  assert.equal(emptyReason.code, 'PAYMENT_HOLD');
});

test('support tickets reuse an open thread per phone and auto-claim on the first staff reply', async () => {
  const { sql, history, queue } = mockSql();
  const { neonDb } = loadNeonDb(sql);

  queue.push([]); // no existing open ticket
  queue.push([{ id: 'ticket-1', customer_phone: '01000000000', assigned_to: null }]); // INSERT ... RETURNING *
  const created = await neonDb.createSupportTicket('01000000000', 'متى يصل طلبي؟', 'عميل تجريبي');
  assert.equal(created.success, true);
  assert.equal(created.ticket.id, 'ticket-1');

  // A second message from the same phone must reuse the existing open ticket.
  queue.push([{ id: 'ticket-1', customer_phone: '01000000000', assigned_to: null }]); // existing open ticket found
  const reused = await neonDb.findOrCreateSupportTicket('01000000000');
  assert.equal(reused.id, 'ticket-1');

  // First staff reply auto-claims (assigned_to was null beforehand).
  history.length = 0;
  queue.push([]); // INSERT support_messages
  queue.push([{ assigned_to: null }]); // SELECT assigned_to before the claim
  queue.push([]); // UPDATE support_tickets (claim)
  queue.push([]); // audit_log insert for TICKET_CLAIMED
  const replied = await neonDb.replySupportTicket('ticket-1', 'staff', 'سيتم شحنه غدًا', { id: 'staff-1', name: 'موظف الدعم' });
  assert.equal(replied.success, true);
  const claimAudit = history.find(call => /INSERT INTO audit_log/.test(call.query));
  assert.ok(claimAudit, 'the first staff reply must log a claim');
  assert.ok(claimAudit.params.includes('TICKET_CLAIMED'));

  // A second staff reply must not re-claim or log again.
  history.length = 0;
  queue.push([]); // INSERT support_messages
  queue.push([{ assigned_to: 'staff-1' }]); // already assigned
  queue.push([]); // UPDATE support_tickets
  const replied2 = await neonDb.replySupportTicket('ticket-1', 'staff', 'تم التأكيد', { id: 'staff-1', name: 'موظف الدعم' });
  assert.equal(replied2.success, true);
  assert.ok(!history.some(call => /INSERT INTO audit_log/.test(call.query)), 'an already-claimed ticket must not log another claim');
});

test('rateSupportTicket only accepts a 1-5 rating once, and only after the ticket is closed', async () => {
  const { sql, queue } = mockSql();
  const { neonDb } = loadNeonDb(sql);

  const outOfRange = await neonDb.rateSupportTicket('ticket-1', 9);
  assert.equal(outOfRange.success, false);

  queue.push([]); // UPDATE ... RETURNING id finds no matching row (already rated or not closed)
  const rejected = await neonDb.rateSupportTicket('ticket-1', 5);
  assert.equal(rejected.success, false);

  queue.push([{ id: 'ticket-1' }]); // the conditional UPDATE matched exactly one closed, unrated ticket
  const accepted = await neonDb.rateSupportTicket('ticket-1', 5, 'خدمة ممتازة');
  assert.equal(accepted.success, true);
});

test('TOTP codes round-trip and reject codes generated from a different secret', async () => {
  const { generateTotpSecret, currentTotpCode, verifyTotpCode, totpAuthUrl } = compile('lib/totp.js');
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.match(totpAuthUrl(secret, 'owner@example.com'), /^otpauth:\/\/totp\//);
  assert.equal(verifyTotpCode(secret, currentTotpCode(secret)), true);
  assert.equal(verifyTotpCode(generateTotpSecret(), currentTotpCode(secret)), false);
  assert.equal(verifyTotpCode('', '123456'), false);
  assert.equal(verifyTotpCode(secret, 'abcdef'), false);
});
