'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── DATA ────────────────────────────────────────────────────────────────────

type PackageType = 'basic' | 'exclusive';
type PaymentMethod = 'usdt' | 'wise' | '';

interface InFeedProduct {
  id: string;
  tier: 'platinum' | 'gold' | 'silver';
  name: string;
  description: string;
  basicPrice: number;
  exclusivePrice: number;
}

const IN_FEED_PRODUCTS: InFeedProduct[] = [
  { id: 'feed-platinum', tier: 'platinum', name: 'Platinum In-Feed Slot', basicPrice: 350, exclusivePrice: 700,
    description: 'Prime placement in top groups; the first asset seen by visitors. Basic = Rotational (25% traffic share). Exclusive = 100% traffic share · 4X volume.' },
  { id: 'feed-gold', tier: 'gold', name: 'Gold In-Feed Slot', basicPrice: 300, exclusivePrice: 600,
    description: 'First position in recent groups. Includes eligibility for Video Ads (up to 3X higher CTR than static images). Basic = Rotational (25% traffic share). Exclusive = 100% traffic share · 4X volume.' },
  { id: 'feed-silver', tier: 'silver', name: 'Silver In-Feed Slot', basicPrice: 220, exclusivePrice: 440,
    description: 'High-visibility 3rd position in the feed. Basic = Rotational (25% traffic share). Exclusive = 100% traffic share · 4X volume.' },
];

const TIER_BADGE: Record<string, string> = {
  platinum: 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900',
  gold:     'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900',
  silver:   'bg-gradient-to-r from-gray-500 to-gray-400 text-gray-900',
};

const TIER_ACCENT: Record<string, string> = {
  platinum: 'border-l-2 border-l-gray-500/40',
  gold:     'border-l-2 border-l-amber-500/40',
  silver:   'border-l-2 border-l-gray-600/40',
};

interface Product {
  id: string; name: string; description: string;
  category: 'cta' | 'homepage' | 'telegram' | 'content';
  monthly?: number; oneTime?: number;
}

const IN_FEED_EXTRAS: Product[] = [
  { id: 'story-7',  name: 'Erogram Stories Profile — 7 Days',  category: 'in-feed' as Product['category'], oneTime: 100,
    description: 'Instagram-style Story with CTA visible on the Groups page. High engagement due to the familiar swipeable format.' },
  { id: 'story-30', name: 'Erogram Stories Profile — 30 Days', category: 'in-feed' as Product['category'], monthly: 300,
    description: 'Instagram-style Story with CTA visible on the Groups page for 30 days. Very high engagement due to the familiar swipeable format.' },
];

const PRODUCTS: Product[] = [
  { id: 'cta-menu',      name: 'Menu CTA',               category: 'cta',      monthly: 200,
    description: 'Permanent link in the main navigation bar. Visible on every single page across the entire site — groups, bots, articles, and join pages.' },
  { id: 'cta-top',       name: 'In-Page CTA (Top)',       category: 'cta',      monthly: 200,
    description: 'The largest, most prominent call-to-action on every group and bot page. Positioned above the fold for maximum click-through.' },
  { id: 'cta-secondary', name: 'In-Page CTA (Secondary)', category: 'cta',      monthly: 200,
    description: 'Highly visible secondary call-to-action on group and bot pages. Great complement to the top CTA or as a standalone placement.' },
  { id: 'hero-img',      name: 'Hero Banner — Image',     category: 'homepage', monthly: 400,
    description: 'Full-width banner above the fold on the homepage. The first thing every visitor sees. Image creative with direct link.' },
  { id: 'hero-vid',      name: 'Hero Banner — Video',     category: 'homepage', monthly: 500,
    description: 'Full-width video banner above the fold on the homepage. Autoplay video captures instant attention and drives action.' },
  { id: 'home-cta',      name: 'Home Page CTA',           category: 'homepage', monthly: 250,
    description: 'Call-to-action button in the hero section, next to "Explore Groups" and "Explore Bots". Direct traffic from homepage visitors.' },
  { id: 'tg-pinned',    name: 'All Groups Pinned Post',                       category: 'telegram', monthly: 200,
    description: 'Your message pinned at the very top of every Telegram channel in our network for the entire duration.' },
  { id: 'tg-blast-1',   name: 'Single Post Blast',                            category: 'telegram', oneTime: 60,
    description: 'One dedicated image/video post with a CTA promoting your brand on all our groups.' },
  { id: 'tg-blast-7',   name: '7-Day Full Blast (Button CTA on all our posts)',  category: 'telegram', oneTime: 150,
    description: 'Persistent button link with CTA on every video and image post across our groups for 7 days. 1 to 4 posts daily on each group.' },
  { id: 'tg-blast-30',  name: '30-Day Full Blast (Button CTA on all our posts)', category: 'telegram', monthly: 400,
    description: 'Persistent button link with CTA on every post across our groups for 30 days. 1 to 4 posts daily on each group.' },
  { id: 'guest-post',   name: 'Guest Post (up to 3,000 words)', category: 'content', oneTime: 100,
    description: 'Publish your own high-quality article on Erogram.pro. Permanent backlink, SEO juice, and brand authority.' },
  { id: 'seo-gold',     name: 'SEO Article — 500 words',        category: 'content', oneTime: 150,
    description: 'Professionally written 500-word search-optimized article. We handle research, writing, and publishing.' },
  { id: 'seo-plat',     name: 'SEO Article — 1,500 words',      category: 'content', oneTime: 400,
    description: 'Premium 1,500-word long-form article. Deeply optimized content for maximum search visibility.' },
];

const CATEGORIES = [
  { id: 'cta'      as const, label: 'CTA Placements', sub: 'Text + Link — Monthly' },
  { id: 'homepage' as const, label: 'Homepage',       sub: 'Hero Banner & CTA — Monthly' },
  { id: 'telegram' as const, label: 'Telegram Ads',   sub: 'Pinned Posts & Blasts' },
  { id: 'content'  as const, label: 'Content & SEO',  sub: 'Permanent Articles' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const DURATIONS = [
  { m: 1, label: '1 mo',  discount: null },
  { m: 2, label: '2 mo',  discount: '-15%' },
  { m: 3, label: '3 mo',  discount: '-30%' },
] as const;

function getPrice(p: Product, months: number): number {
  if (p.oneTime != null) return p.oneTime;
  const base = (p.monthly ?? 0) * months;
  if (months === 2) return Math.round(base * 0.85);
  if (months === 3) return Math.round(base * 0.70);
  return base;
}

function getInFeedPrice(p: InFeedProduct, pkg: PackageType, months: number): number {
  const base = (pkg === 'exclusive' ? p.exclusivePrice : p.basicPrice) * months;
  if (months === 2) return Math.round(base * 0.85);
  if (months === 3) return Math.round(base * 0.70);
  return base;
}

function fmt(n: number): string { return '$' + n.toLocaleString(); }

interface CartItem { id: string; name: string; price: number; sublabel: string; baseTotal: number; }

// ─── SHARED UI ───────────────────────────────────────────────────────────────

function DurationDropdown({ months, setMonths }: { months: number; setMonths: (m: number) => void }) {
  const [open, setOpen] = useState(false);
  const cur = DURATIONS.find((d) => d.m === months) ?? DURATIONS[0];
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all ${
          open ? 'bg-[#2a1a1a] border-[#b31b1b]/50 text-[#ff8080]' : 'bg-[#222] border-[#333] text-[#aaa] hover:border-[#444] hover:text-[#ccc]'
        }`}
      >
        {cur.label}
        {cur.discount && <span className="text-emerald-400 font-black">{cur.discount}</span>}
        <svg className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-20 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl overflow-hidden min-w-[110px]"
            >
              {DURATIONS.map((d) => (
                <button key={d.m} onClick={() => { setMonths(d.m); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                    months === d.m ? 'bg-[#2a1a1a] text-[#f0f0f0]'
                    : d.m === 3 ? 'bg-emerald-950/40 text-[#ddd] hover:bg-emerald-900/40'
                    : 'text-[#aaa] hover:bg-[#252525] hover:text-[#ddd]'
                  }`}
                >
                  <span className={`font-semibold ${d.m === 3 ? 'text-[12px]' : 'text-[11px]'}`}>{d.label}</span>
                  {d.discount && (
                    <span className={`font-black ${d.m === 3 ? 'text-[12px] text-emerald-300' : 'text-[10px] text-emerald-400'}`}>
                      {d.discount}{d.m === 3 && <span className="ml-1 text-[9px] text-emerald-400/70 font-semibold">BEST</span>}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddBtn({ inCart, onClick }: { inCart: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wide border-0 transition-all ${
        inCart
          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
          : 'text-white hover:opacity-90'
      }`}
      style={inCart ? {} : { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
    >
      {inCart
        ? <><svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l3.5 3.5L13 5"/></svg>Added</>
        : <><svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>Add</>
      }
    </button>
  );
}

function DetailsBtn({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
        open ? 'bg-[#2a1a1a] border-[#b31b1b]/40 text-[#ff8080]' : 'bg-[#1e1e1e] border-[#2e2e2e] text-[#666] hover:text-[#999] hover:border-[#3e3e3e]'
      }`}
    >{open ? 'Hide' : 'Details'}</button>
  );
}

const SECTION_STYLES: Record<string, { bg: string; text: string; sub: string; dot: string }> = {
  'in-feed':  { bg: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)', text: '#fecaca', sub: '#fca5a5', dot: '#ff6b6b' },
  'cta':      { bg: 'linear-gradient(135deg, #3b0764 0%, #4c1d95 50%, #3b0764 100%)', text: '#e9d5ff', sub: '#c4b5fd', dot: '#a78bfa' },
  'homepage': { bg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0c4a6e 100%)', text: '#bae6fd', sub: '#7dd3fc', dot: '#38bdf8' },
  'telegram': { bg: 'linear-gradient(135deg, #0c2461 0%, #1a56db 50%, #0c2461 100%)', text: '#bfdbfe', sub: '#93c5fd', dot: '#60a5fa' },
  'content':  { bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #064e3b 100%)', text: '#a7f3d0', sub: '#6ee7b7', dot: '#34d399' },
  'default':  { bg: 'linear-gradient(135deg, #1a1a1a 0%, #222 100%)',                 text: '#e0e0e0', sub: '#666',    dot: '#ff3366' },
};

function SectionHeader({ label, sub }: { label: string; sub?: string; sectionId?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2a2a2a] bg-[#181818]">
      <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md"
        style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)', color: '#fecaca' }}>
        {label}
      </span>
      {sub && <span className="text-[10px] text-[#555]">{sub}</span>}
    </div>
  );
}

function InfoPanel({ text }: { text: string }) {
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.13 }} className="overflow-hidden"
    >
      <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-[#1a1a1a] border border-[#2e2e2e] text-[11px] text-[#999] leading-relaxed">
        {text}
      </div>
    </motion.div>
  );
}

// ─── IN-FEED ROW ─────────────────────────────────────────────────────────────

function InFeedPricingRow({ product, isLast, cart, onCartChange }: {
  product: InFeedProduct; isLast: boolean;
  cart: Map<string, CartItem>;
  onCartChange: (id: string, item: CartItem | null) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const [pkg, setPkg] = useState<PackageType>('basic');

  const inCart = cart.has(product.id);
  const price  = getInFeedPrice(product, pkg, months);
  const base   = (pkg === 'exclusive' ? product.exclusivePrice : product.basicPrice) * months;
  const savings = base - price;

  const build = useCallback((p: PackageType, m: number): CartItem => {
    const pr = getInFeedPrice(product, p, m);
    const bt = (p === 'exclusive' ? product.exclusivePrice : product.basicPrice) * m;
    const d  = DURATIONS.find((x) => x.m === m)!;
    return { id: product.id, name: product.name, price: pr, baseTotal: bt,
      sublabel: `${p === 'exclusive' ? 'Exclusive' : 'Basic'} · ${d.label}${d.discount ? ` ${d.discount}` : ''}` };
  }, [product]);

  const handlePkg = (p: PackageType) => { setPkg(p); if (inCart) onCartChange(product.id, build(p, months)); };
  const handleMo  = (m: number)      => { setMonths(m); if (inCart) onCartChange(product.id, build(pkg, m)); };
  const toggle    = () => inCart ? onCartChange(product.id, null) : onCartChange(product.id, build(pkg, months));

  return (
    <div className={`${!isLast ? 'border-b border-[#222]' : ''} ${TIER_ACCENT[product.tier]} ${inCart ? 'bg-emerald-950/20' : 'hover:bg-[#1c1c1c]'} transition-colors`}>
      <div className="flex items-center gap-2 py-2 px-3">
        <span className={`shrink-0 ${TIER_BADGE[product.tier]} text-[8px] font-black px-1.5 py-[2px] rounded uppercase tracking-wider`}>{product.tier}</span>
        <span className="flex-1 min-w-0 text-xs font-semibold text-[#d0d0d0] truncate">{product.name}</span>
        <DetailsBtn open={infoOpen} onClick={() => setInfoOpen(!infoOpen)} />
        <div className="flex shrink-0 rounded overflow-hidden border border-[#333] text-[10px] font-black uppercase">
          {(['basic', 'exclusive'] as PackageType[]).map((p) => (
            <button key={p} onClick={() => handlePkg(p)}
              className={`px-2 py-1 transition-colors ${pkg === p ? (p === 'exclusive' ? 'bg-[#b31b1b] text-white' : 'bg-[#2e2e2e] text-[#e0e0e0]') : 'text-[#555] hover:text-[#999]'}`}
            >{p === 'basic' ? 'Basic' : 'Excl.'}</button>
          ))}
        </div>
        <DurationDropdown months={months} setMonths={handleMo} />
        <div className="text-right shrink-0 min-w-[52px]">
          <span className="text-sm font-black text-[#f0f0f0] tabular-nums">{fmt(price)}</span>
          <span className="block text-[9px] text-[#555]">{months > 1 ? `total${savings > 0 ? ` · save ${fmt(savings)}` : ''}` : '/mo'}</span>
        </div>
        <AddBtn inCart={inCart} onClick={toggle} />
      </div>
      <AnimatePresence>{infoOpen && <InfoPanel text={product.description} />}</AnimatePresence>
    </div>
  );
}

// ─── STANDARD ROW ────────────────────────────────────────────────────────────

function PricingRow({ product, isLast, cart, onCartChange }: {
  product: Product; isLast: boolean;
  cart: Map<string, CartItem>;
  onCartChange: (id: string, item: CartItem | null) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [months,   setMonths]   = useState(1);

  const inCart  = cart.has(product.id);
  const isSub   = product.monthly != null;
  const price   = getPrice(product, months);
  const base    = (product.monthly ?? 0) * months;
  const savings = isSub && months > 1 ? base - price : 0;

  const build = useCallback((m: number): CartItem => {
    const pr = getPrice(product, m);
    const bt = (product.monthly ?? 0) * m;
    const d  = DURATIONS.find((x) => x.m === m)!;
    return { id: product.id, name: product.name, price: pr,
      baseTotal: product.oneTime != null ? pr : bt,
      sublabel: product.oneTime != null ? 'One-time' : `${d.label}${d.discount ? ` ${d.discount}` : ''}` };
  }, [product]);

  const handleMo = (m: number) => { setMonths(m); if (inCart) onCartChange(product.id, build(m)); };
  const toggle   = () => inCart ? onCartChange(product.id, null) : onCartChange(product.id, build(months));

  return (
    <div className={`${!isLast ? 'border-b border-[#222]' : ''} ${inCart ? 'bg-emerald-950/20' : 'hover:bg-[#1c1c1c]'} transition-colors`}>
      <div className="flex items-center gap-2 py-2 px-3">
        <span className="flex-1 min-w-0 text-xs font-semibold text-[#d0d0d0] truncate">{product.name}</span>
        <DetailsBtn open={infoOpen} onClick={() => setInfoOpen(!infoOpen)} />
        {isSub && <DurationDropdown months={months} setMonths={handleMo} />}
        <div className="text-right shrink-0 min-w-[52px]">
          <span className="text-sm font-black text-[#f0f0f0] tabular-nums">{fmt(price)}</span>
          <span className="block text-[9px] text-[#555]">
            {product.oneTime != null ? 'one-time' : months > 1 ? `total${savings > 0 ? ` · save ${fmt(savings)}` : ''}` : '/mo'}
          </span>
        </div>
        <AddBtn inCart={inCart} onClick={toggle} />
      </div>
      <AnimatePresence>{infoOpen && <InfoPanel text={product.description} />}</AnimatePresence>
    </div>
  );
}

// ─── CAMPAIGN TOTAL ──────────────────────────────────────────────────────────

function CampaignTotal({ cart, onRemove }: { cart: Map<string, CartItem>; onRemove: (id: string) => void }) {
  const [payment,  setPayment]  = useState<PaymentMethod>('');
  const [notes,    setNotes]    = useState('');
  const [email,    setEmail]    = useState('');
  const [fullName, setFullName] = useState('');
  const [company,  setCompany]  = useState('');
  const [website,  setWebsite]  = useState('');
  const [errors,   setErrors]   = useState<{ email?: boolean; fullName?: boolean; company?: boolean; website?: boolean; payment?: boolean }>({});
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [sendError, setSendError] = useState('');

  const items     = Array.from(cart.values());
  const total     = items.reduce((s, i) => s + i.price, 0);
  const totalBase = items.reduce((s, i) => s + i.baseTotal, 0);
  const savings   = totalBase - total;

  const handleSubmit = async () => {
    const errs: typeof errors = {};
    if (!email.trim() || !email.includes('@')) errs.email = true;
    if (!fullName.trim()) errs.fullName = true;
    if (!company.trim()) errs.company = true;
    if (!website.trim()) errs.website = true;
    if (!payment) errs.payment = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSending(true);
    setSendError('');

    try {
      const payLabel = payment === 'usdt' ? 'Crypto USDT TRC-20' : 'Wise';
      const lines = items.map((i) => `• ${i.name} (${i.sublabel}) — ${fmt(i.price)}`).join('\n');
      const message = [
        'I would like to place the following advertising order:',
        '',
        lines,
        '',
        savings > 0 ? `Subtotal (before discounts): ${fmt(totalBase)}` : null,
        savings > 0 ? `Discount savings: -${fmt(savings)}` : null,
        `TOTAL: ${fmt(total)}`,
        '',
        `Preferred payment: ${payLabel}`,
        notes.trim() ? `\nNotes / Special requests:\n${notes.trim()}` : null,
        '',
        'Please confirm availability and next steps.',
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/advertise-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName.trim(), email: email.trim(), company: company.trim(), website: website.trim(), message }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send order');
      setSent(true);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send order. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleExport = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const rows = items.map((i) =>
      `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;color:#1a1a1a">${i.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:11px;color:#888">${i.sublabel}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;font-weight:800;text-align:right;color:#1a1a1a;white-space:nowrap">${fmt(i.price)}</td>
        ${i.baseTotal > i.price ? `<td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:11px;text-align:right;color:#059669;white-space:nowrap">-${fmt(i.baseTotal - i.price)}</td>` : '<td style="padding:10px 12px;border-bottom:1px solid #eee"></td>'}
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erogram Advertising — Price Quote</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;padding:40px;max-width:800px;margin:0 auto}
  @media print{body{padding:20px}button{display:none!important}}
</style></head><body>
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1a1a1a">
  <div>
    <h1 style="font-size:22px;font-weight:900;letter-spacing:0.05em;text-transform:uppercase">Erogram.pro</h1>
    <p style="font-size:11px;color:#888;margin-top:2px">Advertising Price Quote</p>
  </div>
  <div style="text-align:right">
    <p style="font-size:11px;color:#888">${date}</p>
    <p style="font-size:11px;color:#888;margin-top:2px">${items.length} placement${items.length !== 1 ? 's' : ''}</p>
  </div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
  <thead>
    <tr style="border-bottom:2px solid #1a1a1a">
      <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#888">Placement</th>
      <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#888">Details</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#888">Price</th>
      <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#888">Discount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div style="border-top:2px solid #1a1a1a;padding-top:16px;display:flex;justify-content:flex-end;gap:32px;align-items:baseline">
  ${savings > 0 ? `<div style="text-align:right"><p style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Total saved</p><p style="font-size:18px;font-weight:900;color:#059669">${fmt(savings)}</p></div>` : ''}
  <div style="text-align:right">
    <p style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Total</p>
    <p style="font-size:28px;font-weight:900">${fmt(total)}</p>
    ${savings > 0 ? `<p style="font-size:11px;color:#aaa;text-decoration:line-through">${fmt(totalBase)}</p>` : ''}
  </div>
</div>

<div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center">
  <p style="font-size:11px;font-weight:700;color:#1a1a1a;margin-bottom:4px">Contact: erogrampro@gmail.com &nbsp;/&nbsp; Telegram: @erogramDOTpro</p>
  <p style="font-size:10px;color:#aaa;margin-top:8px">Multi-month bookings unlock up to 30% discount. Prices are in USD. This quote is informational — final pricing confirmed upon order submission at erogram.pro/advertise</p>
</div>

<div style="text-align:center;margin-top:24px">
  <button onclick="window.print()" style="padding:10px 32px;background:#1a1a1a;color:white;border:none;border-radius:8px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer">Save as PDF</button>
</div>
</body></html>`;

    const w = window.open('about:blank', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  const inputCls = (err?: boolean) =>
    `w-full bg-white border-2 rounded-lg px-4 py-3 text-[13px] text-[#111] placeholder-[#c0b8b0] focus:outline-none transition-all font-semibold shadow-sm ${
      err
        ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
        : 'border-[#ccc] focus:border-[#333] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.07)]'
    }`;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.2 }}
      className="rounded-xl overflow-hidden border border-[#e8e3dc]"
      style={{ background: '#faf9f7', boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2.5">
          <div className="w-0.5 h-5 rounded-full bg-gradient-to-b from-[#ff3366] to-[#b31b1b]" />
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Campaign Total</h3>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 text-[10px] font-bold text-[#999] uppercase tracking-wider hover:text-white transition-colors"
            title="Export price list"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider">{items.length} placement{items.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Line items */}
      <div className="divide-y divide-[#ede9e3]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#f3f0eb] transition-colors">
            <button onClick={() => onRemove(item.id)}
              className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center border border-[#ddd] text-[#bbb] hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#1a1a1a] truncate">{item.name}</p>
              <p className="text-[10px] text-[#888]">{item.sublabel}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[13px] font-black text-[#1a1a1a] tabular-nums">{fmt(item.price)}</span>
              {item.baseTotal > item.price && (
                <span className="block text-[9px] text-emerald-600 font-medium">save {fmt(item.baseTotal - item.price)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Total bar */}
      <div className="border-t border-[#e0dbd4]">
        <div className="flex items-center justify-between px-5 py-4 bg-[#f0ece5]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#888]">Total</p>
            {savings > 0 && (
              <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
                You save{' '}
                <span className="text-[18px] font-black tabular-nums">{fmt(savings)}</span>
                {totalBase > 0 && <span className="text-[10px] text-[#aaa] line-through ml-1.5 tabular-nums">{fmt(totalBase)}</span>}
              </p>
            )}
          </div>
          <span className="text-3xl font-black text-[#1a1a1a] tabular-nums">{fmt(total)}</span>
        </div>
      </div>

      {/* Form */}
      <div className="px-5 py-5 space-y-4 border-t border-[#e8e3dc]">

        {/* Contact fields */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#444] mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={fullName} onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: false })); }}
                placeholder="Your full name"
                className={inputCls(errors.fullName)}
              />
              {errors.fullName && <p className="text-[11px] text-red-500 mt-1">Full name is required</p>}
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#444] mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: false })); }}
                placeholder="your@email.com"
                className={inputCls(errors.email)}
              />
              {errors.email && <p className="text-[11px] text-red-500 mt-1">Valid email required</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#444] mb-2">
                Company / Contact <span className="text-red-500">*</span>
              </label>
              <input type="text" value={company} onChange={(e) => { setCompany(e.target.value); setErrors((p) => ({ ...p, company: false })); }}
                placeholder="Company name or brand"
                className={inputCls(errors.company)}
              />
              {errors.company && <p className="text-[11px] text-red-500 mt-1">This field is required</p>}
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#444] mb-2">
                Website <span className="text-red-500">*</span>
              </label>
              <input type="url" value={website} onChange={(e) => { setWebsite(e.target.value); setErrors((p) => ({ ...p, website: false })); }}
                placeholder="https://yourwebsite.com"
                className={inputCls(errors.website)}
              />
              {errors.website && <p className="text-[11px] text-red-500 mt-1">Website is required</p>}
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${errors.payment ? 'text-red-500' : 'text-[#444]'}`}>
            Preferred Payment <span className="text-red-500">*</span>
            {errors.payment && <span className="ml-2 normal-case font-normal text-red-500">— please select one</span>}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {/* USDT */}
            <button onClick={() => { setPayment(payment === 'usdt' ? '' : 'usdt'); setErrors((p) => ({ ...p, payment: false })); }}
              className="relative flex flex-col items-center justify-center px-4 py-3.5 rounded-xl border-2 font-black text-sm uppercase tracking-wide transition-all hover:scale-[1.02]"
              style={payment === 'usdt'
                ? { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', borderColor: 'transparent', color: 'white', boxShadow: '0 4px 20px rgba(249,115,22,0.5)' }
                : { background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', borderColor: '#fb923c', color: 'white' }
              }
            >
              {payment === 'usdt' && <svg className="absolute top-2 right-2 w-3.5 h-3.5 text-white/80" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l3.5 3.5L13 5"/></svg>}
              <span className="text-base font-black">Crypto</span>
              <span className="text-[10px] font-semibold mt-0.5 opacity-80">USDT TRC-20</span>
            </button>

            {/* Wise */}
            <button onClick={() => { setPayment(payment === 'wise' ? '' : 'wise'); setErrors((p) => ({ ...p, payment: false })); }}
              className="relative flex flex-col items-center justify-center px-4 py-3.5 rounded-xl border-2 font-black text-sm uppercase tracking-wide transition-all hover:scale-[1.02]"
              style={payment === 'wise'
                ? { background: 'linear-gradient(135deg, #9FE870 0%, #7ec852 100%)', borderColor: 'transparent', color: '#163300', boxShadow: '0 4px 20px rgba(159,232,112,0.4)' }
                : { background: 'linear-gradient(135deg, #f0fce8 0%, #dcfce7 100%)', borderColor: '#86efac', color: '#166534' }
              }
            >
              {payment === 'wise' && <svg className="absolute top-2 right-2 w-3.5 h-3.5 text-[#163300]/60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l3.5 3.5L13 5"/></svg>}
              <span className="text-base font-black">Wise</span>
              <span className="text-[10px] font-semibold mt-0.5 opacity-70">Bank transfer</span>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-black uppercase tracking-widest text-[#444] mb-2">
            Notes / Special Requests <span className="text-[#aaa] normal-case font-normal">(optional)</span>
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. specific launch date, creative format preferences, target audience notes…"
            rows={3}
            className="w-full bg-white border-2 border-[#ccc] rounded-lg px-4 py-3 text-[13px] text-[#111] placeholder-[#c0b8b0] resize-none focus:outline-none focus:border-[#333] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.07)] transition-all leading-relaxed font-semibold shadow-sm"
          />
        </div>

        {/* Send order */}
        {sent ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
              <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8l3.5 3.5L13 5"/></svg>
            </div>
            <p className="text-sm font-black text-[#1a1a1a] uppercase tracking-widest">Order Sent</p>
            <p className="text-xs text-[#888] mt-1">We&apos;ll get back to you shortly to confirm details and next steps.</p>
          </div>
        ) : (
          <>
            <button onClick={handleSubmit} disabled={sending}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-black text-sm uppercase tracking-widest text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
              onMouseEnter={(e) => { if (!sending) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #111 0%, #222 100%)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)'; }}
            >
              {sending ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              )}
              {sending ? 'Sending…' : 'Send Order'}
            </button>
            {sendError && <p className="text-[11px] text-red-500 text-center mt-1">{sendError}</p>}
            <p className="text-[10px] text-[#bbb] text-center">Your order will be sent directly to our team.</p>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── PROCESS STEPS ───────────────────────────────────────────────────────────

const STEPS = [
  { title: 'Select & Submit', desc: 'Choose your placements and submit your order. We review it within a few hours.' },
  { title: 'We Get in Touch', desc: 'Our team contacts you to confirm details, answer questions, and align on goals.' },
  { title: 'Send Your Creative', desc: 'Share your banner, video, or copy. We handle setup, targeting, and scheduling.' },
  { title: 'Campaign Goes Live', desc: 'Your campaign launches within 24–48h of payment confirmation.' },
];

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function AdShop() {
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());

  const handleCartChange = useCallback((id: string, item: CartItem | null) => {
    setCart((prev) => {
      const next = new Map(prev);
      if (item === null) next.delete(id); else next.set(id, item);
      return next;
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Pricing table */}
      <div className="rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#161616]"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.02), 0 20px 50px rgba(0,0,0,0.5)' }}
      >
        <div>
          <SectionHeader label="In-Feed Advertising Packages" sub="Basic & Exclusive — Monthly" sectionId="in-feed" />
          {IN_FEED_PRODUCTS.map((p, i) => (
            <InFeedPricingRow key={p.id} product={p} isLast={false} cart={cart} onCartChange={handleCartChange} />
          ))}
          {IN_FEED_EXTRAS.map((p, i) => (
            <PricingRow key={p.id} product={p} isLast={i === IN_FEED_EXTRAS.length - 1} cart={cart} onCartChange={handleCartChange} />
          ))}
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[#b31b1b]/15 to-transparent" />
        {CATEGORIES.map((cat) => {
          const products = PRODUCTS.filter((p) => p.category === cat.id);
          return (
            <div key={cat.id} className="border-t border-[#1e1e1e]">
              <SectionHeader label={cat.label} sub={cat.sub} sectionId={cat.id} />
              {products.map((p, i) => (
                <PricingRow key={p.id} product={p} isLast={i === products.length - 1} cart={cart} onCartChange={handleCartChange} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Campaign total */}
      <AnimatePresence>
        {cart.size > 0 && <CampaignTotal cart={cart} onRemove={(id) => handleCartChange(id, null)} />}
      </AnimatePresence>

      {/* How it works */}
      <div className="rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#161616]">
        <SectionHeader label="How It Works" />
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={i} className="relative px-4 py-5 hover:bg-[#1c1c1c] transition-colors">
              {i < STEPS.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-[#2a2a2a]" />
              )}
              <div className="w-5 h-5 rounded-full bg-[#b31b1b]/20 border border-[#b31b1b]/40 flex items-center justify-center mb-3">
                <span className="text-[9px] font-black text-[#ff3366]">{i + 1}</span>
              </div>
              <p className="text-[11px] font-black text-[#e0e0e0] mb-1.5 leading-snug">{step.title}</p>
              <p className="text-[10px] text-[#666] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
