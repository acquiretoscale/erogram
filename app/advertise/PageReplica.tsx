'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GroupData {
  name: string;
  image: string;
  category?: string;
  memberCount?: number;
  views?: number;
}

interface AdSlot {
  id: string;
  gridIdx: number;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  kind?: 'feed' | 'cta';
  page: 'listing' | 'individual' | 'homepage' | 'both';
  slotNo?: number;
  label: string;
  description: string;
  videoPrice: string;
  imagePrice: string;
  estViews: string;
  estClicks: string;
  estCtr?: string;
  valuePoints?: string[];
}

const AD_SLOTS: AdSlot[] = [
  // Listing page slots
  { id: 'feed-1', gridIdx: 0,  slotNo: 1, tier: 'platinum', page: 'listing', label: 'In-Feed Slot 1 (Platinum)', description: 'First exposure in the feed loop. This is the premium first-touch position and captures the highest-intent attention immediately.', videoPrice: '—', imagePrice: '—', estViews: 'Top share', estClicks: 'Highest volume', estCtr: 'High single-digit', valuePoints: ['Receives 40%+ of in-feed traffic share', 'First position users see when entering feed', 'Best choice for launches and aggressive scale'] },
  { id: 'feed-2', gridIdx: 4,  slotNo: 2, tier: 'gold', page: 'listing', label: 'In-Feed Slot 2 (Gold)', description: 'Second position in the loop with strong continuity from Slot 1. Ideal for sustained volume with efficient click depth.', videoPrice: '—', imagePrice: '—', estViews: 'Strong share', estClicks: 'Very high', estCtr: '~7-8% projected', valuePoints: ['Around 30% of in-feed traffic share', 'Appears right after Slot 1 in the sequence', 'Great balance of reach and efficiency'] },
  { id: 'feed-3', gridIdx: 8,  slotNo: 3, tier: 'silver', page: 'listing', label: 'In-Feed Slot 3 (Silver)', description: 'Momentum slot for deep-scroll users who are actively engaged and more likely to continue interacting.', videoPrice: '—', imagePrice: '—', estViews: 'Shared', estClicks: 'Consistent', estCtr: '~7% projected', valuePoints: ['Shares remaining traffic with Slot 4', 'Strong value for ongoing visibility campaigns', 'High-quality engaged scroller audience'] },
  { id: 'feed-4', gridIdx: 11, slotNo: 4, tier: 'bronze', page: 'listing', label: 'In-Feed Slot 4 (Bronze)', description: 'Final slot in each rotation cycle, deep-scroll users who are actively engaged and more likely to continue interacting.', videoPrice: '—', imagePrice: '—', estViews: 'Shared', estClicks: 'Steady', estCtr: '~6-7% projected', valuePoints: [] },
  // Individual page slots
  { id: 'join-cta', gridIdx: -1, tier: 'platinum', kind: 'cta', page: 'individual', label: 'In-Page CTA (Top)', description: 'Primary call-to-action displayed right below the \"Join Channel\" button on every group/bot page. Highest-intent placement — users are already engaging. Text + link, customizable label.', videoPrice: '—', imagePrice: '$300', estViews: '26K', estClicks: '3.2K' },
  { id: 'vip-cta', gridIdx: -1, tier: 'gold', kind: 'cta', page: 'individual', label: 'Official Channel CTA', description: 'Eye-catching button placed below the join area on every group/bot page. High visibility with strong conversion.', videoPrice: '—', imagePrice: '$200', estViews: '26K', estClicks: '2.1K' },
  { id: 'popular-cta', gridIdx: -1, tier: 'gold', kind: 'cta', page: 'individual', label: 'Popular CTA', description: 'Branded CTA button embedded directly within the Popular Categories sidebar on the groups directory — the single highest-engagement zone on the page according to heatmap analytics. Users actively clicking through popular categories encounter your button at the peak of their browsing intent. Text + link, zero creative production needed.', videoPrice: '—', imagePrice: '$280', estViews: '48K', estClicks: '4.2K' },
  { id: 'home-menu-cta', gridIdx: -1, tier: 'gold', kind: 'cta', page: 'individual', label: 'Menu CTA Button', description: 'Branded button in the navigation bar — visible on every single page across the entire site (homepage, groups, bots, articles). Text + link, no creative needed. Always visible, always clickable.', videoPrice: '—', imagePrice: '$300', estViews: '132K', estClicks: '5.8K' },
  // Homepage slots
  { id: 'home-hero', gridIdx: -1, tier: 'platinum', page: 'homepage', label: 'Homepage Hero Banner', description: 'Full-width banner at the very top of the homepage, above the fold. The first visual element every visitor sees. Image or video creative, auto-sized. Maximum brand impact.', videoPrice: '$500', imagePrice: '$400', estViews: '52K', estClicks: '4.6K' },
  { id: 'home-page-cta', gridIdx: -1, tier: 'gold', kind: 'cta', page: 'homepage', label: 'Home Page CTA', description: 'Prominent call-to-action button in the homepage hero section, right next to \"Explore Groups\" and \"Explore Bots\". Every single visitor sees and can click it. Text + link, no creative needed.', videoPrice: '—', imagePrice: '$250', estViews: '52K', estClicks: '3.4K' },
];

const adSlotByIdx = new Map(AD_SLOTS.filter((s) => s.page === 'listing' && s.gridIdx >= 0).map((s) => [s.gridIdx, s]));

const TIER_STYLES = {
  platinum: { border: 'border-gray-200/60', glow: 'shadow-[0_0_24px_rgba(220,220,220,0.4)]', badge: 'bg-gradient-to-r from-gray-200 to-gray-400 text-gray-900', panel: 'bg-gradient-to-br from-gray-200/15 to-gray-400/10', ring: 'ring-gray-300/50', fill: 'bg-gradient-to-br from-gray-300/25 via-gray-200/15 to-white/10', fillBorder: 'border-gray-300/40' },
  gold:     { border: 'border-amber-400/60', glow: 'shadow-[0_0_24px_rgba(245,158,11,0.4)]', badge: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900', panel: 'bg-gradient-to-br from-amber-500/15 to-yellow-500/10', ring: 'ring-amber-400/50', fill: 'bg-gradient-to-br from-amber-500/25 via-yellow-400/15 to-orange-300/10', fillBorder: 'border-amber-400/40' },
  silver:   { border: 'border-gray-400/50',  glow: 'shadow-[0_0_20px_rgba(160,160,160,0.3)]',  badge: 'bg-gradient-to-r from-gray-400 to-gray-300 text-gray-800', panel: 'bg-gradient-to-br from-gray-400/15 to-gray-500/10', ring: 'ring-gray-400/40', fill: 'bg-gradient-to-br from-gray-500/20 via-gray-400/10 to-gray-300/5', fillBorder: 'border-gray-400/30' },
  bronze:   { border: 'border-orange-500/55', glow: 'shadow-[0_0_20px_rgba(234,88,12,0.28)]', badge: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white', panel: 'bg-gradient-to-br from-orange-500/12 to-amber-500/10', ring: 'ring-orange-400/40', fill: 'bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-yellow-500/5', fillBorder: 'border-orange-500/35' },
};

const CATEGORIES = ['All', 'Anal', 'Oral', 'MILF', 'BBC', 'Hentai', 'Asian', 'Latina', 'Cosplay'];

const PAGE_DESCRIPTIONS: Record<PageView, { title: string; subtitle: string; body: string; accent: string; accentBorder: string; accentBg: string; icon: string }> = {
  listing: {
    title: 'IN-FEED',
    subtitle: 'MAIN PAGE',
    body: 'In-Feed is the core performance engine and drives almost 60% of traffic sent to advertisers. Placements run on both Groups and Bots pages in a 4-slot loop (1 → 2 → 3 → 4 → repeat), so exposure compounds as users continue scrolling. All distribution insights below come from our internal dashboard tracking, used continuously to optimize user experience and advertiser results.',
    accent: 'text-amber-600',
    accentBorder: 'border-amber-400',
    accentBg: 'bg-amber-50',
    icon: '1',
  },
  individual: {
    title: 'TEXT CTA ADS',
    subtitle: 'HIGH-INTENT PLACEMENTS',
    body: 'Text CTA buttons are strategically positioned across the highest-traffic touchpoints — individual group/bot pages and the main groups directory. These placements capture users at peak engagement moments with zero creative production needed, delivering exceptional click-through rates from day one.',
    accent: 'text-purple-600',
    accentBorder: 'border-purple-400',
    accentBg: 'bg-purple-50',
    icon: '2',
  },
  homepage: {
    title: 'HOME PAGE',
    subtitle: 'EXCLUSIVE PLACEMENT',
    body: 'The home page receives approximately 50% of total incoming traffic, making it our most valuable and exclusive advertising location. This placement ensures maximum visibility at the entry point of the user journey. Click on each ad space for detailed specifications and performance insights.',
    accent: 'text-emerald-600',
    accentBorder: 'border-emerald-400',
    accentBg: 'bg-emerald-50',
    icon: '3',
  },
};

type PageView = 'listing' | 'individual' | 'homepage';

const DESKTOP_SCALE = 0.3;
const DESKTOP_W = 1400;

function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ─── Mini cards for listing view ─── */

function MiniGroupCard({ group }: { group: GroupData }) {
  const hasImage = group.image && !group.image.includes('placeholder');
  return (
    <div className="rounded-xl overflow-hidden bg-[#141414] border border-white/[0.06] flex flex-col" style={BLUR_STYLE}>
      <div
        className="h-[120px] relative bg-center bg-cover bg-[#1a1a1a]"
        style={hasImage ? { backgroundImage: `url("${group.image}")` } : undefined}
      >
        {!hasImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#252525] to-[#1a1a1a] flex items-center justify-center">
            <span className="text-3xl opacity-30">📷</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-2 left-2 flex gap-1.5">
          <span className="text-[11px] bg-black/60 text-white/70 px-2 py-0.5 rounded-md backdrop-blur-sm">👁 {fmtK(group.views ?? 0)}</span>
          <span className="text-[11px] bg-black/60 text-white/70 px-2 py-0.5 rounded-md backdrop-blur-sm">👥 {fmtK(group.memberCount ?? 0)}</span>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <p className="text-[14px] font-bold text-white leading-tight truncate">{group.name}</p>
        {group.category && (
          <span className="text-[11px] text-gray-500 bg-white/5 rounded px-2 py-0.5 self-start">{group.category}</span>
        )}
        <p className="text-[11px] text-gray-600 leading-snug line-clamp-2">Premium Telegram group with exclusive content updated daily.</p>
        <div className="mt-auto pt-2">
          <div className="h-[32px] rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-[12px] font-bold text-white uppercase tracking-wider">Join Group</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniVideoAdCard({ slot, isActive, onClick }: { slot: AdSlot; isActive: boolean; onClick: () => void }) {
  const t = TIER_STYLES.gold;
  return (
    <div onClick={onClick} className={`ad-pulse rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col border ${t.fillBorder} bg-[#141414] ${isActive ? `ad-active ${t.glow} ring-2 ${t.ring}` : ''}`}>
      <div className="h-[160px] relative overflow-hidden bg-gradient-to-br from-[#1a1020] via-[#1a0a1a] to-[#0d0d18]">
        <div className="absolute inset-0 opacity-40" style={{ background: 'linear-gradient(115deg, transparent 20%, rgba(168,85,247,0.15) 35%, rgba(236,72,153,0.12) 50%, rgba(245,158,11,0.1) 65%, transparent 80%)', animation: 'shimmer 3s ease-in-out infinite' }} />
        <div className="absolute inset-0 flex items-center justify-center"><div className="w-[50px] h-[50px] rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center"><div className="w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[16px] border-l-white/90 ml-[3px]" /></div></div>
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1"><span className="w-[8px] h-[8px] rounded-full bg-red-500 animate-pulse" /><span className="text-[22px] font-bold text-white/80 uppercase">Video Ad</span></div>
        <div className="absolute top-3 right-3"><span className={`${t.badge} text-[22px] font-black px-4 py-1 rounded-lg uppercase tracking-wider shadow-lg`}>Slot 1</span></div>
        <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-black/30"><div className="h-full bg-gradient-to-r from-amber-400 to-pink-500 rounded-r-full" style={{ width: '35%', animation: 'progress 8s linear infinite' }} /></div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2"><span className="text-[22px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded">SPONSORED</span></div>
        <p className="text-[28px] font-bold text-white leading-tight">Your Brand Video Here</p>
        <p className="text-[18px] text-gray-500 leading-snug">Autoplay video ad — highest engagement</p>
        <div className="mt-auto pt-2"><div className="h-[44px] rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center"><span className="text-[22px] font-bold text-white uppercase tracking-wider">Visit Site</span></div></div>
      </div>
    </div>
  );
}

function MiniAdSlotCard({ slot, isActive, onClick }: { slot: AdSlot; isActive: boolean; onClick: () => void }) {
  const t = TIER_STYLES.gold;
  return (
    <div onClick={onClick} className={`ad-pulse rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col border ${t.fill} ${t.fillBorder} ${isActive ? `ad-active ${t.glow} ring-2 ${t.ring}` : ''}`}>
      <div className={`h-[160px] ${t.fill} relative flex items-center justify-center`}><span className={`${t.badge} text-[28px] font-black px-6 py-2 rounded-lg uppercase tracking-wider shadow-lg`}>Slot {slot.slotNo ?? slot.gridIdx + 1}</span></div>
      <div className="p-4 flex-1 flex flex-col items-center justify-center gap-2">
        <p className="text-[28px] font-bold text-white/80 text-center">Ad Space</p>
        <p className="text-[20px] text-white/40">Slot #{slot.slotNo ?? slot.gridIdx + 1}</p>
        <div className="mt-auto pt-2 w-full"><div className={`h-[44px] rounded-lg border ${t.fillBorder} ${t.fill} flex items-center justify-center`}><span className="text-[22px] font-bold text-white/50 uppercase">Your Ad Here</span></div></div>
      </div>
    </div>
  );
}

/* ─── Shared top menu bar ─── */

const BLUR_STYLE = { filter: 'blur(3.5px)', opacity: 0.3 } as const;

function MiniTopMenu({ mobile, showMenuCta = true }: { mobile?: boolean; showMenuCta?: boolean }) {
  if (mobile) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-[#151515] border-b border-white/10">
        <span className="text-lg font-black text-white/90" style={BLUR_STYLE}>erogram</span>
        <div className="flex items-center gap-2">
          {showMenuCta && <span className="text-[20px] font-black text-amber-900 bg-gradient-to-r from-amber-400 to-yellow-300 border border-amber-400/50 px-4 py-1.5 rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.3)]">Menu CTA</span>}
          <span className="text-base text-gray-400" style={BLUR_STYLE}>☰</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-[#151515] border-b border-white/10">
      <span className="text-xl font-black text-white/90" style={BLUR_STYLE}>erogram</span>
      <div className="flex items-center gap-2">
        {['Groups', 'Bots', 'Articles', 'Models'].map((label) => (
          <span key={label} className="text-xs font-bold uppercase tracking-wider text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md" style={BLUR_STYLE}>{label}</span>
        ))}
        {showMenuCta && <span className="text-[20px] font-black uppercase tracking-wider text-amber-900 bg-gradient-to-r from-amber-400 to-yellow-300 border border-amber-400/50 px-5 py-2 rounded-lg shadow-[0_0_12px_rgba(245,158,11,0.3)]">Menu CTA Ad</span>}
        <span className="text-xs font-bold uppercase tracking-wider text-gray-900 bg-gray-200 px-3 py-1.5 rounded-md" style={BLUR_STYLE}>Add</span>
      </div>
    </div>
  );
}

/* ─── Individual page miniature ─── */

function IndividualPageContent({ activeId, setActiveId, group, mobile }: { activeId: string | null; setActiveId: (id: string | null) => void; group: GroupData | null; mobile: boolean }) {
  const g = group ?? { name: 'Erogram', image: '', category: 'All', memberCount: 5514, views: 26713 };
  const hasImage = g.image && !g.image.includes('placeholder');

  return (
    <div className="bg-[#0a0a0a] min-h-full">
      <MiniTopMenu mobile={mobile} />

      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/5 bg-[#0a0a0a]/80" style={BLUR_STYLE}>
        <div className="flex items-center text-[11px] text-gray-400 gap-1.5">
          <span>Home</span><span className="text-gray-600">/</span><span>Groups</span><span className="text-gray-600">/</span><span className="text-white font-medium">{g.name}</span>
        </div>
      </div>

      <div className={`px-4 sm:px-6 pt-6 pb-6 ${mobile ? '' : ''}`}>
        <div className={mobile ? '' : 'flex gap-8'}>
          {/* Left column: image + stats */}
          <div className={mobile ? 'mb-6' : 'w-[340px] shrink-0'} style={BLUR_STYLE}>
            <div className="rounded-2xl bg-[#151515] border border-white/10 p-5">
              <div className="aspect-square rounded-xl overflow-hidden bg-[#222] relative mb-5 border border-white/5" style={hasImage ? { backgroundImage: `url("${g.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                {!hasImage && <div className="absolute inset-0 bg-gradient-to-br from-[#252525] to-[#1a1a1a] flex items-center justify-center"><span className="text-6xl opacity-20">📷</span></div>}
                <div className="absolute top-3 right-3 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"><span>✓</span> Verified</div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[{ label: 'Category', value: g.category || 'All' }, { label: 'Country', value: 'All' }, { label: 'Members', value: fmtK(g.memberCount ?? 0) }, { label: 'Views', value: fmtK(g.views ?? 0) }].map((s) => (
                  <div key={s.label} className="bg-[#1a1a1a] rounded-lg border border-white/5 p-2.5 text-center">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">{s.label}</p>
                    <p className="text-[13px] font-semibold text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 min-w-0">
            <div style={BLUR_STYLE}>
              <h1 className={`${mobile ? 'text-[28px]' : 'text-[42px]'} font-black text-white leading-tight mb-4`}>{g.name}</h1>
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300">#{g.category || 'All'}</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300">#All</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-300">Telegram Group</span>
              </div>
              <p className="text-[13px] text-gray-300 leading-relaxed mb-6">Join the official erogram.pro telegram group for up to date groups, events and announcements!</p>
            </div>

            {/* Primary action area */}
            <div className="rounded-2xl bg-[#151515] border border-white/10 p-5 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-600/10 to-purple-600/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
              <div style={BLUR_STYLE}>
                <h2 className="text-base font-bold text-white mb-1 relative z-10">Ready to join?</h2>
                <p className="text-[11px] text-gray-400 mb-4 relative z-10">Click the button below to access this community on Telegram.</p>
                <div className="relative rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-[2px] mb-4">
                  <div className="bg-[#111] rounded-[10px] px-5 py-3.5 flex items-center justify-center gap-2"><span className="text-[14px] font-bold text-white">Join Channel Now</span></div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-4">
                <div onClick={() => setActiveId(activeId === 'join-cta' ? null : 'join-cta')} className={`ad-pulse rounded-xl cursor-pointer transition-all duration-200 overflow-hidden border border-amber-400/40 ${activeId === 'join-cta' ? 'ad-active ring-2 ring-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.5)]' : ''}`}>
                  <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-5 py-5 flex items-center justify-center gap-3">
                    <span className="text-[28px] font-bold text-white">In-Page CTA (Top)</span>
                  </div>
                </div>
              </div>
            </div>

          <div className="text-center mb-0">
              <div onClick={() => setActiveId(activeId === 'vip-cta' ? null : 'vip-cta')} className={`ad-pulse inline-flex items-center gap-3 px-8 py-4 rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-r from-amber-500 to-yellow-500 border border-amber-400/50 text-white font-black text-[28px] ${activeId === 'vip-cta' ? 'ad-active ring-2 ring-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.5)]' : ''}`}>
                <span>Official Channel CTA</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2" style={BLUR_STYLE}>Get exclusive updates, premium content, and VIP offers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Groups page miniature (Popular CTA) ─── */

const POPULAR_CATS = ['Lesbian', 'Threesome', 'Big Ass', 'Amateur', 'Onlyfans', 'Hentai', 'Thailand', 'Russia', 'UK', 'Germany', 'France'];

function GroupsPageCtaContent({ activeId, setActiveId, groups, mobile }: { activeId: string | null; setActiveId: (id: string | null) => void; groups: GroupData[]; mobile: boolean }) {
  let groupCounter = 0;
  const cols = 3;
  const feedCount = 9;

  return (
    <div className="bg-[#0d0d0d]">
      <MiniTopMenu mobile={mobile} showMenuCta={false} />

      <div className="px-5 pt-4 pb-5">
        <div className="flex gap-4">
          <aside className="w-[260px] shrink-0 rounded-xl border border-white/10 bg-[#141414] p-3" style={BLUR_STYLE}>
            <div className="h-[34px] rounded-lg bg-white/5 border border-white/10 flex items-center px-3 mb-3">
              <span className="text-[11px] text-gray-400 font-semibold">Search groups...</span>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Filters</p>
              {CATEGORIES.map((item, i) => (
                <div key={item} className={`h-[30px] rounded-md border px-3 flex items-center ${i === 0 ? 'border-gray-300 bg-gray-300/15 text-gray-200' : 'border-white/10 bg-white/[0.02] text-gray-500'}`}>
                  <span className="text-[11px] font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex-1 rounded-xl border border-white/10 bg-[#111] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10" style={BLUR_STYLE}>
              <p className="text-2xl font-black text-white/90">All Groups</p>
            </div>

            <div className="px-3 py-2.5 border-b border-white/10 flex gap-1.5 overflow-hidden items-center">
              {CATEGORIES.map((c, i) => (
                <span key={c} className={`text-[10px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${i === 0 ? 'bg-gray-200/20 text-gray-200 border border-gray-200/30' : 'bg-white/[0.03] text-gray-400 border border-white/10'}`} style={BLUR_STYLE}>{c}</span>
              ))}
            </div>

            {/* Popular categories section with CTA mixed in */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[16px]">🔥</span>
                <span className="text-[16px] font-bold text-white/80">Popular categories</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CATS.slice(0, 4).map((cat) => (
                  <span key={cat} className="text-[13px] font-semibold px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 border border-white/10" style={BLUR_STYLE}>{cat}</span>
                ))}
                <span
                  onClick={() => setActiveId(activeId === 'popular-cta' ? null : 'popular-cta')}
                  className={`ad-pulse text-[22px] font-black px-5 py-2 rounded-lg cursor-pointer transition-all duration-200 border border-amber-400/50 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 text-amber-400 uppercase tracking-wider ${activeId === 'popular-cta' ? 'ad-active ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : ''}`}
                >Popular CTA</span>
                {POPULAR_CATS.slice(4, 8).map((cat) => (
                  <span key={cat} className="text-[13px] font-semibold px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 border border-white/10" style={BLUR_STYLE}>{cat}</span>
                ))}
                {POPULAR_CATS.slice(8).map((cat) => (
                  <span key={cat} className="text-[13px] font-semibold px-3.5 py-1.5 rounded-lg bg-white/[0.04] text-gray-400 border border-white/10" style={BLUR_STYLE}>{cat}</span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 p-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: feedCount }).map((_, idx) => {
                if (groups.length === 0) return <div key={`ph-${idx}`} className="rounded-xl bg-white/[0.02] border border-white/[0.06] h-[220px] animate-pulse" style={BLUR_STYLE} />;
                const g = groups[groupCounter % groups.length];
                groupCounter++;
                return <MiniGroupCard key={`g-${idx}`} group={g} />;
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Listing page miniature ─── */

function ListingPageContent({ activeId, setActiveId, groups, mobile }: { activeId: string | null; setActiveId: (id: string | null) => void; groups: GroupData[]; mobile: boolean }) {
  let groupCounter = 0;
  const cols = 3;
  const feedCount = 12;

  return (
    <div className="bg-[#0d0d0d]">
      <MiniTopMenu mobile={mobile} showMenuCta={false} />

      <div className="px-5 pt-4 pb-5">
        <div className="flex gap-4">
          <aside className="w-[260px] shrink-0 rounded-xl border border-white/10 bg-[#141414] p-3" style={BLUR_STYLE}>
            <div className="h-[34px] rounded-lg bg-white/5 border border-white/10 flex items-center px-3 mb-3"><span className="text-[11px] text-gray-400 font-semibold">Search groups...</span></div>
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Filters</p>
              {CATEGORIES.map((item, i) => (
                <div key={item} className={`h-[30px] rounded-md border px-3 flex items-center ${i === 0 ? 'border-gray-300 bg-gray-300/15 text-gray-200' : 'border-white/10 bg-white/[0.02] text-gray-500'}`}><span className="text-[11px] font-semibold">{item}</span></div>
              ))}
            </div>
          </aside>

          <section className="flex-1 rounded-xl border border-white/10 bg-[#111] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10" style={BLUR_STYLE}>
              <p className="text-2xl font-black text-white/90">All Groups</p>
              <p className="text-xs text-gray-500 mt-1">Desktop feed preview for ad placement showcase</p>
            </div>

            <div className="px-3 py-2.5 border-b border-white/10 flex gap-1.5 overflow-hidden items-center">
              {CATEGORIES.map((c, i) => (
                <span key={c} className={`text-[10px] font-semibold px-2.5 py-1 rounded-md shrink-0 ${i === 0 ? 'bg-gray-200/20 text-gray-200 border border-gray-200/30' : 'bg-white/[0.03] text-gray-400 border border-white/10'}`} style={BLUR_STYLE}>{c}</span>
              ))}
            </div>

            <div className="grid gap-3 p-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: feedCount }).map((_, idx) => {
                const adSlot = adSlotByIdx.get(idx);
                if (adSlot) {
                  const Card = adSlot.gridIdx === 0 ? MiniVideoAdCard : MiniAdSlotCard;
                  return <Card key={adSlot.id} slot={adSlot} isActive={activeId === adSlot.id} onClick={() => setActiveId(activeId === adSlot.id ? null : adSlot.id)} />;
                }
                if (groups.length === 0) return <div key={`ph-${idx}`} className="rounded-xl bg-white/[0.02] border border-white/[0.06] h-[220px] animate-pulse" style={BLUR_STYLE} />;
                const g = groups[groupCounter % groups.length];
                groupCounter++;
                return <MiniGroupCard key={`g-${idx}`} group={g} />;
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Menu CTA miniature (nav bar preview) ─── */

function MenuCtaContent({ activeId, setActiveId }: { activeId: string | null; setActiveId: (id: string | null) => void }) {
  return (
    <div className="bg-[#111] min-h-full">
      <div className="flex items-center justify-between px-6 py-4 bg-[#151515] border-b border-white/10">
        <span className="text-xl font-black text-white/90" style={BLUR_STYLE}>erogram</span>
        <div className="flex items-center gap-2">
          {['Groups', 'Bots', 'Articles'].map((label) => (
            <span key={label} className="text-xs font-bold uppercase tracking-wider text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md" style={BLUR_STYLE}>{label}</span>
          ))}
          <span
            onClick={() => setActiveId(activeId === 'home-menu-cta' ? null : 'home-menu-cta')}
            className={`ad-pulse text-[20px] font-black uppercase tracking-wider text-amber-900 bg-gradient-to-r from-amber-400 to-yellow-300 border border-amber-400/50 px-5 py-2 rounded-lg cursor-pointer transition-all ${activeId === 'home-menu-cta' ? 'ad-active shadow-[0_0_20px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/60' : ''}`}
          >
            Menu CTA Ad
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-900 bg-gray-200 px-3 py-1.5 rounded-md" style={BLUR_STYLE}>Add</span>
        </div>
      </div>
      <div className="px-6 pt-8 pb-6 text-center" style={BLUR_STYLE}>
        <p className="text-[32px] font-black text-white/60 leading-tight mb-3">Any Page</p>
        <p className="text-sm text-gray-500 max-w-[500px] mx-auto">The Menu CTA button appears in the navigation bar on every single page across the entire site — homepage, groups, bots, articles.</p>
      </div>
    </div>
  );
}

/* ─── Homepage miniature ─── */

function HomePageContent({ activeId, setActiveId, mobile }: { activeId: string | null; setActiveId: (id: string | null) => void; mobile: boolean }) {
  return (
    <div className="bg-[#111] min-h-full">
      {/* Top menu with Menu CTA */}
      {mobile ? (
        <div className="flex items-center justify-between px-4 py-3 bg-[#151515] border-b border-white/10">
          <span className="text-lg font-black text-white/90" style={BLUR_STYLE}>erogram</span>
          <div className="flex items-center gap-2">
            <span className="text-base text-gray-400" style={BLUR_STYLE}>☰</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-6 py-4 bg-[#151515] border-b border-white/10">
          <span className="text-xl font-black text-white/90" style={BLUR_STYLE}>erogram</span>
          <div className="flex items-center gap-2">
            {['Groups', 'Bots', 'Articles'].map((label) => (
              <span key={label} className="text-xs font-bold uppercase tracking-wider text-gray-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md" style={BLUR_STYLE}>{label}</span>
            ))}
            <span className="text-xs font-bold uppercase tracking-wider text-gray-900 bg-gray-200 px-3 py-1.5 rounded-md" style={BLUR_STYLE}>Add</span>
          </div>
        </div>
      )}

      {/* Hero section */}
      <div className={`relative ${mobile ? 'px-4 pt-6 pb-6' : 'px-6 pt-10 pb-8'}`}>
        {!mobile && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-red-500/10 to-transparent rounded-full blur-[80px] pointer-events-none" />}

        {/* Hero Banner */}
        <div
          onClick={() => setActiveId(activeId === 'home-hero' ? null : 'home-hero')}
          className={`ad-pulse relative w-full ${mobile ? 'h-[80px]' : 'h-[140px]'} rounded-2xl ${mobile ? 'mb-6' : 'mb-10'} cursor-pointer transition-all duration-200 overflow-hidden border ${activeId === 'home-hero' ? 'ad-active border-amber-400/60 ring-2 ring-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 'border-amber-400/30'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 flex items-center justify-center">
            <p className={`${mobile ? 'text-[20px]' : 'text-[32px]'} font-black text-white/80`}>Homepage Hero Banner</p>
          </div>
        </div>

        {/* Hero content */}
        <div className={`text-center ${mobile ? '' : 'max-w-[900px]'} mx-auto relative z-10`}>
          <div style={BLUR_STYLE}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[11px] font-medium text-white/80">The #1 Verified NSFW Directory</span>
            </div>

            <h1 className={`${mobile ? 'text-[28px]' : 'text-[48px]'} font-black leading-[1.1] mb-4`}>
              <span className="text-white">Discover Best </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500">NSFW</span>
              <br />
              <span className="text-white">Telegram Groups</span>
            </h1>

            <p className={`${mobile ? 'text-[12px]' : 'text-[14px]'} text-gray-400 leading-relaxed mb-6 ${mobile ? '' : 'max-w-[700px]'} mx-auto`}>
              Dive into a world of <span className="text-white font-medium">premium adult communities</span> and <span className="text-white font-medium">interactive AI</span>.
              {!mobile && <><br />Connect, explore, and indulge — <span className="text-white/80">safely and anonymously</span>.</>}
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-row gap-2.5 justify-center mb-10">
            <span className="px-5 py-3 bg-[#b31b1b] text-white rounded-lg text-[13px] font-semibold" style={BLUR_STYLE}>Explore Groups</span>
            <span className="px-5 py-3 bg-white/5 border border-white/20 text-white rounded-lg text-[13px] font-semibold" style={BLUR_STYLE}>Explore Bots</span>
            <span
              onClick={() => setActiveId(activeId === 'home-page-cta' ? null : 'home-page-cta')}
              className={`ad-pulse px-6 py-4 rounded-lg text-[26px] font-black cursor-pointer transition-all bg-gradient-to-r from-amber-500 to-orange-500 text-white border border-amber-400/40 ${activeId === 'home-page-cta' ? 'ad-active ring-2 ring-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.5)]' : ''}`}
            >
              Home Page CTA
            </span>
          </div>

          {/* No fourth takeover row anymore – focus on hero + CTAs */}
        </div>
      </div>
    </div>
  );
}

/* ─── Verified badge SVG (matches the real site) ─── */

const VERIFIED_BADGE = (
  <svg className="w-[16px] h-[16px] text-blue-500 shrink-0 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
  </svg>
);

/* ─── Video vs Image comparison ─── */

interface ImageAdData {
  creative: string;
  name: string;
  description: string;
  buttonText: string;
  verified: boolean;
}

function AdFormatComparison() {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [imageAd, setImageAd] = useState<ImageAdData | null>(null);

  useEffect(() => {
    fetch('/api/campaigns/feed-preview')
      .then((r) => r.json())
      .then((d) => { if (d.image) setImageAd(d.image); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { e.isIntersecting ? el.play().catch(() => {}) : el.pause(); },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">
          In-Feed Video Ads generate <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">2-3x more clicks</span> than static images
        </h3>
        <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto">Autoplay motion captures attention instantly — here is exactly how both formats appear to users in the feed.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 justify-center items-start">

        {/* ── VIDEO AD — Premium ── */}
        <div className="w-full sm:w-[280px] shrink-0">
          <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <div className="rounded-[22px] overflow-hidden bg-[#0a0a0a] flex flex-col min-h-[480px]">
              <div className="relative flex-1 min-h-[320px] overflow-hidden bg-gradient-to-br from-[#1a1020] via-[#1a0a1a] to-[#0d0d18]">
                <video
                  ref={videoRef}
                  src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 pointer-events-none" />

                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wider">Premium</span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 z-10 flex flex-col gap-2.5">
                  <div className="flex justify-start">
                    <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                      <span className="text-xs text-red-400">⚡</span>
                      <span className="text-xs font-bold text-white">412 visiting now</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight drop-shadow-lg flex items-center gap-1.5">
                    <span className="truncate min-w-0">Your Brand Here</span>
                    {VERIFIED_BADGE}
                  </h3>
                  <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed drop-shadow">
                    Autoplay video ad — motion captures attention as users scroll through the feed.
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500 text-sm">⭐</span>
                      <span className="text-white font-bold text-sm drop-shadow">4.8</span>
                      <span className="text-gray-400 text-xs drop-shadow">(24)</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide drop-shadow">Promoted</span>
                  </div>
                  <div className="w-full py-3.5 px-4 rounded-xl font-black text-white text-sm uppercase tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg text-center">
                    Visit Site
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="inline-block px-3 py-1.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200">Video Format — Premium</span>
          </div>
        </div>

        {/* ── IMAGE AD — Standard (fetches real creative) ── */}
        <div className="w-full sm:w-[280px] shrink-0">
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/50 flex flex-col min-h-[480px]">
            <div className="relative h-52 overflow-hidden bg-[#1a1a1a]">
              {imageAd?.creative ? (
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${imageAd.creative}")` }} />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#2a2035] via-[#1e1525] to-[#1a1a1a]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                  <span className="text-xs">👁️</span>
                  <span className="text-xs font-bold text-white">18,432</span>
                </div>
                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                  <span className="text-xs">👥</span>
                  <span className="text-xs font-bold text-white">4,291</span>
                </div>
              </div>
            </div>
            <div className="p-5 flex-grow flex flex-col relative">
              <h3 className="text-xl font-black text-white mb-3 leading-tight flex items-center gap-1.5">
                <span className="truncate min-w-0">{imageAd?.name || 'Your Brand Here'}</span>
                {(imageAd?.verified ?? true) && VERIFIED_BADGE}
              </h3>
              <div className="mb-6 flex-grow">
                <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                  Static image creative — professional placement that blends naturally with organic feed content.
                </p>
              </div>
              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500 text-sm">⭐</span>
                    <span className="text-white font-bold text-sm">4.6</span>
                    <span className="text-gray-500 text-xs">(17)</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Promoted</span>
                </div>
                <div className="w-full py-3.5 px-4 rounded-xl font-black text-white text-sm uppercase tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg text-center">
                  {imageAd?.buttonText || 'Visit Site'}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200">Image Format — Standard</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Miniature screen wrapper ─── */

function MiniScreen({ children, innerW, innerH, scale }: { children: React.ReactNode; innerW: number; innerH: number; scale: number }) {
  return (
    <div
      className="rounded-2xl border border-gray-200 bg-[#0d0d0d] shadow-2xl shadow-black/30 overflow-hidden"
      style={{ width: innerW * scale, height: innerH * scale }}
    >
      <div style={{ width: innerW * scale, height: innerH * scale, position: 'relative' }}>
        <div style={{ width: innerW, height: innerH, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }} className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Detail panel for a selected slot ─── */

function DetailPanel({ slot }: { slot: AdSlot }) {
  const isFeedSlot = slot.page === 'listing' && !slot.kind;
  return (
    <motion.div
      key={slot.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-gray-700/50 bg-gradient-to-br from-[#1c1c1c] via-[#2a2a2a] to-[#1c1c1c] p-5 shadow-lg"
    >
      <h4 className="text-base font-black text-white mb-1">{slot.label}</h4>
      <p className="text-sm text-gray-300 leading-relaxed">{slot.description}</p>
      {isFeedSlot && (slot.valuePoints ?? []).length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-gray-400">
          {(slot.valuePoints ?? []).map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/* ─── Section view config ─── */

const VIEWS: { id: PageView; title: string; subtitle: string; body: string; accent: string; accentBorder: string; accentBg: string; icon: string; innerH: number }[] = [
  { id: 'listing', innerH: 1893, ...PAGE_DESCRIPTIONS.listing },
  { id: 'individual', innerH: 1456, ...PAGE_DESCRIPTIONS.individual },
  { id: 'homepage', innerH: 1170, ...PAGE_DESCRIPTIONS.homepage },
];

/* ─── Main component ─── */

export default function PageReplica() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);

  useEffect(() => {
    fetch('/api/groups?limit=15&sortBy=popular')
      .then((r) => r.json())
      .then((d) => {
        const list: GroupData[] = (d.groups ?? d ?? [])
          .filter((g: any) => !g.isAdvertisement)
          .slice(0, 15)
          .map((g: any) => ({
            name: g.name,
            image: g.image || '/assets/placeholder-no-image.png',
            category: g.category,
            memberCount: g.memberCount ?? 0,
            views: g.views ?? 0,
          }));
        setGroups(list);
      })
      .catch(() => {});
  }, []);

  const scale = DESKTOP_SCALE;
  const innerW = DESKTOP_W;

  const activeSlot = AD_SLOTS.find((s) => s.id === activeId) ?? null;

  return (
    <>
    <style>{`
      @keyframes shimmer { 0%, 100% { transform: translateX(-60%); } 50% { transform: translateX(60%); } }
      @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
      @keyframes adGlow {
        0% { box-shadow: 0 0 0 rgba(245,158,11,0.0); transform: translateY(0); }
        40% { box-shadow: 0 0 24px rgba(245,158,11,0.65); transform: translateY(-1px); }
        60% { box-shadow: 0 0 18px rgba(245,158,11,0.4); transform: translateY(0); }
        100% { box-shadow: 0 0 0 rgba(245,158,11,0.0); transform: translateY(0); }
      }
      .ad-pulse:not(.ad-active) { animation: adGlow 1.6s ease-in-out infinite; }
    `}</style>
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-14">
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-14">
          {VIEWS.map((view, viewIdx) => {
            const slotsForView = AD_SLOTS.filter((s) => s.page === view.id);
            const activeInView = activeSlot && activeSlot.page === view.id ? activeSlot : null;

            return (
              <div key={view.id}>
                {viewIdx > 0 && (
                  view.id === 'homepage' ? (
                    <div className="my-10 py-6 border-y-2 border-amber-400/30 bg-gradient-to-r from-transparent via-amber-50 to-transparent text-center">
                      <span className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-amber-600">Homepage Placements</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-8">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300">Next Placement</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  )
                )}
                {/* Section header */}
                <div className={`mb-6 rounded-xl ${view.accentBg} border-l-4 ${view.accentBorder} px-5 py-5`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${view.accent} bg-white font-black text-sm border border-gray-200 shadow-sm`}>{view.icon}</span>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-gray-900 uppercase tracking-wide leading-tight">{view.title}</h2>
                      <span className={`text-[11px] font-bold uppercase tracking-[0.2em] ${view.accent}`}>{view.subtitle}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] sm:text-xs text-gray-600 max-w-2xl leading-relaxed">{view.body}</p>
                </div>

                {/* Miniature + detail side by side */}
                {view.id === 'individual' ? (
                  <div className="space-y-6">
                    {/* Individual page miniature + its detail */}
                    <div className="flex flex-col lg:flex-row gap-5 items-start">
                      <MiniScreen innerW={innerW} innerH={view.innerH} scale={scale}>
                        <IndividualPageContent activeId={activeId} setActiveId={setActiveId} group={groups[0] ?? null} mobile={false} />
                      </MiniScreen>
                      <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                          {(activeId === 'join-cta' || activeId === 'vip-cta') && activeInView && <DetailPanel slot={activeInView} />}
                        </AnimatePresence>
                      </div>
                    </div>
                    {/* Groups page miniature + its detail */}
                    <div className="flex flex-col lg:flex-row gap-5 items-start">
                      <MiniScreen innerW={innerW} innerH={1600} scale={scale}>
                        <GroupsPageCtaContent activeId={activeId} setActiveId={setActiveId} groups={groups} mobile={false} />
                      </MiniScreen>
                      <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                          {activeId === 'popular-cta' && activeInView && <DetailPanel slot={activeInView} />}
                        </AnimatePresence>
                      </div>
                    </div>
                    {/* Menu CTA miniature + its detail */}
                    <div className="flex flex-col lg:flex-row gap-5 items-start">
                      <MiniScreen innerW={innerW} innerH={400} scale={scale}>
                        <MenuCtaContent activeId={activeId} setActiveId={setActiveId} />
                      </MiniScreen>
                      <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                          {activeId === 'home-menu-cta' && activeInView && <DetailPanel slot={activeInView} />}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-5 items-start">
                    <MiniScreen innerW={innerW} innerH={view.innerH} scale={scale}>
                      {view.id === 'listing' && <ListingPageContent activeId={activeId} setActiveId={setActiveId} groups={groups} mobile={false} />}
                      {view.id === 'homepage' && <HomePageContent activeId={activeId} setActiveId={setActiveId} mobile={false} />}
                    </MiniScreen>
                    <div className="flex-1 min-w-0">
                      <AnimatePresence mode="wait">
                        {activeInView && <DetailPanel slot={activeInView} />}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {view.id === 'listing' && <AdFormatComparison />}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
    </>
  );
}
