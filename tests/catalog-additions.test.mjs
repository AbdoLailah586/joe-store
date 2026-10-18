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
  return compile('server/store.ts', { '@neondatabase/serverless': { neon: () => sql }, '../src/utils/deliveryAddress.js': {}, './orderWrites.js': {} });
}

test('addCoverEntry inserts a manual addition and returns the saved row', async () => {
  const { sql, history, queue } = mockSql();
  const { neonDb } = loadNeonDb(sql);
  queue.push([{ id: 'cover-new-abc', brand: 'Samsung', model: 'Galaxy A55', style: 'نقشة', color: 'أسود', location: 'رف 2', notes: '' }]);
  const result = await neonDb.addCoverEntry({ brand: 'Samsung', model: 'Galaxy A55', style: 'نقشة', color: 'أسود', location: 'رف 2' }, { id: 'staff-1' });
  assert.equal(result.success, true);
  assert.equal(result.entry.brand, 'Samsung');
  const insertCall = history.find(call => /INSERT INTO cover_catalog_additions/.test(call.query));
  assert.ok(insertCall, 'must insert into cover_catalog_additions');
  assert.ok(insertCall.params.includes('Samsung'));
  assert.ok(insertCall.params.includes('Galaxy A55'));
  assert.ok(insertCall.params.includes('staff-1'));
});

test('getCoverAdditions lists saved manual covers', async () => {
  const { sql, queue } = mockSql();
  const { neonDb } = loadNeonDb(sql);
  queue.push([{ id: 'cover-new-abc', brand: 'Samsung', model: 'Galaxy A55' }]);
  const rows = await neonDb.getCoverAdditions();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].brand, 'Samsung');
});

test('addScreenEntry inserts a manual box with its compatible models as JSONB', async () => {
  const { sql, history, queue } = mockSql();
  const { neonDb } = loadNeonDb(sql);
  const models = [{ brand: 'Samsung', brandAr: 'سامسونج', name: 'Galaxy A55' }];
  queue.push([{ id: 'screen-new-abc', box_code: 'K999', screen_title: 'اسكرينة جديدة', models }]);
  const result = await neonDb.addScreenEntry({ boxCode: 'K999', screenTitle: 'اسكرينة جديدة', category: 'og_clear', shelfLocation: 'رف 5', models }, { id: 'staff-1' });
  assert.equal(result.success, true);
  assert.equal(result.entry.box_code, 'K999');
  const insertCall = history.find(call => /INSERT INTO screen_catalog_additions/.test(call.query));
  assert.ok(insertCall, 'must insert into screen_catalog_additions');
  assert.ok(insertCall.params.includes('K999'));
  assert.ok(insertCall.params.includes(JSON.stringify(models)));
});

test('getScreenAdditions lists saved manual screen boxes', async () => {
  const { sql, queue } = mockSql();
  const { neonDb } = loadNeonDb(sql);
  queue.push([{ id: 'screen-new-abc', box_code: 'K999' }]);
  const rows = await neonDb.getScreenAdditions();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].box_code, 'K999');
});

test('addCoverEntry and addScreenEntry report failure instead of throwing when the database rejects the write', async () => {
  const sql = async () => { throw new Error('connection refused'); };
  const { neonDb } = loadNeonDb(sql);
  const coverResult = await neonDb.addCoverEntry({ brand: 'Samsung', model: 'Galaxy A55' });
  assert.equal(coverResult.success, false);
  assert.ok(coverResult.error);
  const screenResult = await neonDb.addScreenEntry({ boxCode: 'K999', screenTitle: 'عنوان', models: [{ brand: 'Samsung', name: 'Galaxy A55' }] });
  assert.equal(screenResult.success, false);
  assert.ok(screenResult.error);
});
