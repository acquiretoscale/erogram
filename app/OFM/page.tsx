'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CategoryCount = { _id: string; count: number };
type TopCreator = { _id: string; name: string; username: string; subscriberCount: number; avatar: string; isFree: boolean; price: number };
type Stats = {
  total: number;
  freeCount: number;
  paidCount: number;
  verifiedCount: number;
  recentlyScrapped: number;
  categoryCounts: CategoryCount[];
  topBySubscribers: TopCreator[];
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
      <div className={`text-3xl font-black mb-1 ${color || 'text-white'}`}>{value}</div>
      <div className="text-sm font-semibold text-white/70">{label}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function OFMOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/OFM/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00AFF0]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Overview</h1>
          <p className="text-white/40 text-sm mt-0.5">OnlyFans creator database stats</p>
        </div>
        <div className="flex gap-2">
          <Link href="/OFM/scrape" className="px-4 py-2 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition shadow-sm shadow-[#00AFF0]/20">
            + Scrape
          </Link>
          <Link href="/OFM/creators" className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-white/80 text-sm font-semibold rounded-xl transition">
            View All
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Creators" value={stats?.total?.toLocaleString() ?? 0} color="text-[#00AFF0]" />
        <StatCard label="Free Accounts" value={stats?.freeCount?.toLocaleString() ?? 0} sub={`${stats ? Math.round((stats.freeCount / Math.max(stats.total, 1)) * 100) : 0}% of total`} color="text-emerald-400" />
        <StatCard label="Paid Accounts" value={stats?.paidCount?.toLocaleString() ?? 0} color="text-amber-400" />
        <StatCard label="Scraped Last 24h" value={stats?.recentlyScrapped?.toLocaleString() ?? 0} color="text-violet-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top creators */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Top Creators by Subscribers</h2>
          {stats?.topBySubscribers && stats.topBySubscribers.length > 0 ? (
            <div className="space-y-3">
              {stats.topBySubscribers.map((c, i) => (
                <div key={c._id} className="flex items-center gap-3">
                  <div className="text-white/20 text-xs font-bold w-4">{i + 1}</div>
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full object-cover bg-white/5" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center text-[#00AFF0] text-xs font-bold">
                      {c.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{c.name}</div>
                    <div className="text-xs text-white/30">@{c.username}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white/60">{c.subscriberCount > 0 ? c.subscriberCount.toLocaleString() : '—'}</div>
                    <div className={`text-[10px] ${c.isFree ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {c.isFree ? 'Free' : `$${c.price}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/20 text-sm">No creators yet. Start scraping!</p>
          )}
        </div>

        {/* Categories breakdown */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Creators per Category</h2>
          {stats?.categoryCounts && stats.categoryCounts.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {stats.categoryCounts.map((c) => {
                const pct = stats.total > 0 ? Math.round((c.count / stats.total) * 100) : 0;
                return (
                  <div key={c._id} className="flex items-center gap-3">
                    <div className="text-xs text-white/50 capitalize w-24 truncate">{c._id || 'uncategorised'}</div>
                    <div className="flex-1 bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-[#00AFF0] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-white/40 w-12 text-right">{c.count.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/20 text-sm">No categories yet.</p>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { href: '/OFM/creators', label: 'Manage Creators', desc: 'Browse, edit, delete', icon: '👥' },
          { href: '/OFM/scrape', label: 'Scrape Data', desc: 'Pull from OnlyFans', icon: '🔄' },
          { href: '/onlyfans-search', label: 'View Public Page', desc: 'See live search page', icon: '🌐' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-[#00AFF0]/20 rounded-2xl p-4 transition group"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-sm font-bold text-white group-hover:text-[#00AFF0] transition">{item.label}</div>
            <div className="text-xs text-white/30 mt-0.5">{item.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
