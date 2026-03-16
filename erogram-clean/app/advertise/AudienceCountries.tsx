'use client';

const COUNTRIES = [
  { country: 'United States', flag: '🇺🇸', pct: 31.0 },
  { country: 'Germany',       flag: '🇩🇪', pct: 6.5  },
  { country: 'Turkey',        flag: '🇹🇷', pct: 5.2  },
  { country: 'Netherlands',   flag: '🇳🇱', pct: 4.2  },
  { country: 'United Kingdom',flag: '🇬🇧', pct: 4.0  },
  { country: 'Canada',        flag: '🇨🇦', pct: 3.7  },
  { country: 'Italy',         flag: '🇮🇹', pct: 2.6  },
  { country: 'Poland',        flag: '🇵🇱', pct: 2.3  },
];

const MAX_PCT = 31.0;

export default function AudienceCountries() {
  return (
    <div className="rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden bg-white border border-gray-100 shadow-sm">
      <div className="rounded-xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3 bg-white">
          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#b31b1b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Geographic Distribution</h3>
            <p className="text-[10px] text-gray-600">Premium Tier-1 audience composition</p>
          </div>
          <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#b31b1b]/10 text-[#b31b1b] border border-[#b31b1b]/20 uppercase tracking-wider">Tier-1 Focus</span>
        </div>

        <div className="flex flex-col lg:flex-row bg-white">
          {/* Left — data */}
          <div className="flex-1 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4">Top Countries by Traffic Share</p>

            {/* Summary pill */}
            <div className="mb-5 pb-5 border-b border-gray-100">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-0.5">US &amp; Canada</p>
                <p className="text-xl font-black text-gray-900 tabular-nums">34.7%</p>
              </div>
            </div>

            {/* Country rows */}
            <div className="space-y-1.5">
              {COUNTRIES.map((c, i) => (
                <div key={c.country} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-[10px] text-gray-600 w-3 text-right font-mono font-bold tabular-nums">{i + 1}</span>
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="text-[13px] text-gray-700 font-medium flex-1">{c.country}</span>
                    <span className="text-[12px] text-gray-900 font-bold tabular-nums">{c.pct}%</span>
                  </div>
                  {/* Track */}
                  <div className="ml-8 h-2 rounded-full bg-gray-200">
                    {/* Fill — inline-block avoids overflow-hidden clipping issue */}
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(c.pct / MAX_PCT) * 100}%`,
                        background: '#b31b1b',
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
              Premium Tier-1 reach.<br />
              <span className="text-[#b31b1b]">High-intent, high-GDP audience.</span>
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Over <span className="text-gray-800 font-semibold">55% of traffic</span> comes from the US, Canada, and Western Europe — the highest-spending digital markets globally.
            </p>
            <div className="rounded-xl bg-white border border-gray-200 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-600 mb-1.5">Key Takeaway</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tech-aware, often crypto-aware Telegram users with disposable income — ideal for premium brands in adult, crypto, tech, and lifestyle sectors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
