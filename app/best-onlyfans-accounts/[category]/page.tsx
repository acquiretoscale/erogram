import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OF_CATEGORIES, OF_CATEGORY_MAP } from '@/app/onlyfanssearch/constants';
import { ofCategoryFromPublicSegment } from '@/lib/bestOnlyfansAccounts/boaUrls';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { LOCALES, localePath } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { buildSocialMeta } from '@/lib/seo/socialMeta';
import { getMetaDescription } from '@/lib/bestOnlyfansAccounts/metaDescriptions';
import BestOfPageView from '@/app/best-onlyfans-accounts/BestOfPageView';
import { BEST_OF_PAGE_MAP } from '@/app/best-onlyfans-accounts/bestOfPages';

interface PageProps {
    params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
    return OF_CATEGORIES.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const locale = await getLocale();
    const pathname = await getPathname();
    const { category: slugParam } = await params;
    const slug = ofCategoryFromPublicSegment(slugParam) || slugParam;

    const cat = OF_CATEGORY_MAP.get(slug);
    if (!cat) return {};

    const year = new Date().getFullYear();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

    const label = cat.name;
    const l = label.toLowerCase();
    const titleMap: Record<Locale, string> = {
        en: `10 Best ${label} OnlyFans Accounts & Creators (${year})`,
        de: `Die 10 besten ${label} OnlyFans-Accounts & Creator (${year})`,
        es: `Las 10 mejores cuentas ${label} de OnlyFans (${year})`,
        pt: `As 10 melhores contas ${label} de OnlyFans (${year})`,
    };
    const descMap: Record<Locale, string> = {
        en: getMetaDescription(slug, 'en') || `Searching for girls best ${l} OnlyFans models? Our top 10 best ${l} OnlyFans models are here to deliver exactly what you crave.`,
        de: getMetaDescription(slug, 'de') || `Auf der Suche nach Girls – besten ${l} OnlyFans-Models? Unsere Top 10 der besten ${l} OnlyFans-Models liefern genau das, wonach du dich sehnst.`,
        es: getMetaDescription(slug, 'es') || `¿Buscas chicas, las mejores modelos ${l} de OnlyFans? Nuestro top 10 de las mejores modelos ${l} de OnlyFans te dan justo lo que deseas.`,
        pt: getMetaDescription(slug, 'pt') || `Procurando garotas, as melhores modelos ${l} de OnlyFans? Nosso top 10 das melhores modelos ${l} de OnlyFans entrega exatamente o que você quer.`,
    };
    const ogTitleMap: Record<Locale, string> = {
        en: `10 Best ${label} OnlyFans Accounts (${year})`,
        de: `Die 10 besten ${label} OnlyFans-Accounts (${year})`,
        es: `Las 10 mejores cuentas ${label} de OnlyFans (${year})`,
        pt: `As 10 melhores contas ${label} de OnlyFans (${year})`,
    };

    const canonical = `${siteUrl}${pathname}`;

    return {
        title: titleMap[locale] || titleMap.en,
        description: descMap[locale] || descMap.en,
        alternates: {
            canonical,
        },
        ...buildSocialMeta({
            title: ogTitleMap[locale] || ogTitleMap.en,
            description: descMap[locale] || descMap.en,
            url: canonical,
            type: 'website',
        }),
    };
}

export default async function BestOnlyfansPage({ params }: PageProps) {
    const { category: slugParam } = await params;
    const slug = ofCategoryFromPublicSegment(slugParam) || slugParam;

    // Same template as the Hottest page (hero + body + ads + theme + same prompt/content).
    // URL + metadata preserved; only the body renders via the shared BestOfPageView.
    if (BEST_OF_PAGE_MAP.has(slug)) return <BestOfPageView slug={slug} variant="best" />;

    notFound();
}
