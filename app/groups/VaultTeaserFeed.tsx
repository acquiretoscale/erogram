'use client';

import Link from 'next/link';

export interface VaultTeaserItem {
  _id: string;
  name: string;
  image: string;
  category: string;
  categories?: string[];
  country?: string;
  memberCount: number;
  vaultCategories?: string[];
}

const fmtNum = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000
      ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K'
      : n > 0
        ? String(n)
        : null;

export default function VaultTeaserFeed({ items }: { items: VaultTeaserItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <Link href="/premium" target="_blank" className="block col-span-full group/vault cursor-pointer">
      {/* Outer orange gradient border wrapper */}
      <div className="relative p-[2px] rounded-2xl" style={{ background: 'linear-gradient(135deg, #ff006e, #fb5607, #ffbe0b, #ff6b35)' }}>
        {/* EROGRAM PREMIUM badge — top-right, overlapping border */}
        <div className="absolute -top-[1px] right-3 z-10">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-b-md text-[9px] font-black uppercase tracking-[0.15em]"
            style={{ background: 'linear-gradient(135deg, #fb5607, #ffbe0b)', color: '#1a0800' }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            EROGRAM PREMIUM
          </span>
        </div>

        <div
          className="relative rounded-[14px] overflow-hidden p-3 sm:p-4 transition-all group-hover/vault:scale-[1.005]"
          style={{ background: 'linear-gradient(160deg, #0f0d09 0%, #110e08 60%, #0d0b07 100%)' }}
        >
        <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.06] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, #fb5607 0%, transparent 60%)' }} />

        <div className="relative grid grid-cols-2 gap-1.5">
          {items.slice(0, 12).map((g) => {
            const fmt = fmtNum(g.memberCount);
            const cats = g.vaultCategories && g.vaultCategories.length > 0 ? g.vaultCategories : (g.categories?.length ? g.categories : (g.category && g.category !== 'All' ? [g.category] : []));
            return (
              <div
                key={g._id}
                className="relative rounded-lg flex items-center gap-2 px-2 py-1.5 select-none"
                style={{ background: 'linear-gradient(135deg, #120f09 0%, #150f08 100%)', border: '1px solid #2a1f0e' }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(180deg, transparent, #c9973a44, transparent)' }} />
                <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden" style={{ border: '1px solid #2e2010' }}>
                  <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[10px] truncate leading-tight mb-0.5 select-none pointer-events-none" aria-hidden="true">
                    <span className="text-white">{g.name.slice(0, 4)}</span>
                    <span style={{ filter: 'blur(4px)', color: '#fff' }}>{g.name.slice(4) || '····'}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {cats.map((c: string, i: number) => (
                      <span key={c} className="text-[7px] font-black uppercase tracking-[0.06em] px-1 py-0.5 rounded shrink-0" style={{ background: i === 0 ? '#1a1408' : '#12100a', border: '1px solid #c9973a22', color: i === 0 ? '#c9973a' : '#7a6040' }}>{c}</span>
                    ))}
                    {g.country && <span className="text-[8px] font-semibold truncate" style={{ color: '#5a4830' }}>{g.country}</span>}
                    {fmt && <span className="text-[8px] font-semibold shrink-0" style={{ color: '#4a3820' }}>· {fmt}</span>}
                  </div>
                </div>
                <svg className="shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c9973a55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #0f0d09)' }} />

        <div
          className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-[13px] transition-all group-hover/vault:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #fb5607, #ffbe0b)', color: '#1a0800' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Unlock 4000+ exclusive NSFW & Porn Telegram groups
        </div>
        <p className="mt-2 text-center text-[10px]" style={{ color: '#fb923c' }}>Over 60 categories · Updated regularly</p>
        </div>{/* end inner dark card */}
      </div>{/* end orange border wrapper */}
    </Link>
  );
}
