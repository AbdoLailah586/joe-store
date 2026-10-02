import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

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

  let smtpVerification = null;
  const testSmtp = req.query?.test_smtp === '1';

  if (testSmtp && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, '');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER.trim(),
          pass: cleanPass
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000
      });

      await transporter.verify();
      smtpVerification = { success: true, message: 'Google SMTP Authentication Verified Successfully!' };
    } catch (vErr) {
      smtpVerification = {
        success: false,
        error: vErr.message,
        code: vErr.code,
        response: vErr.response
      };
    }
  }

  try {
    const sql = neon(DB_URL);
    const result = await sql`SELECT current_database(), now();`;
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      current_database: result[0]?.current_database,
      server_time: result[0]?.now,
      email_provider: activeEmailProvider,
      smtp_user_set: Boolean(process.env.SMTP_USER),
      smtp_user_email: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 4)}***@gmail.com` : null,
      smtp_pass_length: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '').length : 0,
      smtp_configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      smtp_verification: smtpVerification,
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
