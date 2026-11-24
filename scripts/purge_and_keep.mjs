import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=([^\r\n]+)/);
const sql = neon(match[1]);

async function run() {
  console.log('1. Creating backup of all current products in Neon DB...');
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const allRows = await sql`SELECT * FROM products ORDER BY created_at ASC;`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `products_backup_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(allRows, null, 2), 'utf8');
  console.log(`✅ Backup created: ${backupFile} (${allRows.length} rows)`);

  const keepIds = [
    'prod-onmust-zolo-30w-1006',
    'prod-case-bmw-m-ip17promax',
    'prod-case-carrio-mesh-ip17promax',
    'prod-case-apple-silicone-desert-ip17promax',
    'prod-case-xinreeu-frosted-orange-ip17promax',
    'prod-case-ipefet-leather-tan-ip17promax',
    'prod-case-gear4-crystalex-clear-ip17promax'
  ];

  console.log('2. Deleting legacy products, keeping only verified products:', keepIds);
  const deleted = await sql`
    DELETE FROM products 
    WHERE id NOT IN (${keepIds[0]}, ${keepIds[1]}, ${keepIds[2]}, ${keepIds[3]}, ${keepIds[4]}, ${keepIds[5]}, ${keepIds[6]});
  `;

  const remaining = await sql`SELECT id, name_ar, category FROM products;`;
  console.log(`✅ Deletion complete. Remaining products in Neon DB (${remaining.length}):`);
  remaining.forEach(r => console.log(`  - [${r.category}] ${r.id}: ${r.name_ar}`));
}

run().catch(console.error);
