import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { categories } from '@/app/groups/constants';

import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';

export const metadata: Metadata = {
    title: 'Best Telegram Groups Lists – Erogram',
    description: 'Browse our curated lists of the best Telegram groups and channels by category. Find the top communities for every interest.',
    alternates: {
        canonical: '/best-telegram-groups',
    },
};

export default async function BestGroupsIndexPage() {
    await connectDB();

    // Get categories with at least 1 approved group
    const categoryCounts = await Group.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const activeCategories = new Set(categoryCounts.map(c => c._id));

    const sortedCategories = categories
        .filter(c => c !== 'All' && activeCategories.has(c))
        .sort();

    return (
        <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
                        Curated <span className="gradient-text">Top Lists</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Explore our hand-picked collections of the best Telegram groups and channels for every category.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {sortedCategories.map((category) => (
                        <Link
                            key={category}
                            href={`/best-telegram-groups/${category.toLowerCase()}`}
                            className="glass p-6 rounded-2xl hover-glow transition-all duration-300 group border border-white/5 hover:border-white/20"
                        >
                            <h2 className="text-xl font-bold mb-2 group-hover:text-[#b31b1b] transition-colors">
                                Best {category} Groups
                            </h2>
                            <p className="text-sm text-gray-400">
                                Top 10 {category} communities
                            </p>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
