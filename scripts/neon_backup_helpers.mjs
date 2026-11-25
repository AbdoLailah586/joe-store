import fs from 'node:fs';

/**
 * Load key/value pairs from a local .env file without overriding existing process.env entries.
 */
export function loadLocalEnv(envFile = '.env') {
  const vars = { ...process.env };
  if (!fs.existsSync(envFile)) return vars;
  const content = fs.readFileSync(envFile, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !vars[m[1]]) {
      vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return vars;
}

/**
 * Send a WhatsApp notification using CRM credentials configured in environment variables.
 */
export async function sendWhatsAppNotification(env, message) {
  const baseUrl = (env.WHATSAPP_CRM_URL || '').replace(/\/+$/, '');
  const email = env.WHATSAPP_CRM_EMAIL;
  const password = env.WHATSAPP_CRM_PASSWORD;
  const to = env.WHATSAPP_CRM_TO;

  if (!baseUrl || !email || !password || !to) {
    throw new Error('Missing WHATSAPP_CRM_URL, WHATSAPP_CRM_EMAIL, WHATSAPP_CRM_PASSWORD, or WHATSAPP_CRM_TO in environment/.env');
  }

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!loginRes.ok) {
    throw new Error(`WhatsApp login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  const jwt = loginData.token || loginData.accessToken || loginData.data?.token;
  if (!jwt) {
    throw new Error('WhatsApp login succeeded but no JWT token found in response');
  }

  const sendRes = await fetch(`${baseUrl}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({ to, text: message })
  });
  if (!sendRes.ok) {
    throw new Error(`WhatsApp send failed: ${sendRes.status} ${await sendRes.text()}`);
  }
  return await sendRes.json();
}
