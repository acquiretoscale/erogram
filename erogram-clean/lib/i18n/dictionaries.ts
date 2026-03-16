import type { Locale } from './config';

const dictionaries: Record<Locale, () => Promise<Record<string, any>>> = {
  en: () => import('./locales/en.json').then((m) => m.default),
  de: () => import('./locales/de.json').then((m) => m.default),
  es: () => import('./locales/es.json').then((m) => m.default),
};

/** Load the full dictionary for a locale (lazy, tree-shakeable). */
export async function getDictionary(locale: Locale): Promise<Record<string, any>> {
  const loader = dictionaries[locale] ?? dictionaries.en;
  return loader();
}
