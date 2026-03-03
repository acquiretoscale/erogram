'use client';

export default function AudienceCountries() {
    return (
        <div className="glass rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.08] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#b31b1b]/15 border border-[#b31b1b]/25 flex items-center justify-center text-sm">🌍</div>
                    <div>
                        <h3 className="text-sm font-bold text-[#f5f5f5]">Geographic Distribution</h3>
                        <p className="text-[10px] text-[#999]">Premium Tier-1 audience composition</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#b31b1b]/15 text-[#ff3366] border border-[#b31b1b]/25 uppercase tracking-wider">Tier-1 Focus</span>
                </div>

                <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-px flex-1 bg-gradient-to-r from-[#b31b1b]/40 to-transparent" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff3366]">The Data</span>
                            <div className="h-px flex-1 bg-gradient-to-l from-[#b31b1b]/40 to-transparent" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-white/[0.08]">
                            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
                                <p className="text-[10px] text-[#999] uppercase tracking-wider font-semibold mb-0.5">US &amp; Canada</p>
                                <p className="text-xl font-black text-[#ff3366] tabular-nums">34.7%</p>
                            </div>
                            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
                                <p className="text-[10px] text-[#999] uppercase tracking-wider font-semibold mb-0.5">W. Europe</p>
                                <p className="text-xl font-black text-[#ff3366] tabular-nums">20.6%</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            {[
                                { country: 'United States', flag: '🇺🇸', pct: 31, bar: 'from-[#b31b1b] to-[#ff3366]' },
                                { country: 'Germany', flag: '🇩🇪', pct: 6.5, bar: 'from-[#b31b1b]/80 to-[#ff3366]/80' },
                                { country: 'Turkey', flag: '🇹🇷', pct: 5.2, bar: 'from-[#b31b1b]/60 to-[#ff3366]/60' },
                                { country: 'Netherlands', flag: '🇳🇱', pct: 4.2, bar: 'from-[#b31b1b]/50 to-[#ff3366]/50' },
                                { country: 'United Kingdom', flag: '🇬🇧', pct: 4.0, bar: 'from-[#b31b1b]/45 to-[#ff3366]/45' },
                                { country: 'Canada', flag: '🇨🇦', pct: 3.7, bar: 'from-[#b31b1b]/40 to-[#ff3366]/40' },
                                { country: 'Italy', flag: '🇮🇹', pct: 2.6, bar: 'from-[#b31b1b]/35 to-[#ff3366]/35' },
                                { country: 'Poland', flag: '🇵🇱', pct: 2.3, bar: 'from-[#b31b1b]/30 to-[#ff3366]/30' },
                            ].map((c, i) => (
                                <div key={c.country} className="rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 hover:bg-white/[0.06] transition-colors">
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <span className="text-[10px] text-[#999] w-3 text-right font-mono font-bold">{i + 1}</span>
                                        <span className="text-base leading-none">{c.flag}</span>
                                        <span className="text-[13px] text-[#f5f5f5] font-medium flex-1">{c.country}</span>
                                        <span className="text-[13px] text-[#f5f5f5] font-bold tabular-nums">{c.pct}%</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden ml-8"><div className={`h-full rounded-full bg-gradient-to-r ${c.bar}`} style={{ width: `${(c.pct / 31) * 100}%` }} /></div>
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

                        <p className="text-sm text-[#999] leading-relaxed mb-4">
                            Erogram.pro attracts a premium audience from economically robust Tier-1 regions, ensuring exceptionally high-quality traffic and conversion potential for your campaigns.
                            Our users are not just visitors; they are <span className="text-[#f5f5f5] font-semibold">tech-aware, often crypto-aware Telegram users</span> who demonstrate higher spending potential.
                            This makes them an ideal target for premium brands in the adult industry, crypto, tech, and lifestyle sectors.
                        </p>

                        <p className="text-sm text-[#999] leading-relaxed mb-4">Our audience composition from top Tier-1 countries:</p>
                        <div className="space-y-2.5 mb-5">
                            <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] border border-white/[0.08] p-3">
                                <span className="text-base mt-0.5">🇺🇸🇨🇦</span>
                                <div><p className="text-sm text-[#f5f5f5] font-semibold">United States &amp; Canada</p><p className="text-xs text-[#999]">Combined <span className="text-[#ff3366] font-bold">34.7%</span> of top traffic</p></div>
                            </div>
                            <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] border border-white/[0.08] p-3">
                                <span className="text-base mt-0.5">🇩🇪🇬🇧🇳🇱</span>
                                <div><p className="text-sm text-[#f5f5f5] font-semibold">Western Europe</p><p className="text-xs text-[#999]">Germany, Netherlands, UK, Italy, Poland — <span className="text-[#ff3366] font-bold">20.6%</span> of top traffic</p></div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-[#b31b1b]/10 border border-[#b31b1b]/20 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-[#ff3366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                <h5 className="text-sm font-bold text-[#ff3366]">Elite Global Reach</h5>
                            </div>
                            <p className="text-xs text-[#999] leading-relaxed">
                                This significant concentration of users from high-GDP regions means advertisers are reaching an audience with disposable income and a propensity for digital engagement.
                                For brands in the adult industry, this translates to higher conversion rates and a more valuable customer base.
                                Our users are actively seeking and engaging with content, making them highly receptive to relevant advertising.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
