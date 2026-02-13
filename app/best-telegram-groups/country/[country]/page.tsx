import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FallbackImage from '@/components/FallbackImage';
import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';
import { countries } from '@/app/groups/constants';
import Navbar from '@/components/Navbar';

interface PageProps {
    params: Promise<{ country: string }>;
}

// Helper to normalize country for URL (lowercase)
const normalizeCountry = (country: string) => country.toLowerCase();

export async function generateStaticParams() {
    return countries.map((country) => ({
        country: normalizeCountry(country),
    }));
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

    const meta = {
        title: `10 Best ${realCountry} Telegram Groups & Channels (${year})`,
        description: `Discover the top 10 best ${realCountry} Telegram groups and channels in ${year}. Curated list of the most popular and active communities in ${realCountry}.`,
        openGraph: {
            title: `10 Best ${realCountry} Telegram Groups (${year})`,
            description: `Join the best ${realCountry} Telegram communities. Ranked by popularity and activity.`,
        },
        keywords: `${realCountry} telegram groups, ${realCountry} telegram channels, best ${realCountry} groups, telegram links ${realCountry}`,
        alternates: {
            canonical: `/best-telegram-groups/country/${decodedSlug}`,
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

    // Fetch top 10 groups for this country
    const rawGroups = await Group.find({
        country: realCountry,
        status: 'approved',
        isAdvertisement: false,
    })
        .sort({ views: -1 })
        .limit(10)
        .lean();

    const groups = rawGroups.map((group: any) => ({
        ...group,
        _id: group._id.toString(),
    }));

    // If fewer than 10 groups, fetch random groups from "All" or other countries to fill the list
    // The user said "most groups are 'all'", so we should probably include 'All' country groups as fallback or mix
    let otherGroups: any[] = [];
    if (groups.length < 10) {
        const rawOtherGroups = await Group.aggregate([
            {
                $match: {
                    status: 'approved',
                    isAdvertisement: false,
                    country: { $ne: realCountry } // Exclude current country
                }
            },
            { $sample: { size: 5 } } // Get 5 random groups
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
                        The {groups.length > 0 ? groups.length : 'Best'} Best <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-500">{realCountry}</span> Telegram Groups
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Looking for the best Telegram communities in <strong>{realCountry}</strong>?
                        We've curated the most popular, active, and highly-rated groups for you to join in {year}.
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
                                                src={group.image || '/assets/image.jpg'}
                                                alt={group.name}
                                                className="object-cover hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-grow flex flex-col justify-center">
                                        <h2 className="text-3xl font-bold mb-4 hover:text-[#b31b1b] transition-colors">
                                            <Link href={`/${group.slug}`}>{group.name}</Link>
                                        </h2>

                                        <div className="flex flex-wrap gap-3 mb-6">
                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                                                👁️ {group.views.toLocaleString()} Views
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
                                                href={`/${group.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full md:w-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-900/20"
                                            >
                                                Join Group 🚀
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
                                                src={group.image || '/assets/image.jpg'}
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
