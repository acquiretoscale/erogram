import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const DESTINATION = 'https://joiai.com?utm_source=erogram.pro&utm_medium=referral';

export const metadata: Metadata = {
  title: 'JOI AI — Erogram',
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title: 'JOI AI — Erogram',
    description: 'Try JOI AI on Erogram.',
    url: `${CANONICAL_BASE}/go/joi-ai`,
    type: 'website',
  }),
};

export default function GoJoiAiPage() {
  redirect(DESTINATION);
}
