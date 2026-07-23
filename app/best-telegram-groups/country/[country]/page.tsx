import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FallbackImage from '@/components/FallbackImage';
import connectDB from '@/lib/db/mongodb';
import { Group, BestGroupPick } from '@/lib/models';
import { countries } from '@/app/groups/constants';
import Navbar from '@/components/Navbar';
import BestGroupRankCard from '@/app/best-telegram-groups/BestGroupRankCard';
import { buildSocialMeta } from '@/lib/seo/socialMeta';
import {
  buildTop10Ranking,
  countryPremiumFilter,
  fetchNichePremiumGroups,
  type Top10GroupDoc,
} from '@/lib/bestTelegramGroups/top10List';

interface PageProps {
    params: Promise<{ country: string }>;
}

// Helper to normalize country for URL (lowercase)
const normalizeCountry = (country: string) => country.toLowerCase();

export async function generateStaticParams() {
    await connectDB();
    const counts = await Group.aggregate([
        { $match: { status: 'approved', isAdvertisement: false } },
        { $group: { _id: '$country', n: { $sum: 1 } } },
    ]);
    const active = new Set(counts.map((c: any) => (c._id as string)?.toLowerCase()));
    return countries
        .filter(c => c !== 'All' && active.has(c.toLowerCase()))
        .map((country) => ({ country: normalizeCountry(country) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { country } = await params;
    const decodedSlug = decodeURIComponent(country).toLowerCase();

    // Find the real country name (case-insensitive match)
    const realCountry = countries.find(c => c.toLowerCase() === decodedSlug);

    if (!realCountry) return {};

    const year = new Date().getFullYear();

    await connectDB();
    const count = await Group.countDocuments({
        country: realCountry,
        status: 'approved',
        isAdvertisement: false,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';
    const canonical = `${siteUrl}/best-telegram-groups/country/${decodedSlug}`;
    const ogTitle = `10 Best ${realCountry} Telegram Groups (${year})`;
    const ogDescription = `Discover the top 10 best ${realCountry} Telegram groups and channels in ${year}. Curated, verified list of the most popular and active adult communities in ${realCountry}.`;
    const meta = {
        title: `10 Best ${realCountry} Telegram Groups & Channels (${year})`,
        description: `Discover the top 10 best ${realCountry} Telegram groups and channels in ${year}. Curated, verified list of the most popular and active adult communities in ${realCountry}. Join free on Erogram.pro.`,
        keywords: `${realCountry} telegram groups, ${realCountry} telegram channels, best ${realCountry} groups, telegram links ${realCountry}`,
        alternates: {
            canonical,
        },
        ...buildSocialMeta({
            title: ogTitle,
            description: ogDescription,
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

export default async function BestCountryGroupsPage({ params }: PageProps) {
    const { country } = await params;
    const decodedSlug = decodeURIComponent(country).toLowerCase();
    const year = new Date().getFullYear();
    const month = new Date().toLocaleString('default', { month: 'long' });

    // Find the real country name (case-insensitive match)
    const realCountry = countries.find(c => c.toLowerCase() === decodedSlug);

    // Validate country
    if (!realCountry) {
        notFound();
    }

    await connectDB();

    // 1. Fetch admin-curated picks for this country (up to 10)
    const curatedPicks = await BestGroupPick.find({
        targetType: 'country',
        targetValue: realCountry,
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

    const rawAutoGroups = await Group.find({
        country: realCountry,
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
    const premiumGroups = await fetchNichePremiumGroups(countryPremiumFilter(realCountry), 5);
    const ranking = buildTop10Ranking(freeGroups, premiumGroups);

    // If very few groups overall, show some from other countries
    let otherGroups: any[] = [];
    if (freeGroups.length < 5) {
        const rawOtherGroups = await Group.aggregate([
            {
                $match: {
                    status: 'approved',
                    isAdvertisement: false,
                    premiumOnly: { $ne: true },
                    country: { $ne: realCountry },
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
                        Updated {month} {year}
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                        The {freeGroups.length > 0 ? Math.min(freeGroups.length, 10) : 'Best'} Best <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-500">{realCountry}</span> Telegram Groups
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Looking for the best Telegram communities in <strong>{realCountry}</strong>?
                        We've curated the most popular, active, and highly-rated groups for you to join in {year}.
                    </p>
                </header>

                {/* Main List */}
                {ranking.length > 0 ? (
                    <div className="space-y-12 mb-20">
                        {ranking.map((entry) => (
                            <BestGroupRankCard
                                key={`${entry.group._id}-${entry.rank}`}
                                entry={entry}
                                joinLabel="Join Group 🚀"
                                viewsLabel="Views"
                                localePath={(path) => path}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 mb-20">
                        <p className="text-xl text-gray-400">
                            We are currently curating the best groups for {realCountry}. Check back soon!
                        </p>
                    </div>
                )}

                {/* Other Groups Section */}
                {otherGroups.length > 0 && (
                    <div className="mb-20">
                        <h2 className="text-3xl font-bold mb-8 text-center">
                            🔥 Trending International Groups
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
                                                <Link href={`/${group.slug}`} className="hover:text-[#b31b1b] transition-colors">
                                                    {group.name}
                                                </Link>
                                            </h3>
                                            <div className="flex gap-2 mb-2">
                                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">
                                                    {group.category}
                                                </span>
                                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">
                                                    {group.views.toLocaleString()} Views
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 line-clamp-2">
                                                {group.description}
                                            </p>
                                        </div>
                                        <div className="hidden sm:block">
                                            <a
                                                href={`/${group.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-colors"
                                            >
                                                Join
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
                    <h3 className="text-2xl font-bold mb-4">Want to see more?</h3>
                    <p className="text-gray-400 mb-8">
                        We have thousands of other groups waiting for you.
                    </p>
                    <Link
                        href={`/groups?country=${encodeURIComponent(realCountry)}`}
                        className="inline-block bg-[#b31b1b] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#c42b2b] transition-colors"
                    >
                        Browse All {realCountry} Groups
                    </Link>
                </div>
            </main>
        </div>
    );
}
