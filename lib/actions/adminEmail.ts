'use server';

import jwt from 'jsonwebtoken';
import { sendMail, escapeHtml } from '@/lib/email/sendMail';

const JWT_SECRET = process.env.JWT_SECRET || '';

function verifyAdmin(token: string): boolean {
  try {
    return !!(jwt.verify(token, JWT_SECRET) as any).isAdmin;
  } catch {
    return false;
  }
}

export interface EmailConfigStatus {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  from: string;
  missing: string[];
}

export async function getEmailConfigStatus(token: string): Promise<EmailConfigStatus | { error: string }> {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };

  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.MAIL_FROM || '';

  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!port) missing.push('SMTP_PORT');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (!from) missing.push('MAIL_FROM');

  return { configured: missing.length === 0, host, port, user, from, missing };
}

export async function sendTestEmail(
  token: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!verifyAdmin(token)) return { ok: false, error: 'Unauthorized' };

  const recipient = (to || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return { ok: false, error: 'Invalid email address.' };
  if (!subject.trim() || !body.trim()) return { ok: false, error: 'Subject and body are required.' };

  const html = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font:15px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#1a1a1a;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return sendMail({ to: recipient, subject: subject.trim(), html, text: body.trim() });
}
