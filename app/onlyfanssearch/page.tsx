import type { Metadata } from 'next';
import { mainOfMeta } from '@/app/ofsearch/ofMeta';
import { getLocale } from '@/lib/i18n/server';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import OnlyFansSearchStaticShell from './OnlyFansSearchStaticShell';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const base = mainOfMeta(locale);
  const url = `${CANONICAL_BASE}/onlyfanssearch`;
  const title = typeof base.title === 'string' ? base.title : 'OFsearch';
  const description = typeof base.description === 'string' ? base.description : '';

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    ...buildSocialMeta({
      title,
      description,
      url,
    }),
  };
}

export default function OnlyFansSearchDecoyPage() {
  return <OnlyFansSearchStaticShell />;
}
