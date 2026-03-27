import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import OFFooter from '@/components/OFFooter';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { OF_CATEGORIES, ofCategoryUrl } from '@/app/onlyfanssearch/constants';

export const revalidate = 3600;

const canonicalBase = 'https://erogram.pro';

export const metadata: Metadata = {
  title: 'Best OnlyFans Creators by Category — Top Accounts 2026',
  description: 'Browse the best OnlyFans creators by category. Find top-rated Asian, Blonde, MILF, Teen, Latina, Goth and more OnlyFans accounts — ranked by popularity.',
  alternates: {
    canonical: `${canonicalBase}/best-onlyfans-creators`,
  },
};

interface CategoryPreview {
  slug: string;
  name: string;
  emoji: string;
  count: number;
  topCreators: { avatar: string; name: string }[];
}

export default async function BestOnlyFansCreatorsPage() {
  await connectDB();

  const categoryCounts = await OnlyFansCreator.aggregate([
    { $match: { avatar: { $ne: '' }, gender: 'female' } },
    { $unwind: '$categories' },
    { $group: { _id: '$categories', count: { $sum: 1 } } },
  ]);
  const countMap = new Map<string, number>(categoryCounts.map((c: any) => [c._id, c.count]));

  const previews: CategoryPreview[] = await Promise.all(
    OF_CATEGORIES.map(async (cat) => {
      const top = await OnlyFansCreator.find(
        { categories: cat.slug, avatar: { $ne: '' }, gender: 'female' },
        'name avatar',
      )
        .sort({ clicks: -1 })
        .limit(4)
        .lean() as any[];

      return {
        slug: cat.slug,
        name: cat.name,
        emoji: cat.emoji,
        count: countMap.get(cat.slug) || 0,
        topCreators: top.map((c) => ({ avatar: c.avatar, name: c.name })),
      };
    }),
  );

  const sorted = previews.filter((p) => p.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[#00AFF0] text-sm font-bold uppercase tracking-widest mb-3">OnlyFans Directory</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-5 leading-tight">
            Best OnlyFans{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00AFF0] to-[#00D4FF]">
              Creators
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Browse top-rated OnlyFans accounts by category — ranked by popularity. Find exactly who you&apos;re looking for.
          </p>
          <Link
            href="/onlyfanssearch"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Search All Creators
          </Link>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map((cat) => (
            <Link
              key={cat.slug}
              href={ofCategoryUrl(cat.slug)}
              className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#00AFF0]/40 hover:bg-[#00AFF0]/[0.04] transition-all duration-200 overflow-hidden"
            >
              {/* Avatar strip */}
              {cat.topCreators.length > 0 && (
                <div className="flex h-20 overflow-hidden">
                  {cat.topCreators.map((c, i) => (
                    <div
                      key={i}
                      className="flex-1 relative bg-gray-800"
                      style={{ minWidth: 0 }}
                    >
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#111111]/80" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.emoji}</span>
                    <h2 className="text-base font-black text-white group-hover:text-[#00AFF0] transition-colors">
                      {cat.name} OnlyFans
                    </h2>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-[#00AFF0] transition-colors flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <p className="text-[12px] text-white/40">
                  {cat.count.toLocaleString()} creator{cat.count !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <OFFooter />
    </div>
  );
}
