import nodemailer from 'nodemailer';

export async function sendAuthEmail(to: string, subject: string, text: string, html?: string) {
  const env = process.env;
  const user = env.SMTP_USERNAME || env.SMTP_USER;
  const pass = env.SMTP_PASSWORD || env.SMTP_PASS;
  const from = env.SMTP_FROM_EMAIL || env.SMTP_FROM || user;
  if (!env.SMTP_HOST || !user || !pass || !from) throw new Error('SMTP_NOT_CONFIGURED');
  const port = Number(env.SMTP_PORT_SSL || env.SMTP_PORT || 465);
  const timeout = Number(env.SMTP_TIMEOUT_SECONDS || 20) * 1000;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port, secure: port === 465 || env.SMTP_SECURE === 'true',
    requireTLS: port !== 465, auth: { user, pass },
    connectionTimeout: timeout, greetingTimeout: timeout, socketTimeout: timeout,
  });
  try {
    const result = await transport.sendMail({ from: { name: env.APP_NAME || 'VitaAI', address: from }, to, subject, text, html });
    if (!result.accepted.length) throw new Error('SMTP_RECIPIENT_REJECTED');
  } finally { transport.close(); }
}
