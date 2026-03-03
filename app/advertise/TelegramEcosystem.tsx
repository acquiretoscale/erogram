'use client';

interface TgGroup { name: string; memberCount: number }

interface TelegramEcosystemProps {
    groups: TgGroup[];
    totalSubscribers: number;
    groupCount: number;
}

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

export default function TelegramEcosystem({ groups, totalSubscribers, groupCount }: TelegramEcosystemProps) {
    if (!groups || groups.length === 0) return null;

    return (
        <div>
            <div className="flex items-center gap-2 mb-5">
                <TelegramIcon className="w-7 h-7" />
                <h3 className="text-xl font-black text-[#f5f5f5]">Telegram Ecosystem</h3>
            </div>

            <div className="glass rounded-2xl overflow-hidden border-white/[0.08]">
                <div className="flex flex-col lg:flex-row">
                    {/* Data side */}
                    <div className="flex-1 p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-px flex-1 bg-gradient-to-r from-[#0088cc]/40 to-transparent" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#229ED9]">The Data</span>
                            <div className="h-px flex-1 bg-gradient-to-l from-[#0088cc]/40 to-transparent" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-white/[0.08]">
                            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
                                <p className="text-[10px] text-[#999] uppercase tracking-wider font-semibold mb-0.5">Total Subscribers</p>
                                <p className="text-xl font-black tabular-nums text-[#229ED9]">{fmtNum(totalSubscribers)}+</p>
                            </div>
                            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-center">
                                <p className="text-[10px] text-[#999] uppercase tracking-wider font-semibold mb-0.5">Active Channels</p>
                                <p className="text-xl font-black tabular-nums text-[#229ED9]">{groupCount}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            {groups.map((g, i) => {
                                const maxMembers = groups[0]?.memberCount || 1;
                                return (
                                    <div key={g.name} className="rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2 hover:bg-white/[0.06] transition-colors">
                                        <div className="flex items-center gap-2.5 mb-1">
                                            <span className="text-[10px] text-[#999] w-3 text-right font-mono font-bold">{i + 1}</span>
                                            <TelegramIcon className="w-4 h-4" />
                                            <span className="text-[13px] text-[#f5f5f5] font-medium flex-1 truncate">{g.name}</span>
                                            <span className="text-[13px] font-bold tabular-nums text-[#229ED9]">{fmtNum(g.memberCount)}</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden ml-8">
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
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#229ED9]">What It Means for Advertisers &amp; Partners</span>
                            <div className="h-px flex-1 bg-gradient-to-l from-[#0088cc]/40 to-transparent" />
                        </div>

                        <h4 className="text-lg font-black text-[#f5f5f5] mb-3 leading-tight">Direct Access:<br /><span className="text-[#229ED9]">A Built-In, Engaged Audience</span></h4>
                        <p className="text-sm text-[#999] leading-relaxed mb-4">
                            Our Telegram network isn&apos;t just numbers — these are <span className="text-[#f5f5f5] font-semibold">active, niche-specific communities</span> where members are highly engaged and receptive to curated content. When you advertise through our Telegram channels, your message reaches users who have intentionally subscribed and are actively checking their feeds daily.
                        </p>
                        <p className="text-sm text-[#999] leading-relaxed mb-5">
                            With <span className="text-[#f5f5f5] font-semibold">{fmtNum(totalSubscribers)}+ subscribers</span> across <span className="text-[#f5f5f5] font-semibold">{groupCount} channels</span>, pinned posts and blast campaigns deliver unmatched reach. Unlike website ads that depend on visits, Telegram ads push directly to users&apos; phones with notification-level visibility.
                        </p>

                        <div className="rounded-xl border p-4 bg-[#0088cc]/[0.08] border-[#0088cc]/20">
                            <div className="flex items-center gap-2 mb-1">
                                <svg className="w-4 h-4 text-[#229ED9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#229ED9]">Key Takeaway</span>
                            </div>
                            <p className="text-xs text-[#999] leading-relaxed">
                                Telegram ads deliver push-notification-level visibility — <span className="text-[#f5f5f5] font-semibold">every subscriber gets your message directly</span>. Pinned posts stay visible 24/7 at the top of every channel, ensuring no impression is wasted.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
