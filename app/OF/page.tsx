'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOFMStats, getTrendingDailyClicks } from '@/lib/actions/ofm';
import { getTopClickedCreators, type TopCreator } from '@/lib/actions/ofmCreators';
import { getSearchQueries } from '@/lib/actions/ofmAdmin';

type DailyClick = { date: string; clicks: number };
type QueryItem = { _id: string; query: string; searchCount: number };

export default function OFMOverview() {
  const [total, setTotal] = useState(0);
  const [scraped24h, setScraped24h] = useState(0);
  const [topClicks, setTopClicks] = useState<TopCreator[]>([]);
  const [dailyClicks, setDailyClicks] = useState<DailyClick[]>([]);
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    (async () => {
      try {
        const [stats, clicks, chart, q] = await Promise.all([
          getOFMStats(token),
          getTopClickedCreators(20),
          getTrendingDailyClicks(token),
          getSearchQueries(token, { limit: 30, sort: 'searchCount', order: 'desc' }),
        ]);
        setTotal(stats.total);
        setScraped24h(stats.recentlyScrapped);
        setTopClicks(clicks);
        setDailyClicks(chart as DailyClick[]);
        setQueries((q.queries || []).map((x: any) => ({ _id: x._id, query: x.query, searchCount: x.searchCount })));
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00AFF0]" />
      </div>
    );
  }

  const chartMax = Math.max(...dailyClicks.map((d) => d.clicks), 1);
  const chartTotal = dailyClicks.reduce((s, d) => s + d.clicks, 0);
  const barW = Math.max(4, Math.min(14, Math.floor(680 / Math.max(dailyClicks.length, 1)) - 2));
  const chartH = 120;
  const maxClicks = topClicks[0]?.clicks || 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Overview</h1>
          <p className="text-white/40 text-sm mt-0.5">OnlyFans creator database</p>
        </div>
        <div className="flex gap-2">
          <Link href="/OF/scrape" className="px-4 py-2 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition shadow-sm shadow-[#00AFF0]/20">
            + Scrape
          </Link>
          <Link href="/OF/creators" className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 text-white/80 text-sm font-semibold rounded-xl transition">
            View All
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div className="text-3xl font-black text-[#00AFF0]">{total.toLocaleString()}</div>
          <div className="text-sm font-semibold text-white/70">Total Creators</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div className="text-3xl font-black text-violet-400">{scraped24h.toLocaleString()}</div>
          <div className="text-sm font-semibold text-white/70">Scraped Last 24h</div>
        </div>
      </div>

      {/* Featured clicks chart */}
      {dailyClicks.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white/70">Total Clicks on Featured (30 days)</h2>
              <p className="text-[11px] text-white/30 mt-0.5">All featured creators combined</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-[#00AFF0]">{chartTotal.toLocaleString()}</div>
              <div className="text-[10px] text-white/30">total</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <svg
              width={dailyClicks.length * (barW + 2) + 20}
              height={chartH + 24}
              style={{ display: 'block', margin: '0 auto' }}
            >
              {dailyClicks.map((d, i) => {
                const h = (d.clicks / chartMax) * chartH;
                const x = i * (barW + 2) + 10;
                const isWeekend = [0, 6].includes(new Date(d.date + 'T00:00:00').getDay());
                const fill =
                  d.clicks === 0
                    ? 'rgba(255,255,255,0.05)'
                    : isWeekend
                      ? 'rgba(0,175,240,0.45)'
                      : '#00AFF0';
                return (
                  <g key={d.date}>
                    <title>{d.date}: {d.clicks} clicks</title>
                    <rect
                      x={x}
                      y={chartH - h}
                      width={barW}
                      height={Math.max(h, 2)}
                      rx={2}
                      fill={fill}
                    />
                    {i % 7 === 0 && (
                      <text
                        x={x + barW / 2}
                        y={chartH + 16}
                        textAnchor="middle"
                        fontSize={9}
                        fill="rgba(255,255,255,0.25)"
                      >
                        {d.date.slice(5)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Two-column: Top Clicks + Top Queries */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top 20 clicks */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">Top 20 Clicks</h2>
            <Link href="/OF/top-clicks" className="text-[10px] text-[#00AFF0] hover:underline">View all</Link>
          </div>
          {topClicks.length > 0 ? (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {topClicks.map((c, i) => (
                <div key={c._id} className="flex items-center gap-2.5">
                  <div className="text-white/20 text-[10px] font-bold w-4 text-right shrink-0">{i + 1}</div>
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-full object-cover bg-white/5 shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center shrink-0">
                      <span className="text-[#00AFF0] text-[9px] font-bold">{c.name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{c.name}</div>
                    <div className="text-[10px] text-white/25">@{c.username}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden w-16 hidden sm:block">
                      <div className="h-full bg-[#00AFF0] rounded-full" style={{ width: `${(c.clicks / maxClicks) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-[#00AFF0] tabular-nums w-10 text-right">{c.clicks.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/20 text-sm">No click data yet.</p>
          )}
        </div>

        {/* Top 30 search queries */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">Top 30 Search Queries</h2>
            <Link href="/OF/queries" className="text-[10px] text-[#00AFF0] hover:underline">View all</Link>
          </div>
          {queries.length > 0 ? (
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {queries.map((q, i) => (
                <div key={q._id} className="flex items-center gap-2.5 py-1">
                  <div className="text-white/20 text-[10px] font-bold w-4 text-right shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-white/70 truncate block">{q.query}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 tabular-nums shrink-0">{q.searchCount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/20 text-sm">No search queries yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
