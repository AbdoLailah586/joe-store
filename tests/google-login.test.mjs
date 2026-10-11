import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { verifyGoogleCredential } from '../lib/googleCredential.js';
import googleAuth from '../api/google-auth.js';

const source = await readFile(new URL('../src/services/googleIdentity.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { loadGoogleIdentity } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
function fakeBrowser() {
  const scripts = [];
  const win = {};
  const doc = {
    createElement: () => ({ remove() { this.removed = true; } }),
    head: { appendChild: script => scripts.push(script) }
  };
  return { scripts, win, doc };
}

test('waits past the old 400ms limit and shares one library download', async () => {
  const { scripts, win, doc } = fakeBrowser();
  const first = loadGoogleIdentity(win, doc);
  const second = loadGoogleIdentity(win, doc);
  assert.equal(first, second);
  assert.equal(scripts.length, 1);
  let completed = false;
  first.then(() => { completed = true; });
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(completed, false);
  win.google = { accounts: { id: { renderButton() {} } } };
  scripts[0].onload();
  assert.equal(await first, win.google.accounts.id);
  assert.equal(await loadGoogleIdentity(win, doc), win.google.accounts.id);
  assert.equal(scripts.length, 1);
});

test('failed downloads can be retried successfully', async () => {
  const { scripts, win, doc } = fakeBrowser();
  const failed = loadGoogleIdentity(win, doc);
  scripts[0].onerror();
  await assert.rejects(failed);
  assert.equal(scripts[0].removed, true);
  const retry = loadGoogleIdentity(win, doc);
  assert.equal(scripts.length, 2);
  win.google = { accounts: { id: {} } };
  scripts[1].onload();
  await retry;
});

test('a blocked library times out without reporting a successful login', async () => {
  const { scripts, win, doc } = fakeBrowser();
  await assert.rejects(loadGoogleIdentity(win, doc, 10), /وقتًا طويلًا/);
  assert.equal(scripts[0].removed, true);
});

test('Google token verification receives the configured audience and returns only verified identity', async () => {
  const credential = 'a-signed-google-credential-test-value';
  const client = { verifyIdToken: async input => {
    assert.deepEqual(input, { idToken: credential, audience: 'expected-client' });
    return { getPayload: () => ({ sub: '123', email: 'USER@gmail.com', email_verified: true, name: 'User', role: 'admin' }) };
  } };
  assert.deepEqual(await verifyGoogleCredential(credential, 'expected-client', client), {
    googleId: '123', email: 'user@gmail.com', name: 'User', avatar: ''
  });
  await assert.rejects(verifyGoogleCredential(credential, 'expected-client', {
    verifyIdToken: async () => ({ getPayload: () => ({ sub: '123', email: 'user@gmail.com', email_verified: false }) })
  }));
  await assert.rejects(verifyGoogleCredential('', 'expected-client', client));
  await assert.rejects(verifyGoogleCredential(credential, 'expected-client', {
    verifyIdToken: async () => { throw new Error('Wrong audience or signature'); }
  }));
});

test('the endpoint rejects an unsigned email identity before database access', async () => {
  const res = {
    headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; }
  };
  await googleAuth({ method: 'POST', body: { email: 'owner@example.invalid', googleId: 'fake' } }, res);
  assert.equal(res.code, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
