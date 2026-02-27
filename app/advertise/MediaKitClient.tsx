'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import AdvertiseGate from './AdvertiseGate';
import AdvertiseStats from './AdvertiseStats';
import PageReplica from './PageReplica';
import AdShop from './AdShop';

const fade = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };


function SectionHeading({ badge, title, subtitle }: { badge?: string; title: string; subtitle?: string }) {
  return (
    <motion.div variants={fade} initial="initial" whileInView="animate" viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-8">
      {badge && (
        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-amber-500/30 text-amber-400 bg-amber-500/10 mb-3">
          {badge}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{title}</h2>
      {subtitle && <p className="text-gray-400 text-sm mt-2 max-w-2xl">{subtitle}</p>}
    </motion.div>
  );
}


interface TgGroup { name: string; memberCount: number }
interface TgEcosystem { groups: TgGroup[]; totalSubscribers: number; groupCount: number }

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="inline-flex items-center justify-center w-full h-full rounded-full" style={{ backgroundColor: '#0088cc' }}>
        <svg
          viewBox="0 0 24 24"
          className="w-[70%] h-[70%]"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 3L3 11.5l5.5 2 1 4.5L12.5 15 17 18.5 21 3z" />
        </svg>
      </span>
    </span>
  );
}

export default function MediaKitClient() {
  const [tgEcosystem, setTgEcosystem] = useState<TgEcosystem | null>(null);

  useEffect(() => {
    fetch('/api/advertise-stats', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.telegramEcosystem) setTgEcosystem(d.telegramEcosystem); })
      .catch(() => {});
  }, []);

  return (
    <AdvertiseGate>
      <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] selection:bg-amber-500/30">
        {/* Ambient glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
        </div>

        {/* Top bar */}
        <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-sm bg-[#0a0a0a]/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-black text-white">E</div>
              <div>
                <span className="text-sm font-bold text-white">Erogram.pro</span>
                <span className="text-xs text-gray-600 ml-2 hidden sm:inline">Media Kit</span>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pt-12 sm:pt-20 pb-20">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/[0.06] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Advertising Partner Portal</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300">EROGRAM PRO</span>
              <br />
              <span className="text-white">MEDIA KIT.</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-amber-400/80 uppercase tracking-[0.18em] mb-4">
              Updated February 25, 2026
            </p>
            <p className="text-gray-400 max-w-xl mx-auto text-base sm:text-lg">
              Erogram Pro connects brands with a high-intent, mobile-first, Tier-1 audience through performance-driven placements. We deliver attention, clicks, and scalable exposure inside a fast-growing ecosystem.
            </p>
          </motion.div>

          {/* Live Stats */}
          <AdvertiseStats />

          {/* Audience Insights */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-amber-500/30 text-amber-400 bg-amber-500/10">
                Audience Insights
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-8">Know your audience</h2>

            {/* ── PART 1: Erogram Website ── */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-lg">🌐</span>
                <h3 className="text-xl font-black text-white">Erogram Website</h3>
              </div>

              {/* ── DEVICES ── */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 mb-6 shadow-sm overflow-hidden">
                <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-sm">📱</div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Device & OS Breakdown</h3>
                      <p className="text-[10px] text-gray-500">Where your ads are seen</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 border border-blue-500/25 uppercase tracking-wider">91.6% Mobile</span>
                  </div>

                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">The Data</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-blue-500/40 to-transparent" />
                      </div>

                      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-200">
                        <div className="relative w-20 h-20 shrink-0">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="rgb(229,231,235)" strokeWidth="3" />
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="52.9 100" strokeLinecap="round" />
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="38.7 100" strokeDashoffset="-52.9" strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[11px] font-black text-gray-900">91.6%</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-xs text-gray-600">iOS</span><span className="text-xs font-bold text-gray-900 ml-auto">52.9%</span></div>
                          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-xs text-gray-600">Android</span><span className="text-xs font-bold text-gray-900 ml-auto">38.7%</span></div>
                          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-500" /><span className="text-xs text-gray-600">Desktop</span><span className="text-xs font-bold text-gray-900 ml-auto">8.3%</span></div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {[
                          { os: 'iOS',        icon: '🍎', visitors: '32.7k', pct: 52.9, barColor: 'from-blue-500 to-blue-400' },
                          { os: 'Android',    icon: '🤖', visitors: '23.9k', pct: 38.7, barColor: 'from-green-500 to-emerald-400' },
                          { os: 'Windows',    icon: '🪟', visitors: '2.7k',  pct: 4.4,  barColor: 'from-sky-500 to-sky-400' },
                          { os: 'Mac',        icon: '💻', visitors: '2k',    pct: 3.3,  barColor: 'from-gray-400 to-gray-300' },
                          { os: 'GNU/Linux',  icon: '🐧', visitors: '357',   pct: 0.6,  barColor: 'from-yellow-500 to-amber-400' },
                        ].map((d) => (
                          <div key={d.os} className="rounded-lg bg-white border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2"><span className="text-sm">{d.icon}</span><span className="text-[13px] text-gray-900 font-medium">{d.os}</span></div>
                              <div className="flex items-center gap-3"><span className="text-[11px] text-gray-500 tabular-nums">{d.visitors}</span><span className="text-[11px] text-gray-900 font-bold tabular-nums w-12 text-right">{d.pct}%</span></div>
                            </div>
                            <div className="h-1 rounded-full bg-gray-200 overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${d.barColor}`} style={{ width: `${d.pct}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-amber-500/20 bg-amber-50/50 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">What It Means for Advertisers & Partners</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-blue-500/40 to-transparent" />
                      </div>

                      <h4 className="text-lg font-black text-gray-900 mb-3 leading-tight">Mobile Dominance:<br /><span className="text-blue-600">The Power of In-Feed Advertising</span></h4>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Our data reveals a critical insight: <span className="text-gray-900 font-semibold">91.6% of our audience</span> accesses Erogram.pro via mobile devices.
                        This overwhelming mobile preference is why our In-Feed Ads are not just an option, but our <span className="text-gray-900 font-semibold">most effective and recommended</span> advertising solution.
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed mb-5">
                        Unlike traditional banners, which are often ignored or blocked on mobile, our in-feed placements seamlessly integrate into the user experience, appearing natively within content feeds.
                        This strategic approach has consistently yielded top results for our advertisers, ensuring your message is seen and engaged with where our audience spends most of their time.
                      </p>
                      <div className="rounded-xl bg-blue-100 border border-blue-200 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Key Takeaway</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          In-feed video ads on mobile generate up to <span className="text-gray-900 font-semibold">4x more clicks</span> than traditional banner placements. Your content appears exactly where users are already scrolling.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── TOP COUNTRIES ── */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 mb-6 shadow-sm overflow-hidden">
                <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-sm">🌍</div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Geographic Distribution</h3>
                      <p className="text-[10px] text-gray-500">Premium Tier-1 audience composition</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/25 uppercase tracking-wider">Tier-1 Focus</span>
                  </div>

                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">The Data</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-amber-500/40 to-transparent" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-gray-200">
                        <div className="rounded-xl bg-white border border-gray-200 p-3 text-center">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">US & Canada</p>
                          <p className="text-xl font-black text-amber-600 tabular-nums">34.7%</p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-200 p-3 text-center">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">W. Europe</p>
                          <p className="text-xl font-black text-amber-600 tabular-nums">20.6%</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {[
                          { country: 'United States',  flag: '🇺🇸', pct: 31,  bar: 'from-amber-500 to-orange-400' },
                          { country: 'Germany',        flag: '🇩🇪', pct: 6.5, bar: 'from-amber-600/80 to-yellow-500/80' },
                          { country: 'Turkey',         flag: '🇹🇷', pct: 5.2, bar: 'from-amber-600/60 to-yellow-500/60' },
                          { country: 'Netherlands',    flag: '🇳🇱', pct: 4.2, bar: 'from-amber-600/50 to-yellow-500/50' },
                          { country: 'United Kingdom', flag: '🇬🇧', pct: 4.0, bar: 'from-amber-600/45 to-yellow-500/45' },
                          { country: 'Canada',         flag: '🇨🇦', pct: 3.7, bar: 'from-amber-600/40 to-yellow-500/40' },
                          { country: 'Italy',          flag: '🇮🇹', pct: 2.6, bar: 'from-amber-600/35 to-yellow-500/35' },
                          { country: 'Poland',         flag: '🇵🇱', pct: 2.3, bar: 'from-amber-600/30 to-yellow-500/30' },
                        ].map((c, i) => (
                          <div key={c.country} className="rounded-lg bg-white border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2.5 mb-1">
                              <span className="text-[10px] text-gray-600 w-3 text-right font-mono font-bold">{i + 1}</span>
                              <span className="text-base leading-none">{c.flag}</span>
                              <span className="text-[13px] text-gray-900 font-medium flex-1">{c.country}</span>
                              <span className="text-[13px] text-gray-900 font-bold tabular-nums">{c.pct}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-gray-200 overflow-hidden ml-8"><div className={`h-full rounded-full bg-gradient-to-r ${c.bar}`} style={{ width: `${(c.pct / 31) * 100}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-amber-500/20 bg-amber-50/50 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">What It Means for Advertisers & Partners</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-amber-500/40 to-transparent" />
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Erogram.pro attracts a premium audience from economically robust Tier-1 regions, ensuring exceptionally high-quality traffic and conversion potential for your campaigns.
                        Our users are not just visitors; they are <span className="text-gray-900 font-semibold">tech-aware, often crypto-aware Telegram users</span> who demonstrate higher spending potential.
                        This makes them an ideal target for premium brands in the adult industry, crypto, tech, and lifestyle sectors.
                      </p>

                      <p className="text-sm text-gray-600 leading-relaxed mb-4">Our audience composition from top Tier-1 countries:</p>
                      <div className="space-y-2.5 mb-5">
                        <div className="flex items-start gap-3 rounded-lg bg-white border border-gray-200 p-3">
                          <span className="text-base mt-0.5">🇺🇸🇨🇦</span>
                          <div><p className="text-sm text-gray-900 font-semibold">United States & Canada</p><p className="text-xs text-gray-600">Combined <span className="text-amber-600 font-bold">34.7%</span> of top traffic</p></div>
                        </div>
                        <div className="flex items-start gap-3 rounded-lg bg-white border border-gray-200 p-3">
                          <span className="text-base mt-0.5">🇩🇪🇬🇧🇳🇱</span>
                          <div><p className="text-sm text-gray-900 font-semibold">Western Europe</p><p className="text-xs text-gray-600">Germany, Netherlands, UK, Italy, Poland — <span className="text-amber-600 font-bold">20.6%</span> of top traffic</p></div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-amber-100 border border-amber-200 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          <h5 className="text-sm font-bold text-amber-800">Elite Global Reach</h5>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          This significant concentration of users from high-GDP regions means advertisers are reaching an audience with disposable income and a propensity for digital engagement.
                          For brands in the adult industry, this translates to higher conversion rates and a more valuable customer base.
                          Our users are actively seeking and engaging with content, making them highly receptive to relevant advertising.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── EXPLOSIVE ORGANIC GROWTH ── */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 mb-6 shadow-sm overflow-hidden">
                <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-sm">📈</div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Explosive Organic Growth</h3>
                      <p className="text-[10px] text-gray-500">Google Search Console — erogram.pro</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/25 uppercase tracking-wider">Verified</span>
                  </div>

                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">The Data</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/40 to-transparent" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5">
                        {[
                          { label: 'Clicks (3mo)', value: '20K', change: '+89%', color: 'text-blue-600' },
                          { label: 'Impressions', value: '132K', change: '+97%', color: 'text-purple-600' },
                          { label: 'Avg. CTR', value: '15.2%', change: null, color: 'text-gray-900' },
                          { label: 'Avg. Position', value: '#7.1', change: null, color: 'text-gray-900' },
                        ].map((m) => (
                          <div key={m.label} className="rounded-xl bg-white border border-gray-200 px-3 py-2.5">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">{m.label}</p>
                            <p className={`text-lg font-black ${m.color} tabular-nums`}>{m.value}</p>
                            {m.change && <p className="text-[10px] font-bold text-emerald-600">{m.change} vs prior period</p>}
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                        <Image
                          src="/assets/google-search-console.png"
                          alt="Google Search Console growth chart — 89% increase in clicks, 97% increase in impressions"
                          width={680}
                          height={640}
                          className="w-full h-auto"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-3">
                        <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <span>Source: Google Search Console — erogram.pro — Last 3 months</span>
                      </div>
                    </div>

                    <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-amber-500/20 bg-amber-50/50 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/40 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">What It Means for Advertisers & Partners</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/40 to-transparent" />
                      </div>

                      <h4 className="text-lg font-black text-gray-900 mb-3 leading-tight">Your ROI Compounds:<br /><span className="text-emerald-600">Invest Today, Reach More Tomorrow</span></h4>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Our Google Search Console data confirms accelerating month-over-month growth.
                        Your ad investment scales with our trajectory — <span className="text-gray-900 font-semibold">the audience you reach today will be significantly larger next month.</span>
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed mb-5">
                        With <span className="text-gray-900 font-semibold">+89% clicks</span> and <span className="text-gray-900 font-semibold">+97% impressions</span> growth in just 3 months, early advertisers lock in lower rates while benefiting from an exponentially expanding audience.
                        Our average CTR of <span className="text-gray-900 font-semibold">15.2%</span> dramatically outperforms the industry standard, proving that our audience actively engages with content rather than passively scrolling past.
                      </p>

                      <div className="rounded-xl bg-emerald-100 border border-emerald-200 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Key Takeaway</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Month-over-month growth trend means your ROI compounds — <span className="text-gray-900 font-semibold">early advertisers benefit the most</span> as our audience multiplies.
                          Lock in your placement now while pricing reflects our current size, not where we'll be in 90 days.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PART 2: Telegram Ecosystem ── */}
            {tgEcosystem && tgEcosystem.groups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <TelegramIcon className="w-7 h-7" />
                  <h3 className="text-xl font-black text-white">Telegram Ecosystem</h3>
                </div>

                <div className="rounded-2xl overflow-hidden shadow-lg border border-[#0088cc]/20" style={{ background: 'linear-gradient(180deg, #f4f9fc 0%, #e8f4fc 50%, #ddedfa 100%)' }}>
                  <div className="flex flex-col lg:flex-row">
                    {/* Data side */}
                    <div className="flex-1 p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-[#0088cc]/40 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#0088cc' }}>The Data</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-[#0088cc]/40 to-transparent" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-gray-200">
                        <div className="rounded-xl bg-white border border-gray-200 p-3 text-center">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Total Subscribers</p>
                          <p className="text-xl font-black tabular-nums" style={{ color: '#0088cc' }}>{fmtNum(tgEcosystem.totalSubscribers)}+</p>
                        </div>
                        <div className="rounded-xl bg-white border border-gray-200 p-3 text-center">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Active Channels</p>
                          <p className="text-xl font-black tabular-nums" style={{ color: '#0088cc' }}>{tgEcosystem.groupCount}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {tgEcosystem.groups.map((g, i) => {
                          const maxMembers = tgEcosystem.groups[0]?.memberCount || 1;
                          return (
                            <div key={g.name} className="rounded-lg bg-white border border-gray-200 px-3 py-2 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-2.5 mb-1">
                                <span className="text-[10px] text-gray-600 w-3 text-right font-mono font-bold">{i + 1}</span>
                                <TelegramIcon className="w-4 h-4" />
                                <span className="text-[13px] text-gray-900 font-medium flex-1 truncate">{g.name}</span>
                                <span className="text-[13px] font-bold tabular-nums" style={{ color: '#0088cc' }}>{fmtNum(g.memberCount)}</span>
                              </div>
                              <div className="h-1 rounded-full bg-gray-200 overflow-hidden ml-8">
                                <div className="h-full rounded-full" style={{ width: `${(g.memberCount / maxMembers) * 100}%`, background: 'linear-gradient(to right, #0088cc, #00aaee)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Insights side */}
                    <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-[#0088cc]/15 bg-[#0088cc]/[0.04] flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="h-px flex-1 bg-gradient-to-r from-[#0088cc]/40 to-transparent" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#0088cc' }}>What It Means for Advertisers & Partners</span>
                        <div className="h-px flex-1 bg-gradient-to-l from-[#0088cc]/40 to-transparent" />
                      </div>

                      <h4 className="text-lg font-black text-gray-900 mb-3 leading-tight">Direct Access:<br /><span style={{ color: '#0088cc' }}>A Built-In, Engaged Audience</span></h4>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Our Telegram network isn&apos;t just numbers — these are <span className="text-gray-900 font-semibold">active, niche-specific communities</span> where members are highly engaged and receptive to curated content. When you advertise through our Telegram channels, your message reaches users who have intentionally subscribed and are actively checking their feeds daily.
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed mb-5">
                        With <span className="text-gray-900 font-semibold">{fmtNum(tgEcosystem.totalSubscribers)}+ subscribers</span> across <span className="text-gray-900 font-semibold">{tgEcosystem.groupCount} channels</span>, pinned posts and blast campaigns deliver unmatched reach. Unlike website ads that depend on visits, Telegram ads push directly to users&apos; phones with notification-level visibility.
                      </p>

                      <div className="rounded-xl border p-4" style={{ backgroundColor: 'rgba(0, 136, 204, 0.08)', borderColor: 'rgba(0, 136, 204, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4" style={{ color: '#0088cc' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#0088cc' }}>Key Takeaway</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Telegram ads deliver push-notification-level visibility — <span className="text-gray-900 font-semibold">every subscriber gets your message directly</span>. Pinned posts stay visible 24/7 at the top of every channel, ensuring no impression is wasted.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>

          {/* ── Section divider: Stats → Ad Placements ── */}
          <div className="my-16 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/50">Ad Placements</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
          </div>

          {/* Interactive page replica — ad slot preview */}
          <motion.section
            id="website-ads"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="scroll-mt-28 mb-10"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300">
                  EROGRAM
                </span>
                <span className="text-white"> ADS PLACEMENTS</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
                Visual overview of every ad location across the website. Click any highlighted slot for specs and pricing.
              </p>
            </div>
            <PageReplica />
          </motion.section>

          {/* Pricing */}
          <motion.section
            id="ad-pricing-list"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="scroll-mt-28 mb-14"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300">ADVERTISING</span>
                <span className="text-white"> RATES</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
                Transparent pricing for every placement. Multi-month bookings unlock 15–30% discounts. Reach out to get started.
              </p>
            </div>
            <AdShop />
          </motion.section>

          {/* Ad specs */}
          <motion.section
            id="ad-specs"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="scroll-mt-28"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300">CREATIVE SPECS</span>
                <span className="text-white"> FOR LIVE PLACEMENTS</span>
              </h2>
              <p className="mt-3 text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
                Specs below are based on the current live ad render on Erogram.pro and advertiser placements.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider mb-2">In-Feed Image</h3>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    <li>Live card media area: full card width x ~208px visible image area.</li>
                    <li>Best formats: 1080x1080 (square) or 1080x1350 (portrait).</li>
                    <li>Safe zone: keep logo and CTA inside center 80% of the creative.</li>
                    <li>Upload pipeline optimizes to WebP and may resize large files.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                  <h3 className="text-sm font-black text-purple-800 uppercase tracking-wider mb-2">In-Feed Video</h3>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    <li>Video can run as square style or full-card background format.</li>
                    <li>For full-card impact, use 9:16 or 4:5 portrait creative.</li>
                    <li>Accepted upload types: MP4, WebM, MOV.</li>
                    <li>Max upload size: 50MB per video file.</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 mb-5">
                <h3 className="text-sm font-black text-sky-800 uppercase tracking-wider mb-3">CTA Text Length (Current UI)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="font-bold text-gray-900">Menu CTA (Navbar)</p>
                    <p className="text-gray-600">Ideal: 14-24 chars</p>
                    <p className="text-gray-500 text-xs mt-0.5">Hard max: ~34 chars before crowding in navbar</p>
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="font-bold text-gray-900">Category Bar CTA</p>
                    <p className="text-gray-600">Ideal: 12-20 chars</p>
                    <p className="text-gray-500 text-xs mt-0.5">Hard max: ~26 chars for clean one-line display</p>
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="font-bold text-gray-900">In-Page CTA (Top)</p>
                    <p className="text-gray-600">Ideal: 16-30 chars</p>
                    <p className="text-gray-500 text-xs mt-0.5">Hard max: ~42 chars on mobile before wrapping</p>
                  </div>
                  <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                    <p className="font-bold text-gray-900">Home Page CTA</p>
                    <p className="text-gray-600">Ideal: 12-22 chars</p>
                    <p className="text-gray-500 text-xs mt-0.5">Hard max: ~30 chars for hero button balance</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-2">Homepage / Banner Creative</h3>
                <ul className="space-y-1.5 text-sm text-gray-700">
                  <li>Homepage hero and top banners are rendered full-width and responsive.</li>
                  <li>Recommended desktop creative: 1920x500 (or 1800x470) for sharp wide display.</li>
                  <li>Recommended mobile-safe variant: keep key text centered to avoid side crop risk.</li>
                  <li>Accepted: static image for banners; feed supports image or video.</li>
                </ul>
              </div>
            </div>
          </motion.section>

        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/[0.06] py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 flex items-center justify-between text-xs text-gray-600">
            <span>Erogram.pro &copy; {new Date().getFullYear()}</span>
            <span>This document is confidential and intended for advertising partners only.</span>
          </div>
        </footer>
      </div>
    </AdvertiseGate>
  );
}
