import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
const SMTP_PASS = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || SMTP_USER || 'abdolailah586@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'JOE Store';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.VITE_EMAIL_FROM || process.env.RESEND_FROM || 'JOE Store <onboarding@resend.dev>';

/**
 * Dispatches a transactional email using the first available configured provider (SMTP -> Brevo -> Resend) with timeouts.
 */
export async function sendTransactionalEmail({ to, toName = 'عميلنا العزيز', subject, html, text }) {
  if (SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 12000,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"${BREVO_SENDER_NAME}" <${SMTP_USER}>`,
        to,
        subject,
        html,
        text
      });
      return { success: true, provider: 'Gmail SMTP' };
    } catch (err) {
      console.error('[Mailer SMTP Error]:', err?.message || err);
    }
  }

  if (BREVO_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
          to: [{ email: to, name: toName }],
          subject,
          htmlContent: html,
          textContent: text
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data?.messageId || data?.id)) return { success: true, provider: 'Brevo' };
    } catch (err) {
      console.error('[Mailer Brevo Error]:', err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }

  if (RESEND_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.id) return { success: true, provider: 'Resend' };
    } catch (err) {
      console.error('[Mailer Resend Error]:', err?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }

  return { success: false, error: 'تعذر الإرسال عبر مزود البريد حالياً.' };
}
