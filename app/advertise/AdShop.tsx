'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── DATA ────────────────────────────────────────────────────────────────────

type AdFormat = 'video' | 'image';

interface Product {
  id: string;
  name: string;
  description: string;
  category: 'in-feed' | 'cta' | 'homepage' | 'telegram' | 'content';
  monthly?: number;
  monthlyVideo?: number;
  monthlyImage?: number;
  oneTime?: number;
}

const PRODUCTS: Product[] = [
  { id: 'feed-s1', name: 'In-Feed Slot 1', category: 'in-feed', monthlyVideo: 450, monthlyImage: 350,
    description: 'Premier position in the feed. Highest traffic share, first in the 4-slot ad rotation. Captures the most attention immediately.' },
  { id: 'feed-s2', name: 'In-Feed Slot 2', category: 'in-feed', monthlyVideo: 380, monthlyImage: 280,
    description: 'High-traffic second position with strong visibility. Appears right after Slot 1 in the rotation sequence.' },
  { id: 'feed-s3', name: 'In-Feed Slot 3', category: 'in-feed', monthlyVideo: 300, monthlyImage: 220,
    description: 'Momentum slot for deep-scroll users who are actively engaged and more likely to interact.' },
  { id: 'feed-s4', name: 'In-Feed Slot 4', category: 'in-feed', monthlyVideo: 300, monthlyImage: 220,
    description: 'Final slot in each rotation cycle. Ads loop continuously as users keep scrolling, creating repeated brand exposure.' },

  { id: 'cta-menu', name: 'Menu CTA', category: 'cta', monthly: 300,
    description: 'Permanent link in the main navigation bar. Visible on every single page across the entire site — groups, bots, articles, and join pages.' },
  { id: 'cta-top', name: 'In-Page CTA (Top)', category: 'cta', monthly: 300,
    description: 'The largest, most prominent call-to-action on every group and bot page. Positioned above the fold for maximum click-through.' },
  { id: 'cta-secondary', name: 'In-Page CTA (Secondary)', category: 'cta', monthly: 200,
    description: 'Highly visible secondary call-to-action on group and bot pages. Great complement to the top CTA or as a standalone placement.' },
  { id: 'cta-filter', name: 'Popular CTA', category: 'cta', monthly: 280,
    description: 'CTA button embedded within the Popular Categories section on the groups directory — the highest-engagement zone on the page.' },

  { id: 'hero-img', name: 'Homepage Hero Banner — Image', category: 'homepage', monthly: 400,
    description: 'Full-width banner above the fold on the homepage. The first thing every visitor sees. Image creative with direct link.' },
  { id: 'hero-vid', name: 'Homepage Hero Banner — Video', category: 'homepage', monthly: 500,
    description: 'Full-width video banner above the fold on the homepage. Autoplay video captures instant attention and drives action.' },
  { id: 'home-cta', name: 'Home Page CTA', category: 'homepage', monthly: 250,
    description: 'Call-to-action button in the hero section, positioned next to "Explore Groups" and "Explore Bots". Direct traffic from homepage visitors.' },

  { id: 'tg-pinned', name: 'All Groups Pinned Post', category: 'telegram', monthly: 200,
    description: 'Your message pinned at the very top of every Telegram channel in our network for the entire duration. Unmatched visibility.' },
  { id: 'tg-blast-1', name: '1 Post Blast', category: 'telegram', oneTime: 60,
    description: 'Single coordinated post across all channels. Custom image/video, text, and direct link sent at peak engagement time.' },
  { id: 'tg-blast-7', name: '7-Day Daily Blasts', category: 'telegram', oneTime: 150,
    description: 'One post per day for 7 consecutive days across all channels. Builds momentum and sustained awareness.' },
  { id: 'tg-blast-30', name: '30-Day Daily Blasts', category: 'telegram', oneTime: 600,
    description: 'One post per day for 30 days across all channels. Best for building long-term brand recognition.' },
  { id: 'tg-blast-60', name: '60-Day Daily Blasts', category: 'telegram', oneTime: 1050,
    description: 'One post per day for 60 days across all channels. Maximum sustained exposure at the lowest per-day rate.' },

  { id: 'guest-post', name: 'Guest Post (up to 3,000 words)', category: 'content', oneTime: 100,
    description: 'Publish your own high-quality article on Erogram.pro. Permanent backlink, SEO juice, and brand authority.' },
  { id: 'seo-gold', name: 'SEO Article — 500 words', category: 'content', oneTime: 250,
    description: 'Professionally written 500-word search-optimized article. We handle research, writing, and publishing.' },
  { id: 'seo-plat', name: 'SEO Article — 1,500 words', category: 'content', oneTime: 400,
    description: 'Premium 1,500-word long-form article. Comprehensive, deeply optimized content for maximum search visibility.' },
];

const CATEGORIES = [
  { id: 'in-feed' as const, label: 'In-Feed Ads', sub: 'Video & Image — Monthly' },
  { id: 'cta' as const, label: 'CTA Placements', sub: 'Text + Link — Monthly' },
  { id: 'homepage' as const, label: 'Homepage', sub: 'Hero Banner & CTA — Monthly' },
  { id: 'telegram' as const, label: 'Telegram Ads', sub: 'Pinned Posts & Blasts' },
  { id: 'content' as const, label: 'Content & SEO', sub: 'Permanent Articles' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const DURATIONS = [
  { m: 1, label: '1 Month', discount: null },
  { m: 2, label: '2 Months', discount: '-15%' },
  { m: 3, label: '3 Months', discount: '-30%' },
] as const;

function getMonthly(p: Product, format?: AdFormat): number {
  if (p.monthlyVideo != null && p.monthlyImage != null) {
    return format === 'image' ? p.monthlyImage : p.monthlyVideo;
  }
  return p.monthly ?? 0;
}

function getPrice(p: Product, months: number, format?: AdFormat): number {
  if (p.oneTime != null) return p.oneTime;
  const base = getMonthly(p, format) * months;
  if (months === 2) return Math.round(base * 0.85);
  if (months === 3) return Math.round(base * 0.70);
  return base;
}

function fmt(n: number): string { return '$' + n.toLocaleString(); }

// ─── PRICING ROW ─────────────────────────────────────────────────────────────

function PricingRow({ product, isLast }: { product: Product; isLast: boolean }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const [format, setFormat] = useState<AdFormat>('video');

  const isSub = product.monthly != null || (product.monthlyVideo != null && product.monthlyImage != null);
  const hasFormatToggle = product.monthlyVideo != null && product.monthlyImage != null;

  const price = getPrice(product, months, format);
  const currentDuration = DURATIONS.find((d) => d.m === months) ?? DURATIONS[0];

  return (
    <div className={`${!isLast ? 'border-b border-gray-100' : ''}`}>
      <div className="flex items-center gap-2 sm:gap-3 py-2 px-3 sm:px-4 hover:bg-gray-50/50 transition-colors">

        {/* Name + info */}
        <div className="min-w-0 flex items-center gap-1.5 flex-1">
          <span className="text-xs sm:text-[13px] font-medium text-gray-900 truncate">{product.name}</span>
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            className={`w-3.5 h-3.5 rounded-full border text-[7px] font-bold flex items-center justify-center shrink-0 transition-colors ${
              infoOpen ? 'border-amber-400 text-amber-500 bg-amber-50' : 'border-gray-300 text-gray-400 hover:border-amber-400 hover:text-amber-500'
            }`}
          >
            i
          </button>
        </div>

        {/* Video / Image toggle */}
        {hasFormatToggle && (
          <div className="flex items-center shrink-0 rounded-lg overflow-hidden border-2 border-amber-300">
            {(['video', 'image'] as AdFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1 text-[11px] font-black uppercase tracking-wide transition-all ${
                  format === f
                    ? 'bg-amber-500 text-white shadow-inner'
                    : 'bg-white text-amber-600 hover:bg-amber-50'
                }`}
              >
                {f === 'video' ? '▶ Video' : '🖼 Image'}
              </button>
            ))}
          </div>
        )}

        {/* Duration dropdown */}
        {isSub && (
          <div className="relative shrink-0">
            <button
              onClick={() => setDurationOpen(!durationOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border-2 transition-all ${
                durationOpen
                  ? 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm'
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400 hover:shadow-sm'
              }`}
            >
              <span>{currentDuration.label}</span>
              {currentDuration.discount && <span className="text-emerald-600 font-black text-[10px]">{currentDuration.discount}</span>}
              <svg className={`w-3.5 h-3.5 transition-transform ${durationOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <AnimatePresence>
              {durationOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDurationOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden min-w-[130px]"
                  >
                    {DURATIONS.map((d) => {
                      const isActive = months === d.m;
                      return (
                        <button
                          key={d.m}
                          onClick={() => { setMonths(d.m); setDurationOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${isActive ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                        >
                          <span className={`text-[11px] font-semibold ${isActive ? 'text-amber-700' : 'text-gray-700'}`}>{d.label}</span>
                          {d.discount && <span className="text-[10px] font-bold text-emerald-600">{d.discount}</span>}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Price */}
        <div className="text-right min-w-[50px] shrink-0">
          <span className="text-sm sm:text-[15px] font-bold text-gray-900 tabular-nums">{fmt(price)}</span>
          {product.oneTime == null && <span className="block text-[9px] text-gray-400">{months > 1 ? 'total' : '/mo'}</span>}
        </div>
      </div>

      {/* Info expandable */}
      <AnimatePresence>
        {infoOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mx-3 sm:mx-4 mb-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/60 text-[11px] text-gray-600 leading-relaxed">
              {product.description}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PROCESS STEPS ───────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: '📋',
    title: 'Choose placements & get in touch',
    desc: 'Pick the placements you want and email us your goals so we can shape the campaign.',
  },
  {
    icon: '🧠',
    title: 'We craft your strategy',
    desc: 'We recommend the best combination (slots, duration, formats) for your budget and objectives.',
  },
  {
    icon: '💳',
    title: 'Payment & campaign details',
    desc: 'You confirm the plan, pay upfront via Wise or USDT (TRC-20), and send any required creatives or tracking links.',
  },
  {
    icon: '🚀',
    title: 'Go live in 24–48h',
    desc: 'We schedule and launch your campaign within 24–48 hours after payment confirmation.',
  },
];

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function AdShop() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Pricing table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-200">
        {CATEGORIES.map((cat) => {
          const products = PRODUCTS.filter((p) => p.category === cat.id);
          return (
            <div key={cat.id}>
              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-amber-500 border-b border-amber-600">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">{cat.label}</h3>
                  <span className="text-[10px] text-white/60">{cat.sub}</span>
                </div>
              </div>
              {products.map((product, i) => (
                <PricingRow key={product.id} product={product} isLast={i === products.length - 1} />
              ))}
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-gray-900 to-gray-800">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">How It Works</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
          {STEPS.map((step, i) => (
            <div key={i} className="px-4 py-5 text-center">
              <div className="text-2xl mb-2.5">{step.icon}</div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">Step {i + 1}</div>
              <p className="text-xs font-bold text-gray-900 mb-1">{step.title}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment & contact */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-gray-900 to-gray-800">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Contact</h3>
        </div>
        <div className="px-5 py-6 text-center space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            Contact: <span className="font-semibold text-gray-900">adilmaf.agency@gmail.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
