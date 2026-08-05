import nodemailer, { type Transporter } from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const MAIL_FROM = process.env.MAIL_FROM || 'Erogram <noreply@erogram.pro>';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      pool: true,
    });
  }
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/** Never throws: email failures must not break signup, approval, or payment flows. */
export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }> {
  const to = (input.to || '').trim();
  if (!to) return { ok: false, error: 'No recipient' };

  const tx = getTransporter();
  if (!tx) {
    console.warn('[email] SMTP not configured — skipped:', input.subject);
    return { ok: false, error: 'SMTP not configured' };
  }

  try {
    await tx.sendMail({
      from: MAIL_FROM,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    return { ok: true };
  } catch (e) {
    console.error('[email] send failed:', input.subject, e);
    return { ok: false, error: e instanceof Error ? e.message : 'Send failed' };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
