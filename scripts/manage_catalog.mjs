import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

// Read database URL from .env or environment
function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VITE_DATABASE_URL) return process.env.VITE_DATABASE_URL;
  try {
    const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    const match = envContent.match(/^(?:VITE_)?DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch (_) {}
  return '';
}

const dbUrl = getDatabaseUrl();
if (!dbUrl) {
  console.error('❌ خطأ: لم يتم العثور على متغير DATABASE_URL في ملف .env أو بيئة التشغيل.');
  process.exit(1);
}

const sql = neon(dbUrl);

async function printStatus() {
  console.log('📊 فحص حالة كتالوج المنتجات في Neon PostgreSQL...');
  const total = await sql`SELECT count(*)::int as count FROM products;`;
  const posCount = await sql`SELECT count(*)::int as count FROM products WHERE id LIKE 'prod-pos-%';`;
  const seedCount = await sql`SELECT count(*)::int as count FROM products WHERE id NOT LIKE 'prod-pos-%';`;
  const cats = await sql`SELECT category, count(*)::int as count FROM products GROUP BY category ORDER BY count DESC;`;

  console.log('========================================================');
  console.log(`🔹 إجمالي المنتجات الحالية: ${total[0]?.count || 0}`);
  console.log(`🔹 منتجات الإكسيل التجريبية (POS Import): ${posCount[0]?.count || 0}`);
  console.log(`🔹 منتجات البذور والمحاكاة التجريبية (Seed): ${seedCount[0]?.count || 0}`);
  console.log('--------------------------------------------------------');
  console.log('توزيع الأقسام الحالي:');
  cats.forEach(c => console.log(`  - ${c.category}: ${c.count} منتج`));
  console.log('========================================================');
}

async function createBackup() {
  console.log('💾 جاري إنشاء نسخة احتياطية من جميع المنتجات الحالية...');
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const rows = await sql`SELECT * FROM products ORDER BY created_at ASC;`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `products_backup_${timestamp}.json`);

  fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2), 'utf8');
  console.log(`✅ تم حفظ النسخة الاحتياطية بنجاح (${rows.length} منتج) في:`);
  console.log(`📁 ${backupFile}`);
  return backupFile;
}

async function purgeMockData(confirmAll = false) {
  // Always take a backup first for absolute safety!
  await createBackup();

  if (confirmAll) {
    console.log('⚠️ جاري حذف جميع المنتجات من جدول products لتجهيز المتجر للمنتجات الحقيقية...');
    const result = await sql`DELETE FROM products RETURNING id;`;
    console.log(`✅ تم مسح ${result.length} منتج بنجاح. جدول المنتجات الآن فارغ ونظيف 100%.`);
  } else {
    console.log('⚠️ جاري حذف المنتجات التجريبية فقط (prod-pos-* والمنتجات الافتراضية)...');
    const result = await sql`DELETE FROM products WHERE id LIKE 'prod-pos-%' RETURNING id;`;
    console.log(`✅ تم مسح ${result.length} منتج تجريبي من المنتجات المستوردة. تم الإبقاء على المنتجات الأخرى.`);
  }

  console.log('💡 جاهز الآن لإضافة المنتجات الحقيقية المصورة!');
}

const command = process.argv[2] || 'status';

if (command === 'status') {
  await printStatus();
} else if (command === 'backup') {
  await createBackup();
} else if (command === 'purge-mock') {
  await purgeMockData(false);
} else if (command === 'purge-all') {
  const confirmed = process.argv.includes('--confirm');
  if (!confirmed) {
    console.error('⛔ تنبيه أمان: لحذف كافة المنتجات، يرجى تشغيل الأمر مصحوباً بـ --confirm');
    console.error('مثال: node scripts/manage_catalog.mjs purge-all --confirm');
    process.exit(1);
  }
  await purgeMockData(true);
} else {
  console.log(`
أوامر إدارة وتصفير الكتالوج:
  node scripts/manage_catalog.mjs status       - عرض إحصائيات المنتجات الحالية
  node scripts/manage_catalog.mjs backup       - أخذ نسخة احتياطية محلية بصيغة JSON
  node scripts/manage_catalog.mjs purge-mock   - مسح المنتجات المستوردة من الإكسيل (2233 منتج)
  node scripts/manage_catalog.mjs purge-all --confirm - مسح كامل المنتجات لتجهيز الكتالوج الحقيقي
  `);
}
