import type { Metadata } from 'next';
import PartnersClient from './PartnersClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getLinkExchangePartnersPublic } from '@/lib/actions/linkExchangePartners';

const title = 'Partners';
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

export const revalidate = 300;

export default async function PartnersPage() {
  const partners = await getLinkExchangePartnersPublic();
  return <PartnersClient partners={partners} />;
}
