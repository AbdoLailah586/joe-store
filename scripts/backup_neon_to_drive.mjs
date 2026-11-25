import { neon } from '@neondatabase/serverless';
import { google } from 'googleapis';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { loadLocalEnv, sendWhatsAppNotification } from './neon_backup_helpers.mjs';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

function loadDatabaseUrl(env) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  throw new Error('DATABASE_URL not found in environment or .env');
}

function escapeSqlValue(val, dataType = '') {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (val instanceof Date) return `'${val.toISOString().replace(/'/g, "''")}'`;
  if (Array.isArray(val) && !dataType.includes('json')) {
    // PostgreSQL array literal
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

async function dumpNeonDatabase(sql) {
  const tablesRes = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC
  `;

  const tables = tablesRes.map(r => r.table_name);
  let sqlLines = [
    `-- JOE Store Neon PostgreSQL Full Backup`,
    `-- Generated at: ${new Date().toISOString()}`,
    `-- Tables count: ${tables.length}`,
    `BEGIN;\n`
  ];

  const manifest = {
    project: 'JOESTORE',
    database: 'Neon PostgreSQL',
    exported_at: new Date().toISOString(),
    tables_count: tables.length,
    total_rows: 0,
    tables: {}
  };

  const tableJsonData = {};

  for (const tableName of tables) {
    const colsRes = await sql`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position ASC
    `;

    const colDefs = colsRes.map(c => {
      let typeStr = c.data_type;
      if (c.data_type === 'ARRAY' && c.udt_name?.startsWith('_')) {
        typeStr = `${c.udt_name.slice(1)}[]`;
      } else if (c.data_type === 'USER-DEFINED') {
        typeStr = c.udt_name;
      }
      const nullable = c.is_nullable === 'NO' ? ' NOT NULL' : '';
      const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
      return `  "${c.column_name}" ${typeStr}${nullable}${def}`;
    });

    sqlLines.push(`-- Table: ${tableName}`);
    sqlLines.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (\n${colDefs.join(',\n')}\n);\n`);

    const rows = await sql.query(`SELECT * FROM "${tableName}"`);
    manifest.tables[tableName] = rows.length;
    manifest.total_rows += rows.length;
    tableJsonData[tableName] = rows;

    if (rows.length > 0) {
      const colNames = colsRes.map(c => `"${c.column_name}"`).join(', ');
      const colTypeMap = Object.fromEntries(colsRes.map(c => [c.column_name, c.data_type]));

      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const valueTuples = batch.map(row => {
          const vals = colsRes.map(c => escapeSqlValue(row[c.column_name], colTypeMap[c.column_name]));
          return `(${vals.join(', ')})`;
        });
        sqlLines.push(`INSERT INTO "${tableName}" (${colNames}) VALUES\n${valueTuples.join(',\n')}\nON CONFLICT DO NOTHING;\n`);
      }
    }
    console.log(`  ✓ Exported table "${tableName}": ${rows.length} rows`);
  }

  sqlLines.push('COMMIT;\n');
  return { sqlDump: sqlLines.join('\n'), manifest, tableJsonData };
}

async function createZipArchive(zipPath, sqlDump, manifest, tableJsonData) {
  await fs.promises.mkdir(path.dirname(zipPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => resolve({ sizeBytes: archive.pointer() }));
    archive.on('error', reject);

    archive.pipe(output);
    archive.append(sqlDump, { name: 'dump.sql' });
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    for (const [tableName, rows] of Object.entries(tableJsonData)) {
      archive.append(JSON.stringify(rows, null, 2), { name: `tables/${tableName}.json` });
    }
    archive.finalize();
  });
}

async function uploadToGoogleDrive(env, zipPath, fileName) {
  const credsRaw = env.GOOGLE_DRIVE_CREDENTIALS_JSON || fs.readFileSync('oauth-credentials.json', 'utf8');
  const tokenRaw = env.GOOGLE_DRIVE_TOKEN_JSON || fs.readFileSync('data/google_drive_token.json', 'utf8');

  const creds = JSON.parse(credsRaw);
  const token = JSON.parse(tokenRaw);
  const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oauth2Client.setCredentials(token);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const folderName = env.GOOGLE_DRIVE_BACKUP_FOLDER || 'JOESTORE_Backups';

  const folderSearch = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  let folderId;
  if (folderSearch.data.files && folderSearch.data.files.length > 0) {
    folderId = folderSearch.data.files[0].id;
  } else {
    const folderCreate = await drive.files.create({
      resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id'
    });
    folderId = folderCreate.data.id;
  }

  const fileRes = await drive.files.create({
    resource: { name: fileName, parents: [folderId] },
    media: { mimeType: 'application/zip', body: fs.createReadStream(zipPath) },
    fields: 'id, name, webViewLink, size'
  });

  return fileRes.data;
}

async function main() {
  console.log('🚀 Starting Neon PostgreSQL backup for JOESTORE...');
  const env = loadLocalEnv();
  const dbUrl = loadDatabaseUrl(env);
  const sql = neon(dbUrl);

  const { sqlDump, manifest, tableJsonData } = await dumpNeonDatabase(sql);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `joestore_neon_backup_${stamp}.zip`;
  const zipPath = path.join('backups', fileName);

  const { sizeBytes } = await createZipArchive(zipPath, sqlDump, manifest, tableJsonData);
  const sizeKB = (sizeBytes / 1024).toFixed(2);
  console.log(`📦 ZIP Archive created: ${zipPath} (${sizeKB} KB)`);

  let driveFile = null;
  try {
    driveFile = await uploadToGoogleDrive(env, zipPath, fileName);
    console.log(`☁️ Uploaded to Google Drive: ${driveFile.webViewLink}`);
  } catch (err) {
    console.error('⚠️ Google Drive upload failed:', err.message);
  }

  const tableSummary = Object.entries(manifest.tables)
    .map(([t, count]) => `• ${t}: ${count}`)
    .join('\n');

  const waMessage = [
    `✅ *تقرير النسخ الاحتياطي - قاعدة بيانات JOESTORE (Neon)*`,
    `📅 التاريخ: ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`,
    `📊 الجداول: ${manifest.tables_count} جدول | إجمالي الصفوف: ${manifest.total_rows}`,
    `📦 حجم الأرشيف: ${sizeKB} KB`,
    driveFile ? `☁️ رابط Google Drive:\n${driveFile.webViewLink}` : `⚠️ تعذر الرفع على Drive (محفوظ محلياً في ${zipPath})`,
    `\n📋 تفاصيل الجداول:\n${tableSummary}`
  ].join('\n');

  try {
    await sendWhatsAppNotification(env, waMessage);
    console.log('📱 WhatsApp report sent.');
  } catch (err) {
    console.error('⚠️ WhatsApp notification failed:', err.message);
  }

  console.log('✨ Backup workflow finished!');
}

main().catch(err => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
