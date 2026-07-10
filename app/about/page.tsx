import { Metadata } from 'next';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';
import AboutClient from './AboutClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const canonicalBase = CANONICAL_BASE;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);

  const canonical = `${canonicalBase}${pathname}`;

  return {
    title: dict.meta.aboutTitle,
    description: dict.meta.aboutDesc,
    alternates: {
      canonical,
    },
    ...buildSocialMeta({
      title: dict.meta.aboutTitle,
      description: dict.meta.aboutDesc,
      url: canonical,
      type: 'website',
    }),
  };
}

export default function AboutPage() {
  return <AboutClient />;
}
