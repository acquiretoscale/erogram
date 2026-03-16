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
                <svg viewBox="0 0 24 24" className="w-[70%] h-[70%]" fill="none" stroke="white"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

            <div className="rounded-2xl overflow-hidden border border-[#b3dff5] shadow-sm" style={{ background: '#e8f6fd' }}>
                <div className="flex flex-col lg:flex-row">

                    {/* Data side */}
                    <div className="flex-1 p-5 sm:p-6" style={{ background: '#f0f9fe' }}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0077b6] mb-4">The Data</p>

                        <div className="grid grid-cols-2 gap-3 mb-5 pb-5 border-b border-[#b3dff5]">
                            <div className="rounded-xl p-3 text-center border border-[#b3dff5]" style={{ background: 'white' }}>
                                <p className="text-[10px] text-[#0077b6] uppercase tracking-wider font-semibold mb-0.5">Total Subscribers</p>
                                <p className="text-xl font-black tabular-nums text-[#0088cc]">{fmtNum(totalSubscribers)}+</p>
                            </div>
                            <div className="rounded-xl p-3 text-center border border-[#b3dff5]" style={{ background: 'white' }}>
                                <p className="text-[10px] text-[#0077b6] uppercase tracking-wider font-semibold mb-0.5">Active Channels</p>
                                <p className="text-xl font-black tabular-nums text-[#0088cc]">{groupCount}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {groups.slice(0, 8).map((g, i) => (
                                <div key={g.name} className="rounded-xl px-3 py-3 border border-[#b3dff5] flex flex-col gap-1.5 hover:brightness-95 transition-all" style={{ background: 'white' }}>
                                    <div className="flex items-center gap-1.5">
                                        <TelegramIcon className="w-4 h-4 shrink-0" />
                                        <span className="text-[10px] text-[#0077b6] font-bold tabular-nums">#{i + 1}</span>
                                    </div>
                                    <p className="text-[12px] text-gray-800 font-semibold leading-snug line-clamp-2">{g.name}</p>
                                    <p className="text-[13px] font-black tabular-nums text-[#0088cc] mt-auto">{fmtNum(g.memberCount)}<span className="text-[10px] font-semibold text-[#0077b6] ml-1">members</span></p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Insights side */}
                    <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-[#b3dff5] flex flex-col justify-center" style={{ background: '#e0f3fc' }}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0077b6] mb-4">Advertiser Insight</p>

                        <h4 className="text-lg font-black text-gray-900 mb-3 leading-snug">
                            Direct access.<br />
                            <span className="text-[#0088cc]">A built-in, engaged audience.</span>
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed mb-4">
                            Our Telegram network isn&apos;t just numbers — these are <span className="text-gray-900 font-semibold">active, niche-specific communities</span> where members are highly engaged and receptive to curated content. When you advertise through our Telegram channels, your message reaches users who have intentionally subscribed and are actively checking their feeds daily.
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed mb-5">
                            With <span className="text-gray-900 font-semibold">{fmtNum(totalSubscribers)}+ subscribers</span> across <span className="text-gray-900 font-semibold">{groupCount} channels</span>, pinned posts and blast campaigns deliver unmatched reach. Unlike website ads that depend on visits, Telegram ads push directly to users&apos; phones with notification-level visibility.
                        </p>

                        <div className="rounded-xl p-4 border border-[#b3dff5]" style={{ background: 'white' }}>
                            <p className="text-[10px] font-black uppercase tracking-wider text-[#0077b6] mb-1.5">Key Takeaway</p>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Telegram ads deliver push-notification-level visibility — <span className="text-gray-900 font-semibold">every subscriber gets your message directly</span>. Pinned posts stay visible 24/7 at the top of every channel, ensuring no impression is wasted.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
