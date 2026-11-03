import { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import CopyrightClient from './CopyrightClient';

const title = 'Copyright & Takedown Policy – erogramx.com';
const description =
  'Copyright & Takedown Policy for erogramx.com. How to submit a DMCA notice and how Erogram handles copyright claims.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/copyright` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/copyright`,
    type: 'website',
  }),
};

export default function CopyrightPage() {
  return <CopyrightClient />;
}
