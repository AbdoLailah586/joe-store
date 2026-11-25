import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadLocalEnv, sendWhatsAppNotification } from './neon_backup_helpers.mjs';

const execFileAsync = promisify(execFile);

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const forceAlert = args.has('--force');
  const skipBackup = args.has('--no-backup');

  const env = loadLocalEnv();
  const apiKey = env.NEON_API_KEY;
  if (!apiKey) throw new Error('NEON_API_KEY missing from .env or environment');

  const projectId = env.NEON_PROJECT_ID;
  if (!projectId) throw new Error('NEON_PROJECT_ID missing from .env or environment');
  const thresholdPct = Number(env.NEON_ALERT_THRESHOLD_PCT || 80);

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json'
  };

  const [projRes, branchesRes] = await Promise.all([
    fetch(`https://console.neon.tech/api/v2/projects/${projectId}`, { headers }),
    fetch(`https://console.neon.tech/api/v2/projects/${projectId}/branches`, { headers })
  ]);

  if (!projRes.ok) throw new Error(`Neon API project error: ${projRes.status}`);
  const { project } = await projRes.json();
  const { branches = [] } = branchesRes.ok ? await branchesRes.json() : { branches: [] };
  const primaryBranch = branches.find(b => b.primary) || branches[0];

  // Neon Free Tier (free_v3) limits
  const egressLimitBytes = 5 * 1024 * 1024 * 1024; // 5 GiB (5.37 GB)
  const computeLimitHours = 100; // 100 CU-hours/month
  const storageLimitBytes = project.branch_logical_size_limit_bytes || 512 * 1024 * 1024;

  const egressUsedBytes = Number(project.data_transfer_bytes || 0);
  const computeUsedHours = Number(project.compute_time_seconds || 0) / 3600;
  const storageUsedBytes = Number(primaryBranch?.logical_size || project.synthetic_storage_size || 0);

  const egressPct = (egressUsedBytes / egressLimitBytes) * 100;
  const computePct = (computeUsedHours / computeLimitHours) * 100;
  const storagePct = (storageUsedBytes / storageLimitBytes) * 100;

  const maxPct = Math.max(egressPct, computePct, storagePct);

  console.log(`📊 Neon Project: ${project.name} (${project.id}) | Plan: ${project.owner?.subscription_type || 'free'}`);
  console.log(`   • Egress (نقل البيانات): ${formatBytes(egressUsedBytes)} / ${formatBytes(egressLimitBytes)} (${egressPct.toFixed(1)}%)`);
  console.log(`   • Compute (ساعات التشغيل): ${computeUsedHours.toFixed(2)} / ${computeLimitHours} CU-hrs (${computePct.toFixed(1)}%)`);
  console.log(`   • Storage (المساحة): ${formatBytes(storageUsedBytes)} / ${formatBytes(storageLimitBytes)} (${storagePct.toFixed(1)}%)`);
  console.log(`   • Reset Date: ${project.consumption_period_end}`);

  const warnings = [];
  if (egressPct >= thresholdPct) warnings.push(`⚠️ نقل البيانات (Egress): *${egressPct.toFixed(1)}%* (${formatBytes(egressUsedBytes)} من ${formatBytes(egressLimitBytes)})`);
  if (computePct >= thresholdPct) warnings.push(`⚠️ ساعات التشغيل (Compute): *${computePct.toFixed(1)}%* (${computeUsedHours.toFixed(2)} من ${computeLimitHours} ساعة)`);
  if (storagePct >= thresholdPct) warnings.push(`⚠️ مساحة التخزين (Storage): *${storagePct.toFixed(1)}%* (${formatBytes(storageUsedBytes)} من ${formatBytes(storageLimitBytes)})`);

  if (warnings.length === 0 && !forceAlert) {
    console.log(`✅ All Neon limits are below ${thresholdPct}%. No alert needed.`);
    return;
  }

  // Anti-spam state check (alert once per 10% tier per billing period, unless --force)
  const statePath = path.join('data', 'neon_alert_state.json');
  let state = {};
  if (fs.existsSync(statePath)) {
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch {}
  }
  const periodKey = project.consumption_period_end || 'current';
  const currentTier = Math.floor(maxPct / 5) * 5; // 80, 85, 90, 95, 100
  if (!forceAlert && state.periodKey === periodKey && (state.lastAlertTier || 0) >= currentTier) {
    console.log(`ℹ️ Already alerted for tier ${currentTier}% in period ${periodKey}. Skipping duplicate alert.`);
    return;
  }

  // Trigger auto-backup if threshold breached
  let backupStatusLine = '';
  if (warnings.length > 0 && !skipBackup) {
    console.log('🚨 Limit threshold reached! Triggering automatic Neon backup...');
    try {
      const { stdout } = await execFileAsync('node', ['scripts/backup_neon_to_drive.mjs'], { timeout: 120000 });
      const driveMatch = stdout.match(/https:\/\/drive\.google\.com\/[^\s]+/);
      backupStatusLine = driveMatch
        ? `✅ تم أخذ Backup تلقائي ورفعه على Drive:\n${driveMatch[0]}`
        : `✅ تم أخذ Backup تلقائي محلياً.`;
    } catch (err) {
      backupStatusLine = `⚠️ فشل الـ Backup التلقائي: ${err.message}`;
    }
  }

  const resetDate = project.consumption_period_end
    ? new Date(project.consumption_period_end).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' })
    : 'غير محدد';

  const msg = [
    warnings.length > 0
      ? `🚨 *تنبيه عاجل: باقة Neon المجانية لـ JOESTORE قربت تخلص!*`
      : `📊 *تقرير استهلاك Neon - متجر JOESTORE*`,
    ``,
    `• نقل البيانات (Egress): *${egressPct.toFixed(1)}%* (${formatBytes(egressUsedBytes)} / ${formatBytes(egressLimitBytes)})`,
    `• ساعات التشغيل (Compute): *${computePct.toFixed(1)}%* (${computeUsedHours.toFixed(2)} / ${computeLimitHours} CU-hrs)`,
    `• المساحة (Storage): *${storagePct.toFixed(1)}%* (${formatBytes(storageUsedBytes)} / ${formatBytes(storageLimitBytes)})`,
    `📅 موعد تجديد الباقة: ${resetDate}`,
    ``,
    backupStatusLine,
    warnings.length > 0 ? `\n💡 يُنصح بنقل الداتا بيز إلى أكونت Neon جديد إذا استمر الضغط قبل موعد التجديد.` : ''
  ].filter(Boolean).join('\n');

  await sendWhatsAppNotification(env, msg);
  console.log('📱 WhatsApp alert sent.');

  await fs.promises.mkdir('data', { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({
    periodKey,
    lastAlertTier: currentTier,
    lastCheckedAt: new Date().toISOString(),
    egressPct: Number(egressPct.toFixed(2)),
    computePct: Number(computePct.toFixed(2)),
    storagePct: Number(storagePct.toFixed(2))
  }, null, 2));
}

main().catch(err => {
  console.error('❌ Neon monitor error:', err);
  process.exit(1);
});
