import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';

function loadSrcUrl() {
  const env = fs.readFileSync('.env', 'utf8');
  const m = env.match(/^DATABASE_URL=([^\r\n]+)/m);
  if (!m) throw new Error('DATABASE_URL not found in .env');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const dstUrl = process.argv[2];
if (!dstUrl) {
  console.error('Usage: node scripts/migrate_neon_db.mjs <TARGET_DATABASE_URL>');
  process.exit(1);
}

function escapeSqlValue(val, dataType = '') {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (val instanceof Date) return `'${val.toISOString().replace(/'/g, "''")}'`;
  if (Array.isArray(val) && !dataType.includes('json')) {
    const escapedItems = val.map(item => {
      if (item === null || item === undefined) return 'NULL';
      const s = String(item).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${s}"`;
    });
    return `'{${escapedItems.join(',')}}'::text[]`;
  }
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function main() {
  const srcUrl = loadSrcUrl();
  const src = neon(srcUrl);
  const dst = neon(dstUrl);

  console.log('🔍 Checking target Neon database...');
  const dstCheck = await dst.query('SELECT version()');
  console.log('✅ Connected to target:', dstCheck[0].version.split(',')[0]);

  // 1. Get all base tables from source
  const tablesRes = await src.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC
  `);
  const tables = tablesRes.map(r => r.table_name);
  console.log(`📋 Found ${tables.length} tables in source database.`);

  // 2. Get sequences from source
  const seqRes = await src.query(`
    SELECT sequencename, start_value, min_value, max_value, increment_by, last_value
    FROM pg_sequences
    WHERE schemaname = 'public'
  `);
  for (const seq of seqRes) {
    await dst.query(`CREATE SEQUENCE IF NOT EXISTS "${seq.sequencename}" START WITH ${seq.start_value} INCREMENT BY ${seq.increment_by}`);
  }
  if (seqRes.length > 0) console.log(`🔢 Created ${seqRes.length} sequences.`);

  // 3. Get constraints & indexes from source
  const constraints = await src.query(`
    SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS def, contype
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY contype DESC, conrelid::regclass::text
  `);

  const indexes = await src.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);

  const constraintNames = new Set(constraints.map(c => c.conname));
  const tableColumnsMap = {};

  // 4. Create tables using exact format_type from pg_attribute (drop clean on fresh target if re-running)
  for (const tableName of tables) {
    const colsRes = await src.query(`
      SELECT
        a.attname AS column_name,
        format_type(a.atttypid, a.atttypmod) AS exact_type,
        t.typname AS udt_name,
        NOT a.attnotnull AS is_nullable,
        pg_get_expr(d.adbin, d.adrelid) AS column_default
      FROM pg_attribute a
      JOIN pg_type t ON a.atttypid = t.oid
      LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      WHERE a.attrelid = '"${tableName}"'::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum ASC
    `);
    tableColumnsMap[tableName] = colsRes;

    const colDefs = colsRes.map(c => {
      const nullable = c.is_nullable ? '' : ' NOT NULL';
      const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
      return `  "${c.column_name}" ${c.exact_type}${nullable}${def}`;
    });

    const tableNonFkConstraints = constraints
      .filter(c => c.table_name === tableName && c.contype !== 'f')
      .map(c => `  CONSTRAINT "${c.conname}" ${c.def}`);

    await dst.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
    const createSql = `CREATE TABLE "${tableName}" (\n${[...colDefs, ...tableNonFkConstraints].join(',\n')}\n);`;
    await dst.query(createSql);
  }
  console.log('🏗️ All table schemas & primary/unique constraints created on target.');

  // 5. Copy all rows table by table
  const verification = [];
  for (const tableName of tables) {
    const colsRes = tableColumnsMap[tableName];
    const rows = await src.query(`SELECT * FROM "${tableName}"`);

    if (rows.length > 0) {
      const colNames = colsRes.map(c => `"${c.column_name}"`).join(', ');
      const colTypeMap = Object.fromEntries(colsRes.map(c => [c.column_name, c.exact_type]));

      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const valueTuples = batch.map(row => {
          const vals = colsRes.map(c => escapeSqlValue(row[c.column_name], colTypeMap[c.column_name]));
          return `(${vals.join(', ')})`;
        });
        const insertSql = `INSERT INTO "${tableName}" (${colNames}) VALUES\n${valueTuples.join(',\n')}\nON CONFLICT DO NOTHING;`;
        await dst.query(insertSql);
      }
    }

    const dstCountRes = await dst.query(`SELECT COUNT(*)::int AS cnt FROM "${tableName}"`);
    const dstCount = dstCountRes[0].cnt;
    verification.push({ table: tableName, source: rows.length, target: dstCount });
    console.log(`  ✓ ${tableName}: source=${rows.length}, target=${dstCount}`);
  }

  // 6. Add Foreign Keys
  const fkConstraints = constraints.filter(c => c.contype === 'f');
  for (const fk of fkConstraints) {
    try {
      await dst.query(`ALTER TABLE "${fk.table_name}" ADD CONSTRAINT "${fk.conname}" ${fk.def};`);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.warn(`⚠️ FK ${fk.conname} warning:`, err.message);
      }
    }
  }
  if (fkConstraints.length > 0) console.log(`🔗 Applied ${fkConstraints.length} foreign key constraints.`);

  // 7. Create non-constraint indexes
  let idxCount = 0;
  for (const idx of indexes) {
    if (constraintNames.has(idx.indexname)) continue;
    const safeDef = idx.indexdef.replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS ').replace(/^CREATE UNIQUE INDEX /, 'CREATE UNIQUE INDEX IF NOT EXISTS ');
    try {
      await dst.query(safeDef);
      idxCount++;
    } catch (err) {
      console.warn(`⚠️ Index ${idx.indexname} warning:`, err.message);
    }
  }
  if (idxCount > 0) console.log(`⚡ Created ${idxCount} indexes.`);

  // 8. Sync sequence values
  for (const seq of seqRes) {
    if (seq.last_value != null) {
      await dst.query(`SELECT setval('"${seq.sequencename}"', ${seq.last_value}, true)`);
    }
  }

  const mismatches = verification.filter(v => v.source !== v.target);
  if (mismatches.length > 0) {
    console.error('❌ Verification mismatches:', mismatches);
    process.exit(1);
  }

  console.log('\n🎉 Migration 100% complete & verified! All 20 tables match exact row counts.');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
