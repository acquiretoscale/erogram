'use client';

export default function AudienceDevices() {
    return (
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-5">
                <span className="text-lg">🌐</span>
                <h3 className="text-xl font-black text-[#f5f5f5]">Erogram Website</h3>
            </div>

            {/* ── DEVICES ── */}
            <div className="glass rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#b31b1b]/15 border border-[#b31b1b]/25 flex items-center justify-center text-sm">📱</div>
                        <div>
                            <h3 className="text-sm font-bold text-[#f5f5f5]">Device &amp; OS Breakdown</h3>
                            <p className="text-[10px] text-[#999]">Where your ads are seen</p>
                        </div>
                        <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#b31b1b]/15 text-[#ff3366] border border-[#b31b1b]/25 uppercase tracking-wider">91.6% Mobile</span>
                    </div>

                    <div className="flex flex-col lg:flex-row">
                        <div className="flex-1 p-5 sm:p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-px flex-1 bg-gradient-to-r from-[#b31b1b]/40 to-transparent" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff3366]">The Data</span>
                                <div className="h-px flex-1 bg-gradient-to-l from-[#b31b1b]/40 to-transparent" />
                            </div>

                            <div className="flex items-center gap-4 mb-5 pb-5 border-b border-white/[0.08]">
                                <div className="relative w-20 h-20 shrink-0">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="14" fill="none" stroke="#ff3366" strokeWidth="3" strokeDasharray="52.9 100" strokeLinecap="round" />
                                        <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="38.7 100" strokeDashoffset="-52.9" strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[11px] font-black text-[#f5f5f5]">91.6%</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#ff3366]" /><span className="text-xs text-[#999]">iOS</span><span className="text-xs font-bold text-[#f5f5f5] ml-auto">52.9%</span></div>
                                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-xs text-[#999]">Android</span><span className="text-xs font-bold text-[#f5f5f5] ml-auto">38.7%</span></div>
                                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#999]" /><span className="text-xs text-[#999]">Desktop</span><span className="text-xs font-bold text-[#f5f5f5] ml-auto">8.3%</span></div>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {[
                                    { os: 'iOS', icon: '🍎', visitors: '32.7k', pct: 52.9, barColor: 'from-[#ff3366] to-[#b31b1b]' },
                                    { os: 'Android', icon: '🤖', visitors: '23.9k', pct: 38.7, barColor: 'from-green-500 to-emerald-400' },
                                    { os: 'Windows', icon: '🪟', visitors: '2.7k', pct: 4.4, barColor: 'from-sky-500 to-sky-400' },
                                    { os: 'Mac', icon: '💻', visitors: '2k', pct: 3.3, barColor: 'from-[#999] to-[#666]' },
                                    { os: 'GNU/Linux', icon: '🐧', visitors: '357', pct: 0.6, barColor: 'from-amber-500 to-amber-400' },
                                ].map((d) => (
                                    <div key={d.os} className="rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 hover:bg-white/[0.06] transition-colors">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2"><span className="text-sm">{d.icon}</span><span className="text-[13px] text-[#f5f5f5] font-medium">{d.os}</span></div>
                                            <div className="flex items-center gap-3"><span className="text-[11px] text-[#999] tabular-nums">{d.visitors}</span><span className="text-[11px] text-[#f5f5f5] font-bold tabular-nums w-12 text-right">{d.pct}%</span></div>
                                        </div>
                                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${d.barColor}`} style={{ width: `${d.pct}%` }} /></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-[#b31b1b]/20 bg-[#b31b1b]/5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-5">
                                <div className="h-px flex-1 bg-gradient-to-r from-[#b31b1b]/40 to-transparent" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff3366]">What It Means for Advertisers &amp; Partners</span>
                                <div className="h-px flex-1 bg-gradient-to-l from-[#b31b1b]/40 to-transparent" />
                            </div>

                            <h4 className="text-lg font-black text-[#f5f5f5] mb-3 leading-tight">Mobile Dominance:<br /><span className="text-[#ff3366]">The Power of In-Feed Advertising</span></h4>
                            <p className="text-sm text-[#999] leading-relaxed mb-4">
                                Our data reveals a critical insight: <span className="text-[#f5f5f5] font-semibold">91.6% of our audience</span> accesses Erogram.pro via mobile devices.
                                This overwhelming mobile preference is why our In-Feed Ads are not just an option, but our <span className="text-[#f5f5f5] font-semibold">most effective and recommended</span> advertising solution.
                            </p>
                            <p className="text-sm text-[#999] leading-relaxed mb-5">
                                Unlike traditional banners, which are often ignored or blocked on mobile, our in-feed placements seamlessly integrate into the user experience, appearing natively within content feeds.
                                This strategic approach has consistently yielded top results for our advertisers, ensuring your message is seen and engaged with where our audience spends most of their time.
                            </p>
                            <div className="rounded-xl bg-[#b31b1b]/10 border border-[#b31b1b]/20 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-4 h-4 text-[#ff3366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                    <span className="text-xs font-bold text-[#ff3366] uppercase tracking-wider">Key Takeaway</span>
                                </div>
                                <p className="text-xs text-[#999] leading-relaxed">
                                    In-feed video ads on mobile generate up to <span className="text-[#f5f5f5] font-semibold">4x more clicks</span> than traditional banner placements. Your content appears exactly where users are already scrolling.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
