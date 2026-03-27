import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, TrendingOFCreator } from '@/lib/models';
import Navbar from '@/components/Navbar';
import { OF_CATEGORIES, OF_CATEGORY_MAP, ofCategoryUrl } from '@/app/onlyfanssearch/constants';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

interface PageProps {
    params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
    return OF_CATEGORIES.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const locale = await getLocale();
    const pathname = await getPathname();
    const { category: slug } = await params;

    const cat = OF_CATEGORY_MAP.get(slug);
    if (!cat) return {};

    const year = new Date().getFullYear();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

    return {
        title: `10 Best ${cat.name} OnlyFans Accounts & Creators (${year})`,
        description: `Discover the top 10 best ${cat.name} OnlyFans accounts and creators in ${year}. Curated, verified ranking of the most popular ${cat.name.toLowerCase()} OnlyFans profiles — updated daily on Erogram.`,
        openGraph: {
            title: `10 Best ${cat.name} OnlyFans Accounts (${year})`,
            description: `Discover the top 10 best ${cat.name} OnlyFans accounts and creators in ${year}. Curated, verified ranking of the most popular ${cat.name.toLowerCase()} profiles.`,
        },
        alternates: {
            canonical: `${siteUrl}${pathname}`,
            languages: Object.fromEntries(LOCALES.map(l => [l, `${siteUrl}${localePath(`/best-onlyfans-accounts/${slug}`, l)}`])),
        },
    };
}

export default async function BestOnlyfansPage({ params }: PageProps) {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    const { category: slug } = await params;
    const year = new Date().getFullYear();
    const localeMap: Record<string, string> = { en: 'en-US', de: 'de-DE', es: 'es-ES' };
    const month = new Date().toLocaleString(localeMap[locale] || 'en-US', { month: 'long' });

    const cat = OF_CATEGORY_MAP.get(slug);
    if (!cat) notFound();

    const label = cat.name;

    await connectDB();

    const baseMatch = { categories: slug, gender: 'female', avatar: { $ne: '' } };

    const [topByClicks, trendingRaw] = await Promise.all([
        OnlyFansCreator.find({ ...baseMatch, clicks: { $gt: 0 } })
            .sort({ clicks: -1 })
            .limit(10)
            .select('_id name username slug avatar likesCount mediaCount photosCount videosCount price isFree url clicks')
            .lean(),
        TrendingOFCreator.find({ active: true, categories: slug })
            .sort({ position: 1 })
            .limit(3)
            .lean(),
    ]);

    const usedUsernames = new Set<string>();
    const creators: any[] = [];

    for (const tc of trendingRaw) {
        if (creators.length >= 10) break;
        usedUsernames.add(tc.username);
        creators.push({
            _id: String(tc._id),
            name: tc.name || '',
            username: tc.username || '',
            avatar: tc.avatar || '',
            likesCount: 0,
            mediaCount: 0,
            photosCount: 0,
            videosCount: 0,
            price: 0,
            isFree: false,
            url: tc.url || '',
            isTrending: true,
        });
    }

    for (const c of topByClicks) {
        if (creators.length >= 10) break;
        if (usedUsernames.has(c.username)) continue;
        usedUsernames.add(c.username);
        creators.push({
            _id: (c._id as any).toString(),
            name: c.name || '',
            username: c.username || '',
            avatar: c.avatar || '',
            likesCount: c.likesCount || 0,
            mediaCount: c.mediaCount || 0,
            photosCount: c.photosCount || 0,
            videosCount: c.videosCount || 0,
            price: c.price || 0,
            isFree: c.isFree || false,
            url: c.url || '',
            isTrending: false,
        });
    }

    if (creators.length < 10) {
        const fillCreators = await OnlyFansCreator.find({
            ...baseMatch,
            username: { $nin: Array.from(usedUsernames) },
        })
            .sort({ likesCount: -1 })
            .limit(10 - creators.length)
            .select('_id name username avatar likesCount mediaCount photosCount videosCount price isFree url')
            .lean();

        for (const c of fillCreators) {
            creators.push({
                _id: (c._id as any).toString(),
                name: c.name || '',
                username: c.username || '',
                avatar: c.avatar || '',
                likesCount: c.likesCount || 0,
                mediaCount: c.mediaCount || 0,
                photosCount: c.photosCount || 0,
                videosCount: c.videosCount || 0,
                price: c.price || 0,
                isFree: c.isFree || false,
                url: c.url || '',
                isTrending: false,
            });
        }
    }

    const RANK_BADGE: Record<number, string> = {
        1: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30',
        2: 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-lg shadow-slate-400/20',
        3: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/20',
    };

    return (
        <div className="min-h-screen bg-[#0e0e0e] text-[#f5f5f5]">
            <Navbar variant="onlyfans" />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16">

                {/* Header */}
                <header className="mb-6 pt-4">
                    <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-2">
                        {creators.length > 0
                            ? dict.bestOnlyfans.theBest.replace('{count}', String(creators.length)).split('{category}')[0]
                            : dict.bestOnlyfans.theBestFallback.split('{category}')[0]
                        }<span className="text-[#00AFF0]">{label}</span>{dict.bestOnlyfans.theBest.split('{category}')[1] || ''}
                    </h1>
                    <p className="text-sm text-white/40 max-w-xl">
                        {dict.bestOnlyfans.lookingFor.replace('{category}', label).replace('{year}', String(year))}
                    </p>
                </header>

                {/* Updated badge — above the list */}
                <div className="mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#00AFF0]/10 text-[#00AFF0] rounded-full text-[11px] font-bold border border-[#00AFF0]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00AFF0] animate-pulse" />
                        {dict.bestOnlyfans.updated.replace('{month}', month).replace('{year}', String(year))}
                    </span>
                </div>

                {/* Ranked List */}
                {creators.length > 0 ? (
                    <ol className="space-y-2 mb-12 list-none p-0">
                        {creators.map((creator: any, index: number) => {
                            const rank = index + 1;
                            const isTop3 = rank <= 3;
                            const rankBadge = RANK_BADGE[rank] ?? 'bg-white/[0.08] text-white/50 border border-white/10';

                            return (
                                <li key={creator._id}>
                                    <article className={`group relative rounded-xl border transition-all duration-200 bg-white ${
                                        rank === 1
                                            ? 'border-amber-400/60 shadow-md shadow-amber-100'
                                            : isTop3
                                            ? 'border-gray-200 shadow-sm'
                                            : 'border-gray-200'
                                    }`}>
                                        <a
                                            href={creator.url}
                                            target="_blank"
                                            rel="noopener noreferrer nofollow sponsored"
                                            className="flex items-start gap-3 p-3 sm:p-3.5"
                                        >
                                            {/* Rank badge */}
                                            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black ${rankBadge}`}>
                                                {rank}
                                            </span>

                                            {/* Avatar */}
                                            <div className={`flex-shrink-0 w-36 h-44 sm:w-44 sm:h-56 rounded-xl overflow-hidden bg-gray-800 ${
                                                creator.isTrending ? 'ring-2 ring-orange-500/50' : isTop3 ? 'ring-1 ring-[#00AFF0]/30' : ''
                                            }`}>
                                                {creator.avatar ? (
                                                    <img
                                                        src={creator.avatar}
                                                        alt={`${creator.name} OnlyFans`}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        loading={index < 4 ? 'eager' : 'lazy'}
                                                        width={176}
                                                        height={224}
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/20 bg-gradient-to-br from-gray-800 to-gray-900">
                                                        {creator.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h2 className="font-bold text-sm sm:text-[15px] text-gray-900 group-hover:text-[#00AFF0] transition-colors truncate leading-tight">
                                                        {creator.name}
                                                    </h2>
                                                    {creator.isTrending && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-black uppercase tracking-wide flex-shrink-0">
                                                            🔥 Hot
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-[#00AFF0] leading-none mt-0.5">@{creator.username}</p>

                                                {(() => {
                                                    const likes = creator.likesCount || 0;
                                                    const photos = creator.photosCount || 0;
                                                    const videos = creator.videosCount || 0;
                                                    const media = creator.mediaCount || 0;
                                                    // same logic as formatCount used across the app
                                                    const fmt = (n: number) => {
                                                        if (!n) return '0';
                                                        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                                                        if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
                                                        return `${n}K`;
                                                    };
                                                    return (
                                                        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                                                            {likes > 0 && (
                                                                <span className="flex items-center gap-1 text-xs font-semibold text-rose-400">
                                                                    ❤️ {fmt(likes)} likes
                                                                </span>
                                                            )}
                                                            {photos > 0 ? (
                                                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                                    📸 {fmt(photos)} photos
                                                                </span>
                                                            ) : media > 0 && videos === 0 ? (
                                                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                                    📸 {fmt(media)} photos
                                                                </span>
                                                            ) : null}
                                                            {videos > 0 && (
                                                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                                    🎬 {fmt(videos)} videos
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* CTA */}
                                            <span className="flex-shrink-0 px-5 py-3 rounded-xl bg-[#00AFF0] group-hover:bg-[#009ADB] text-white text-sm font-black transition-colors whitespace-nowrap shadow-md shadow-[#00AFF0]/30">
                                                {dict.bestOnlyfans.view} →
                                            </span>
                                        </a>
                                    </article>
                                </li>
                            );
                        })}
                    </ol>
                ) : (
                    <div className="text-center py-12 mb-12 rounded-2xl border border-white/[0.06]">
                        <p className="text-white/30 text-sm">{dict.bestOnlyfans.curatingMsg}</p>
                    </div>
                )}

                {/* FAQ */}
                <div className="mb-10">
                    <h2 className="text-base font-black text-white/50 uppercase tracking-widest mb-4">FAQ</h2>
                    <div className="space-y-2">
                        {(dict.bestOnlyfans.faq as { q: string; a: string }[]).map((item, i) => (
                            <details key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden group" open={i === 0}>
                                <summary className="px-4 py-3 cursor-pointer font-semibold text-sm text-white/70 hover:text-white transition-colors list-none flex items-center justify-between gap-3">
                                    {item.q.replace(/\{category\}/g, label)}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 transition-transform group-open:rotate-180 opacity-40"><path d="M6 9l6 6 6-6"/></svg>
                                </summary>
                                <div className="px-4 pb-3 text-sm text-white/35 leading-relaxed">
                                    {item.a.replace(/\{category\}/g, label.toLowerCase())}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                    <div>
                        <h3 className="font-bold text-sm text-white/80">{dict.bestOnlyfans.wantMore}</h3>
                        <p className="text-xs text-white/30 mt-0.5">{dict.bestOnlyfans.wantMoreDesc}</p>
                    </div>
                    <Link
                        href={localePath(ofCategoryUrl(slug), locale)}
                        className="flex-shrink-0 ml-4 px-4 py-2 rounded-lg bg-[#00AFF0] text-white text-sm font-bold hover:bg-[#009ADB] transition-colors"
                    >
                        {dict.bestOnlyfans.browseAll}
                    </Link>
                </div>
            </main>
        </div>
    );
}
