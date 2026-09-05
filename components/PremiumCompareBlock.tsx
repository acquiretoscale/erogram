import Link from 'next/link';
import type { ReactNode } from 'react';
import { FREE_BOOKMARK_LIMIT, FREE_FOLDER_LIMIT } from '@/lib/premiumLimits';

const ROWS = [
  { feature: 'Catalog', free: '300 groups', premium: '4,800+ hand-picked' },
  { feature: 'Search', free: 'Standard', premium: 'Advanced filters' },
  { feature: 'Access', free: 'Public feed', premium: 'Instant + Constant updates with fresh new verfied groups.' },
  { feature: 'Freshness', free: "We don't verify daily the expired links", premium: 'No expired links / Verfied Daily' },
  { feature: 'Categories', free: 'Public only', premium: 'over 60 categories (Kinks, Ethnicity, Body type etc...)' },
  { feature: 'Bookmarks', free: `${FREE_BOOKMARK_LIMIT} max`, premium: 'Unlimited' },
  { feature: 'Folders', free: `${FREE_FOLDER_LIMIT} max`, premium: 'Unlimited' },
  { feature: 'Theme', free: '2 themes', premium: 'Unlock all EROgram themes and pick what fits your vibe.' },
];

const MODAL_SHELL =
  'rounded-3xl border border-[#2AABEE]/25 bg-[#17212b] shadow-[0_0_60px_rgba(42,171,238,0.18),inset_0_1px_0_rgba(42,171,238,0.14)]';
const WHITE_INSET = 'rounded-2xl bg-white';
const PREMIUM_GOLD = {
  background: 'linear-gradient(135deg, #f5d061 0%, #c9973a 45%, #a67c00 100%)',
  color: '#2a1f00',
  border: '1px solid #e8c547',
  boxShadow: '0 0 10px rgba(201,151,58,0.45)',
};

function Cta({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  if (href.startsWith('#')) {
    return (
      <a href={href} className={className} style={PREMIUM_GOLD}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={PREMIUM_GOLD}>
      {children}
    </Link>
  );
}

export default function PremiumCompareBlock({
  className = 'mb-6',
  ctaHref = '/premium',
}: {
  className?: string;
  ctaHref?: string;
}) {
  const headerCtaClass =
    'shrink-0 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wide transition-all hover:brightness-110 hover:scale-[1.03] active:scale-[0.98]';
  const footerCtaClass =
    'mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-black uppercase tracking-wide transition-all hover:brightness-110 active:scale-95';

  return (
    <section className={`p-4 sm:p-5 ${MODAL_SHELL} ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2AABEE]">Compare Plans</p>
          <h3 className="text-lg sm:text-xl font-black text-white leading-tight mt-1">
            Free vs Erogram Premium
          </h3>
          <p className="text-[12px] text-white/55 mt-1">
            See exactly what you unlock with Premium.
          </p>
        </div>
        <Cta href={ctaHref} className={headerCtaClass}>
          Upgrade
        </Cta>
      </div>

      <div className={`${WHITE_INSET} overflow-hidden`}>
        <div className="grid grid-cols-3 text-[10px] font-black uppercase tracking-wider">
          <div className="px-3 py-2.5 text-gray-500 bg-gray-50">Feature</div>
          <div className="px-3 py-2.5 text-gray-500 bg-gray-50 border-l border-gray-200">Free</div>
          <div className="px-3 py-2.5 text-[#2a1f00] border-l border-[#e8c547]/50" style={{ background: 'linear-gradient(180deg, #fdf8ee 0%, #f5ead0 100%)' }}>
            Premium
          </div>
        </div>
        {ROWS.map((row) => (
          <div key={row.feature} className="grid grid-cols-3 text-[12px] border-t border-gray-200">
            <div className="px-3 py-2.5 font-bold text-gray-900 leading-snug">{row.feature}</div>
            <div className="px-3 py-2.5 text-gray-500 border-l border-gray-200 leading-snug">{row.free}</div>
            <div className="px-3 py-2.5 font-semibold text-gray-900 border-l border-[#e8c547]/40 leading-snug bg-[#fdf8ee]">
              {row.premium}
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-3 ${WHITE_INSET} p-3.5`}>
        <p className="text-[10px] font-black uppercase tracking-wider mb-2 text-[#c9973a]">Premium Highlights</p>
        <div className="space-y-1.5 text-[13px] font-semibold text-gray-800">
          <p>👩🏻 4,800+ hand-picked channels</p>
          <p>🔥 Advanced filters to find faster</p>
          <p>⚡ Immediate access + free updates</p>
          <p>🎯 Exclusive non-public niches</p>
        </div>
      </div>

      <Cta href={ctaHref} className={footerCtaClass}>
        Unlock Erogram Premium
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </Cta>
    </section>
  );
}
