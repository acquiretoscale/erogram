import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

export const revalidate = 300;

const canonicalBase = 'https://erogram.pro';

async function getCategoryThumbnails(): Promise<Map<string, string>> {
    try {
        await connectDB();
        const slugs = OF_CATEGORIES.map((c) => c.slug);
        const rows = await OnlyFansCreator.aggregate([
            { $match: { gender: 'female', avatar: { $ne: '' }, deleted: { $ne: true }, categories: { $in: slugs } } },
            { $unwind: '$categories' },
            { $match: { categories: { $in: slugs } } },
            { $sort: { clicks: -1 } },
            { $group: { _id: '$categories', avatar: { $first: '$avatar' } } },
        ]);
        return new Map<string, string>((rows as any[]).map((r) => [r._id, r.avatar]));
    } catch {
        return new Map();
    }
}

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
    const thumbs = await getCategoryThumbnails();

    return (
        <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
            <Navbar variant="onlyfans" />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-14">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 rounded-full bg-[#00AFF0]/10 text-[#00AFF0] text-[11px] font-bold uppercase tracking-widest border border-[#00AFF0]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00AFF0] animate-pulse" />
                        Updated Daily
                    </span>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4 leading-tight tracking-tight">
                        {dict.bestOnlyfans.curatedTitle}{' '}
                        <span className="text-[#00AFF0]">{dict.bestOnlyfans.topLists}</span>
                    </h1>
                    <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto">
                        {dict.bestOnlyfans.indexDesc}
                    </p>
                </div>

                {/* Category grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {OF_CATEGORIES.map((cat) => {
                        const avatar = thumbs.get(cat.slug) || '';
                        return (
                            <Link
                                key={cat.slug}
                                href={localePath(`/best-onlyfans-accounts/${cat.slug}`, locale)}
                                className="group flex items-center gap-4 p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-[#00AFF0]/50 hover:bg-[#00AFF0]/[0.05] transition-all duration-200"
                            >
                                {/* Icon-sized creator thumbnail (decorative) */}
                                <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-[#1a1a1a] ring-2 ring-white/10 group-hover:ring-[#00AFF0]/40 transition-all">
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt=""
                                            aria-hidden="true"
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            width={56}
                                            height={56}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#00AFF0]/50 text-lg font-black">
                                            {cat.name.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                {/* Big, fast-readable category name */}
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg sm:text-xl font-extrabold leading-tight truncate group-hover:text-[#00AFF0] transition-colors">
                                        {cat.name} <span className="text-white/40 font-bold">OnlyFans</span>
                                    </h2>
                                    <p className="text-xs text-white/40 mt-0.5">Top 10 ranked creators</p>
                                </div>

                                {/* Arrow affordance */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-white/20 group-hover:text-[#00AFF0] group-hover:translate-x-0.5 transition-all"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </Link>
                        );
                    })}
                </div>
            </main>
            <Footer />
        </div>
    );
}
