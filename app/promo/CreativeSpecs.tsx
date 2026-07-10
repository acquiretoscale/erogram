'use client';

export default function CreativeSpecs() {
    return (
        <div className="p-6 sm:p-8" style={{ background: 'linear-gradient(180deg, #0c2d48 0%, #0a1929 100%)', border: '3px solid #0ea5e9', boxShadow: '4px 4px 0px #0ea5e9' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                <div className="p-5" style={{ border: '2px solid rgba(14,165,233,0.4)', background: 'rgba(14,165,233,0.05)' }}>
                    <h3 className="text-sm font-black text-sky-400 uppercase tracking-wider mb-2">In-Feed Image</h3>
                    <ul className="space-y-1.5 text-sm text-[#999]">
                        <li>Live card media area: full card width x ~208px visible image area.</li>
                        <li>Best formats: 1080x1080 (square) or 1080x1350 (portrait).</li>
                        <li>Safe zone: keep logo and CTA inside center 80% of the creative.</li>
                        <li>Upload pipeline optimizes to WebP and may resize large files.</li>
                    </ul>
                </div>

                <div className="p-5" style={{ border: '2px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.05)' }}>
                    <h3 className="text-sm font-black text-purple-400 uppercase tracking-wider mb-2">In-Feed Video</h3>
                    <ul className="space-y-1.5 text-sm text-[#999]">
                        <li>Video can run as square style or full-card background format.</li>
                        <li>For full-card impact, use 9:16 or 4:5 portrait creative.</li>
                        <li>Accepted upload types: MP4, WebM, MOV.</li>
                        <li>Max upload size: 50MB per video file.</li>
                    </ul>
                </div>
            </div>

            <div className="p-5 mb-5" style={{ border: '2px solid rgba(14,165,233,0.3)', background: 'rgba(14,165,233,0.05)' }}>
                <h3 className="text-sm font-black text-sky-400 uppercase tracking-wider mb-3">CTA Text Length (Current UI)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                        <p className="font-bold text-[#f5f5f5]">Menu CTA (Navbar)</p>
                        <p className="text-[#999]">Ideal: 14-24 chars</p>
                        <p className="text-[#999]/70 text-xs mt-0.5">Hard max: ~34 chars before crowding in navbar</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                        <p className="font-bold text-[#f5f5f5]">Category Bar CTA</p>
                        <p className="text-[#999]">Ideal: 12-20 chars</p>
                        <p className="text-[#999]/70 text-xs mt-0.5">Hard max: ~26 chars for clean one-line display</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                        <p className="font-bold text-[#f5f5f5]">In-Page CTA (Top)</p>
                        <p className="text-[#999]">Ideal: 16-30 chars</p>
                        <p className="text-[#999]/70 text-xs mt-0.5">Hard max: ~42 chars on mobile before wrapping</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                        <p className="font-bold text-[#f5f5f5]">Home Page CTA</p>
                        <p className="text-[#999]">Ideal: 12-22 chars</p>
                        <p className="text-[#999]/70 text-xs mt-0.5">Hard max: ~30 chars for hero button balance</p>
                    </div>
                </div>
            </div>

            <div className="p-5" style={{ border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                <h3 className="text-sm font-black text-[#f5f5f5] uppercase tracking-wider mb-2">Homepage / Banner Creative</h3>
                <ul className="space-y-1.5 text-sm text-[#999]">
                    <li>Homepage hero and top banners are rendered full-width and responsive.</li>
                    <li>Recommended desktop creative: 1920x500 (or 1800x470) for sharp wide display.</li>
                    <li>Recommended mobile-safe variant: keep key text centered to avoid side crop risk.</li>
                    <li>Accepted: static image for banners; feed supports image or video.</li>
                </ul>
            </div>
        </div>
    );
}
