import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FallbackImage from '@/components/FallbackImage';
import connectDB from '@/lib/db/mongodb';
import { Group, BestGroupPick } from '@/lib/models';
import { categories } from '@/app/groups/constants';
import Navbar from '@/components/Navbar';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

interface PageProps {
    params: Promise<{ category: string }>;
}

// Helper to normalize category for URL (lowercase)
const normalizeCategory = (cat: string) => cat.toLowerCase();

export async function generateStaticParams() {
    await connectDB();
    const counts = await Group.aggregate([
        { $match: { status: 'approved', isAdvertisement: false } },
        { $group: { _id: '$category', n: { $sum: 1 } } },
    ]);
    const active = new Set(counts.map((c: any) => (c._id as string)?.toLowerCase()));
    return categories
        .filter(cat => cat !== 'All' && active.has(cat.toLowerCase()))
        .map((category) => ({ category: normalizeCategory(category) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const locale = await getLocale();
    const pathname = await getPathname();
    const { category } = await params;
    const decodedSlug = decodeURIComponent(category).toLowerCase();

    // Find the real category name (case-insensitive match)
    const realCategory = categories.find(c => c.toLowerCase() === decodedSlug);

    if (!realCategory) return {};

    const year = new Date().getFullYear();

    await connectDB();
    const count = await Group.countDocuments({
        category: realCategory,
        status: 'approved',
        isAdvertisement: false,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
    const meta = {
        title: `10 Best ${realCategory} Telegram Groups & Channels (${year})`,
        description: `Discover the top 10 best ${realCategory} Telegram groups and channels in ${year}. Curated, verified list of the most popular and active adult communities. Join free on Erogram.pro.`,
        openGraph: {
            title: `10 Best ${realCategory} Telegram Groups (${year})`,
            description: `Discover the top 10 best ${realCategory} Telegram groups and channels in ${year}. Curated, verified list of the most popular and active adult communities.`,
        },
        alternates: {
            canonical: `${siteUrl}${pathname}`,
            languages: Object.fromEntries(LOCALES.map(l => [l, `${siteUrl}${localePath(`/best-telegram-groups/${decodedSlug}`, l)}`])),
        },
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
    const decodedSlug = decodeURIComponent(category).toLowerCase();
    const year = new Date().getFullYear();
    const localeMap: Record<string, string> = { en: 'en-US', de: 'de-DE', es: 'es-ES' };
    const month = new Date().toLocaleString(localeMap[locale] || 'en-US', { month: 'long' });

    // Find the real category name (case-insensitive match)
    const realCategory = categories.find(c => c.toLowerCase() === decodedSlug);

    // Validate category
    if (!realCategory) {
        notFound();
    }

    await connectDB();

    // 1. Fetch admin-curated picks for this category (up to 10)
    const curatedPicks = await BestGroupPick.find({
        targetType: 'category',
        targetValue: realCategory,
    })
        .sort({ position: 1 })
        .populate({
            path: 'group',
            match: { status: 'approved' },
        })
        .lean();

    const curatedGroups = curatedPicks
        .filter((p: any) => p.group)
        .map((p: any) => ({
            ...p.group,
            _id: p.group._id.toString(),
        }));

    const curatedIds = new Set(curatedGroups.map((g: any) => g._id));

    // 2. Auto-fill with top-viewed groups (5 slots, excluding curated picks)
    const rawAutoGroups = await Group.find({
        category: realCategory,
        status: 'approved',
        isAdvertisement: false,
        premiumOnly: { $ne: true },
        _id: { $nin: Array.from(curatedIds) },
    })
        .sort({ views: -1 })
        .limit(5)
        .lean();

    const autoGroups = rawAutoGroups.map((group: any) => ({
        ...group,
        _id: group._id.toString(),
    }));

    const groups = [...curatedGroups, ...autoGroups];

    // If very few groups overall, show some from other categories
    let otherGroups: any[] = [];
    if (groups.length < 5) {
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
                        {groups.length > 0
                            ? `${dict.bestGroups.theBest.split('{category}')[0].replace('{count}', String(groups.length))}`
                            : `${dict.bestGroups.theBestFallback.split('{category}')[0]}`}<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{realCategory}</span>{dict.bestGroups.theBest.split('{category}')[1] || ''}
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {dict.bestGroups.lookingFor.replace('{category}', realCategory).replace('{year}', String(year))}
                    </p>
                </header>

                {/* Main List */}
                {groups.length > 0 ? (
                    <div className="space-y-12 mb-20">
                        {groups.map((group: any, index: number) => (
                            <div
                                key={group._id}
                                className="glass rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden"
                            >
                                {/* Rank Badge */}
                                <div className="absolute top-0 left-0 bg-[#b31b1b] text-white px-6 py-2 rounded-br-3xl font-black text-xl z-10">
                                    #{index + 1}
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 mt-4">
                                    {/* Image */}
                                    <div className="w-full md:w-1/3 flex-shrink-0">
                                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-800 shadow-2xl">
                                            <FallbackImage
                                                src={(group.image && typeof group.image === 'string' && group.image.startsWith('https://')) ? group.image : (process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png')}
                                                alt={group.name}
                                                className="object-cover hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-grow flex flex-col justify-center">
                                        <h2 className="text-3xl font-bold mb-4 hover:text-[#b31b1b] transition-colors">
                                            <Link href={localePath(`/${group.slug}`, locale)}>{group.name}</Link>
                                        </h2>

                                        <div className="flex flex-wrap gap-3 mb-6">
                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                                                👁️ {group.views.toLocaleString()} {dict.common.views}
                                            </span>
                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                                                🌍 {group.country}
                                            </span>
                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                                                📂 {group.category}
                                            </span>
                                        </div>

                                        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                            {group.description}
                                        </p>

                                        <div className="mt-auto">
                                            <a
                                                href={localePath(`/${group.slug}`, locale)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full md:w-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-900/20"
                                            >
                                                {dict.bestGroups.joinGroup} 🚀
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
            </main>
        </div>
    );
}
