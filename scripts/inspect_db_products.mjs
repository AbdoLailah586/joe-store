import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function check() {
  const all = await sql`SELECT id, name_ar, category, brand FROM products;`;
  console.log('Total products in DB:', all.length);
  const byCat = {};
  all.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
  console.log('By category:', byCat);
  const keepList = all.filter(p => p.id.startsWith('prod-case-') || p.id.includes('onmust'));
  console.log('Products to keep (' + keepList.length + '):', keepList.map(p => p.id));
}

check().catch(console.error);
