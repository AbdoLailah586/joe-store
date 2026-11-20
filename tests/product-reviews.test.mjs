import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function compile(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const input = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(input, {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    }
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    id => mocks[id] || (id.endsWith('/deliveryAddress.js') ? { decodeDeliveryNotes: () => ({}), encodeDeliveryNotes: () => ({}), formatDeliveryAddress: () => '' } : {}),
    module,
    module.exports
  );
  return module.exports;
}

test('reviews validation: enforces rating boundaries, character limits, max 3 images and pending status', async () => {
  let insertedData = null;
  const mockSql = Object.assign(
    async (strings, ...values) => {
      insertedData = values;
      return [{
        id: values[0],
        product_id: values[1],
        product_name_ar: values[2],
        author_name: values[3],
        author_phone: values[4],
        user_id: values[5],
        session_id: values[6],
        rating: values[7],
        comment: values[8],
        images: JSON.parse(values[9]),
        status: 'pending'
      }];
    },
    { query: async () => [] }
  );

  const { neonDb } = compile('server/store.ts', {
    './orderWrites.js': {},
    '@neondatabase/serverless': { neon: () => mockSql }
  });

  // 1. Missing author or comment fails
  const missingAuthor = await neonDb.submitProductReview({ product_id: 'p1', author_name: '', comment: 'great', rating: 5 });
  assert.equal(missingAuthor.success, false);
  assert.match(missingAuthor.error, /اسم كاتب التقييم مطلوب/);

  const missingComment = await neonDb.submitProductReview({ product_id: 'p1', author_name: 'Ahmed', comment: '   ', rating: 5 });
  assert.equal(missingComment.success, false);
  assert.match(missingComment.error, /نص التقييم مطلوب/);

  // 2. Comment length > 600 fails
  const longComment = 'a'.repeat(601);
  const tooLong = await neonDb.submitProductReview({ product_id: 'p1', author_name: 'Ahmed', comment: longComment, rating: 5 });
  assert.equal(tooLong.success, false);
  assert.match(tooLong.error, /الحد الأقصى/);

  // 3. Valid submission clamps rating, caps images to 3, and assigns pending status
  const valid = await neonDb.submitProductReview({
    product_id: 'p-100',
    product_name_ar: 'شاحن أون موست',
    author_name: '  محمود علي  ',
    author_phone: '01555555555',
    session_id: 'ses-12345',
    rating: 6, // Should be clamped to 5
    comment: 'شاحن ممتاز جداً وسريع في الشحن وجودة الخامات ممتازة.',
    images: ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg'] // Should cap to 3
  });

  assert.equal(valid.success, true);
  assert.equal(valid.review.product_id, 'p-100');
  assert.equal(valid.review.author_name, 'محمود علي');
  assert.equal(valid.review.rating, 5); // Clamped
  assert.equal(valid.review.status, 'pending');
  assert.deepEqual(valid.review.images, ['img1.jpg', 'img2.jpg', 'img3.jpg']);
});

test('shadow moderation: author sees their own pending review, strangers see only approved', async () => {
  const reviewsDb = [
    { id: 'rev-1', product_id: 'prod-A', author_name: 'Zaid', rating: 5, comment: 'Approved review', status: 'approved', session_id: 'ses-other', user_id: null },
    { id: 'rev-2', product_id: 'prod-A', author_name: 'Omar', rating: 4, comment: 'Pending review by Omar', status: 'pending', session_id: 'ses-omar-999', user_id: 'usr-omar' }
  ];

  const mockSql = Object.assign(
    async (strings, ...values) => {
      const prodId = values[0];
      const hasSessionOrUser = values.length >= 3;
      const sessionId = hasSessionOrUser ? values[1] : null;
      const userId = hasSessionOrUser ? values[2] : null;

      return reviewsDb.filter(r => {
        if (r.product_id !== prodId) return false;
        if (r.status === 'approved') return true;
        if (r.status === 'pending') {
          if (sessionId && r.session_id === sessionId) return true;
          if (userId && r.user_id === userId) return true;
        }
        return false;
      });
    },
    { query: async () => [] }
  );

  const { neonDb } = compile('server/store.ts', {
    './orderWrites.js': {},
    '@neondatabase/serverless': { neon: () => mockSql }
  });

  // Stranger browsing product
  const strangerReviews = await neonDb.getProductReviews('prod-A', 'ses-stranger-111');
  assert.equal(strangerReviews.length, 1);
  assert.equal(strangerReviews[0].id, 'rev-1');
  assert.equal(strangerReviews[0].author_name, 'Zaid');

  // Omar (the author of pending review) browsing product
  const omarReviews = await neonDb.getProductReviews('prod-A', 'ses-omar-999');
  assert.equal(omarReviews.length, 2);
  assert.equal(omarReviews.some(r => r.id === 'rev-2'), true);
});
