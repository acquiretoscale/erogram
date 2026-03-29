'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

/* ─── palette ──────────────────────────────────────────────────────────────
   bg:       #080c14   (near-black navy)
   surface:  #0e1018   (dark navy card)
   accent:   #00AFF0   (OnlyFans blue)
   accent2:  #0090cc   (darker blue for hover)
──────────────────────────────────────────────────────────────────────────── */

type FaqItem = { q: string; a: string };

const FAQS: FaqItem[] = [
  {
    q: 'How is this different from other advertising?',
    a: "Erogram users are actively searching for OnlyFans creators to subscribe to. They're not passively scrolling — they're hunting. This means dramatically higher conversion rates and better quality fans who actually spend money.",
  },
  {
    q: "What's the minimum budget?",
    a: '$297 to launch your first campaign — that gets you around 2,000 targeted clicks from high-intent fans actively looking for creators.',
  },
  {
    q: 'How do I pay?',
    a: "Payment is accepted via USDT TRC20 or bank wire. We'll send the exact payment details after you submit the form.",
  },
  {
    q: 'Is this self-serve?',
    a: 'For budgets over $2,000/month, we set up a dedicated account for you — with full dashboard access so you can manage, adjust, and scale your campaigns entirely on your own terms. Your budget can be split across up to 10 models.',
  },
  {
    q: 'How fast will I see results?',
    a: 'Campaigns go live instantly. Most creators see their first new subscribers within days of launching.',
  },
  {
    q: 'Can I advertise multiple models?',
    a: 'Yes, agencies are welcome. You can advertise as many models as you want. The minimum starting budget per model is $200.',
  },
];

interface StatsData { totalViews: number; activeVisitors: number; last7dClicks: number }
interface FeedAd { name: string; creative: string; videoUrl?: string; description: string; buttonText: string; verified: boolean }
const POLL_MS = 60_000;

function useCountUp(target: number, duration = 2000, ready = false) {
  const [count, setCount] = useState(0);
  const frame = useRef(0);
  const prev = useRef(target);
  useEffect(() => {
    if (!ready) { setCount(target); return; }
    const from = prev.current !== target ? prev.current : 0;
    prev.current = target;
    if (!target) { setCount(0); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setCount(Math.round(from + (1 - Math.pow(1 - p, 3)) * (target - from)));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, ready]);
  return count;
}

function LiveStatCard({ label, value, ready, live }: { label: string; value: number; ready: boolean; live?: boolean }) {
  const n = useCountUp(value, 2000, ready);
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white px-4 py-5 text-center overflow-hidden shadow-sm">
      {live && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#00AFF0] animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#00AFF0]">Live</span>
        </div>
      )}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">{label}</p>
      <p className="text-2xl sm:text-3xl font-black text-gray-800 tabular-nums">{n.toLocaleString()}</p>
    </div>
  );
}

const COUNTRIES = [
  { country: 'United States',  flag: '\u{1F1FA}\u{1F1F8}', pct: 31.0 },
  { country: 'Germany',        flag: '\u{1F1E9}\u{1F1EA}', pct: 6.5  },
  { country: 'Turkey',         flag: '\u{1F1F9}\u{1F1F7}', pct: 5.2  },
  { country: 'Netherlands',    flag: '\u{1F1F3}\u{1F1F1}', pct: 4.2  },
  { country: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', pct: 4.0  },
  { country: 'Canada',         flag: '\u{1F1E8}\u{1F1E6}', pct: 3.7  },
  { country: 'Singapore',      flag: '\u{1F1F8}\u{1F1EC}', pct: 3.1  },
  { country: 'Italy',          flag: '\u{1F1EE}\u{1F1F9}', pct: 3.0  },
  { country: 'Poland',         flag: '\u{1F1F5}\u{1F1F1}', pct: 2.3  },
  { country: 'India',          flag: '\u{1F1EE}\u{1F1F3}', pct: 1.6  },
];
const MAX_PCT = 31.0;

const DEVICES = [
  { os: 'iOS',       pct: 52.9 },
  { os: 'Android',   pct: 38.7 },
  { os: 'Windows',   pct: 4.4  },
  { os: 'macOS',     pct: 3.3  },
  { os: 'GNU/Linux', pct: 0.6  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <span className="w-0.5 h-4 rounded-full bg-[#00AFF0]" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{children}</span>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export default function OFMAdsClient() {
  const [username, setUsername] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsReady, setStatsReady] = useState(false);
  const [videoAd, setVideoAd] = useState<FeedAd | null>(null);
  const [imageAd, setImageAd] = useState<FeedAd | null>(null);
  const [formState, setFormState] = useState({ user: '', name: '', email: '', telegram: '', phone: '', link: '', budget: '500', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchStats = useCallback(() => {
    fetch('/api/advertise-stats', { cache: 'no-store' })
      .then(r => r.json())
      .then((d) => {
        setStats({ totalViews: d.totalViews ?? 0, activeVisitors: d.activeVisitors ?? 0, last7dClicks: d.last7dClicks ?? 0 });
        setStatsReady(true);
      })
      .catch(() => { setStats({ totalViews: 0, activeVisitors: 0, last7dClicks: 0 }); setStatsReady(true); });
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStats]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('username') : null;
    if (stored) setUsername(stored);

    fetch('/api/campaigns/feed-preview')
      .then((r) => r.json())
      .then((d) => {
        if (d.video) setVideoAd(d.video);
        if (d.image) setImageAd(d.image);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true); setSubmitError('');
    try {
      const res = await fetch('/api/ofmads/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formState) });
      if (res.ok) setSubmitted(true);
      else setSubmitError('Something went wrong. Please try again or contact us directly.');
    } catch { setSubmitError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#080c14', backgroundImage: 'none' }}>

      <Navbar username={username} setUsername={setUsername} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-14">

        {/* ── Hero ── */}
        <section className="pt-10 pb-8 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#00AFF0] mb-3">OFM Boost</p>
          <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight tracking-tight">
            Get More<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#00AFF0]">OnlyFans Subscribers</span>
          </h1>
          <p className="text-sm sm:text-base text-white/50 mb-6 leading-relaxed max-w-sm mx-auto">
            Put your profile in front of 10K+ daily high-intent fans actively searching for creators like you.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-7 text-left">
            {[
              { icon: '🎯', title: 'Keyword targeting', sub: 'Reach exact search intent' },
              { icon: '🌍', title: 'Tier-1 & Tier-2 audience', sub: 'Tap into high-intent fans from premium markets' },
              { icon: '🐋', title: 'Reach the whales', sub: '2–5x higher spend/fan' },
              { icon: '⚡', title: 'Live instantly', sub: 'No waiting period' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">{f.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* ── Live Stats ── */}
        <section className="pb-8">
          <SectionLabel>Live Platform Stats</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <LiveStatCard label="Total Visits" value={stats?.totalViews ?? 0} ready={statsReady} live />
            <LiveStatCard label="Active Now (30 min)" value={stats?.activeVisitors ?? 0} ready={statsReady} live />
            <LiveStatCard label="Clicks to Creators Today" value={stats?.last7dClicks ?? 0} ready={statsReady} />
          </div>
        </section>

        {/* ── Erogram Audience ── */}
        <section className="pb-8">
          <SectionLabel>Erogram Website Audience</SectionLabel>
          <div className="space-y-2.5">

            {/* Device breakdown */}
            <Card>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Device &amp; OS</p>
                  <p className="text-[10px] text-gray-400">Where your ads are seen</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#00AFF0]/10 text-[#00AFF0] border border-[#00AFF0]/20 uppercase tracking-wider">91.6% Mobile</span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#00AFF0" strokeWidth="4" strokeDasharray="52.9 100" strokeLinecap="butt" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#d1d5db" strokeWidth="4" strokeDasharray="38.7 100" strokeDashoffset="-52.9" strokeLinecap="butt" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-black text-gray-800 leading-none">91.6%</span>
                      <span className="text-[7px] text-gray-400 uppercase tracking-wider">mobile</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {[
                      { label: 'iOS', pct: '52.9%', color: 'bg-[#00AFF0]' },
                      { label: 'Android', pct: '38.7%', color: 'bg-gray-300' },
                      { label: 'Desktop', pct: '8.3%', color: 'bg-gray-200' },
                    ].map((d) => (
                      <div key={d.label} className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.color}`} />
                        <span className="text-xs text-gray-500 flex-1">{d.label}</span>
                        <span className="text-xs font-bold text-gray-700 tabular-nums">{d.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {DEVICES.map((d) => (
                    <div key={d.os}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">{d.os}</span>
                        <span className="text-xs font-bold text-gray-700 tabular-nums">{d.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full" style={{ width: `${d.pct}%`, background: d.os === 'iOS' ? '#00AFF0' : '#d1d5db' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Geo Distribution */}
            <Card>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Geographic Distribution</p>
                  <p className="text-[10px] text-gray-400">Mostly Tier-1 &amp; Tier-2</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#00AFF0]/10 text-[#00AFF0] border border-[#00AFF0]/20 uppercase tracking-wider">Tier-1 &amp; Tier-2</span>
              </div>
              <div className="p-4 space-y-1.5">
                {COUNTRIES.map((c, i) => (
                  <div key={c.country}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-gray-300 font-mono w-3 text-right tabular-nums shrink-0">{i + 1}</span>
                      <span className="text-sm leading-none shrink-0">{c.flag}</span>
                      <span className="text-xs text-gray-600 flex-1">{c.country}</span>
                      <span className="text-xs font-bold text-gray-700 tabular-nums">{c.pct}%</span>
                    </div>
                    <div className="ml-5 h-1 rounded-full bg-gray-100">
                      <div className="h-1 rounded-full bg-[#00AFF0]" style={{ width: `${(c.pct / MAX_PCT) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 bg-[#00AFF0]/[0.04]">
                <p className="text-[10px] text-[#00AFF0]/80 leading-relaxed">
                  <span className="font-bold text-[#00AFF0]">67%+ of traffic</span> from US, Canada &amp; Western Europe — the highest-spending digital markets globally.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* ── Erogram vs Others ── */}
        <section className="pb-8">
          <SectionLabel>Erogram vs TikTok / Instagram</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {/* Erogram — white bg, pops */}
            <div className="rounded-xl overflow-hidden border-2 border-[#00AFF0]/30 bg-white shadow-lg shadow-[#00AFF0]/5">
              <div className="px-4 py-2.5 bg-[#00AFF0]">
                <p className="text-xs font-black text-white tracking-wide">Erogram</p>
              </div>
              <ul className="p-3.5 space-y-2.5">
                {[
                  'High-intent fans actively searching',
                  'Payment info already saved',
                  '2–5x higher spend per fan',
                  'Subscribe & actually pay',
                  'Know exactly what they want',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] leading-snug text-gray-800 font-medium">
                    <span className="text-[#00AFF0] shrink-0 mt-px font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* TikTok / Instagram — dark bg, red crosses */}
            <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-900 shadow-sm">
              <div className="px-4 py-2.5 bg-gray-800 border-b border-gray-700">
                <p className="text-xs font-black text-gray-300 tracking-wide">TikTok / Instagram</p>
              </div>
              <ul className="p-3.5 space-y-2.5">
                {[
                  'Mindlessly scrolling feeds',
                  'No payment method linked',
                  'Low conversion rates',
                  'Free trials then vanish',
                  "Don't know what they want",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px] leading-snug text-gray-400">
                    <span className="text-red-500 shrink-0 mt-px font-bold">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="pb-8">
          <SectionLabel>Targeting &amp; Pricing</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: '🎯', title: 'Keyword targeting', desc: 'Exact & broad match. Negative keywords supported.' },
              { icon: '🌍', title: 'Location targeting', desc: 'Target or exclude any country.' },
              { icon: '🎬', title: 'Video ads', desc: 'TikTok-style autoplay. 2–3x higher CTR.' },
              { icon: '💸', title: 'CPC only', desc: 'Pay per click. Every 100 clicks ≈ 33 subscribers.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                <span className="text-xl block mb-2">{f.icon}</span>
                <p className="text-xs font-bold text-gray-800 mb-1">{f.title}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Choose Video or Photo Ads ── */}
        <section className="pb-8">
          <SectionLabel>Choose Video or Photo Ads</SectionLabel>
          <Card>
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-500">
                In-Feed Video Ads generate{' '}
                <span className="font-bold text-[#00AFF0]">2–3x more clicks</span>{' '}
                than static images — motion captures attention instantly.
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100">

              {/* VIDEO */}
              <div className="p-3 flex flex-col gap-3">
                <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-[9/14]">
                  <video
                    src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
                    muted playsInline loop autoPlay preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-black bg-[#00AFF0] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Video Ad</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-[10px] font-black text-white leading-tight mb-1.5">Your Model Here ✓</p>
                    <div className="w-full py-1.5 rounded-lg bg-[#00AFF0] text-[9px] font-black text-white text-center uppercase tracking-wide">Visit Site</div>
                  </div>
                </div>
                <ul className="space-y-1">
                  {['2–3x higher CTR', 'Autoplay, no tap needed', 'Full-card immersive', 'MP4/WebM/MOV ≤ 50MB'].map((t) => (
                    <li key={t} className="text-[10px] text-gray-500 flex items-center gap-1.5">
                      <span className="text-[#00AFF0] text-[9px]">✓</span>{t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* IMAGE */}
              <div className="p-3 flex flex-col gap-3">
                <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[9/14] border border-gray-200">
                  {imageAd?.creative ? (
                    <img src={imageAd.creative} alt="Photo ad preview" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-black bg-black/30 backdrop-blur text-white/80 px-2 py-0.5 rounded-full uppercase tracking-wider">Photo Ad</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-[10px] font-black text-white leading-tight mb-1.5">Your Model Here ✓</p>
                    <div className="w-full py-1.5 rounded-lg bg-[#00AFF0] text-[9px] font-black text-white text-center uppercase tracking-wide">Visit Site</div>
                  </div>
                </div>
                <ul className="space-y-1">
                  {['Clean, native look', 'Faster to produce', '1080×1080 or portrait', 'Great entry-level'].map((t) => (
                    <li key={t} className="text-[10px] text-gray-400 flex items-center gap-1.5">
                      <span className="text-gray-300 text-[9px]">✓</span>{t}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </Card>
        </section>

        {/* ── How It Works ── */}
        <section className="pb-8">
          <SectionLabel>Launch in 4 steps</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { num: '1', title: 'Contact Us', desc: 'Share your profile, niche, and goals.' },
              { num: '2', title: 'We Build It', desc: 'We set up targeting, keywords & creatives.' },
              { num: '3', title: 'Go Live', desc: 'Your ads start running instantly.' },
              { num: '4', title: 'Grow', desc: 'Subscribers roll in as campaigns scale.' },
            ].map((s) => (
              <div key={s.num} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-[#00AFF0]/10 border border-[#00AFF0]/20 flex items-center justify-center mb-2.5">
                  <span className="text-xs font-black text-[#00AFF0]">{s.num}</span>
                </div>
                <p className="text-xs font-bold text-gray-800 mb-1">{s.title}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="pb-8">
          <SectionLabel>Get in Touch</SectionLabel>
          <div className="rounded-xl border-2 border-[#00AFF0]/25 bg-white p-5 space-y-3 shadow-sm">
            <p className="text-sm text-gray-500 text-center mb-1">Ready to grow? Reach out and we&apos;ll get your campaign live.</p>
            <a
              href="mailto:erogram@gmail.com"
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 hover:border-[#00AFF0]/40 hover:bg-[#00AFF0]/[0.04] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#00AFF0]/15 border border-[#00AFF0]/25 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#00AFF0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Email</p>
                <p className="text-sm font-black text-gray-800 group-hover:text-[#00AFF0] transition-colors">erogram@gmail.com</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-[#00AFF0] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
            <a
              href="https://t.me/RVN8888"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 hover:border-[#00AFF0]/40 hover:bg-[#00AFF0]/[0.04] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#00AFF0]/15 border border-[#00AFF0]/25 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#00AFF0]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.447l-2.938-.916c-.638-.203-.651-.638.136-.943l11.57-4.461c.537-.194 1.006.131.936.094z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Telegram</p>
                <p className="text-sm font-black text-gray-800 group-hover:text-[#00AFF0] transition-colors">@RVN8888</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-[#00AFF0] transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="pb-12">
          <SectionLabel>Frequently Asked Questions</SectionLabel>
          <div className="space-y-1.5">
            {FAQS.map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>{item.q}</span>
                  <span className={`ml-3 shrink-0 text-lg text-[#00AFF0] transition-transform duration-200 ${activeFaq === i ? 'rotate-45' : ''}`}>+</span>
                </button>
                <div className={`px-4 overflow-hidden transition-all duration-300 ${activeFaq === i ? 'pb-4 pt-0 border-t border-gray-100 max-h-96 opacity-100' : 'pb-0 pt-0 border-t border-transparent max-h-0 opacity-0'}`} aria-hidden={activeFaq !== i}>
                  <p className="text-sm text-gray-500 leading-relaxed pt-3">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <Footer />

      {/* ── Contact Popup ── */}
      {popupOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPopupOpen(false); }}
        >
          <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto border border-white/[0.10] bg-[#0e1018] shadow-2xl">
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00AFF0] to-transparent" />
            <button
              onClick={() => setPopupOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-white/60 hover:text-white transition-colors"
            >
              ×
            </button>
            <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#00AFF0] mb-1">OFM Boost</p>
              <h2 className="text-lg font-black mb-1">Get a Promotion Quote</h2>
              <p className="text-xs text-white/40">Our team will contact you within 24 hours.</p>
            </div>
            <div className="px-6 py-5">
              {submitted ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="text-base font-black mb-1">Request Received!</h3>
                  <p className="text-sm text-white/40">We&apos;ll reach out within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="flex gap-4">
                    {['Agency', 'Creator'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="user" value={type} checked={formState.user === type} onChange={(e) => setFormState({ ...formState, user: e.target.value })} required className="accent-[#00AFF0]" />
                        <span className="text-sm text-white/70">{type}</span>
                      </label>
                    ))}
                  </div>

                  {[
                    { id: 'name', label: 'Contact name *', type: 'text', required: true, field: 'name' as const },
                    { id: 'email', label: 'Email address *', type: 'email', required: true, field: 'email' as const },
                    { id: 'telegram', label: 'Telegram', type: 'text', required: false, field: 'telegram' as const },
                    { id: 'phone', label: 'Phone number *', type: 'tel', required: true, field: 'phone' as const },
                    { id: 'link', label: 'Profile link(s) *', type: 'text', required: true, field: 'link' as const },
                  ].map((f) => (
                    <div key={f.id}>
                      <label htmlFor={f.id} className="block text-xs text-white/45 mb-1">{f.label}</label>
                      <input
                        id={f.id} type={f.type} required={f.required}
                        value={formState[f.field]}
                        onChange={(e) => setFormState({ ...formState, [f.field]: e.target.value })}
                        className="w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00AFF0]/60 focus:ring-1 focus:ring-[#00AFF0]/20 transition-colors"
                      />
                    </div>
                  ))}

                  <div>
                    <label htmlFor="budget" className="block text-xs text-white/45 mb-1">Your budget *</label>
                    <select
                      id="budget" value={formState.budget}
                      onChange={(e) => setFormState({ ...formState, budget: e.target.value })}
                      className="w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#00AFF0]/60 focus:ring-1 focus:ring-[#00AFF0]/20 transition-colors"
                    >
                      <option value="297">$297 — starter (~2K clicks)</option>
                      <option value="1000">$1,000 – $2,000</option>
                      <option value="2000">$2,000+ / month (self-serve)</option>
                      <option value="3000">$3,000+</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs text-white/45 mb-1">Message (optional)</label>
                    <textarea
                      id="message" rows={3} value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="w-full bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00AFF0]/60 focus:ring-1 focus:ring-[#00AFF0]/20 transition-colors resize-none"
                    />
                  </div>

                  {submitError && <p className="text-xs text-red-400">{submitError}</p>}

                  <button
                    type="submit" disabled={submitting}
                    className="w-full py-3 rounded-xl bg-[#00AFF0] hover:bg-[#0090cc] disabled:opacity-50 text-white font-bold text-sm transition-all active:scale-[0.98]"
                  >
                    {submitting ? 'Sending…' : 'Send Request'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
