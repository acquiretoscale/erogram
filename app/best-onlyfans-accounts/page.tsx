import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

const canonicalBase = 'https://erogram.pro';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const pathname = await getPathname();
    const dict = await getDictionary(locale);
    return {
        title: dict.meta.bestOnlyfansIndexTitle,
        description: dict.meta.bestOnlyfansIndexDesc,
        alternates: {
            canonical: `${canonicalBase}${pathname}`,
            languages: Object.fromEntries(LOCALES.map(l => [l, `${canonicalBase}${localePath('/best-onlyfans-accounts', l)}`])),
        },
    };
}

export default async function BestOnlyfansIndexPage() {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    return (
        <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
            <Navbar variant="onlyfans" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                        {dict.bestOnlyfans.curatedTitle}{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00AFF0] to-[#00D4FF]">{dict.bestOnlyfans.topLists}</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {dict.bestOnlyfans.indexDesc}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {OF_CATEGORIES.map((cat) => (
                        <Link
                            key={cat.slug}
                            href={localePath(`/best-onlyfans-accounts/${cat.slug}`, locale)}
                            className="glass p-6 rounded-2xl hover-glow transition-all duration-300 group border border-white/5 hover:border-[#00AFF0]/30"
                        >
                            <div className="text-2xl mb-2">{cat.emoji}</div>
                            <h2 className="text-xl font-bold mb-2 group-hover:text-[#00AFF0] transition-colors">
                                {dict.bestOnlyfans.bestCategory.replace('{category}', cat.name)}
                            </h2>
                            <p className="text-sm text-gray-400">
                                {dict.bestOnlyfans.top10.replace('{category}', cat.name)}
                            </p>
                        </Link>
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
}
