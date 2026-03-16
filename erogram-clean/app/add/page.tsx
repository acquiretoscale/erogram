import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AddClient from './AddClient';
import { filterCategories, filterCountries } from '@/app/groups/constants';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

const canonicalBase = 'https://erogram.pro';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);
  return {
    title: dict.meta.addTitle,
    description: dict.meta.addDesc,
    alternates: {
      canonical: `${canonicalBase}${pathname}`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `${canonicalBase}${localePath('/add', l)}`])),
    },
  };
}

export default function AddPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <AddClient categories={filterCategories} countries={filterCountries} />
    </div>
  );
}
