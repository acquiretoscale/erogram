import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { categories } from '@/app/groups/constants';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';

const canonicalBase = 'https://erogram.pro';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const pathname = await getPathname();
    const dict = await getDictionary(locale);
    return {
        title: dict.meta.bestGroupsIndexTitle,
        description: dict.meta.bestGroupsIndexDesc,
        alternates: {
            canonical: `${canonicalBase}${pathname}`,
            languages: Object.fromEntries(LOCALES.map(l => [l, `${canonicalBase}${localePath('/best-telegram-groups', l)}`])),
        },
    };
}

export default async function BestGroupsIndexPage() {
    const locale = await getLocale();
    const dict = await getDictionary(locale);

    await connectDB();

    // Get categories with at least 1 approved group
    const categoryCounts = await Group.aggregate([
        { $match: { status: 'approved', premiumOnly: { $ne: true } } },
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
                        {dict.bestGroups.curatedTitle} <span className="gradient-text">{dict.bestGroups.topLists}</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        {dict.bestGroups.indexDesc}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {sortedCategories.map((category) => (
                        <Link
                            key={category}
                            href={localePath(`/best-telegram-groups/${category.toLowerCase()}`, locale)}
                            className="glass p-6 rounded-2xl hover-glow transition-all duration-300 group border border-white/5 hover:border-white/20"
                        >
                            <h2 className="text-xl font-bold mb-2 group-hover:text-[#b31b1b] transition-colors">
                                {dict.bestGroups.bestCategory.replace('{category}', category)}
                            </h2>
                            <p className="text-sm text-gray-400">
                                {dict.bestGroups.top10.replace('{category}', category)}
                            </p>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
