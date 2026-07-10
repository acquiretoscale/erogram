'use client';

const COUNTRIES = [
  { country: 'United States', flag: '🇺🇸', pct: 31.0 },
  { country: 'Germany',       flag: '🇩🇪', pct: 6.5  },
  { country: 'Netherlands',   flag: '🇳🇱', pct: 4.2  },
  { country: 'United Kingdom',flag: '🇬🇧', pct: 4.0  },
  { country: 'Canada',        flag: '🇨🇦', pct: 3.7  },
  { country: 'Italy',         flag: '🇮🇹', pct: 2.6  },
  { country: 'Singapore',     flag: '🇸🇬', pct: 3.0  },
  { country: 'India',         flag: '🇮🇳', pct: 2.8  },
  { country: 'Poland',        flag: '🇵🇱', pct: 2.3  },
  { country: 'Spain',         flag: '🇪🇸', pct: 2.0  },
];

const MAX_PCT = 31.0;

export default function AudienceCountries() {
  return (
    <div className="rounded-2xl p-4 sm:p-6 md:p-8 mb-6 overflow-hidden bg-white border border-gray-100 shadow-sm">
      <div className="rounded-xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 flex flex-wrap items-center gap-2 sm:gap-3 bg-white">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0ea5e9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900">Geographic Distribution</h3>
            <p className="text-[9px] sm:text-[10px] text-gray-600">Tier 1 &amp; Tier 2 audience composition</p>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 uppercase tracking-wider shrink-0">Tier 1 &amp; 2</span>
        </div>

        <div className="bg-white">
          {/* Country data */}
          <div className="p-4 sm:p-5 md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4">Top Countries by Traffic Share</p>

            {/* Country rows */}
            <div className="space-y-1.5">
              {COUNTRIES.map((c, i) => (
                <div key={c.country} className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 sm:px-3 py-2 sm:py-2.5 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2">
                    <span className="text-[9px] sm:text-[10px] text-gray-600 w-3 text-right font-mono font-bold tabular-nums">{i + 1}</span>
                    <span className="text-sm sm:text-base leading-none">{c.flag}</span>
                    <span className="text-[12px] sm:text-[13px] text-gray-700 font-medium flex-1 truncate">{c.country}</span>
                    <span className="text-[11px] sm:text-[12px] text-gray-900 font-bold tabular-nums shrink-0">{c.pct}%</span>
                  </div>
                  {/* Track */}
                  <div className="ml-7 sm:ml-8 h-1.5 sm:h-2 rounded-full bg-gray-200">
                    {/* Fill — inline-block avoids overflow-hidden clipping issue */}
                    <div
                      className="h-1.5 sm:h-2 rounded-full"
                      style={{
                        width: `${(c.pct / MAX_PCT) * 100}%`,
                        background: '#0ea5e9',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
