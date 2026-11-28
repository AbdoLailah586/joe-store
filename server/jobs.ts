import { randomBytes } from 'node:crypto';
import { dispatchWhatsAppViaCrm } from './whatsappCrm.js';
import { recordOperationalAlert } from './monitoring.js';
import { sendTransactionalEmail } from '../lib/mailer.js';

export type BackgroundJobType = 'whatsapp_dispatch' | 'email_dispatch';

let jobsTableReady = false;

export async function ensureBackgroundJobsTable(sql: any): Promise<void> {
  if (jobsTableReady || !sql?.query) return;
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
  `).catch(() => {});
  await sql.query(`
    CREATE INDEX IF NOT EXISTS idx_bg_jobs_pending
      ON background_jobs(status, run_after ASC)
      WHERE status IN ('pending', 'retry');
  `).catch(() => {});
  jobsTableReady = true;
}

export async function enqueueBackgroundJob(
  sql: any,
  jobType: BackgroundJobType,
  payload: Record<string, any>
): Promise<string | null> {
  if (typeof sql !== 'function') return null;
  try {
    await ensureBackgroundJobsTable(sql);
    const id = `job-${Date.now()}-${randomBytes(4).toString('hex')}`;
    await sql`
      INSERT INTO background_jobs (id, job_type, payload, status)
      VALUES (${id}, ${jobType}, ${JSON.stringify(payload || {})}::jsonb, 'pending');
    `;
    return id;
  } catch (err: any) {
    void recordOperationalAlert(sql, {
      severity: 'warn',
      source: 'jobs.enqueue',
      message: String(err?.message || err)
    });
    return null;
  }
}

export async function processPendingBackgroundJobs(
  sql: any,
  settings?: any,
  limit = 20
): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (typeof sql !== 'function') return { processed: 0, succeeded: 0, failed: 0 };
  await ensureBackgroundJobsTable(sql);

  const cap = Math.max(1, Math.min(50, limit));
  const jobs = await sql`
    WITH next_batch AS (
      SELECT id
      FROM background_jobs
      WHERE status IN ('pending', 'retry') AND run_after <= NOW()
      ORDER BY created_at ASC
      LIMIT ${cap}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE background_jobs b
    SET status = 'processing', attempts = b.attempts + 1
    FROM next_batch
    WHERE b.id = next_batch.id
    RETURNING b.*;
  `.catch(() => []);

  let succeeded = 0;
  let failed = 0;

  for (const job of jobs || []) {
    try {
      const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : (job.payload || {});
      if (job.job_type === 'whatsapp_dispatch') {
        const res = await dispatchWhatsAppViaCrm(sql, { ...payload, settings });
        if (!res.success) throw new Error(res.error || 'WhatsApp dispatch failed');
      } else if (job.job_type === 'email_dispatch') {
        const res = await sendTransactionalEmail(payload);
        if (!res.success) throw new Error(res.error || 'Email dispatch failed');
      }
      await sql`
        UPDATE background_jobs
        SET status = 'completed', completed_at = NOW(), last_error = NULL
        WHERE id = ${job.id};
      `;
      succeeded++;
    } catch (err: any) {
      failed++;
      const errText = String(err?.message || err).slice(0, 500);
      const exhausted = Number(job.attempts || 1) >= Number(job.max_attempts || 5);
      await sql`
        UPDATE background_jobs
        SET status = ${exhausted ? 'dead' : 'retry'},
            last_error = ${errText},
            run_after = NOW() + (${Math.min(60, Number(job.attempts || 1) * 5)}::text || ' minutes')::interval
        WHERE id = ${job.id};
      `.catch(() => {});
      if (exhausted) {
        await recordOperationalAlert(sql, {
          severity: 'error',
          source: `jobs.dead.${job.job_type}`,
          message: `فشلت المهمة الخلفية بعد ${job.attempts} محاولات: ${errText}`,
          metadata: { jobId: job.id }
        });
      }
    }
  }

  return { processed: (jobs || []).length, succeeded, failed };
}
