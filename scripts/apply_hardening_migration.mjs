import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import { loadLocalEnv } from './neon_backup_helpers.mjs';

async function main() {
  const env = loadLocalEnv();
  const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL || env.VITE_DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL missing.');
    process.exit(1);
  }
  const sql = neon(dbUrl);
  const migFiles = [
    'migrations/20261127_payment_gateway_and_crm.sql',
    'migrations/20261128_production_hardening.sql'
  ];

  for (const rel of migFiles) {
    const migPath = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(migPath)) continue;
    const raw = fs.readFileSync(migPath, 'utf8');
    const statements = raw
      .split(/;\s*(?:\r?\n|$)/)
      .map(s => s.replace(/^--.*$/gm, '').trim())
      .filter(Boolean);

    console.log(`Applying ${statements.length} statements from ${rel}...`);
    for (let i = 0; i < statements.length; i++) {
      await sql.query(`${statements[i]};`);
      console.log(`  [${i + 1}/${statements.length}] OK`);
    }
  }

  await sql.query(`
    CREATE TABLE IF NOT EXISTS background_jobs (
      id VARCHAR(120) PRIMARY KEY,
      job_type VARCHAR(60) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      last_error TEXT,
      run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_bg_jobs_pending
      ON background_jobs(status, run_after ASC)
      WHERE status IN ('pending', 'retry');
  `);
  console.log('✅ Hardening migration applied successfully.');
}

main().catch(err => {
  console.error('❌ Migration error:', err?.message || err);
  process.exit(1);
});
