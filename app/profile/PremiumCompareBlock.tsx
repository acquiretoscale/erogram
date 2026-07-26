import Link from 'next/link';

const FREE_BOOKMARK_LIMIT = 20;
const FREE_FOLDER_LIMIT = 2;

const ROWS = [
  { feature: 'Catalog', free: '300 groups', premium: '4,800+ hand-picked' },
  { feature: 'Search', free: 'Standard', premium: 'Advanced filters' },
  { feature: 'Access', free: 'Public feed', premium: 'Instant + updates' },
  { feature: 'Niches', free: 'Public only', premium: 'Exclusive groups' },
  { feature: 'Saved', free: `${FREE_BOOKMARK_LIMIT} max`, premium: 'Unlimited' },
  { feature: 'Folders', free: `${FREE_FOLDER_LIMIT} max`, premium: 'Unlimited' },
];

export default function PremiumCompareBlock({ className = 'mb-6' }: { className?: string }) {
  return (
    <section
      className={`rounded-2xl p-4 sm:p-5 ${className}`}
      style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Compare Plans</p>
          <h3 className="text-[18px] sm:text-[20px] font-black text-gray-900 leading-tight mt-1">
            Free vs Premium Vault
          </h3>
          <p className="text-[12px] text-gray-600 mt-1">
            See exactly what you unlock with Premium.
          </p>
        </div>
        <Link
          href="/premium"
          className="shrink-0 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all hover:scale-[1.03]"
          style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
        >
          Upgrade
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-3 bg-gray-50 text-[9px] font-black uppercase tracking-wider">
          <div className="px-2 py-1.5 text-gray-500">Feature</div>
          <div className="px-2 py-1.5 text-gray-600 border-l border-gray-200">Free</div>
          <div className="px-2 py-1.5 text-amber-700 border-l border-gray-200">Premium</div>
        </div>
        {ROWS.map((row) => (
          <div key={row.feature} className="grid grid-cols-3 text-[11px] border-t border-gray-200">
            <div className="px-2 py-1.5 font-semibold text-gray-800">{row.feature}</div>
            <div className="px-2 py-1.5 text-gray-700 border-l border-gray-200">{row.free}</div>
            <div className="px-2 py-1.5 font-semibold text-gray-900 border-l border-gray-200" style={{ background: '#fff8e8' }}>
              {row.premium}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-lg p-2.5" style={{ background: 'linear-gradient(135deg, #fff8e8, #fff2d1)', border: '1px solid #f3d9a6' }}>
        <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: '#8a6115' }}>Premium Highlights</p>
        <div className="space-y-1 text-[11px] text-gray-900">
          <p>👩🏻 4,800+ hand-picked channels</p>
          <p>🔥 Advanced filters to find faster</p>
          <p>⚡ Immediate access + free updates</p>
          <p>🎯 Exclusive non-public niches</p>
        </div>
      </div>

      <Link
        href="/premium"
        className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-black uppercase tracking-wide transition-all hover:scale-[1.01] active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
      >
        Unlock Premium Vault
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </Link>
    </section>
  );
}
