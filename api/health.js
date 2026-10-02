import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!DB_URL) {
    return res.status(500).json({
      status: 'error',
      database: 'Missing DATABASE_URL environment variable on Vercel'
    });
  }

  const activeEmailProvider = (process.env.SMTP_USER && process.env.SMTP_PASS)
    ? 'gmail_smtp'
    : (process.env.BREVO_API_KEY ? 'brevo' : (process.env.RESEND_API_KEY ? 'resend' : 'none'));

  try {
    const sql = neon(DB_URL);
    const result = await sql`SELECT current_database(), now();`;
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      current_database: result[0]?.current_database,
      server_time: result[0]?.now,
      email_provider: activeEmailProvider,
      smtp_configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      brevo_configured: Boolean(process.env.BREVO_API_KEY),
      resend_configured: Boolean(process.env.RESEND_API_KEY)
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      database: 'connection_failed',
      error: err.message
    });
  }
}
