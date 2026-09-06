import { cookies } from 'next/headers';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getVisitorCountriesForAds } from '@/lib/adGeo';

/** Server components: real IP country (cookie) + site version (/de/) for geo-restricted ads. */
export async function getServerVisitorCountries(): Promise<string[]> {
  const cookieStore = await cookies();
  const [locale, pathname] = await Promise.all([getLocale(), getPathname()]);
  return getVisitorCountriesForAds({
    ipCountry: cookieStore.get('__ero_cc')?.value,
    locale,
    pathname,
  });
}
