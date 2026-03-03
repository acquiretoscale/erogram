'use client';

import Image from 'next/image';

export default function OrganicGrowth() {
    return (
        <div className="glass rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#b31b1b]/15 border border-[#b31b1b]/25 flex items-center justify-center text-sm">📈</div>
                    <div>
                        <h3 className="text-sm font-bold text-[#f5f5f5]">Explosive Organic Growth</h3>
                        <p className="text-[10px] text-[#999]">Google Search Console — erogram.pro</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase tracking-wider">Verified</span>
                </div>

                <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="h-px flex-1 bg-gradient-to-r from-[#b31b1b]/40 to-transparent" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff3366]">The Data</span>
                            <div className="h-px flex-1 bg-gradient-to-l from-[#b31b1b]/40 to-transparent" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            {[
                                { label: 'Clicks (3mo)', value: '20K', change: '+89%', color: 'text-[#ff3366]' },
                                { label: 'Impressions', value: '132K', change: '+97%', color: 'text-[#ff3366]' },
                                { label: 'Avg. CTR', value: '15.2%', change: null, color: 'text-[#f5f5f5]' },
                                { label: 'Avg. Position', value: '#7.1', change: null, color: 'text-[#f5f5f5]' },
                            ].map((m) => (
                                <div key={m.label} className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2.5">
                                    <p className="text-[10px] text-[#999] uppercase tracking-wider font-semibold mb-1">{m.label}</p>
                                    <p className={`text-lg font-black ${m.color} tabular-nums`}>{m.value}</p>
                                    {m.change && <p className="text-[10px] font-bold text-emerald-400">{m.change} vs prior period</p>}
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-lg">
                            <Image
                                src="/assets/google-search-console.png"
                                alt="Google Search Console growth chart — 89% increase in clicks, 97% increase in impressions"
                                width={680}
                                height={640}
                                className="w-full h-auto"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#999] mt-3">
                            <svg className="w-3.5 h-3.5 text-[#ff3366] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <span>Source: Google Search Console — erogram.pro — Last 3 months</span>
                        </div>
                    </div>

                    <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-[#b31b1b]/20 bg-[#b31b1b]/5 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="h-px flex-1 bg-gradient-to-r from-[#b31b1b]/40 to-transparent" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff3366]">What It Means for Advertisers &amp; Partners</span>
                            <div className="h-px flex-1 bg-gradient-to-l from-[#b31b1b]/40 to-transparent" />
                        </div>

                        <h4 className="text-lg font-black text-[#f5f5f5] mb-3 leading-tight">Your ROI Compounds:<br /><span className="text-[#ff3366]">Invest Today, Reach More Tomorrow</span></h4>
                        <p className="text-sm text-[#999] leading-relaxed mb-4">
                            Our Google Search Console data confirms accelerating month-over-month growth.
                            Your ad investment scales with our trajectory — <span className="text-[#f5f5f5] font-semibold">the audience you reach today will be significantly larger next month.</span>
                        </p>
                        <p className="text-sm text-[#999] leading-relaxed mb-5">
                            With <span className="text-[#f5f5f5] font-semibold">+89% clicks</span> and <span className="text-[#f5f5f5] font-semibold">+97% impressions</span> growth in just 3 months, early advertisers lock in lower rates while benefiting from an exponentially expanding audience.
                            Our average CTR of <span className="text-[#f5f5f5] font-semibold">15.2%</span> dramatically outperforms the industry standard, proving that our audience actively engages with content rather than passively scrolling past.
                        </p>

                        <div className="rounded-xl bg-[#b31b1b]/10 border border-[#b31b1b]/20 p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-[#ff3366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                <span className="text-xs font-bold text-[#ff3366] uppercase tracking-wider">Key Takeaway</span>
                            </div>
                            <p className="text-xs text-[#999] leading-relaxed">
                                Month-over-month growth trend means your ROI compounds — <span className="text-[#f5f5f5] font-semibold">early advertisers benefit the most</span> as our audience multiplies.
                                Lock in your placement now while pricing reflects our current size, not where we&apos;ll be in 90 days.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
