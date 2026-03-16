'use client';

import Image from 'next/image';

const DEVICES = [
  { os: 'iOS',       visitors: '32.7K', pct: 52.9 },
  { os: 'Android',   visitors: '23.9K', pct: 38.7 },
  { os: 'Windows',   visitors: '2.7K',  pct: 4.4  },
  { os: 'macOS',     visitors: '2.0K',  pct: 3.3  },
  { os: 'GNU/Linux', visitors: '357',   pct: 0.6  },
];

export default function AudienceDevices() {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#ff3366] to-[#b31b1b]" />
        <h3 className="text-xl font-black text-[#f5f5f5]">Erogram Website</h3>
      </div>

      {/* ── DEVICES ── */}
      <div className="rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden bg-white border border-gray-100 shadow-sm">
        <div className="rounded-xl border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3 bg-white">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#b31b1b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Device &amp; OS Breakdown</h3>
              <p className="text-[10px] text-gray-600">Where your ads are seen</p>
            </div>
            <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#b31b1b]/10 text-[#b31b1b] border border-[#b31b1b]/20 uppercase tracking-wider">91.6% Mobile</span>
          </div>

          <div className="flex flex-col lg:flex-row bg-white">
            {/* Left — data */}
            <div className="flex-1 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4">Operating Systems</p>

              {/* Donut + legend */}
              <div className="flex items-center gap-5 mb-5 pb-5 border-b border-gray-100">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#b31b1b" strokeWidth="3.5"
                      strokeDasharray="52.9 100" strokeLinecap="butt" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#d1d5db" strokeWidth="3.5"
                      strokeDasharray="38.7 100" strokeDashoffset="-52.9" strokeLinecap="butt" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[12px] font-black text-gray-900 leading-none">91.6%</span>
                    <span className="text-[8px] text-gray-600 uppercase tracking-wider">mobile</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#b31b1b] shrink-0" />
                    <span className="text-xs text-gray-600">iOS</span>
                    <span className="text-xs font-bold text-gray-900 ml-auto tabular-nums">52.9%</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                    <span className="text-xs text-gray-600">Android</span>
                    <span className="text-xs font-bold text-gray-900 ml-auto tabular-nums">38.7%</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-gray-200 shrink-0" />
                    <span className="text-xs text-gray-600">Desktop</span>
                    <span className="text-xs font-bold text-gray-900 ml-auto tabular-nums">8.3%</span>
                  </div>
                </div>
              </div>

              {/* OS bars */}
              <div className="space-y-2">
                {DEVICES.map((d) => (
                  <div key={d.os} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] text-gray-700 font-medium">{d.os}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-600 tabular-nums">{d.visitors}</span>
                        <span className="text-[12px] text-gray-900 font-bold tabular-nums w-10 text-right">{d.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200">
                      <div className="h-2 rounded-full"
                        style={{
                          width: `${d.pct}%`,
                          background: d.os === 'iOS' ? '#b31b1b' : '#9ca3af',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — insight */}
            <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-gray-100 bg-gray-50 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4">Advertiser Insight</p>

              <h4 className="text-lg font-black text-gray-900 mb-3 leading-snug">
                Mobile-first audience.<br />
                <span className="text-[#b31b1b]">In-Feed ads built for it.</span>
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                <span className="text-gray-800 font-semibold">91.6% of our audience</span> accesses Erogram.pro on mobile.
                Our In-Feed placements are native to this experience — appearing directly in the content scroll, not as intrusive banners that get ignored.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                This makes In-Feed the highest-performing ad format on the platform, with measurably higher CTR than any other placement type.
              </p>
              <div className="rounded-xl bg-white border border-gray-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-600 mb-1.5">Key Takeaway</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  In-feed video ads on mobile generate up to <span className="text-gray-800 font-semibold">4x more clicks</span> than banner placements. Your message appears where users are already engaged.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIMILARWEB ── */}
      <div className="rounded-2xl p-6 sm:p-8 mt-6 overflow-hidden bg-white border border-gray-100 shadow-sm">
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3 bg-white">
            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#b31b1b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">SimilarWeb Stats Overview</h3>
          </div>
          <div className="p-4 flex items-center justify-center bg-white">
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm w-[80%] sm:w-[60%] lg:w-[30%]">
              <Image
                src="/assets/similarweb-stats.png"
                alt="SimilarWeb traffic chart — erogram.pro visits over time Nov–Jan 2026"
                width={700} height={900} className="w-full h-auto"
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50">
            <svg className="w-4 h-4 text-[#b31b1b] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <a href="https://pro.similarweb.com/?domain=erogram.pro" target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold text-[#b31b1b] hover:underline tracking-wide">
              Source: pro.similarweb.com — erogram.pro
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
