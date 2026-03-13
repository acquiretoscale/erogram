import { Metadata } from 'next';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';
import AboutClient from './AboutClient';

const canonicalBase = 'https://erogram.pro';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.aboutTitle,
    description: dict.meta.aboutDesc,
    alternates: {
      canonical: `${canonicalBase}${pathname}`,
      languages: Object.fromEntries(
        LOCALES.map(l => [l, `${canonicalBase}${localePath('/about', l)}`])
      ),
    },
  };
}

export default function AboutPage() {
  return <AboutClient />;
}
