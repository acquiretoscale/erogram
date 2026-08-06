'use client';

const COUNTRIES = [
  { country: 'United States', flag: '🇺🇸', pct: 29.0 },
  { country: 'Germany', flag: '🇩🇪', pct: 7.0 },
  { country: 'Netherlands', flag: '🇳🇱', pct: 4.0 },
  { country: 'United Kingdom', flag: '🇬🇧', pct: 4.0 },
  { country: 'Canada', flag: '🇨🇦', pct: 4.0 },
  { country: 'Italy', flag: '🇮🇹', pct: 3.0 },
  { country: 'Spain', flag: '🇪🇸', pct: 2.5 },
  { country: 'Australia', flag: '🇦🇺', pct: 2.0 },
];

const MAX_PCT = 29.0;
const HEADER_BG = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';

export default function SubmitAudienceCountries({ embedded = false }: { embedded?: boolean }) {
  const header = (
    <div
      className={`px-4 sm:px-5 py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-3 ${embedded ? 'border-b border-[#00AFF0]/20' : 'border-b border-[#00AFF0]/25'}`}
      style={{ background: HEADER_BG }}
    >
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00AFF0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">Geographic Distribution</h3>
        {!embedded && (
          <p className="text-[9px] sm:text-[10px] text-white/45">Tier 1 &amp; Tier 2 audience composition</p>
        )}
      </div>
      <span className="text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#00AFF0]/15 text-[#00AFF0] border border-[#00AFF0]/25 uppercase tracking-wider shrink-0">
        Tier 1 &amp; 2
      </span>
    </div>
  );

  const rows = (
    <div className={`space-y-1.5 ${embedded ? 'p-4 sm:p-5' : 'p-4 sm:p-5'}`}>
      {!embedded && (
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Top Countries by Traffic Share</p>
      )}
      {COUNTRIES.map((c, i) => (
        <div
          key={c.country}
          className={
            embedded
              ? 'rounded-lg bg-white/[0.06] border border-white/10 px-2.5 sm:px-3 py-2 sm:py-2.5'
              : 'rounded-lg bg-[#f0f8ff]/60 border border-[#00AFF0]/10 px-2.5 sm:px-3 py-2 sm:py-2.5'
          }
        >
          <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2">
            <span className={`text-[9px] sm:text-[10px] w-3 text-right font-mono font-bold tabular-nums ${embedded ? 'text-white/35' : 'text-gray-400'}`}>
              {i + 1}
            </span>
            <span className="text-sm sm:text-base leading-none">{c.flag}</span>
            <span className={`text-[12px] sm:text-[13px] font-semibold flex-1 truncate ${embedded ? 'text-white/90' : 'text-gray-800'}`}>
              {c.country}
            </span>
            <span className="text-[11px] sm:text-[12px] text-[#00AFF0] font-black tabular-nums shrink-0">{c.pct}%</span>
          </div>
          <div className={`ml-7 sm:ml-8 h-1.5 sm:h-2 rounded-full ${embedded ? 'bg-white/10' : 'bg-[#00AFF0]/10'}`}>
            <div
              className="h-1.5 sm:h-2 rounded-full bg-gradient-to-r from-[#009AD6] to-[#00AFF0]"
              style={{ width: `${(c.pct / MAX_PCT) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  if (embedded) {
    return (
      <div className="overflow-hidden rounded-xl border border-[#00AFF0]/25 bg-[#071222]">
        {header}
        {rows}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#00AFF0]/30 bg-white shadow-[0_16px_40px_-20px_rgba(0,40,80,0.55)]">
      {header}
      {rows}
    </section>
  );
}
