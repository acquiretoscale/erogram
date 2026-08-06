import connectDB from '@/lib/db/mongodb';
import { EmailTemplate } from '@/lib/models';
import { escapeHtml } from './sendMail';

export type EmailTemplateId = 'creator-approved' | 'email-verify' | 'password-reset';

export interface EmailTemplateDef {
  label: string;
  subject: string;
  body: string;
  /** Placeholders the body may use, as {{name}}. */
  vars: readonly string[];
}

/** Defaults. Whatever the admin saves in the Email tab wins over these. */
export const EMAIL_TEMPLATES: Record<EmailTemplateId, EmailTemplateDef> = {
  'creator-approved': {
    label: 'Creator Fanpage approved',
    subject: 'Your Erogram Fanpage is approved',
    body: `Hi {{creatorName}},

Your Erogram Fanpage is approved and live.

View it here: {{profileUrl}}

To manage your Fanpage, you need an Erogram account on the same email address you gave when you submitted your details. If you already have one, just log in. If not, create an account with that same email and your Fanpage will be there waiting.

Once you are logged in, open your profile and go to the Listings tab to edit your Fanpage.

If you have a question, just reply to this email.

Erogram`,
    vars: ['creatorName', 'profileUrl'],
  },
  'email-verify': {
    label: 'Confirm your email (new signups)',
    subject: 'Confirm your Erogram email',
    body: `Confirm your email address on Erogram by opening the link below.

{{verifyUrl}}

This link expires in 24 hours. If you did not create an Erogram account, ignore this email.

Erogram`,
    vars: ['verifyUrl'],
  },
  'password-reset': {
    label: 'Password reset',
    subject: 'Reset your Erogram password',
    body: `Choose a new password for your Erogram account by opening the link below.

{{resetUrl}}

This link expires in 1 hour. If you did not request this, ignore this email.

Erogram`,
    vars: ['resetUrl'],
  },
};

export const EMAIL_TEMPLATE_IDS = Object.keys(EMAIL_TEMPLATES) as EmailTemplateId[];

export function isEmailTemplateId(id: string): id is EmailTemplateId {
  return Object.prototype.hasOwnProperty.call(EMAIL_TEMPLATES, id);
}

/** Saved copy for a template, falling back to the default when nothing is saved. */
export async function getEmailTemplateCopy(id: EmailTemplateId): Promise<{ subject: string; body: string }> {
  const fallback = EMAIL_TEMPLATES[id];
  try {
    await connectDB();
    const saved = await EmailTemplate.findOne({ templateId: id }).select('subject body').lean() as any;
    if (saved && (saved.subject?.trim() || saved.body?.trim())) {
      return { subject: saved.subject || '', body: saved.body || '' };
    }
  } catch (e) {
    console.error('[email] template lookup failed:', id, e);
  }
  return { subject: fallback.subject, body: fallback.body };
}

function fillVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vars[key] ?? '');
}

function bodyToHtml(body: string): string {
  return body
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font:15px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#1a1a1a;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`,
    )
    .join('');
}

/** Returns null when the template has no subject or body, so nothing gets sent. */
export async function renderEmailTemplate(
  id: EmailTemplateId,
  vars: Record<string, string>,
): Promise<{ subject: string; html: string; text: string } | null> {
  const copy = await getEmailTemplateCopy(id);
  if (!copy.subject.trim() || !copy.body.trim()) return null;

  const subject = fillVars(copy.subject, vars).trim();
  const text = fillVars(copy.body, vars).trim();
  if (!subject || !text) return null;

  return { subject, html: bodyToHtml(text), text };
}
