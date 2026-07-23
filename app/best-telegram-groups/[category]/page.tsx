import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FallbackImage from '@/components/FallbackImage';
import connectDB from '@/lib/db/mongodb';
import { Group, BestGroupPick } from '@/lib/models';
import { categories, categorySlug, categoryFromSlug } from '@/app/groups/constants';
import { bestTgCategoryFromPublicSegment } from '@/lib/bestTelegramGroups/btgUrls';
import Navbar from '@/components/Navbar';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';
import { getKeywordPlacementCampaigns } from '@/lib/actions/campaigns';
import BestGroupsAds from '@/app/best-telegram-groups/BestGroupsAds';
import BestGroupRankCard from '@/app/best-telegram-groups/BestGroupRankCard';
import { buildSocialMeta } from '@/lib/seo/socialMeta';
import { getMetaDescription } from '@/lib/bestTelegramGroups/metaDescriptions';
import {
  buildTop10Ranking,
  categoryPremiumFilter,
  fetchNichePremiumGroups,
  type Top10GroupDoc,
} from '@/lib/bestTelegramGroups/top10List';
import type { Locale } from '@/lib/i18n';

interface PageProps {
    params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
    await connectDB();
    const counts = await Group.aggregate([
        { $match: { status: 'approved', isAdvertisement: false } },
        { $group: { _id: '$category', n: { $sum: 1 } } },
    ]);
    const active = new Set(counts.map((c: any) => (c._id as string)?.toLowerCase()));
    return categories
        .filter(cat => cat !== 'All' && active.has(cat.toLowerCase()))
        .map((category) => ({ category: categorySlug(category) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const locale = await getLocale();
    const { category } = await params;

    // Find the real category name (matches hyphen slug OR legacy space slug)
    const resolvedSlug = bestTgCategoryFromPublicSegment(category) || category;
    const realCategory = categoryFromSlug(resolvedSlug);

    if (!realCategory) return {};

    // Canonical always uses the hyphenated slug — never %20/spaces.
    const canonicalSlug = categorySlug(realCategory);

    const year = new Date().getFullYear();

    await connectDB();
    const count = await Group.countDocuments({
        category: realCategory,
        status: 'approved',
        isAdvertisement: false,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
    const canonical = `${siteUrl}${localePath(`/best-telegram-groups/${canonicalSlug}`, locale)}`;
    const ogTitle = `10 Best ${realCategory} Telegram Groups (${year})`;
    const l = realCategory.toLowerCase();
    const descFallback = `Discover the top 10 best ${l} Telegram groups and channels in ${year}. Curated, verified list of the most popular and active adult communities.`;
    const descMap: Record<Locale, string> = {
        en: getMetaDescription(canonicalSlug, 'en') || descFallback,
        de: getMetaDescription(canonicalSlug, 'de') || descFallback,
        es: getMetaDescription(canonicalSlug, 'es') || descFallback,
        pt: getMetaDescription(canonicalSlug, 'pt') || descFallback,
    };
    const meta = {
        title: `10 Best ${realCategory} Telegram Groups & Channels (${year})`,
        description: descMap[locale] || descMap.en,
        alternates: {
            canonical,
        },
        ...buildSocialMeta({
            title: ogTitle,
            description: descMap[locale] || descMap.en,
            url: canonical,
            type: 'website',
        }),
    };

    if (count === 0) {
        return {
            ...meta,
            robots: {
                index: false,
                follow: true,
            },
        };
    }

    return meta;
}

export default async function BestGroupsPage({ params }: PageProps) {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    const { category } = await params;
    const year = new Date().getFullYear();
    const localeMap: Record<string, string> = { en: 'en-US', de: 'de-DE', es: 'es-ES' };
    const month = new Date().toLocaleString(localeMap[locale] || 'en-US', { month: 'long' });

    // Find the real category name (matches hyphen slug OR legacy space slug)
    const resolvedSlug = bestTgCategoryFromPublicSegment(category) || category;
    const realCategory = categoryFromSlug(resolvedSlug);

    // Validate category
    if (!realCategory) {
        notFound();
    }

    const decodedSlug = realCategory.toLowerCase();

    await connectDB();

    // 1. Fetch admin-curated picks for this category (up to 10)
    const curatedPicks = await BestGroupPick.find({
        targetType: 'category',
        targetValue: realCategory,
    })
        .sort({ position: 1 })
        .populate({
            path: 'group',
            match: { status: 'approved', premiumOnly: { $ne: true } },
        })
        .lean();

    const curatedGroups = curatedPicks
        .filter((p: any) => p.group && p.group.premiumOnly !== true)
        .map((p: any) => ({
            ...p.group,
            _id: p.group._id.toString(),
        })) as Top10GroupDoc[];

    const curatedIds = new Set(curatedGroups.map((g) => g._id));

    // 2. Auto-fill with top-viewed free groups (up to 10 total)
    const rawAutoGroups = await Group.find({
        category: realCategory,
        status: 'approved',
        isAdvertisement: false,
        premiumOnly: { $ne: true },
        _id: { $nin: Array.from(curatedIds) },
    })
        .sort({ views: -1 })
        .limit(Math.max(0, 10 - curatedGroups.length))
        .lean();

    const autoGroups = rawAutoGroups.map((group: any) => ({
        ...group,
        _id: group._id.toString(),
    })) as Top10GroupDoc[];

    const freeGroups = [...curatedGroups, ...autoGroups];
    const premiumGroups = await fetchNichePremiumGroups(categoryPremiumFilter(realCategory), 5);
    const ranking = buildTop10Ranking(freeGroups, premiumGroups);

    // If very few groups overall, show some from other categories
    let otherGroups: any[] = [];
    if (freeGroups.length < 5) {
        const rawOtherGroups = await Group.aggregate([
            {
                $match: {
                    status: 'approved',
                    isAdvertisement: false,
                    premiumOnly: { $ne: true },
                    category: { $ne: realCategory }
                }
            },
            { $sample: { size: 5 } }
        ]);

        otherGroups = rawOtherGroups.map((group: any) => ({
            ...group,
            _id: group._id.toString(),
        }));
    }

    // Ad network: agnostic ads for this Top-10 page (keyword-targeted to this category).
    // Up to 5 → 1 blends in as the top slot, up to 4 fill the mid 4-up block before #6.
    const bestGroupsAds = await getKeywordPlacementCampaigns('best-groups', decodedSlug, 5).catch(() => []);
    const topGroupAd = (bestGroupsAds as any[])[0] || null;
    const midGroupAds = (bestGroupsAds as any[]).slice(1, 5);

    return (
        <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                {/* Article Header */}
                <header className="text-center mb-16">
                    <div className="inline-block px-4 py-1 bg-[#b31b1b]/20 text-[#b31b1b] rounded-full text-sm font-bold mb-4 border border-[#b31b1b]/30">
                        {dict.bestGroups.updated.replace('{month}', month).replace('{year}', String(year))}
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                        {freeGroups.length > 0
                            ? dict.bestGroups.theBest.split('{category}')[0].replace('{count}', String(Math.min(freeGroups.length, 10)))
                            : dict.bestGroups.theBestFallback.split('{category}')[0]}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{realCategory}</span>
                        {dict.bestGroups.theBest.split('{category}')[1] || ''}
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {(() => {
                            const stripped = realCategory.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                            const heroText = Object.entries(dict.bestGroups as any).find(([k]) => k.toLowerCase() === `hero${stripped}`)?.[1] as string | undefined;
                            const text = heroText || dict.bestGroups.lookingFor.replace('{category}', realCategory).replace('{year}', String(year));
                            return text.split(/\*\*(.*?)\*\*/).map((part: string, i: number) =>
                                i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                            );
                        })()}
                    </p>
                </header>

                {/* Main List — order: Premium → Featured ad → #1 free → rest (mid ads before rank 6) */}
                {ranking.length > 0 ? (
                    <div className="space-y-12 mb-20">
                        {ranking.map((entry, index) => {
                            const headIsPremium = ranking[0]?.isPremium;
                            return (
                            <React.Fragment key={`${entry.group._id}-${entry.rank}`}>
                            {index === 0 && !headIsPremium && topGroupAd && (
                                <BestGroupsAds variant="top" ads={[topGroupAd as any]} />
                            )}
                            <BestGroupRankCard
                                entry={entry}
                                joinLabel={`${dict.bestGroups.joinGroup} 🚀`}
                                viewsLabel={dict.common.views}
                                localePath={(path) => localePath(path, locale)}
                                pageCategory={realCategory}
                            />
                            {index === 0 && headIsPremium && topGroupAd && (
                                <BestGroupsAds variant="top" ads={[topGroupAd as any]} />
                            )}
                            {index === 5 && midGroupAds.length > 0 && (
                                <BestGroupsAds variant="grid" ads={midGroupAds as any} />
                            )}
                            </React.Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 mb-20">
                        <p className="text-xl text-gray-400">
                            {dict.bestGroups.curatingMsg}
                        </p>
                    </div>
                )}

                {/* Other Categories Section */}
                {otherGroups.length > 0 && (
                    <div className="mb-20">
                        <h2 className="text-3xl font-bold mb-8 text-center">
                            🔥 {dict.bestGroups.otherCategories}
                        </h2>
                        <div className="space-y-8">
                            {otherGroups.map((group: any) => (
                                <div
                                    key={group._id}
                                    className="glass rounded-2xl p-6 border border-white/5 hover:border-white/20 transition-all"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                                            <FallbackImage
                                                src={(group.image && typeof group.image === 'string' && group.image.startsWith('https://')) ? group.image : (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png')}
                                                alt={group.name}
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-xl font-bold mb-2">
                                                <Link href={localePath(`/${group.slug}`, locale)} className="hover:text-[#b31b1b] transition-colors">
                                                    {group.name}
                                                </Link>
                                            </h3>
                                            <div className="flex gap-2 mb-2">
                                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">
                                                    {group.category}
                                                </span>
                                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">
                                                    {group.views.toLocaleString()} {dict.common.views}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 line-clamp-2">
                                                {group.description}
                                            </p>
                                        </div>
                                        <div className="hidden sm:block">
                                            <a
                                                href={localePath(`/${group.slug}`, locale)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
                                            >
                                                {dict.bestGroups.join}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer CTA */}
                <div className="text-center p-10 glass rounded-3xl border border-white/10">
                    <h3 className="text-2xl font-bold mb-4">{dict.bestGroups.wantMore}</h3>
                    <p className="text-gray-400 mb-8">
                        {dict.bestGroups.wantMoreDesc}
                    </p>
                    <Link
                        href={localePath(`/groups?category=${encodeURIComponent(realCategory)}`, locale)}
                        className="inline-block bg-[#b31b1b] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#c42b2b] transition-colors"
                    >
                        {dict.bestGroups.browseAll}
                    </Link>
                </div>

                {/* Premium CTA */}
                <div className="mt-12 max-w-2xl mx-auto">
                    <p className="text-lg text-gray-400 leading-relaxed">
                        This is not even 10% of what&rsquo;s in{' '}
                        <a
                            href={localePath('/premium', locale)}
                            target="_blank"
                            rel="noopener"
                            className="font-semibold underline decoration-[#ffd700]/40 underline-offset-2"
                            style={{ background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 45%, #fff8b0 60%, #ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                        >
                            EROgram Premium
                        </a>. Over 4,800 groups sorted by niche, unlisted anywhere else, updated weekly. Consider this list the appetizer.{' '}
                        <a
                            href={localePath('/premium', locale)}
                            target="_blank"
                            rel="noopener"
                            className="font-semibold underline decoration-[#ffd700]/40 underline-offset-2"
                            style={{ background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 45%, #fff8b0 60%, #ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                        >
                            Upgrade to Premium
                        </a>{' '}
                        if you want the full menu.
                    </p>
                </div>
            </main>
        </div>
    );
}
