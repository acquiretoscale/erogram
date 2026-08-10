import type { Metadata } from 'next';
import PartnersClient from './PartnersClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Partners | Erogram.pro';
const description = 'Link exchange partners on Erogram.pro.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/partners` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/partners`,
    type: 'website',
  }),
};

export default function PartnersPage() {
  return <PartnersClient />;
}
