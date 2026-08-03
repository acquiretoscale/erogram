'use client';

const COUNTRIES = [
  { country: 'United States', flag: '🇺🇸', pct: 29.0 },
  { country: 'Germany',       flag: '🇩🇪', pct: 7.0  },
  { country: 'Netherlands',   flag: '🇳🇱', pct: 4.0  },
  { country: 'United Kingdom',flag: '🇬🇧', pct: 4.0  },
  { country: 'Canada',        flag: '🇨🇦', pct: 4.0  },
  { country: 'Italy',         flag: '🇮🇹', pct: 3.0  },
  { country: 'Spain',         flag: '🇪🇸', pct: 2.5  },
  { country: 'Australia',     flag: '🇦🇺', pct: 2.0  },
  { country: 'Turkey',        flag: '🇹🇷', pct: 2.0  },
  { country: 'Singapore',     flag: '🇸🇬', pct: 2.0  },
  { country: 'Malaysia',      flag: '🇲🇾', pct: 2.0  },
];

const ACCENT = '#22c55e';
const HEADER_BG = 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)';
const BORDER = '3px solid #000000';
const SHADOW = '6px 6px 0px #000000';

function GeoHeader({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="px-2.5 py-1.5 shrink-0" style={{ background: HEADER_BG, borderBottom: `2px solid ${ACCENT}` }}>
        <h3 className="text-[10px] font-black uppercase tracking-wide text-white">Geographic Distribution</h3>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-5 py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-3" style={{ background: HEADER_BG, borderBottom: BORDER }}>
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4ade80]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">Geographic Distribution</h3>
      </div>
    </div>
  );
}

function GeoTable({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex-1 min-h-0 p-2 bg-white flex flex-col justify-between gap-0.5">
        {COUNTRIES.map((c) => (
          <div key={c.country} className="flex items-center gap-1.5 min-w-0 px-1.5 py-[2px] rounded bg-[#f8faf9] border border-black/5">
            <span className="text-[11px] leading-none shrink-0">{c.flag}</span>
            <span className="text-[10px] text-black/75 font-semibold flex-1 truncate">{c.country}</span>
            <span className="text-[10px] text-[#16a34a] font-black tabular-nums shrink-0">{c.pct}%</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 bg-white flex-1">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45 mb-4">Top Countries by Traffic Share</p>
      <div className="space-y-1.5">
        {COUNTRIES.map((c, i) => (
          <div key={c.country} className="rounded-lg bg-[#f8faf9] border border-black/10 px-2.5 sm:px-3 py-2 sm:py-2.5">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span className="text-[9px] sm:text-[10px] text-black/40 w-3 text-right font-mono font-bold tabular-nums">{i + 1}</span>
              <span className="text-sm sm:text-base leading-none">{c.flag}</span>
              <span className="text-[12px] sm:text-[13px] text-black/80 font-semibold flex-1 truncate">{c.country}</span>
              <span className="text-[11px] sm:text-[12px] text-[#16a34a] font-black tabular-nums shrink-0">{c.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AudienceCountriesPanel({ embedded = false }: { embedded?: boolean }) {
  if (embedded) {
    return (
      <div className="overflow-hidden bg-white h-full min-h-0 flex flex-col" style={{ border: `2px solid ${ACCENT}` }}>
        <GeoHeader compact />
        <GeoTable compact />
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden bg-white" style={{ border: BORDER, boxShadow: SHADOW }}>
      <GeoHeader />
      <GeoTable />
    </div>
  );
}

export default function AudienceCountries() {
  return <AudienceCountriesPanel />;
}
