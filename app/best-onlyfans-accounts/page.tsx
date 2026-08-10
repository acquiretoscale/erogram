import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, localePath } from '@/lib/i18n';
import { buildSocialMeta, buildMetadataAlternates, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { ofCategoryPublicPath } from '@/lib/bestOnlyfansAccounts/boaUrls';
import BestEditorialSeo from '@/app/best-onlyfans-accounts/BestEditorialSeo';

export const revalidate = 300;

const canonicalBase = CANONICAL_BASE;
const CREAM = '#F7F4EC';
const PLUM = '#2B1B28';
const MUTED = '#6B6568';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const pathname = await getPathname();
    const dict = await getDictionary(locale);
    const alternates = buildMetadataAlternates(pathname, locale);
    const canonical = alternates?.canonical?.toString() || `${CANONICAL_BASE}${pathname}`;

    return {
        title: dict.meta.bestOnlyfansIndexTitle,
        description: dict.meta.bestOnlyfansIndexDesc,
        alternates,
        ...buildSocialMeta({
            title: dict.meta.bestOnlyfansIndexTitle,
            description: dict.meta.bestOnlyfansIndexDesc,
            url: canonical,
            type: 'website',
        }),
    };
}

export default async function BestOnlyfansIndexPage() {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    return (
        <div className="min-h-screen font-[family-name:var(--font-baloo)]" style={{ backgroundColor: CREAM, color: PLUM }}>
            <Navbar variant="onlyfans" />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20">
                <div className="text-center mb-10 sm:mb-12">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 rounded-full bg-[#00AFF0]/10 text-[#00AFF0] text-[11px] font-bold uppercase tracking-widest border border-[#00AFF0]/20">
                        Updated Daily
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 leading-tight tracking-tight">
                        {dict.bestOnlyfans.curatedTitle}{' '}
                        <span className="text-[#00AFF0]">{dict.bestOnlyfans.topLists}</span>
                    </h1>
                    <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: MUTED }}>
                        {dict.bestOnlyfans.indexDesc}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {OF_CATEGORIES.map((cat) => (
                        <Link
                            key={cat.slug}
                            href={localePath(ofCategoryPublicPath(cat.slug, locale), locale)}
                            className="group flex items-center gap-4 p-4 rounded-2xl border border-[rgba(43,27,40,0.08)] bg-white transition-colors hover:border-[#00AFF0]/35"
                        >
                            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-[#00AFF0] bg-[#00AFF0]/10">
                                {cat.name.charAt(0)}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-extrabold leading-tight truncate group-hover:text-[#00AFF0] transition-colors">
                                    {cat.name} <span style={{ color: MUTED }}>OnlyFans</span>
                                </h2>
                                <p className="text-xs mt-0.5" style={{ color: MUTED }}>Top 10 ranked creators</p>
                            </div>

                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-30 group-hover:text-[#00AFF0] group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </Link>
                    ))}
                </div>

                <BestEditorialSeo locale={locale} />
            </main>
            <Footer />
        </div>
    );
}
