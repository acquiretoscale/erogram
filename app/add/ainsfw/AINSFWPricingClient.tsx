'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createAINSFWSubmission, type AINSFWPlan, type AINSFWFormData } from '@/lib/actions/ainsfwPayment';
import { validateCoupon } from '@/lib/actions/coupons';
import TrustedByLeaders from '@/app/advertise/TrustedByLeaders';

const ACCENT      = '#0ea5e9';
const ACCENT_DARK = '#0369a1';
const SHADOW      = '4px 4px 0px #000000';
const SHADOW_LG   = '6px 6px 0px #000000';
const BORDER      = '3px solid #000000';

// The 5 main categories (stored as `category` in DB)
const MAIN_CATEGORIES = ['AI Girlfriend', 'Undress AI', 'AI Chat', 'AI Image', 'AI Roleplay'] as const;
const SUBSCRIPTION_OPTIONS = ['Free', 'Freemium & Paid', 'Paid'] as const;
const PAYMENT_OPTIONS = ['Credit Cards', 'Crypto', 'PayPal'] as const;

// All chips shown together — main categories first, then tags (no duplicates)
const ALL_CHIPS: string[] = [
  // main categories (capitalized, these also become the DB `category` / `categories`)
  'AI Girlfriend', 'Undress AI', 'AI Chat', 'AI Image', 'AI Roleplay',
  // tags that don't duplicate the above
  'ai companion', 'ai chatbot', 'ai nsfw chat', 'ai sexting',
  'ai nsfw roleplay', 'ai characters', 'ai nsfw character', 'ai virtual girlfriend',
  'ai undress', 'ai nudifier', 'ai clothes remover',
  'ai image generator', 'ai nsfw image generator', 'ai porn generator',
  'ai art generator', 'ai face swap', 'ai video generator',
  'ai erotic storytelling', 'ai story', 'ai fetish',
  'ai anime', 'ai anime characters',
];

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
      <path d="M2.5 8l3.5 3.5L13.5 4" />
    </svg>
  );
}

function CompactHeroStats() {
  const [views, setViews] = useState<number | null>(null);
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.totalViews === 'number') setViews(d.totalViews);
          if (typeof d.activeVisitors === 'number') setLive(d.activeVisitors);
        })
        .catch(() => {});
    };
    fetchStats();
    const id = setInterval(fetchStats, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="shrink-0 text-right">
      <p className="inline-flex px-2.5 py-0.5 mb-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] text-white bg-black rounded">
        Get seen on Erogram
      </p>
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-5 py-4 space-y-2 shrink-0">
        <div className="flex items-baseline justify-end gap-3 whitespace-nowrap">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/30">Page views</span>
          <span className="text-lg sm:text-xl font-bold tabular-nums text-white/65">
            {views != null ? views.toLocaleString() : '—'}
          </span>
        </div>
        <div className="flex items-baseline justify-end gap-3 whitespace-nowrap">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400/70 animate-pulse shrink-0 self-center" />
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/30">Live now</span>
          <span className="text-lg sm:text-xl font-bold tabular-nums text-white/65">
            {live != null ? live.toLocaleString() : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

const emptyForm: AINSFWFormData = {
  toolName: '',
  websiteUrl: '',
  email: '',
  contactTelegram: '',
  description: '',
  logoUrl: '',
  category: 'AI Girlfriend',
  vendor: '',
  tags: '',
  subscription: 'Freemium & Paid',
  paymentMethods: [],
};

export default function AINSFWPricingClient() {
  const [username, setUsername] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AINSFWPlan | null>(null);
  const [form, setForm] = useState<AINSFWFormData>({ ...emptyForm });
  // unified selection — main categories + tags in one list
  const [selectedItems, setSelectedItems] = useState<string[]>(['AI Girlfriend']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountedStars?: number; savedStars?: number; error?: string } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openForm = (plan: AINSFWPlan) => {
    setSelectedPlan(plan);
    setError('');
    setTimeout(() => {
      document.getElementById('submit-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const closeForm = () => { setSelectedPlan(null); setError(''); };

  const togglePayment = (method: string) => {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(method)
        ? f.paymentMethods.filter((m) => m !== method)
        : [...f.paymentMethods, method],
    }));
  };

  const maxMainCats = selectedPlan === 'boost' ? 5 : 1;

  const toggleItem = (item: string) => {
    const isMainCat = (MAIN_CATEGORIES as readonly string[]).includes(item);
    setSelectedItems((prev) => {
      if (prev.includes(item)) {
        // keep at least one main category selected
        const remaining = prev.filter((i) => i !== item);
        const stillHasMainCat = remaining.some((i) => (MAIN_CATEGORIES as readonly string[]).includes(i));
        return stillHasMainCat ? remaining : prev;
      }
      // adding a main category: enforce limit
      if (isMainCat) {
        const currentMainCount = prev.filter((i) => (MAIN_CATEGORIES as readonly string[]).includes(i)).length;
        if (currentMainCount >= maxMainCats) return prev;
      }
      return [...prev, item];
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setError('');
  };

  const uploadImage = async (category: string): Promise<string> => {
    if (!imageFile) return '';
    const fd = new FormData();
    fd.append('file', imageFile);
    fd.append('folder', 'ainsfw');
    fd.append('name', form.toolName.trim());
    fd.append('category', category);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!form.toolName.trim()) { setError('Tool name is required.'); return; }
    if (!form.websiteUrl.trim() || !form.websiteUrl.startsWith('http')) { setError('Enter a valid URL starting with https://'); return; }
    const hasEmail = form.email.trim() && form.email.includes('@');
    const hasTelegram = !!form.contactTelegram?.trim();
    if (!hasEmail && !hasTelegram) { setError('Provide a contact email or Telegram so we can reach you.'); return; }
    if (!form.description.trim() || form.description.trim().length < 30) { setError('Description must be at least 30 characters.'); return; }
    if (!imageFile) { setError('Please upload a logo / image for your tool.'); return; }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Please log in to submit — your listing will be saved to your account.');
      window.location.href = '/join-erogram?redirect=/add/ainsfw';
      return;
    }

    setLoading(true);
    setError('');
    try {
      const mainCatsSelected = selectedItems.filter((i) => (MAIN_CATEGORIES as readonly string[]).includes(i));
      const category = mainCatsSelected[0] ?? 'AI Girlfriend';
      setUploading(true);
      const logoUrl = await uploadImage(category);
      setUploading(false);

      const result = await createAINSFWSubmission(selectedPlan, {
        ...form,
        logoUrl,
        category,
        tags: selectedItems.join(', '),
        extraCategories: mainCatsSelected,
      }, couponCode.trim() || undefined, token);
      if (result.freeApproval) {
        window.location.href = `/add/ainsfw/thank-you?plan=${selectedPlan}&slug=${result.slug}`;
      } else if (result.success && result.invoiceUrl) {
        window.location.href = result.invoiceUrl;
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Failed to process. Please try again.');
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  /* shared input style — white bg for contrast on dark form */
  const inputCls = 'w-full px-4 py-3 text-sm font-semibold bg-white text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-sky-500/60 rounded-none';

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar username={username} setUsername={setUsername} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-white/30 mb-6 uppercase tracking-widest">
          <Link href="/add" className="hover:text-white/60 transition-colors">Add</Link>
          <span className="text-white/20">/</span>
          <span style={{ color: ACCENT }}>AI NSFW Tool</span>
        </div>

        {/* HERO */}
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span
              className="inline-block px-3 py-1 mb-4 text-[10px] font-black uppercase tracking-widest"
              style={{ background: ACCENT, color: '#fff', border: BORDER }}
            >
              🔞 AI NSFW Directory
            </span>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.05] tracking-tighter mb-3">
              <span className="text-white">List Your</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-400 to-emerald-400">AI NSFW Tool.</span>
            </h1>
            <p className="text-sm text-white/50 max-w-sm leading-relaxed">
              Get featured on the largest adult NSFW hub  reach <strong className="text-white/80">140K+ monthly visitors</strong> hunting for AI tools.
            </p>
          </div>
          <div className="self-end sm:self-start sm:pt-1">
            <CompactHeroStats />
          </div>
        </div>

        {/* PRICING GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">

          {/* BASIC */}
          <div
            className="relative flex flex-col bg-white p-6"
            style={{ border: BORDER, boxShadow: SHADOW_LG, color: '#000' }}
          >
            <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-2">Basic</p>
            <div className="mb-4">
              <span className="text-5xl font-black text-black">$49</span>
              <span className="text-sm font-bold text-black/40 ml-2">one-time</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Listed in 1 category',
                'Instant approval',
                'Tool page with backlink',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-semibold text-black/80">
                  <span style={{ color: ACCENT }}><Check /></span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => openForm('basic')}
              className="w-full py-3.5 text-sm font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px]"
              style={selectedPlan === 'basic'
                ? { background: ACCENT_DARK, color: '#fff', border: BORDER, boxShadow: 'none', transform: 'translate(2px,2px)' }
                : { background: ACCENT, color: '#fff', border: BORDER, boxShadow: SHADOW }
              }
            >
              {selectedPlan === 'basic' ? '✓ Selected — scroll down' : 'Get Listed — $49'}
            </button>
          </div>

          {/* BOOST */}
          <div
            className="relative flex flex-col bg-white p-6 overflow-hidden"
            style={{ border: `3px solid ${ACCENT}`, boxShadow: `6px 6px 0px ${ACCENT}`, color: '#000' }}
          >
            {/* Big BOOST label */}
            <p
              className="font-black uppercase leading-none mb-1 tracking-tight"
              style={{ fontSize: '3rem', color: ACCENT, textShadow: '2px 2px 0px rgba(0,0,0,0.15)' }}
            >
              BOOST
            </p>

            {/* Price */}
            <div className="mb-4">
              <span className="text-4xl font-black text-black">$197</span>
              <span className="text-sm font-bold text-black/40 ml-2">one-time</span>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {/* Featured highlight */}
              <li
                className="flex items-center gap-2 px-3 py-2 text-[12px] font-black uppercase tracking-wide"
                style={{ background: '#0ea5e9', color: '#fff', border: '2px solid #000' }}
              >
                <Check /> 2 Weeks featured in &ldquo;Top AI NSFW&rdquo;
              </li>
              {[
                'Everything in Basic',
                'Instant approval',
                'Priority placement in directory',
                'Up to 5 category listings',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-semibold text-black/80">
                  <span style={{ color: ACCENT }} className="mt-0.5 shrink-0"><Check /></span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => openForm('boost')}
              className="w-full py-3.5 text-sm font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px]"
              style={selectedPlan === 'boost'
                ? { background: ACCENT_DARK, color: '#fff', border: BORDER, boxShadow: 'none', transform: 'translate(2px,2px)' }
                : { background: ACCENT, color: '#fff', border: BORDER, boxShadow: SHADOW }
              }
            >
              {selectedPlan === 'boost' ? '✓ Selected — scroll down' : 'Boost My Tool — $197'}
            </button>
          </div>

          {/* SCALE — same dark blue gradient as old BOOST */}
          <div
            className="relative flex flex-col p-6 overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0c2d4e 0%, #0a3d62 60%, #064e3b 100%)',
              border: `3px solid ${ACCENT}`,
              boxShadow: `6px 6px 0px ${ACCENT}`,
            }}
          >
            {/* Big SCALE label */}
            <p
              className="font-black uppercase leading-none mb-1 tracking-tight"
              style={{ fontSize: '3rem', color: ACCENT, textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
            >
              SCALE
            </p>

            {/* Giant 40× */}
            <div className="mb-3">
              <span
                className="font-black leading-none block text-white"
                style={{ fontSize: '5.5rem', textShadow: '3px 3px 0px rgba(0,0,0,0.5)', lineHeight: 1 }}
              >
                40<span style={{ color: ACCENT }}>×</span>
              </span>
              <span
                className="font-black uppercase tracking-tight block"
                style={{ fontSize: '1.4rem', color: '#7dd3fc', lineHeight: 1.1 }}
              >
                More Exposure
              </span>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {[
                'CPC campaigns',
                'Blog posts / reviews',
                'SEO Backlinks',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-semibold text-white/90">
                  <span style={{ color: '#34d399' }} className="mt-0.5 shrink-0"><Check /></span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/advertise"
              className="block w-full py-4 text-sm font-black uppercase tracking-widest text-center text-white transition-all hover:opacity-95 active:translate-x-[2px] active:translate-y-[2px]"
              style={{ background: ACCENT, border: BORDER, boxShadow: SHADOW }}
            >
              ADVERTISE
            </Link>
            <p className="text-[10px] text-sky-400/50 text-center mt-2.5 font-semibold uppercase tracking-widest">
              Custom pricing · Contact our team
            </p>
          </div>

        </div>

        {/* ── SUBMISSION FORM ── */}
        {selectedPlan && (
          <div
            id="submit-form"
            className="max-w-2xl mx-auto p-8 mb-5"
            style={{
              background: 'linear-gradient(180deg, #0c2d48 0%, #0a1929 100%)',
              border: `3px solid ${ACCENT}`,
              boxShadow: `6px 6px 0px ${ACCENT}`,
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <div
                  className="inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white mb-2"
                  style={{ background: ACCENT, border: '2px solid #000' }}
                >
                  {selectedPlan === 'basic' ? 'Basic — $49' : 'Boost — $197 · Instant Approval'}
                </div>
                <h2 className="text-xl font-black text-white">Submit Your AI Tool</h2>
                <p className="text-xs text-white/50 mt-1">
                  {selectedPlan === 'boost'
                    ? 'Your tool will be instantly approved & featured in Top AI NSFW after payment.'
                    : 'Fill in your details, then pay securely in crypto. Reviewed within 24h.'}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 flex items-center justify-center text-xl text-white/40 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Row: Name + Vendor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1.5">Tool Name *</label>
                  <input
                    type="text"
                    value={form.toolName}
                    onChange={(e) => setForm(f => ({ ...f, toolName: e.target.value }))}
                    placeholder="e.g. DreamGF"
                    className={inputCls}
                    style={{ border: `2px solid ${ACCENT}` }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1.5">Vendor / Company</label>
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={(e) => setForm(f => ({ ...f, vendor: e.target.value }))}
                    placeholder="e.g. Dreamgf.ai"
                    className={inputCls}
                    style={{ border: `2px solid ${ACCENT}` }}
                  />
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1.5">Website URL *</label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://yourtool.com"
                  className={inputCls}
                  style={{ border: `2px solid ${ACCENT}` }}
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1.5">Logo / Image *</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative cursor-pointer flex flex-col items-center justify-center gap-2 py-6 transition-colors hover:bg-white/[0.06]"
                  style={{ border: `2px dashed ${ACCENT}`, background: 'rgba(14,165,233,0.06)' }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded border-2 border-sky-500/40" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-white/[0.08] flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-sky-400">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                  )}
                  <p className="text-xs text-white/50 font-semibold">
                    {imagePreview ? 'Click to change' : 'Click to upload (JPG, PNG, WebP — max 5 MB)'}
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe your AI tool — what it does, pricing, key features..."
                  rows={4}
                  className={inputCls + ' resize-y'}
                  style={{ border: `2px solid ${ACCENT}` }}
                />
                <p className="text-[10px] text-white/30 mt-1">{form.description.length}/1000 characters (min 30)</p>
              </div>

              {/* Unified Categories & Tags */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="block text-xs font-black uppercase tracking-widest text-sky-300">
                    Categories &amp; Tags *
                  </label>
                  {selectedPlan === 'boost'
                    ? <span className="text-[10px] text-sky-400/60 font-semibold">All categories unlocked</span>
                    : <span className="text-[10px] text-white/30 font-semibold">1 main category max on Basic</span>
                  }
                </div>
                <p className="text-[10px] text-white/30 mb-2">
                  Bold chips = main categories · rest are tags. At least one main category required.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_CHIPS.map((item) => {
                    const isMainCat = (MAIN_CATEGORIES as readonly string[]).includes(item);
                    const active = selectedItems.includes(item);
                    const currentMainCount = selectedItems.filter((i) => (MAIN_CATEGORIES as readonly string[]).includes(i)).length;
                    const disabled = !active && isMainCat && currentMainCount >= maxMainCats;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(item)}
                        disabled={disabled}
                        className={`px-2.5 py-1 text-[11px] transition-all disabled:opacity-30 ${isMainCat ? 'font-black uppercase tracking-wide' : 'font-semibold'}`}
                        style={{
                          background: active ? ACCENT : 'rgba(255,255,255,0.07)',
                          color: active ? '#fff' : isMainCat ? '#e0f2fe' : 'rgba(255,255,255,0.45)',
                          border: active ? `2px solid ${ACCENT}` : isMainCat ? '2px solid rgba(125,211,252,0.3)' : '2px solid rgba(255,255,255,0.1)',
                          boxShadow: active ? 'none' : isMainCat ? '0 0 0 0' : 'none',
                        }}
                      >
                        {active ? '✓ ' : ''}{item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subscription */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1.5">Pricing Model</label>
                <select
                  value={form.subscription}
                  onChange={(e) => setForm(f => ({ ...f, subscription: e.target.value }))}
                  className={inputCls + ' cursor-pointer appearance-none'}
                  style={{ border: `2px solid ${ACCENT}` }}
                >
                  {SUBSCRIPTION_OPTIONS.map((s) => <option key={s} value={s} className="bg-[#0a1929]">{s}</option>)}
                </select>
              </div>

              {/* Payment methods */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-2">What payment do you accept?</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => togglePayment(pm)}
                      className="px-3 py-1.5 text-xs font-bold transition-all"
                      style={{
                        background: form.paymentMethods.includes(pm) ? ACCENT : 'rgba(255,255,255,0.06)',
                        color: form.paymentMethods.includes(pm) ? '#fff' : 'rgba(255,255,255,0.5)',
                        border: form.paymentMethods.includes(pm) ? `2px solid ${ACCENT}` : '2px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      {pm === 'Credit Cards' ? '💳' : pm === 'Crypto' ? '₿' : 'P'} {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact — email OR telegram required */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-sky-300 mb-1.5">Contact — Email or Telegram *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className={inputCls}
                  style={{ border: `2px solid ${ACCENT}` }}
                />
                <input
                  type="text"
                  value={form.contactTelegram || ''}
                  onChange={(e) => setForm(f => ({ ...f, contactTelegram: e.target.value }))}
                  placeholder="@yourtelegram"
                  className={`${inputCls} mt-2`}
                  style={{ border: `2px solid ${ACCENT}` }}
                />
                <p className="text-[11px] font-bold text-white/40 mt-1.5">We&apos;ll only use this to reach you about your listing. At least one is required.</p>
              </div>

              {error && (
                <div className="px-4 py-3 text-sm font-bold text-white bg-red-600" style={{ border: BORDER }}>
                  {error}
                </div>
              )}

              {/* Crypto notice — bottom */}
              <div
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{ background: 'rgba(14,165,233,0.10)', border: `2px solid ${ACCENT}` }}
              >
                <span className="text-lg">₿</span>
                <span className="text-xs font-bold text-sky-300">
                  Secure payment via <strong className="text-white">NowPayments</strong> — BTC, ETH, USDT &amp; 100+ coins
                </span>
              </div>

              {/* Coupon code */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                  placeholder="Coupon code"
                  className="flex-1 px-3 py-2.5 bg-white/[0.06] border-2 border-black text-white text-xs font-bold placeholder:text-white/25 outline-none focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  disabled={!couponCode.trim() || validatingCoupon}
                  onClick={async () => {
                    setValidatingCoupon(true);
                    const priceUsd = selectedPlan === 'boost' ? 197 : 49;
                    const starsEquiv = Math.round(priceUsd / 0.013);
                    const res = await validateCoupon(couponCode.trim(), 'ainsfw', starsEquiv);
                    setCouponResult(res);
                    setValidatingCoupon(false);
                  }}
                  className="px-4 py-2.5 bg-white/[0.1] hover:bg-white/[0.15] border-2 border-black text-white/70 text-xs font-black uppercase tracking-wider disabled:opacity-30 transition"
                >
                  {validatingCoupon ? '...' : 'Apply'}
                </button>
              </div>
              {couponResult && (
                <p className={`text-xs font-bold ${couponResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {couponResult.valid
                    ? `✓ Coupon applied! Discount active.`
                    : couponResult.error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-sm font-black uppercase tracking-widest text-white transition-all disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px]"
                style={{ background: ACCENT, border: BORDER, boxShadow: SHADOW }}
              >
                {uploading
                  ? 'Uploading image...'
                  : loading
                    ? 'Processing...'
                    : selectedPlan === 'boost'
                      ? 'Pay $197 — Go Live Instantly →'
                      : 'Pay $49 in Crypto →'}
              </button>

              <p className="text-[10px] text-white/30 text-center font-medium">
                {selectedPlan === 'boost'
                  ? 'Your tool goes live instantly after payment confirmation. Featured for 1 month in Top AI NSFW.'
                  : 'Listing reviewed & approved within 24 hours of confirmed payment.'}
              </p>

              {/* Support */}
              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] text-white/30 font-semibold">
                <span>Questions? Reach us at:</span>
                <a href="mailto:isabella@erogram.biz" className="text-sky-400 hover:text-sky-300 transition-colors">
                  isabella@erogram.biz
                </a>
                <span className="hidden sm:inline text-white/15">·</span>
                <a
                  href="https://t.me/erogramDOTpro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 transition-colors"
                >
                  @erogramDOTpro on Telegram
                </a>
              </div>
            </form>
          </div>
        )}

        {/* Contact block */}
        <section className="mb-3">
          <div className="rounded-xl bg-white px-3 py-2.5 sm:px-4 sm:py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <span className="inline-flex shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white bg-black rounded">
                Need help?
              </span>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <a
                  href="mailto:isabella@erogram.biz"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 bg-neutral-50 border border-neutral-200 rounded-lg hover:border-neutral-400 transition-colors"
                >
                  ✉️ isabella@erogram.biz
                </a>
                <a
                  href="https://t.me/erogramDOTpro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-white rounded-lg hover:brightness-105 transition-all"
                  style={{ background: ACCENT }}
                >
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  @erogramDOTpro on Telegram
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="[&>section]:mb-4 [&>section>div]:py-5 [&>section>div]:sm:py-6 [&>section_p]:mb-4 [&>section_p]:sm:mb-5">
          <TrustedByLeaders />
        </div>

        {/* SCALE BANNER */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-7 mt-4"
          style={{
            background: 'linear-gradient(135deg, #0c1a2e 0%, #0c4a6e 50%, #064e3b 100%)',
            border: `3px solid ${ACCENT}`,
            boxShadow: `6px 6px 0px ${ACCENT}`,
          }}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-sky-400/70 mb-1">Want maximum reach?</p>
            <h3 className="text-2xl font-black leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-400 to-emerald-400">
                Scale across all of Erogram.
              </span><br />
              <span className="text-white/80 text-xl">40× more exposure.</span>
            </h3>
          </div>
          <Link
            href="/advertise"
            className="shrink-0 px-8 py-4 text-sm font-black uppercase tracking-widest text-white text-center transition-all hover:opacity-90 active:translate-x-[2px] active:translate-y-[2px] whitespace-nowrap"
            style={{ background: ACCENT, border: BORDER, boxShadow: SHADOW }}
          >
            ADVERTISE
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  );
}
