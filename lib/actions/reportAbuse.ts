'use server';

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.CONTACT_EMAIL || 'isabella@erogram.biz';
const FROM_EMAIL = 'Erogram Report Abuse <onboarding@resend.dev>';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function submitAbuseReport(data: {
  violationType: string;
  contentType: string;
  url?: string;
  description: string;
  email?: string;
}) {
  const description = (data.description || '').trim();
  const url = (data.url || '').trim().slice(0, 500);
  const email = (data.email || '').trim().slice(0, 200);

  if (!data.violationType || !data.contentType || !description) {
    return { success: false, error: 'Please fill in all required fields.' };
  }
  if (description.length > 5000) {
    return { success: false, error: 'Description is too long (max 5000 characters).' };
  }
  if (!RESEND_API_KEY) {
    return { success: false, error: 'Report form is not configured. Please email support@erogram.biz directly.' };
  }

  const resend = new Resend(RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [TO_EMAIL],
    ...(email ? { replyTo: email } : {}),
    subject: `[Erogram Report Abuse] ${data.violationType}`,
    html: [
      `<p><strong>Violation type:</strong> ${escapeHtml(data.violationType)}</p>`,
      `<p><strong>Content type:</strong> ${escapeHtml(data.contentType)}</p>`,
      url ? `<p><strong>URL:</strong> <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>` : '',
      email ? `<p><strong>Reporter email:</strong> ${escapeHtml(email)}</p>` : '<p><strong>Reporter email:</strong> (not provided)</p>',
      `<hr/><p><strong>Description:</strong></p><pre style="white-space:pre-wrap;font-family:monospace;background:#f5f5f5;padding:12px;border-radius:8px;">${escapeHtml(description)}</pre>`,
    ].join(''),
  });

  if (error) {
    console.error('[report-abuse] Resend error:', error);
    return { success: false, error: 'Failed to send report. Please try again or email support@erogram.biz directly.' };
  }

  return { success: true };
}
