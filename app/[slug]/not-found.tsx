import Link from 'next/link';
import { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { Group, OnlyFansCreator } from '@/lib/models';

export const metadata: Metadata = {
  title: 'Not Found | Erogram',
};

async function getTopGroups() {
  try {
    await connectDB();
    const groups = await Group.find({
      status: 'approved',
      image: { $nin: [null, ''] },
      isAdvertisement: { $ne: true },
    })
      .sort({ memberCount: -1 })
      .limit(6)
      .select('name slug image category memberCount')
      .lean();

    return (groups as any[]).map((g) => ({
      _id: g._id.toString(),
      name: g.name || '',
      slug: g.slug || '',
      image: g.image || '',
      category: g.category || '',
      memberCount: g.memberCount || 0,
    }));
  } catch {
    return [];
  }
}

async function getTopCreators() {
  try {
    await connectDB();
    const creators = await OnlyFansCreator.find({
      gender: 'female',
      avatar: { $ne: '' },
      deleted: { $ne: true },
      adminImported: true,
    })
      .sort({ clicks: -1, likesCount: -1 })
      .limit(6)
      .select('name username slug avatar url price isFree likesCount')
      .lean();

    return (creators as any[]).map((c) => ({
      _id: c._id.toString(),
      name: c.name || '',
      username: c.username || '',
      slug: c.slug || '',
      avatar: c.avatar || '',
      url: c.url || '',
      price: c.price || 0,
      isFree: c.isFree || false,
      likesCount: c.likesCount || 0,
    }));
  } catch {
    return [];
  }
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}K`;
}

export default async function NotFound() {
  const [groups, creators] = await Promise.all([
    getTopGroups(),
    getTopCreators(),
  ]);

  return (
    <div className="min-h-screen w-full bg-[#111111] text-[#f5f5f5]">
      <div className="w-full max-w-2xl mx-auto px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔍</div>
          <h1 className="text-xl sm:text-2xl font-black mb-1">Page Not Found</h1>
          <p className="text-white/40 text-xs sm:text-sm">
            This page doesn&apos;t exist, but there&apos;s plenty to explore.
          </p>
        </div>

        {/* Stacked sections — full width, no wasted space */}
        <div className="space-y-4">
          {/* Telegram Groups */}
          {groups.length > 0 && (
            <section className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💬</span>
                  <h2 className="text-sm font-black text-white/90">Top Telegram Groups</h2>
                </div>
                <Link href="/groups" className="text-[11px] font-bold text-[#00AFF0] hover:text-white transition">
                  View all →
                </Link>
              </div>
              <div className="space-y-0.5">
                {groups.map((g) => (
                  <Link
                    key={g._id}
                    href={`/${g.slug}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0">
                      {g.image ? (
                        <img src={g.image} alt={g.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-black text-white/10">
                          {g.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-bold text-white truncate group-hover:text-[#00AFF0] transition-colors">
                        {g.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                        <span className="capitalize">{g.category}</span>
                        {g.memberCount > 0 && (
                          <>
                            <span>·</span>
                            <span>{formatCount(g.memberCount)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/groups"
                className="block mt-2.5 w-full text-center py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Browse All Telegram Groups
              </Link>
            </section>
          )}

          {/* OnlyFans Creators */}
          {creators.length > 0 && (
            <section className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔥</span>
                  <h2 className="text-sm font-black text-white/90">Top OnlyFans Creators</h2>
                </div>
                <Link href="/onlyfanssearch" className="text-[11px] font-bold text-[#00AFF0] hover:text-white transition">
                  View all →
                </Link>
              </div>
              <div className="space-y-0.5">
                {creators.map((c) => (
                  <a
                    key={c._id}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/10">
                          {c.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[13px] font-bold text-white truncate group-hover:text-[#00AFF0] transition-colors">
                          {c.name}
                        </h3>
                        <span className={`flex-shrink-0 px-1 py-px rounded text-[8px] font-extrabold uppercase ${
                          c.isFree ? 'bg-emerald-400/20 text-emerald-400' : 'bg-[#00AFF0]/20 text-[#00AFF0]'
                        }`}>
                          {c.isFree ? 'Free' : `$${c.price}`}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#00AFF0]/60">@{c.username}</p>
                    </div>
                  </a>
                ))}
              </div>
              <Link
                href="/onlyfanssearch"
                className="block mt-2.5 w-full text-center py-2.5 bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] hover:from-[#009ADB] hover:to-[#00BFE8] text-white font-bold text-xs rounded-xl transition-all"
              >
                Search OnlyFans Creators
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
