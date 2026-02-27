'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const STORAGE_KEY = 'erogram_advertiser_token';
const ADVERTISER_KEY = 'erogram_advertiser_data';

interface AdvertiserInfo {
  _id: string;
  name: string;
  email: string;
  company: string;
  logo: string;
}

interface CampaignRow {
  _id: string;
  name: string;
  slot: string;
  slotLabel: string;
  creative: string;
  destinationUrl: string;
  startDate: string;
  endDate: string;
  status: string;
  isVisible: boolean;
  clicks: number;
  impressions: number;
  clicks7d: number;
  clicks30d: number;
  description: string;
  buttonText: string;
  videoUrl: string;
  badgeText: string;
  verified: boolean;
}

interface ArticleRow {
  _id: string;
  title: string;
  slug: string;
  views: number;
  status: string;
  publishedAt: string;
}

interface FeaturedGroupRow {
  _id: string;
  name: string;
  slug: string;
  clickCount: number;
  views: number;
  image: string;
}

interface DashboardData {
  advertiser: AdvertiserInfo;
  stats: {
    totalClicks: number;
    totalImpressions: number;
    todayClicks: number;
    clicks7d: number;
    clicks30d: number;
    activeCampaigns: number;
    totalCampaigns: number;
  };
  chartData: { date: string; clicks: number }[];
  campaigns: CampaignRow[];
  articles: ArticleRow[];
  featuredGroups: FeaturedGroupRow[];
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    ended: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    draft: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.ended}`}>
      {status}
    </span>
  );
}

function MiniChart({ data, height = 60 }: { data: { date: string; clicks: number }[]; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.clicks), 1);
  const w = 100;
  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = height - (d.clicks / max) * (height - 4);
    return `${x},${y}`;
  });
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${w},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(245, 158, 11)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGrad)" />
      <path d={linePath} fill="none" stroke="rgb(245, 158, 11)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ── LOGIN GATE ──

function LoginGate({ onLogin }: { onLogin: (token: string, advertiser: AdvertiserInfo) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/advertisers/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        onLogin(data.token, data.advertiser);
      } else {
        setError(data.message || 'Access denied');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/[0.03] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Advertiser Portal</h1>
          <p className="text-sm text-gray-500">Access your campaign dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="your@email.com"
              autoFocus
              disabled={submitting}
              className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none disabled:opacity-50 transition-all"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-sm text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm tracking-wide uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Need an advertiser account? Contact{' '}
          <a href="mailto:adilmaf.agency@gmail.com" className="text-amber-500/80 hover:text-amber-400 transition-colors">
            our team
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ── DASHBOARD ──

function Dashboard({ token, advertiser, onLogout }: { token: string; advertiser: AdvertiserInfo; onLogout: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'campaigns' | 'articles' | 'groups'>('overview');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/advertisers/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setError(json.message || 'Failed to load dashboard');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Failed to load'}</p>
          <button onClick={fetchData} className="px-6 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { stats, chartData, campaigns, articles, featuredGroups } = data;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const hasArticles = articles.length > 0;
  const hasGroups = featuredGroups.length > 0;

  const tabs: { id: typeof tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'campaigns', label: 'Campaigns', count: campaigns.length },
    ...(hasArticles ? [{ id: 'articles' as const, label: 'Articles', count: articles.length }] : []),
    ...(hasGroups ? [{ id: 'groups' as const, label: 'Featured Groups', count: featuredGroups.length }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm bg-[#0a0a0a]/80 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-black text-white">E</div>
            <div>
              <span className="text-sm font-bold text-white">Erogram.pro</span>
              <span className="text-xs text-gray-600 ml-2 hidden sm:inline">Advertiser Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{advertiser.name}</p>
              <p className="text-[10px] text-gray-500">{advertiser.company || advertiser.email}</p>
            </div>
            {advertiser.logo ? (
              <Image src={advertiser.logo} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                {advertiser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={onLogout}
              className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
            Welcome back, {advertiser.name}
          </h1>
          <p className="text-sm text-gray-500">Here&apos;s your campaign performance at a glance.</p>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8"
        >
          {[
            { label: 'Total Clicks', value: fmtNum(stats.totalClicks), sub: `${fmtNum(stats.todayClicks)} today`, icon: '🖱️' },
            { label: 'Last 7 Days', value: fmtNum(stats.clicks7d), sub: 'clicks', icon: '📊' },
            { label: 'Last 30 Days', value: fmtNum(stats.clicks30d), sub: 'clicks', icon: '📈' },
            { label: 'Active Campaigns', value: String(stats.activeCampaigns), sub: `of ${stats.totalCampaigns} total`, icon: '🚀' },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{kpi.icon}</span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white tabular-nums">{kpi.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-gray-500 border border-transparent hover:text-white hover:border-white/[0.06]'
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1.5 text-[10px] opacity-60">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              {/* Click Trend Chart */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Click Trend</h3>
                    <p className="text-[10px] text-gray-500">Last 30 days</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-400 tabular-nums">{fmtNum(stats.clicks30d)} clicks</span>
                </div>
                <MiniChart data={chartData} height={120} />
                <div className="flex justify-between mt-2 text-[10px] text-gray-600">
                  <span>{chartData.length > 0 ? formatDate(chartData[0].date) : ''}</span>
                  <span>{chartData.length > 0 ? formatDate(chartData[chartData.length - 1].date) : ''}</span>
                </div>
              </div>

              {/* Active Campaigns Quick View */}
              {activeCampaigns.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 mb-6">
                  <h3 className="text-sm font-bold text-white mb-4">Active Campaigns</h3>
                  <div className="space-y-3">
                    {activeCampaigns.map((c) => (
                      <div key={c._id} className="flex items-center gap-4 rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 sm:p-4">
                        {c.creative && (
                          <Image src={c.creative} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {c.slotLabel} &middot; {formatDate(c.startDate)} — {formatDate(c.endDate)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-white tabular-nums">{fmtNum(c.clicks)}</p>
                          <p className="text-[10px] text-gray-500">clicks</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats Row */}
              {(hasArticles || hasGroups) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {hasArticles && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                      <h3 className="text-sm font-bold text-white mb-3">Sponsored Articles</h3>
                      <div className="space-y-2">
                        {articles.slice(0, 3).map((a) => (
                          <div key={a._id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400 truncate flex-1 mr-3">{a.title}</span>
                            <span className="text-white font-semibold tabular-nums shrink-0">{fmtNum(a.views)} views</span>
                          </div>
                        ))}
                      </div>
                      {articles.length > 3 && (
                        <button onClick={() => setTab('articles')} className="text-xs text-amber-500 hover:text-amber-400 mt-3 transition-colors">
                          View all {articles.length} articles →
                        </button>
                      )}
                    </div>
                  )}

                  {hasGroups && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                      <h3 className="text-sm font-bold text-white mb-3">Featured Groups</h3>
                      <div className="space-y-2">
                        {featuredGroups.slice(0, 3).map((g) => (
                          <div key={g._id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400 truncate flex-1 mr-3">{g.name}</span>
                            <span className="text-white font-semibold tabular-nums shrink-0">{fmtNum(g.clickCount)} clicks</span>
                          </div>
                        ))}
                      </div>
                      {featuredGroups.length > 3 && (
                        <button onClick={() => setTab('groups')} className="text-xs text-amber-500 hover:text-amber-400 mt-3 transition-colors">
                          View all {featuredGroups.length} groups →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'campaigns' && (
            <motion.div key="campaigns" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              {campaigns.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p className="text-lg font-semibold mb-1">No campaigns yet</p>
                  <p className="text-sm">Contact our team to set up your first campaign.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c._id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
                      <div className="flex items-start gap-4">
                        {c.creative && (
                          <Image src={c.creative} alt="" width={64} height={64} className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0 hidden sm:block" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-sm font-bold text-white">{c.name}</h4>
                            <StatusBadge status={c.status} />
                            {c.verified && (
                              <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mb-3">
                            {c.slotLabel} &middot; {formatDate(c.startDate)} — {formatDate(c.endDate)}
                            {c.destinationUrl && (
                              <> &middot; <a href={c.destinationUrl} target="_blank" rel="noopener noreferrer" className="text-amber-500/70 hover:text-amber-400 transition-colors">{new URL(c.destinationUrl).hostname}</a></>
                            )}
                          </p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">All-time Clicks</p>
                              <p className="text-lg font-black text-white tabular-nums">{fmtNum(c.clicks)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Last 7 Days</p>
                              <p className="text-lg font-black text-white tabular-nums">{fmtNum(c.clicks7d)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Last 30 Days</p>
                              <p className="text-lg font-black text-white tabular-nums">{fmtNum(c.clicks30d)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Impressions</p>
                              <p className="text-lg font-black text-white tabular-nums">{fmtNum(c.impressions)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'articles' && hasArticles && (
            <motion.div key="articles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-5 py-3 font-semibold text-xs text-gray-400 uppercase tracking-wider">Article</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-400 uppercase tracking-wider text-right">Views</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-400 uppercase tracking-wider text-right hidden sm:table-cell">Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((a) => (
                      <tr key={a._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3">
                          <a href={`/articles/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-amber-400 transition-colors font-medium">
                            {a.title}
                          </a>
                        </td>
                        <td className="px-5 py-3 text-center"><StatusBadge status={a.status} /></td>
                        <td className="px-5 py-3 text-right text-white font-semibold tabular-nums">{fmtNum(a.views)}</td>
                        <td className="px-5 py-3 text-right text-gray-500 hidden sm:table-cell">{formatDate(a.publishedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {tab === 'groups' && hasGroups && (
            <motion.div key="groups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredGroups.map((g) => (
                  <div key={g._id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    {g.image && (
                      <Image src={g.image} alt="" width={400} height={200} className="w-full h-32 object-cover border-b border-white/[0.06]" />
                    )}
                    <div className="p-4">
                      <h4 className="text-sm font-bold text-white mb-2">{g.name}</h4>
                      <div className="flex items-center gap-4 text-[11px]">
                        <div>
                          <span className="text-gray-500">Clicks: </span>
                          <span className="text-white font-semibold tabular-nums">{fmtNum(g.clickCount)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Views: </span>
                          <span className="text-white font-semibold tabular-nums">{fmtNum(g.views)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center justify-between text-xs text-gray-600">
          <span>Erogram.pro &copy; {new Date().getFullYear()}</span>
          <span>Advertiser data is confidential.</span>
        </div>
      </footer>
    </div>
  );
}

// ── MAIN PORTAL COMPONENT ──

export default function AdvertiserPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [advertiser, setAdvertiser] = useState<AdvertiserInfo | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const advData = localStorage.getItem(ADVERTISER_KEY);
    if (stored && advData) {
      try {
        setToken(stored);
        setAdvertiser(JSON.parse(advData));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ADVERTISER_KEY);
      }
    }
    setChecking(false);
  }, []);

  function handleLogin(newToken: string, adv: AdvertiserInfo) {
    localStorage.setItem(STORAGE_KEY, newToken);
    localStorage.setItem(ADVERTISER_KEY, JSON.stringify(adv));
    setToken(newToken);
    setAdvertiser(adv);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ADVERTISER_KEY);
    setToken(null);
    setAdvertiser(null);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !advertiser) {
    return <LoginGate onLogin={handleLogin} />;
  }

  return <Dashboard token={token} advertiser={advertiser} onLogout={handleLogout} />;
}
