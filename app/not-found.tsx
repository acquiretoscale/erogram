import Link from 'next/link';
import connectDB from '@/lib/db/mongodb';
import { Group, OnlyFansCreator } from '@/lib/models';
import Navbar from '@/components/Navbar';

async function getTopGroups() {
  try {
    await connectDB();
    const groups = await Group.find({
      status: 'approved',
      image: { $nin: [null, ''] },
      isAdvertisement: { $ne: true },
    })
      .sort({ memberCount: -1 })
      .limit(8)
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
    })
      .sort({ clicks: -1, likesCount: -1 })
      .limit(8)
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
  return String(n);
}

export default async function NotFound() {
  const [groups, creators] = await Promise.all([
    getTopGroups(),
    getTopCreators(),
  ]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-3">
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Page Not Found</h2>
          <p className="text-gray-400 text-sm">
            This page doesn&apos;t exist, but there&apos;s plenty to explore.
          </p>
        </div>

        {/* Two columns side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Telegram Groups block */}
          {groups.length > 0 && (
            <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">💬</span>
                  <h2 className="text-sm sm:text-base font-black text-white/90">Top Telegram Groups</h2>
                </div>
                <Link href="/groups" className="text-xs font-bold text-[#00AFF0] hover:text-white transition">
                  All →
                </Link>
              </div>
              <div className="space-y-1.5">
                {groups.map((g) => (
                  <Link
                    key={g._id}
                    href={`/${g.slug}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0">
                      {g.image ? (
                        <img src={g.image} alt={g.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-black text-white/10">
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
                className="block mt-3 w-full text-center py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                Browse All Telegram Groups
              </Link>
            </section>
          )}

          {/* OnlyFans Creators block */}
          {creators.length > 0 && (
            <section className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <h2 className="text-sm sm:text-base font-black text-white/90">Top OnlyFans Creators</h2>
                </div>
                <Link href="/onlyfans-search" className="text-xs font-bold text-[#00AFF0] hover:text-white transition">
                  All →
                </Link>
              </div>
              <div className="space-y-1.5">
                {creators.map((c) => (
                  <a
                    key={c._id}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/10">
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
                href="/onlyfans-search"
                className="block mt-3 w-full text-center py-2.5 bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] hover:from-[#009ADB] hover:to-[#00BFE8] text-white font-bold text-xs rounded-xl transition-all"
              >
                Search OnlyFans Creators
              </Link>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
