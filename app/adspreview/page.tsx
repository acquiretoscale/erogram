'use client';

import { useState } from 'react';
import Link from 'next/link';

type Period = 'mar10' | 'mar15' | 'current';

export default function AdsPreviewPage() {
  const [activePeriod, setActivePeriod] = useState<Period>('mar10');

  const periods: { key: Period; label: string; date: string; salesInfo: string; color: string }[] = [
    { key: 'mar10', label: 'Mar 10-11', date: 'Sales Period', salesInfo: '5 sales ($45)', color: '#22c55e' },
    { key: 'mar15', label: 'Mar 15', date: 'Last Sale', salesInfo: '1 sale ($9)', color: '#f59e0b' },
    { key: 'current', label: 'Now', date: 'Mar 16-18', salesInfo: '0 sales', color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Premium Ad Placements — Timeline Comparison</h1>
        <p className="text-white/50 text-sm mb-8">Exact reconstruction of what users saw during each period</p>

        {/* Period Tabs */}
        <div className="flex gap-3 mb-10 flex-wrap">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                activePeriod === p.key
                  ? 'scale-105 ring-2'
                  : 'opacity-60 hover:opacity-90'
              }`}
              style={{
                background: activePeriod === p.key ? `${p.color}20` : '#1a1a1a',
                borderColor: p.color,
                border: `1px solid ${activePeriod === p.key ? p.color : '#333'}`,
                boxShadow: activePeriod === p.key ? `0 0 0 2px ${p.color}40` : 'none',
              }}
            >
              <div className="text-white">{p.label}</div>
              <div className="text-[11px] mt-0.5" style={{ color: p.color }}>{p.salesInfo}</div>
            </button>
          ))}
        </div>

        {/* Side by side view */}
        <div className="space-y-16">

          {/* ── PLACEMENT 1: Story Bar Premium Circle ── */}
          <PlacementSection
            title="1. Story Bar — Premium Upgrade Circle"
            location="/groups feed → top story bar → last circle"
            existed={{ mar10: true, mar15: true, current: true }}
            activePeriod={activePeriod}
          >
            <StoryBarCirclePreview />
            <div className="text-xs text-white/40 mt-2">
              {activePeriod === 'mar10' && 'Identical across all periods — spinning gold circle with star icon. Always links to /premium.'}
              {activePeriod === 'mar15' && 'Identical across all periods — no changes.'}
              {activePeriod === 'current' && 'Identical across all periods — no changes.'}
            </div>
          </PlacementSection>

          {/* ── PLACEMENT 2: Trending Categories Pill ── */}
          <PlacementSection
            title="2. Trending Categories — Premium Gold Pill"
            location="/groups feed → below story bar → trending categories row"
            existed={{ mar10: false, mar15: false, current: true }}
            activePeriod={activePeriod}
          >
            {activePeriod === 'current' ? (
              <TrendingPillPreview version="current" />
            ) : activePeriod === 'mar15' ? (
              <TrendingPillPreview version="mar15" />
            ) : (
              <TrendingPillPreview version="mar10" />
            )}
          </PlacementSection>

          {/* ── PLACEMENT 3: Story Viewer — Premium Grid Slide ── */}
          <PlacementSection
            title="3. Story Viewer — Premium Grid Slide"
            location="Tap any story circle → premium grid slide shows 2×2 vault preview"
            existed={{ mar10: true, mar15: true, current: true }}
            activePeriod={activePeriod}
          >
            <StoryViewerPreview />
            <div className="text-xs text-white/40 mt-2">
              Purple/gold gradient with 2×2 group preview grid + &quot;Unlock Premium&quot; CTA button.
              Identical across all periods.
            </div>
          </PlacementSection>

          {/* ── PLACEMENT 4: Inside Group — Premium Gate ── */}
          <PlacementSection
            title="4. Inside Group Page — Premium Gate"
            location="/[slug] → premium-only groups show lock gate for non-premium users"
            existed={{ mar10: true, mar15: true, current: true }}
            activePeriod={activePeriod}
          >
            <PremiumGatePreview />
            <div className="text-xs text-white/40 mt-2">
              Lock icon + &quot;Premium Content&quot; gate blocks access. Identical across all periods.
            </div>
          </PlacementSection>

          {/* ── PLACEMENT 5: Inside Group — Vault Teaser Mosaic ── */}
          <PlacementSection
            title="5. Inside Group Page — Vault Teaser Mosaic"
            location="/[slug] → below CTA buttons → 'Private Vault' section with blurred group previews"
            existed={{ mar10: true, mar15: true, current: true }}
            activePeriod={activePeriod}
          >
            <VaultTeaserPreview />
            <div className="text-xs text-white/40 mt-2">
              Gold-themed mosaic showing premium groups with blurred names. Links to /premium. Identical across all periods.
            </div>
          </PlacementSection>

          {/* ── PLACEMENT 6: Profile — Unlock the Vault Banner ── */}
          <PlacementSection
            title="6. Profile Page — Unlock the Vault Banner"
            location="/profile → below profile info → for non-premium users"
            existed={{ mar10: true, mar15: true, current: true }}
            activePeriod={activePeriod}
          >
            {activePeriod === 'mar10' ? (
              <ProfileBannerPreview version="mar10" />
            ) : (
              <ProfileBannerPreview version="current" />
            )}
          </PlacementSection>

          {/* ── PLACEMENT 7: Vault Tab — Locked State ── */}
          <PlacementSection
            title="7. Vault Tab — Locked State"
            location="/profile → 'Vault' tab → non-premium users see locked preview"
            existed={{ mar10: true, mar15: true, current: true }}
            activePeriod={activePeriod}
          >
            <VaultLockedPreview />
            <div className="text-xs text-white/40 mt-2">
              Blurred group grid + &quot;Vault Locked&quot; heading + &quot;Unlock Premium&quot; sticky CTA. Present across all periods.
            </div>
          </PlacementSection>

          {/* ── PLACEMENT 8: In-Feed Premium Mosaic Card ── */}
          <PlacementSection
            title="8. In-Feed Premium Mosaic Card (NEW)"
            location="/groups feed → injected between group cards at various positions"
            existed={{ mar10: false, mar15: false, current: true }}
            activePeriod={activePeriod}
          >
            {activePeriod === 'current' ? (
              <FeedMosaicPreview />
            ) : (
              <div className="text-center py-12 rounded-2xl border border-dashed border-white/10">
                <p className="text-white/30 text-lg font-bold">DID NOT EXIST</p>
                <p className="text-white/20 text-sm mt-1">
                  PremiumMosaicCard was added on March 15 (commit acd72b5).
                  <br />No in-feed premium ads during the sales period.
                </p>
              </div>
            )}
          </PlacementSection>

          {/* ── PLACEMENT 9: Premium CTA on /premium page ── */}
          <PlacementSection
            title="9. Premium Landing Page (the destination)"
            location="/premium — where all CTAs link to"
            existed={{ mar10: true, mar15: true, current: true }}
            activePeriod={activePeriod}
          >
            <PremiumPageCompare activePeriod={activePeriod} />
          </PlacementSection>
        </div>

        {/* Summary Table */}
        <div className="mt-20 rounded-2xl overflow-hidden border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left p-4 font-bold text-white/70">Placement</th>
                <th className="text-center p-4 font-bold" style={{ color: '#22c55e' }}>Mar 10-11 (5 sales)</th>
                <th className="text-center p-4 font-bold" style={{ color: '#f59e0b' }}>Mar 15 (1 sale)</th>
                <th className="text-center p-4 font-bold" style={{ color: '#ef4444' }}>Now (0 sales)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Story Bar Circle', m10: '✅', m15: '✅', now: '✅', note: 'No change' },
                { name: 'Trending Premium Pill', m10: '❌', m15: '❌', now: '✅ NEW', note: 'Added Mar 14' },
                { name: 'Story Premium Grid', m10: '✅', m15: '✅', now: '✅', note: 'No change' },
                { name: 'Group Premium Gate', m10: '✅', m15: '✅', now: '✅', note: 'No change' },
                { name: 'Group Vault Teaser', m10: '✅', m15: '✅', now: '✅', note: 'No change' },
                { name: 'Profile Vault Banner', m10: '✅ simple', m15: '✅ gold', now: '✅ gold', note: 'Upgraded to gold CTA on Mar 14' },
                { name: 'Vault Locked Tab', m10: '✅', m15: '✅', now: '✅', note: 'No change' },
                { name: 'In-Feed Mosaic Ad', m10: '❌', m15: '❌', now: '✅ NEW', note: 'Added Mar 15 — 0.46% CTR' },
                { name: 'Social Proof Toasts', m10: '✅', m15: '✅', now: '✅', note: 'Added Mar 11' },
              ].map((row, i) => (
                <tr key={i} className="border-t border-white/5">
                  <td className="p-4 font-semibold text-white/80">{row.name}</td>
                  <td className="p-4 text-center">{row.m10}</td>
                  <td className="p-4 text-center">{row.m15}</td>
                  <td className="p-4 text-center">{row.now}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 rounded-2xl p-6 border border-amber-500/20" style={{ background: '#1a1408' }}>
          <h3 className="text-lg font-black text-amber-400 mb-3">Key Insight</h3>
          <p className="text-white/70 text-sm leading-relaxed">
            The sales period (Mar 10-11) had <strong className="text-white">fewer premium placements</strong> than today, yet converted better.
            The core driver was the same set of organic placements — Story Bar circle, Story premium grid slide,
            group premium gate, and the vault teaser inside group pages.
            Since then, you <em>added</em> the trending pill and in-feed mosaic ads, but these haven&apos;t converted.
            The difference is <strong className="text-white">on the landing page itself</strong> (/premium) — not the ads driving traffic to it.
            Compare the landing pages directly at{' '}
            <Link href="/premium10" className="text-amber-400 underline">/premium10</Link>,{' '}
            <Link href="/premium15" className="text-amber-400 underline">/premium15</Link>, and{' '}
            <Link href="/premium" className="text-amber-400 underline">/premium</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlacementSection({
  title,
  location,
  existed,
  activePeriod,
  children,
}: {
  title: string;
  location: string;
  existed: Record<Period, boolean>;
  activePeriod: Period;
  children: React.ReactNode;
}) {
  const present = existed[activePeriod];
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-black text-white">{title}</h2>
        {present ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">ACTIVE</span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">NOT PRESENT</span>
        )}
      </div>
      <p className="text-white/30 text-xs mb-4 font-mono">{location}</p>
      <div className="rounded-2xl border border-white/10 bg-[#111] p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   INDIVIDUAL PLACEMENT PREVIEWS
   ═══════════════════════════════════════════════════════ */

function StoryBarCirclePreview() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="relative w-[76px] h-[76px]">
          <style>{`@keyframes spin-gold { to { transform: rotate(360deg); } }`}</style>
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute"
              style={{
                inset: '-24px',
                background: 'conic-gradient(from 0deg, #f59e0b, #ef4444, #f59e0b, #fbbf24, #f59e0b)',
                animation: 'spin-gold 3s linear infinite',
              }}
            />
          </div>
          <div className="absolute inset-[3px] rounded-full" style={{ background: '#1a1008' }} />
          <div
            className="absolute inset-[5px] rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1c1203, #2d1f04)' }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
            </svg>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase tracking-tight text-center leading-tight text-amber-400 max-w-[76px]">
          Upgrade<br />Premium
        </span>
      </div>
      <div className="text-sm text-white/50">
        <p>Links to: <code className="text-amber-400">/premium</code></p>
        <p className="mt-1">Position: Last circle in story bar (after all story categories)</p>
      </div>
    </div>
  );
}

function TrendingPillPreview({ version }: { version: 'mar10' | 'mar15' | 'current' }) {
  const categories =
    version === 'mar10'
      ? ['Lesbian', 'Threesome', 'Big Ass', 'Amateur', 'Onlyfans', 'Hentai', 'Thailand', 'Russia', 'UK', 'Germany', 'France']
      : ['Russian', 'Amateur', 'Threesome', 'Lesbian', 'China', 'Cosplay', 'Blowjob', 'Colombia'];

  const hasPremiumPill = version === 'current';

  return (
    <div>
      <div
        className="rounded-xl p-2.5"
        style={{ background: 'linear-gradient(135deg, #1a1510, #191510)', border: '1px solid rgba(245,158,11,0.15)' }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider shrink-0 mr-0.5" style={{ color: '#f59e0b' }}>
            🔥 Trending Categories
          </span>
          {categories.map(cat => (
            <span
              key={cat}
              className="px-2 py-[3px] text-[9px] font-bold rounded-full whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15))',
                color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              {cat}
            </span>
          ))}
          {hasPremiumPill && (
            <span
              className="px-3 py-1.5 text-[10px] font-black rounded-full whitespace-nowrap inline-flex items-center gap-1"
              style={{
                background: 'linear-gradient(135deg, #c9973a, #e8ba5a)',
                color: '#0d0c0a',
                boxShadow: '0 0 10px rgba(201,151,58,0.35)',
              }}
            >
              ⭐ EROGRAM PREMIUM
            </span>
          )}
        </div>
      </div>
      {!hasPremiumPill && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-400 text-xs font-bold">⚠️ No premium pill in trending categories during this period</p>
          <p className="text-white/40 text-[11px] mt-0.5">The gold &quot;EROGRAM PREMIUM&quot; button was added on March 14</p>
        </div>
      )}
    </div>
  );
}

function StoryViewerPreview() {
  const groups = [
    { name: 'Lesbian Paradise 🔞', category: 'Lesbian', members: '5.1K' },
    { name: 'MILF🎒', category: 'MILF', members: '223K' },
    { name: 'Double Blowjob', category: 'Blowjob', members: '23.9K' },
    { name: 'suisai <3', category: 'Amateur', members: '52K' },
  ];

  return (
    <div
      className="relative rounded-2xl overflow-hidden mx-auto max-w-sm"
      style={{ aspectRatio: '9/16', maxHeight: '500px' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, #0d0515 0%, #1a0630 45%, #0a0a1a 100%)' }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-24 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 pt-14 pb-5">
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
              </svg>
            </div>
            <span className="text-[12px] font-black uppercase tracking-[0.18em]" style={{ color: '#f59e0b' }}>
              Latest additions to premium
            </span>
          </div>
          <div className="h-px w-40 opacity-40" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />
        </div>

        <div className="grid grid-cols-2 gap-2 flex-1">
          {groups.map(g => {
            const half = Math.ceil(g.name.length / 2);
            return (
              <div
                key={g.name}
                className="rounded-xl overflow-hidden border border-white/10 flex flex-col"
                style={{ background: 'linear-gradient(180deg, rgba(30,20,50,0.9), rgba(18,10,35,0.95))' }}
              >
                <div className="relative aspect-[4/3] bg-[#120a23] flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,5,20,0.85), transparent 55%)' }} />
                  <div
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.8)' }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div className="absolute bottom-1.5 left-1.5">
                    <span className="px-1.5 py-0.5 rounded-full text-white text-[7px] font-bold uppercase" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                      {g.category}
                    </span>
                  </div>
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[10px] font-bold leading-tight whitespace-nowrap overflow-hidden">
                    <span className="text-white">{g.name.slice(0, half)}</span>
                    <span className="text-white/80" style={{ filter: 'blur(5px)', userSelect: 'none' }}>{g.name.slice(half)}</span>
                  </p>
                  <span className="text-blue-300/70 text-[9px] font-semibold">{g.members}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <div
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-white text-[13px] tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Unlock Premium
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function PremiumGatePreview() {
  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-white mb-2">Premium Content</h2>
        <p className="text-gray-400 mb-1">
          <span className="font-bold text-white">GroupName</span> is part of the Premium Vault
        </p>
        <p className="text-gray-500 text-sm mb-6">Unlock access to 4,000+ hand-picked groups</p>
        <div
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Upgrade to Premium
        </div>
      </div>
    </div>
  );
}

function VaultTeaserPreview() {
  const groups = [
    { name: 'Lesbian Paradise 🔞', category: 'Lesbian', members: '5.1K' },
    { name: '福利姬摩多 收藏夹', category: 'Amateur', members: '329K' },
    { name: 'Itatijoss OnlyFans🔥', category: 'Amateur', members: '246K' },
    { name: 'MILF🎒', category: 'MILF', members: '223K' },
    { name: 'FemaleBlowjob 18+', category: 'Blowjob', members: '107K' },
    { name: 'suisai <3', category: 'Amateur', members: '52K' },
  ];

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-3">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-1.5" style={{ color: '#b8964e' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Private Vault
        </span>
        <h2 className="text-lg font-black text-white tracking-tight">
          Premium <span style={{ background: 'linear-gradient(135deg, #c9973a, #e8ba5a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Secret Vault</span>
        </h2>
        <p className="text-white/30 text-xs mt-0.5">Exclusive groups only visible to Premium members</p>
      </div>

      <div
        className="rounded-2xl overflow-hidden p-3"
        style={{ background: 'linear-gradient(160deg, #0f0d09, #110e08, #0d0b07)', border: '1px solid #2a1f0e' }}
      >
        <div className="grid grid-cols-3 gap-2">
          {groups.map(g => (
            <div key={g.name} className="rounded-lg overflow-hidden" style={{ background: '#151210' }}>
              <div className="aspect-square bg-gradient-to-br from-amber-900/30 to-orange-900/20 relative">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
                <div className="absolute inset-0 rounded-lg ring-1 ring-orange-500/40" />
                <div className="absolute bottom-0 left-0 right-0 p-1">
                  <p className="text-[7px] font-bold text-white truncate leading-tight">
                    {g.name.slice(0, 6)}
                    <span style={{ display: 'inline-block', width: '3em', height: '0.7em', background: 'rgba(255,255,255,0.9)', borderRadius: '3px', verticalAlign: 'middle', marginLeft: '2px', filter: 'blur(2px)' }} />
                  </p>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[7px] font-black text-orange-400 leading-none">{g.members}</span>
                    <span className="text-[6px] font-bold text-white/40 leading-none">· {g.category}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-2 flex items-center justify-center gap-2 py-2 rounded-xl font-black text-sm"
        style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Unlock the Full Vault
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

function ProfileBannerPreview({ version }: { version: 'mar10' | 'current' }) {
  if (version === 'mar10') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center py-4 px-6 rounded-xl bg-white/5 border border-white/10">
          <p className="text-white/70 text-sm mb-3">
            Unlock the <strong className="text-amber-400">Premium Vault</strong>, unlimited bookmarks &amp; more
          </p>
          <span className="inline-block px-5 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-bold">
            Upgrade to Premium
          </span>
        </div>
        <p className="text-xs text-white/30 mt-2 text-center">Simple amber button — minimal design</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #c9973a, #a67c2e)',
          boxShadow: '0 0 20px rgba(201,151,58,0.3)',
          color: '#0d0c0a',
        }}
      >
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Members Only</p>
          <p className="text-[17px] font-black uppercase tracking-tight leading-none">Unlock the Vault</p>
          <p className="text-[11px] font-semibold mt-0.5 opacity-75">4,000+ exclusive groups · Instant access</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1000" strokeWidth="3" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      <p className="text-xs text-white/30 mt-2 text-center">Full-width gold banner — upgraded design from Mar 14</p>
    </div>
  );
}

function VaultLockedPreview() {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center py-8 px-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.3em] block mb-1" style={{ color: '#b8964e' }}>
          Private Vault · Members Only
        </span>
        <h2 className="text-lg font-black text-white tracking-tight mb-1">Vault Locked</h2>
        <p className="text-[12px] font-bold" style={{ color: '#c9973a' }}>Unlock 4,000+ hand-picked groups in all categories</p>
      </div>

      {/* Blurred preview grid */}
      <div className="grid grid-cols-3 gap-2 opacity-40 blur-sm mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-500/10" />
        ))}
      </div>

      <div className="sticky bottom-0">
        <div
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Unlock Premium
        </div>
      </div>
    </div>
  );
}

function FeedMosaicPreview() {
  const groups = [
    { name: 'Lesbian Paradise 🔞', category: 'Lesbian', members: '5.1K' },
    { name: '福利姬摩多 收藏夹', category: 'Amateur', members: '329K' },
    { name: 'MILF🎒', category: 'MILF', members: '223K' },
    { name: 'Itatijoss OnlyFans🔥', category: 'Amateur', members: '246K' },
  ];

  return (
    <div className="max-w-xs mx-auto">
      <div className="rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>
        <div className="p-2">
          <div className="grid grid-cols-2 gap-1.5">
            {groups.map((g, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 to-orange-900/20" />
                <div className="absolute inset-0 rounded-xl ring-1 ring-orange-500/40" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <p className="text-[8px] font-bold text-white truncate leading-tight">
                    {g.name.slice(0, 6)}
                    <span style={{ display: 'inline-block', width: '3.5em', height: '0.75em', background: 'rgba(255,255,255,0.9)', borderRadius: '3px', verticalAlign: 'middle', marginLeft: '2px', filter: 'blur(2px)' }} />
                  </p>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[8px] font-black text-orange-400 leading-none">{g.members}</span>
                    <span className="text-[7px] font-bold text-white/40 leading-none">· {g.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 pt-1">
          <div className="inline-flex bg-black/60 border border-white/10 px-2 py-1 rounded-lg items-center gap-1.5 mb-2">
            <span className="text-xs text-red-400">⚡</span>
            <span className="text-xs font-bold text-white">342 visiting now</span>
          </div>
          <h3 className="text-sm font-black text-white mb-1 leading-tight">
            🔒 EROGRAM PREMIUM
          </h3>
          <p className="text-gray-400 text-xs mb-3">Unlock the best Lesbian groups</p>
          <button className="w-full py-2.5 px-3 rounded-xl font-black text-white text-xs uppercase tracking-wide bg-gradient-to-r from-orange-500 to-red-600">
            🔓 Unlock The Vault
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs text-white/40">Status: <span className="text-green-400">1 active</span>, <span className="text-red-400">10 paused</span></p>
        <p className="text-xs text-white/40">Total impressions: 23,228 | Total clicks: 76</p>
        <p className="text-xs text-white/40">Overall CTR: <span className="text-red-400 font-bold">0.33%</span></p>
      </div>
    </div>
  );
}

function PremiumPageCompare({ activePeriod }: { activePeriod: Period }) {
  const configs = {
    mar10: {
      route: '/premium10',
      plans: '2 plans: Monthly ($8.99 / 600★) + Yearly ($35.99 / 1,200★)',
      payment: 'Telegram Stars + Crypto toggle',
      socialProof: 'Toast popups (John from New York bought...)',
      nameBlur: '3 chars shown',
      extra: 'Admin preview panel present',
    },
    mar15: {
      route: '/premium15',
      plans: '2 plans: Monthly ($8.99 / 600★) + Yearly ($35.99 / 1,200★)',
      payment: 'Stars-first (crypto toggle still present but secondary)',
      socialProof: 'Toast popups',
      nameBlur: '5 chars shown',
      extra: 'China groups excluded from vault preview',
    },
    current: {
      route: '/premium',
      plans: '3 plans: Monthly (600★) + 3 Months (900★) + Yearly (2,000★) — all show 80% OFF',
      payment: 'Telegram Stars ONLY (crypto removed)',
      socialProof: 'Toast popups',
      nameBlur: '4 chars shown',
      extra: 'Admin preview panel removed',
    },
  };

  const c = configs[activePeriod];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl p-4 bg-white/5 border border-white/10">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Plans</p>
          <p className="text-sm text-white/80">{c.plans}</p>
        </div>
        <div className="rounded-xl p-4 bg-white/5 border border-white/10">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Payment Method</p>
          <p className="text-sm text-white/80">{c.payment}</p>
        </div>
        <div className="rounded-xl p-4 bg-white/5 border border-white/10">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Social Proof</p>
          <p className="text-sm text-white/80">{c.socialProof}</p>
        </div>
        <div className="rounded-xl p-4 bg-white/5 border border-white/10">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Vault Preview</p>
          <p className="text-sm text-white/80">Name blur: {c.nameBlur}</p>
        </div>
      </div>
      <div className="rounded-xl p-4 bg-white/5 border border-white/10">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Other</p>
        <p className="text-sm text-white/80">{c.extra}</p>
      </div>
      <Link
        href={c.route}
        target="_blank"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-all"
      >
        View actual page → {c.route}
      </Link>
    </div>
  );
}
