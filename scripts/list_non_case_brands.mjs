import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function main() {
  const prods = await sql`
    SELECT id, name_ar, name_en, brand, category, specs, images
    FROM products 
    WHERE category != 'cases_protection'
    ORDER BY brand, id
  `;

  console.log('Total non-case products:', prods.length);
  const brandMap = {};
  for (const p of prods) {
    brandMap[p.brand] = brandMap[p.brand] || [];
    brandMap[p.brand].push(p);
  }

  console.log('\n--- Brands Summary ---');
  for (const [brand, items] of Object.entries(brandMap)) {
    console.log(`\nBrand: "${brand}" (${items.length} items):`);
    for (const item of items) {
      console.log(`  - [${item.id}] ${item.name_ar} | EN: ${item.name_en}`);
    }
  }

  fs.writeFileSync('non_case_products.json', JSON.stringify(prods, null, 2), 'utf8');
}

main().catch(console.error);
