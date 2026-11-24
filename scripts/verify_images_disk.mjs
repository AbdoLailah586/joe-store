import fs from 'node:fs';

const content = fs.readFileSync('scripts/insert_all_whatsapp_products.mjs', 'utf8');
const regex = /\/product-images\/[^'",\s]+/g;
const matches = [...new Set(content.match(regex))];
console.log('Total unique images in insert script:', matches.length);
let missing = 0;
for (const m of matches) {
  const p = 'public' + m;
  if (!fs.existsSync(p)) {
    console.error('MISSING:', p);
    missing++;
  }
}
if (missing === 0) {
  console.log(`✅ ALL ${matches.length} IMAGES EXIST ON DISK 100%!`);
}
