import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';
import { currentUser } from '../lib/session.js';
import { isFullAdmin } from '../lib/access.js';

export default async function handler(req, res) {
  const DB_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '';

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method Not Allowed' });
  }

  if (!DB_URL) {
    return res.status(500).json({
      status: 'error',
      database: 'Missing DATABASE_URL configuration'
    });
  }

  try {
    const sql = neon(DB_URL);
    await sql`SELECT 1;`;

    // Only authenticated store administrators can inspect internal configuration or run diagnostic probes
    const user = await currentUser(req, sql).catch(() => null);
    const isAdmin = Boolean(user && isFullAdmin(user));

    if (!isAdmin) {
      return res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
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
          code: vErr.code
        };
      }
    }

    const result = await sql`SELECT current_database(), now();`;
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      current_database: result[0]?.current_database,
      server_time: result[0]?.now,
      email_provider: activeEmailProvider,
      smtp_configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      smtp_verification: smtpVerification,
      brevo_configured: Boolean(process.env.BREVO_API_KEY),
      resend_configured: Boolean(process.env.RESEND_API_KEY)
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      database: 'connection_failed',
      error: 'Database connection failed'
    });
  }
}
