'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { saveAINSFWListingDraft, type AINSFWFormData } from '@/lib/actions/ainsfwPayment';
import { type AINSFWPlan } from '@/lib/ainsfw/planPrices';
import { normalizeWebsiteUrl } from '@/lib/ainsfw/websiteUrl';
import { AINSFW_CATEGORIES } from '@/app/ainsfw/types';
import TrustedByLeaders from '@/app/advertise/TrustedByLeaders';
import PartnershipStats from '@/app/partnership/PartnershipStats';
import ErogramWordmark from '@/components/ErogramWordmark';
import { ainsfwCtaButtonClass } from '@/lib/ainsfw/ctaButton';

// Match the /ainsfw directory vibe: green accent on dark-green surfaces
const ACCENT      = '#22c55e';
const ACCENT_DARK = '#16a34a';
const SUBMIT_ACCENT = '#00AFF0';
const SUBMIT_NAVY = '#0a1628';
const SUBMIT_NAVY_BORDER = '#0a2840';
const SUBMIT_NAVY_HEADER = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';
const SHADOW      = '4px 4px 0px #000000';
const SHADOW_LG   = '6px 6px 0px #000000';
const BORDER      = '3px solid #000000';
const SURFACE     = '#0a1f12';
const SURFACE_BORDER = '1px solid rgba(34,197,94,0.15)';
// CTA yellow — same as the AI NSFW listing cards (Tailwind yellow-400 / 300)
const CTA         = '#facc15';
const CTA_DARK    = '#eab308';
const CTA_BORDER  = '4px solid #000000';
const CTA_SHADOW  = '8px 8px 0px #000000';
const CTA_SHADOW_HOVER = '10px 10px 0px #000000';
const CTA_SHADOW_ACTIVE = '2px 2px 0px #000000';
const PLAN_HEADER_BG = 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)';

function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '';
  return String.fromCodePoint(...upper.split('').map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

const SUBMIT_FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'Can you list our AI tool for free or in exchange for a high affiliate commission?',
    a: (
      <>
        <p>You can get a free Basic listing in exchange of adding our &quot;Featured on EROGRAMX&quot; badge to your footer, or sidebar. More details could be found{' '}
          <Link href="/partnership" className="text-[#4ade80] hover:underline">here</Link>
          . Once it&apos;s live, send us an email at{' '}
          <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:underline">isabella@erogram.biz</a>
          . If approved, we&apos;ll happily return the favor with your free Basic listing.</p>
      </>
    ),
  },
  {
    q: 'I\'m scaling and need a lot of traffic. What\'s the maximum traffic EROGRAMX can deliver?',
    a: (
      <>
        <p>If you&apos;re looking to scale aggressively, our custom advertising packages can deliver significantly more traffic than our standard listing plans. Visit <Link href="/promo" className="text-[#4ade80] hover:underline">Promo page</Link> for more details</p>
      </>
    ),
  },
  {
    q: 'What happens when my featured campaign ends?',
    a: (
      <>
        <p>Your permanent listing will remain live on EROGRAMX.</p>
        <p className="mt-3">Only your featured placements and promotional campaign expire. You can renew or upgrade your campaign at any time through the <Link href="/my-listings" className="text-[#4ade80] hover:underline">My Campaigns</Link> dashboard.</p>
        <p className="mt-3">
          If you need help choosing the right package, contact us at{' '}
          <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:underline">isabella@erogram.biz</a>
          {' '}or message us on Telegram:{' '}
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] hover:underline">@erogramDOTpro</a>.
        </p>
      </>
    ),
  },
  {
    q: 'I purchased Basic or BOOST. How long before my tool is live?',
    a: (
      <>
        <p>Most listings go live in less than 24h. All listings get reviewed and optimized by our team for better result.</p>
      </>
    ),
  },
  {
    q: 'Can I edit my listing after it\'s published?',
    a: (
      <>
        <p>Yes. You have full control over your listing after it&apos;s published.</p>
        <p className="mt-3">
          You can update your description, links, screenshots, pricing, and other details at any time through your{' '}
          <Link href="/my-listings" className="text-[#4ade80] hover:underline">My Campaigns</Link> dashboard. Or just reach out to us through Telegram and we will be more than happy to assist{' '}
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] hover:underline">@erogramDOTpro</a>
        </p>
      </>
    ),
  },
  {
    q: 'Do you offer custom advertising opportunities?',
    a: (
      <>
        <p>Yes.</p>
        <p className="mt-3">We offer banner advertising, native placements, homepage takeovers, sponsored editorial content, Telegram promotions, video ads, launch campaigns, and fully customized advertising packages for brands looking to scale.</p>
        <p className="mt-3">If you want to maximize exposure, we&apos;d be happy to build a custom campaign around your goals. Feel free to reach out at{' '}
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] hover:underline">@EROGRAMDOTPRO</a>
          {' '}on Telegram or{' '}
          <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:underline">isabella@erogram.biz</a>
        </p>
      </>
    ),
  },
  {
    q: 'Can I get listed for free?',
    a: (
      <>
        <p>Yes.</p>
        <p className="mt-3">Eligible AI tools can receive a free permanent listing by displaying a small{' '}
          <Link href="/partnership" className="text-[#4ade80] hover:underline">&quot;Featured on EROGRAMX&quot; badge</Link>
          {' '}on their website that links back to EROGRAMX.</p>
        <p className="mt-3">This helps support our platform while giving your project long-term visibility at no cost. All free submissions are manually reviewed before approval.</p>
        <p className="mt-3">Free listings include a standard listing only. Featured placements, editorial reviews, homepage promotion, and premium advertising are available exclusively through our paid plans.</p>
      </>
    ),
  },
];

export function AinsfwSubmitFaq({ tone = 'green', lightPage = false }: { tone?: 'green' | 'blue'; lightPage?: boolean }) {
  const blue = tone === 'blue';
  return (
    <section className="mt-8 mb-10 max-w-3xl mx-auto">
      <h2 className={`text-xl sm:text-2xl font-black mb-6 text-center ${lightPage ? 'text-black' : 'text-white'}`}>Frequently Asked Questions</h2>
      <div className="space-y-3">
        {SUBMIT_FAQ.map((faq) => (
          <details
            key={faq.q}
            className={`group rounded-xl overflow-hidden ${
              blue ? 'border border-[#00AFF0]/20 bg-[#111B2E]' : 'border border-[#22c55e]/15 bg-[#0a1f12]'
            }`}
          >
            <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 text-white font-semibold text-base sm:text-base list-none [&::-webkit-details-marker]:hidden">
              <span>{faq.q}</span>
              <svg className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 text-white/50 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </summary>
            <div className={`px-5 pb-5 text-white/70 text-base sm:text-sm leading-relaxed ${blue ? '[&_a]:text-[#00AFF0]' : ''}`}>{faq.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

// Same main categories as /ainsfw (sans "All")
const MAIN_CATEGORIES = AINSFW_CATEGORIES.filter((c) => c !== 'All');
const MAIN_CATEGORY_SET = new Set<string>(MAIN_CATEGORIES as readonly string[]);

function isMainCategory(item: string): boolean {
  return MAIN_CATEGORY_SET.has(item);
}

/** Max main categories + subcategory tags selectable per plan (matches pricing cards). */
const PLAN_SELECTION_LIMITS: Record<AINSFWPlan, number> = {
  basic: 2,
  boost: 8,
  startup: 8,
  free: 2,
};

const MAX_DESCRIPTION_WORDS = 1000;
const PLANS_WITH_SCREENSHOTS: AINSFWPlan[] = ['boost', 'startup'];

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function limitToMaxWords(text: string, max: number): string {
  if (countWords(text) <= max) return text;
  return text.trim().split(/\s+/).slice(0, max).join(' ');
}

function trimSelectedItems(items: string[], plan: AINSFWPlan): string[] {
  const limit = PLAN_SELECTION_LIMITS[plan];
  const mains = items.filter((i) => isMainCategory(i));
  const tags = items.filter((i) => !isMainCategory(i));
  const trimmedMains = mains.slice(0, limit);
  const roomForTags = Math.max(0, limit - trimmedMains.length);
  return [...trimmedMains, ...tags.slice(0, roomForTags)];
}
const SUBSCRIPTION_OPTIONS = ['Free', 'Freemium & Paid', 'Paid'] as const;
const PAYMENT_OPTIONS = ['Credit Cards', 'Crypto', 'PayPal', 'Telegram Payment'] as const;

function formatVisitAgo(ts: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}

type VisitorEvent = { id: string; country: string; ts: string };

function useLiveVisitorFeed(pollMs = 5000) {
  const [views, setViews] = useState<number | null>(null);
  const [liveNow, setLiveNow] = useState<number | null>(null);
  const [last30dAdClicks, setLast30dAdClicks] = useState<number | null>(null);
  const [events, setEvents] = useState<VisitorEvent[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    // One-time cleanup of the retired sticky-floor keys that pinned the counter to stale values.
    try { localStorage.removeItem('ero_group_clicks_v2'); localStorage.removeItem('ero_ad_clicks_30d'); } catch {}
    const fetchStats = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.totalViews === 'number') setViews(d.totalViews);
          if (typeof d.activeVisitors === 'number') setLiveNow(d.activeVisitors);
          if (typeof d.last30dClientClicks === 'number') {
            // Group clicks are cumulative and only ever grow, so we show the real value
            // straight from the API. No localStorage flooring — that pinned the counter to
            // stale values and made it look stuck.
            setLast30dAdClicks(d.last30dClientClicks);
          }
          if (Array.isArray(d.lastVisitorCountries)) {
            setCountries(
              d.lastVisitorCountries
                .filter((c: unknown): c is string => typeof c === 'string' && c.length === 2)
                .slice(0, 20),
            );
          }
          if (Array.isArray(d.lastVisitorEvents)) {
            setEvents(
              d.lastVisitorEvents
                .filter((ev: unknown): ev is VisitorEvent =>
                  !!ev &&
                  typeof ev === 'object' &&
                  typeof (ev as VisitorEvent).id === 'string' &&
                  typeof (ev as VisitorEvent).country === 'string' &&
                  (ev as VisitorEvent).country.length === 2,
                )
                .slice(0, 10),
            );
          }
        })
        .catch(() => {});
    };
    fetchStats();
    const id = setInterval(fetchStats, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { views, liveNow, last30dAdClicks, events, countries };
}

function LiveVisitorFlags({ events, size = 'md' }: { events: VisitorEvent[]; size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';
  return (
    <span className="inline-flex items-center gap-1 min-h-[1.5rem]">
      <AnimatePresence initial={false} mode="popLayout">
        {events.map((ev) => (
          <motion.span
            key={ev.id}
            layout
            initial={{ opacity: 0, scale: 0.4, x: -16 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.6, x: 8 }}
            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            className={`${textSize} leading-none drop-shadow-[0_0_8px_rgba(34,197,94,0.45)]`}
            title={`${ev.country} · ${formatVisitAgo(ev.ts)}`}
          >
            {countryCodeToFlag(ev.country)}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}

function GetListedPricingButton({
  onClick,
  children,
  size = 'hero',
  className = '',
}: {
  onClick: () => void;
  children: ReactNode;
  size?: 'hero' | 'compact';
  className?: string;
}) {
  const isHero = size === 'hero';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative font-black uppercase text-black transition-all duration-150 ease-out',
        'hover:-translate-y-1 hover:brightness-105',
        'active:translate-x-[6px] active:translate-y-[6px] active:brightness-100',
        isHero
          ? 'w-full sm:w-auto px-10 sm:px-12 py-4 sm:py-4 text-lg sm:text-base tracking-[0.18em] sm:tracking-[0.22em]'
          : 'shrink-0 px-5 py-3 text-xs tracking-wider',
        className,
      ].join(' ')}
      style={{
        background: `linear-gradient(180deg, #fef08a 0%, ${CTA} 38%, ${CTA_DARK} 100%)`,
        border: CTA_BORDER,
        boxShadow: isHero ? CTA_SHADOW : '5px 5px 0px #000000',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = isHero ? CTA_SHADOW_HOVER : '6px 6px 0px #000000';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = isHero ? CTA_SHADOW : '5px 5px 0px #000000';
        e.currentTarget.style.transform = '';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.boxShadow = CTA_SHADOW_ACTIVE;
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.boxShadow = isHero ? CTA_SHADOW : '5px 5px 0px #000000';
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[42%] rounded-t-[2px]"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)' }}
        aria-hidden
      />
      <span className="relative">{children}</span>
    </button>
  );
}

function CompactHeroStats({
  views,
  last30dAdClicks,
  compact = false,
  flush = false,
  flushBlue = false,
  heroMascot = false,
  hideTopVisual = false,
}: {
  views: number | null;
  last30dAdClicks: number | null;
  compact?: boolean;
  flush?: boolean;
  flushBlue?: boolean;
  heroMascot?: boolean;
  hideTopVisual?: boolean;
}) {
  return (
    <div className={flush ? 'w-full' : 'flex justify-center w-full'}>
      <div
        className={
          flush
            ? `w-full overflow-hidden ${flushBlue ? '' : 'bg-white'}`
            : compact
            ? `w-full max-w-[16.5rem] sm:max-w-[19rem] rounded-lg overflow-hidden mx-auto ${flushBlue ? '' : 'bg-white'}`
            : 'w-full max-w-xl sm:max-w-2xl rounded-lg bg-white overflow-hidden'
        }
        style={
          flushBlue
            ? { background: SUBMIT_NAVY, ...(flush ? {} : { border: BORDER, boxShadow: compact ? SHADOW : SHADOW_LG }) }
            : flush
            ? undefined
            : { border: BORDER, boxShadow: compact ? SHADOW : SHADOW_LG }
        }
      >
        <div style={{ borderBottom: BORDER }}>
          {!hideTopVisual && (heroMascot ? (
            <div className="flex justify-center py-4 sm:py-5">
              <Image
                src="/assets/erogram-gold-mascot.png"
                alt=""
                width={530}
                height={502}
                className="w-[140px] sm:w-[180px] h-auto"
              />
            </div>
          ) : (
            <div className="w-full overflow-hidden bg-black">
              <Image
                src="/assets/erogram-discovery-hub-banner.webp"
                alt=""
                width={1024}
                height={225}
                className="w-full h-auto block"
              />
            </div>
          ))}
          <div
            className={compact ? 'px-2 py-2 sm:px-3 sm:py-2.5' : 'px-3 py-2.5 sm:px-6 sm:py-4'}
            style={{ background: flushBlue ? SUBMIT_NAVY_HEADER : flush ? '#ffffff' : 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)' }}
          >
            {heroMascot ? (
              <p className="text-center text-sm sm:text-base font-black leading-snug px-1 text-white">
                Total traffic delivered to our partners and sponsors the last 30 days.
              </p>
            ) : (
              <>
            <p
              className={
                compact
                  ? `text-center text-[11px] sm:text-xs font-black uppercase tracking-wide leading-snug px-1 ${flushBlue ? 'text-[#00AFF0]' : flush ? 'text-[#0099db]' : 'text-[#4ade80]'}`
                  : `text-center text-base sm:text-lg md:text-xl lg:text-2xl font-black uppercase tracking-wide leading-snug px-1 ${flushBlue ? 'text-[#00AFF0]' : flush ? 'text-[#0099db]' : 'text-[#4ade80]'}`
              }
            >
              AD CLICKS THE LAST 30 DAYS.
            </p>
            <p
              className={
                compact
                  ? `text-center text-[7px] sm:text-[8px] mt-1 px-1 leading-snug ${flushBlue || !flush ? 'text-white/40' : 'text-black/45'}`
                  : `text-center text-[9px] sm:text-[10px] mt-1.5 px-2 leading-snug ${flushBlue || !flush ? 'text-white/40' : 'text-black/45'}`
              }
            >
              Total traffic delivered to our partners and sponsors.
            </p>
              </>
            )}
          </div>
        </div>
        <div
          className={
            compact
              ? `px-2 py-3 sm:py-4 text-center ${heroMascot ? 'bg-white' : flushBlue ? '' : 'bg-gradient-to-br from-[#ecfdf5] via-white to-[#f0fdf4]'}`
              : `px-3 py-4 sm:py-8 text-center ${heroMascot ? 'bg-white' : flushBlue ? '' : 'bg-gradient-to-br from-[#ecfdf5] via-white to-[#f0fdf4]'}`
          }
          style={flushBlue && !heroMascot ? { background: SUBMIT_NAVY } : undefined}
        >
          <div className="flex flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5">
            <p
              className={
                compact
                  ? `text-2xl sm:text-3xl md:text-4xl font-black tabular-nums ${heroMascot || !flushBlue ? 'text-black' : 'text-white'} leading-none`
                  : `text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tabular-nums ${heroMascot || !flushBlue ? 'text-black' : 'text-white'} leading-none`
              }
            >
              {last30dAdClicks != null ? last30dAdClicks.toLocaleString() : '—'}
            </p>
            <span
              className={
                compact
                  ? `text-[8px] sm:text-[9px] font-bold uppercase tracking-wide ${heroMascot || !flushBlue ? 'text-black/40' : 'text-white/40'} leading-tight`
                  : `text-[10px] sm:text-xs font-bold uppercase tracking-wide ${heroMascot || !flushBlue ? 'text-black/40' : 'text-white/40'} leading-tight`
              }
            >
              clicks last 30 days
            </span>
          </div>
        </div>
        {!flush && (
        <div
          className={
            compact
              ? 'flex items-center justify-center border-t border-black/10 px-2 py-1.5 sm:py-2'
              : 'flex items-center justify-center border-t border-black/10 px-3 py-2 sm:py-3'
          }
        >
          <div className="flex flex-col items-center justify-center text-center min-w-0">
            <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mb-0.5 ${flushBlue ? 'text-white/45' : 'text-black/45'}`}>Page views</span>
            <span
              className={
                compact
                  ? `text-sm sm:text-base font-black tabular-nums ${flushBlue ? 'text-[#00AFF0]' : 'text-[#16a34a]'} leading-none`
                  : `text-lg sm:text-xl font-black tabular-nums ${flushBlue ? 'text-[#00AFF0]' : 'text-[#16a34a]'} leading-none`
              }
            >
              {views != null ? views.toLocaleString() : '—'}
            </span>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function MobileSubmitStickyBar({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[#00AFF0]/30"
      style={{ background: 'linear-gradient(160deg, #0B1220 0%, #0a2840 60%, #0d3550 100%)' }}
    >
      <div className="flex items-center px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex-1 min-w-0">
          <GetListedPricingButton onClick={onSubmit} size="compact">
            Submit
          </GetListedPricingButton>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-1">
      <path d="M2.5 8l3.5 3.5L13.5 4" />
    </svg>
  );
}

type PlanFeature = {
  text: string;
  subtext?: string;
  info?: string;
};

function PlusMark() {
  return (
    <span className="inline-flex w-4 shrink-0 items-center justify-center text-xl font-black leading-none mt-0.5" style={{ color: ACCENT }}>
      +
    </span>
  );
}

function PlanFeatureItem({ text, subtext, info, usePlus = false }: PlanFeature & { usePlus?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-lg sm:text-base font-semibold text-black/80">
      {usePlus ? (
        <PlusMark />
      ) : (
        <span style={{ color: ACCENT }} className="mt-0.5 shrink-0"><Check /></span>
      )}
      <span className="min-w-0">
        <span className="inline-flex items-start gap-1.5 flex-wrap">
          <span>{text}</span>
          {info && (
            <span className="relative group/info shrink-0">
              <button
                type="button"
                tabIndex={0}
                aria-label={`More about ${text}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black leading-none text-black/50 transition-colors hover:text-black focus:text-black focus:outline-none"
                style={{ border: '2px solid rgba(0,0,0,0.2)', background: 'rgba(34,197,94,0.12)' }}
              >
                i
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-[min(17rem,calc(100vw-3rem))] -translate-x-1/2 rounded-lg bg-[#04140c] px-3 py-2.5 text-left text-xs font-semibold normal-case leading-relaxed text-white/90 opacity-0 shadow-lg transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100"
                style={{ border: `2px solid ${ACCENT}` }}
              >
                {info}
              </span>
            </span>
          )}
        </span>
        {subtext && (
          <span className="mt-0.5 block text-sm font-medium text-black/45">{subtext}</span>
        )}
      </span>
    </li>
  );
}

const BOOST_BASE_FEATURES = [
  'Permanent listing',
  'Lising with tool description, pricing + Logo.',
  'Edit anytime',
  'Lifetime organic exposure',
  'Listed on up to 6 relevant categories to maximise your exposure.',
  'Featured on recently added AI NSFW for 1 month.',
] as const;

const BOOST_FEATURES: PlanFeature[] = [
  { text: 'Dofollow link to your website for higher SEO benefits.' },
  {
    text: 'Add up to 5 screenshots',
    info: 'Add more screenshots, optimized with proper alt text, file size, and formatting to enhance your listing\'s SEO.',
  },
  { text: '30 days featured in your categories' },
  {
    text: 'Qualify for our Top 10 Rankings',
    info: 'Your AI tool becomes eligible to appear in our highest-traffic pages after the homepage: the Top 10 AI NSFW Tools rankings for each category. The more upvotes and engagement your tool receives from the EROGRAMX community, the higher it can climb in the rankings.',
  },
];

const STARTUP_FEATURES: PlanFeature[] = [
  { text: 'Verified badge to make your listing stand out.' },
  { text: 'Video Cover for your listing (Get 10X more clicks)' },
  { text: 'Listing + Editorial Review (1,000+ words)' },
  { text: 'SEO & conversion-optimized listing' },
  {
    text: 'Up to 10 screenshots + 1 video on your listing.',
    info: 'You can add up to 10 screenshots and one promotional video to increase conversions and strengthen your branding.',
  },
  {
    text: '30 days featured across up to 8 AI NSFW categories and subcategories.',
    info: 'Your tool will appear in the top featured block alongside up to 4 AI NSFW tools in each category.',
  },
  {
    text: '30 days of native placements across the AI NSFW section.',
    info: 'Your tool will appear as a native placement throughout the AI NSFW section, including the feed and individual tool pages.',
  },
  { text: '30 days featured in our Trending section.' },
];

const A_LA_CARTE_ADDONS: { title: string; price: string; description?: string }[] = [
  {
    title: 'LONG Form Editorial Article',
    price: '$290',
    description: 'SEO and conversion-optimized editorial article (2,000–3,000 words).',
  },
  {
    title: 'Short Form Article / Review',
    price: '$190',
    description: 'SEO and conversion-optimized editorial article (1,000 words).',
  },
  {
    title: 'Banner Ad (AINSFW, Groups, or Bots)',
    price: '$190/M',
  },
  {
    title: 'Top Menu Button',
    price: '$290/M',
  },
  {
    title: 'Integrated Ads',
    price: '$190/M',
    description: 'Native ads integrated in AI Tools, TG groups, and TG bots feeds. Seamless placements with excellent engagement.',
  },
  {
    title: 'Featured on AINSFW / OnlyFans / Bots',
    price: '$290/M',
    description: 'Featured on the main section page and on individual listing pages.',
  },
  {
    title: 'Telegram Boost',
    price: '$190/M',
    description: '30-day promotion across our NSFW Telegram network (9 groups, 30,000+ subscribers), with 3 sponsored posts per week.',
  },
  {
    title: 'Pinned Telegram Posts',
    price: '$290/M',
    description: 'Keep your promotion pinned for 30 days across our 8 NSFW Telegram groups, ensuring every new member sees your ad first.',
  },
];

const emptyForm: AINSFWFormData = {
  toolName: '',
  websiteUrl: '',
  email: '',
  contactTelegram: '',
  description: '',
  logoUrl: '',
  category: 'AI Companion',
  vendor: '',
  tags: '',
  subscription: 'Freemium & Paid',
  paymentMethods: [],
  videoUrl: '',
};

const AUTOSAVE_KEY = 'erogram-ainsfw-submit-draft';

type SubmitAutosave = {
  form: AINSFWFormData;
  selectedItems: string[];
  selectedPlan: AINSFWPlan | null;
  draftSubmissionId: string | null;
  savedLogoUrl: string | null;
};

export default function AINSFWPricingClient({
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
  pageVariant = 'submit',
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
  pageVariant?: 'submit' | 'advertise';
}) {
  const isAdvertise = pageVariant === 'advertise';
  const [advertiseSection, setAdvertiseSection] = useState<'ai-tg' | 'onlyfans'>('ai-tg');
  const [username, setUsername] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AINSFWPlan | null>('basic');
  const [form, setForm] = useState<AINSFWFormData>({ ...emptyForm });
  // unified selection — main categories + tags in one list
  const [selectedItems, setSelectedItems] = useState<string[]>(['AI Companion']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draftSubmissionId, setDraftSubmissionId] = useState<string | null>(null);
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);
  const [autosaveRestored, setAutosaveRestored] = useState(false);
  const [urlHelpOpen, setUrlHelpOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const screenshotRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const [screenshotItems, setScreenshotItems] = useState<{ preview: string; file?: File; url?: string }[]>([]);
  const [videoItem, setVideoItem] = useState<{ preview: string; file?: File; url?: string } | null>(null);

  const visitorStats = useLiveVisitorFeed(60_000);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) {
        setAutosaveRestored(true);
        return;
      }
      const parsed = JSON.parse(raw) as SubmitAutosave;
      if (parsed.form) setForm(parsed.form);
      if (parsed.selectedItems?.length) setSelectedItems(parsed.selectedItems);
      if (parsed.selectedPlan) setSelectedPlan(parsed.selectedPlan);
      if (parsed.draftSubmissionId) setDraftSubmissionId(parsed.draftSubmissionId);
      if (parsed.savedLogoUrl) {
        setSavedLogoUrl(parsed.savedLogoUrl);
        setImagePreview(parsed.savedLogoUrl);
      }
      if (parsed.form?.videoUrl) {
        setVideoItem({ preview: parsed.form.videoUrl, url: parsed.form.videoUrl });
      }
    } catch {
      /* ignore corrupt autosave */
    } finally {
      setAutosaveRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!autosaveRestored) return;
    const t = window.setTimeout(() => {
      if (!selectedPlan && !form.toolName.trim()) return;
      const payload: SubmitAutosave = {
        form,
        selectedItems,
        selectedPlan,
        draftSubmissionId,
        savedLogoUrl,
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
    }, 600);
    return () => window.clearTimeout(t);
  }, [autosaveRestored, form, selectedItems, selectedPlan, draftSubmissionId, savedLogoUrl]);

  const clearAutosave = () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      /* ignore */
    }
  };

  const openForm = (plan: AINSFWPlan) => {
    setSelectedPlan(plan);
    setDraftSubmissionId(null);
    setSavedLogoUrl(null);
    setScreenshotItems([]);
    setVideoItem(null);
    setSelectedItems((prev) => trimSelectedItems(prev, plan));
    setError('');
    setTimeout(() => {
      document.getElementById('submit-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const closeForm = () => {
    setSelectedPlan(null);
    setDraftSubmissionId(null);
    setSavedLogoUrl(null);
    setScreenshotItems([]);
    setVideoItem(null);
    setError('');
  };

  const scrollToPricing = () => {
    const target = document.getElementById(
      isAdvertise ? 'advertise-sections' : 'submit-form',
    );
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const togglePayment = (method: string) => {
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(method)
        ? f.paymentMethods.filter((m) => m !== method)
        : [...f.paymentMethods, method],
    }));
  };

  const selectionLimit = 8;

  const toggleItem = (item: string) => {
    const isMainCat = isMainCategory(item);
    setSelectedItems((prev) => {
      if (prev.includes(item)) {
        // keep at least one main category selected
        const remaining = prev.filter((i) => i !== item);
        const stillHasMainCat = remaining.some((i) => isMainCategory(i));
        return stillHasMainCat ? remaining : prev;
      }
      if (prev.length >= selectionLimit) return prev;
      if (isMainCat) {
        const currentMainCount = prev.filter((i) => isMainCategory(i)).length;
        if (currentMainCount >= selectionLimit) return prev;
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

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const room = 4 - screenshotItems.length;
    if (room <= 0) { setError('You can upload up to 4 screenshots.'); return; }
    const next = files.slice(0, room);
    for (const file of next) {
      if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
      if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    }
    setScreenshotItems((prev) => [
      ...prev,
      ...next.map((file) => ({ preview: URL.createObjectURL(file), file })),
    ]);
    setError('');
  };

  const removeScreenshot = (index: number) => {
    setScreenshotItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
    if (!isVideo) { setError('Please select an MP4, WebM, or MOV file.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Video must be under 2 MB.'); return; }
    setVideoItem({ preview: URL.createObjectURL(file), file });
    setForm((f) => ({ ...f, videoUrl: '' }));
    setError('');
  };

  const removeVideo = () => {
    setVideoItem(null);
    setForm((f) => ({ ...f, videoUrl: '' }));
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

  const uploadScreenshotFile = async (file: File, category: string, index: number): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'ainsfw');
    fd.append('name', `${form.toolName.trim()}-screenshot-${index + 1}-${Date.now()}`);
    fd.append('category', category);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');
    return data.url;
  };

  const uploadListingVideo = async (file: File, category: string): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'ainsfw');
    fd.append('name', `${form.toolName.trim()}-video-${Date.now()}`);
    fd.append('category', category);
    const res = await fetch('/api/upload/video', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');
    return data.url;
  };

  const buildSubmissionPayload = async () => {
    const mainCatsSelected = selectedItems.filter((i) => isMainCategory(i));
    const category = mainCatsSelected[0] ?? 'AI Companion';
    setUploading(true);
    try {
    let logoUrl = savedLogoUrl || '';
    if (imageFile) {
      logoUrl = await uploadImage(category);
    }
    const screenshots: string[] = [];
    for (let i = 0; i < screenshotItems.length; i++) {
      const item = screenshotItems[i];
      if (item.url) {
        screenshots.push(item.url);
        continue;
      }
      if (item.file) {
        screenshots.push(await uploadScreenshotFile(item.file, category, i));
      }
    }
    let videoUrl = videoItem?.url || form.videoUrl || '';
    if (videoItem?.file) {
      videoUrl = await uploadListingVideo(videoItem.file, category);
    }
    if (!logoUrl) throw new Error('Logo is required.');
    return {
      mainCatsSelected,
      category,
      logoUrl,
      payload: {
        ...form,
        websiteUrl: normalizeWebsiteUrl(form.websiteUrl),
        logoUrl,
        category,
        tags: mainCatsSelected.flatMap((c) => [c, c.toLowerCase()]).join(', '),
        extraCategories: mainCatsSelected,
        screenshots,
        videoUrl,
      } satisfies AINSFWFormData,
    };
    } finally {
      setUploading(false);
    }
  };

  const handleSavePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.toolName.trim()) { setError('Tool name is required.'); return; }
    const websiteUrl = normalizeWebsiteUrl(form.websiteUrl);
    if (!websiteUrl) {
      setUrlHelpOpen(true);
      return;
    }
    setForm((f) => ({ ...f, websiteUrl }));
    if (!form.description.trim()) { setError('Description is required.'); return; }
    if (countWords(form.description) > MAX_DESCRIPTION_WORDS) {
      setError('Description cannot exceed 1000 words.');
      return;
    }
    if (!imageFile && !savedLogoUrl) { setError('Please upload a logo / image for your tool.'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Please provide a contact email.'); return; }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : undefined;

    setLoading(true);
    setError('');
    try {
      const { payload, logoUrl } = await buildSubmissionPayload();
      const result = await saveAINSFWListingDraft(
        selectedPlan || 'basic',
        payload,
        token || undefined,
        draftSubmissionId || undefined,
      );
      if (!result.success || !result.submissionId) {
        setError(result.error || 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = `/add/ainsfw/preview?draft=${result.submissionId}`;
    } catch {
      setError('Failed to process. Please try again.');
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  /* shared input style — white form card */
  const inputCls = 'w-full px-4 py-3.5 text-base sm:text-sm font-semibold bg-white text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/60 rounded-none';
  const formHintCls = 'text-sm sm:text-base font-medium text-black/80';
  const formFieldHintCls = 'text-sm sm:text-base text-black/55 leading-snug';

  return (
    <div
      className="ainsfw-page min-h-screen text-white"
      style={{
        backgroundColor: '#0B1220',
        backgroundImage:
          'radial-gradient(900px circle at 12% -10%, rgba(0,175,240,0.16), transparent 55%), radial-gradient(800px circle at 100% 0%, rgba(0,175,240,0.10), transparent 50%), linear-gradient(180deg, #0B1220 0%, #0a1018 40%, #070c14 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      <Navbar username={username} setUsername={setUsername} />

      <main
        className={
          isAdvertise
            ? 'flex w-full flex-col px-4 sm:px-6 lg:px-8 pt-[4.75rem] sm:pt-20 pb-12 sm:pb-16'
            : 'max-w-5xl xl:max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-[4.75rem] sm:pt-20 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-16'
        }
      >

        {/* Breadcrumb */}
        {!isAdvertise && (
        <div className="flex items-center gap-2 text-sm font-bold text-white/40 mb-4 uppercase tracking-widest">
          <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
          <span className="text-white/20">/</span>
          <Link href="/add" className="hover:text-white/80 transition-colors">Add</Link>
          <span className="text-white/20">/</span>
          <span style={{ color: SUBMIT_ACCENT }}>AI NSFW Tool</span>
        </div>
        )}

        {/* HERO */}
        <div className={isAdvertise ? 'w-full max-w-3xl mx-auto flex flex-col items-center gap-6 sm:gap-8' : 'mb-10 flex flex-col gap-8 sm:gap-10'}>
          {!isAdvertise ? (
            <div className="w-full max-w-xl sm:max-w-2xl mx-auto overflow-hidden rounded-2xl border shadow-[0_16px_40px_-20px_rgba(0,40,80,0.55)]" style={{ borderColor: SUBMIT_NAVY_BORDER, background: SUBMIT_NAVY }}>
              <CompactHeroStats
                views={visitorStats.views}
                last30dAdClicks={visitorStats.last30dAdClicks}
                flush
                flushBlue
                heroMascot
                hideTopVisual
              />
              <PartnershipStats
                aiNsfwCount={aiNsfwCount}
                groupsAndBotsCount={groupsAndBotsCount}
                totalUsers={totalUsers}
                variant="onlyfans"
                embedded
                redBrandX
                combineListings
                listingsCount={4800}
                hideUsers
                whiteStats
                compact
                liveAudience={
                  visitorStats.views != null
                    ? { pageViews: visitorStats.views, activeVisitors: visitorStats.liveNow ?? 0 }
                    : null
                }
                geo={{
                  text: 'TOP GEOS:',
                  label: (
                    <span
                      className="text-[17px] leading-none"
                      style={{
                        color: 'black',
                        fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                      }}
                    >
                      🇺🇸 🇩🇪 🇧🇷 🇳🇱 🇪🇸 🇬🇧 🇨🇦
                    </span>
                  ),
                }}
              />
              <TrustedByLeaders variant="onlyfans" embedded whiteBg />
            </div>
          ) : (
            <CompactHeroStats
              views={visitorStats.views}
              last30dAdClicks={visitorStats.last30dAdClicks}
              compact={isAdvertise}
              flushBlue
            />
          )}

          {isAdvertise ? (
            <>
              <div className="flex flex-col gap-5 sm:gap-6 justify-center items-stretch w-full">
                <h2 className="text-center text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex flex-wrap items-baseline justify-center gap-x-2">
                  <span>ADVERTISE ON</span>
                  <ErogramWordmark className="text-2xl sm:text-3xl" />
                </h2>
                <div className="flex flex-col gap-4 items-stretch w-full max-w-xl mx-auto">
                <Link
                  href="/add/ainsfw"
                  className="relative w-full font-black uppercase text-black transition-all duration-150 ease-out hover:-translate-y-1 hover:brightness-105 active:translate-x-[6px] active:translate-y-[6px] active:brightness-100 px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-base tracking-wide text-center whitespace-nowrap"
                  style={{
                    background: `linear-gradient(180deg, #fef08a 0%, ${CTA} 38%, ${CTA_DARK} 100%)`,
                    border: CTA_BORDER,
                    boxShadow: CTA_SHADOW,
                  }}
                >
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-[42%] rounded-t-[2px]"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)' }}
                    aria-hidden
                  />
                  <span className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap">
                    <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md border-2 border-black/35 bg-black/10 text-[10px] sm:text-xs font-black leading-none tracking-tight">
                      18+
                    </span>
                    AI, Bots &amp; Adult Websites
                  </span>
                </Link>
              <Link
                href="/ofm-agencies"
                className="relative w-full font-black uppercase text-black transition-all duration-150 ease-out hover:-translate-y-1 hover:brightness-105 active:translate-x-[6px] active:translate-y-[6px] active:brightness-100 px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-base tracking-wide text-center whitespace-nowrap"
                style={{
                  background: `linear-gradient(180deg, #fef08a 0%, ${CTA} 38%, ${CTA_DARK} 100%)`,
                  border: CTA_BORDER,
                  boxShadow: CTA_SHADOW,
                }}
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-[42%] rounded-t-[2px]"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)' }}
                  aria-hidden
                />
                <span className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0 sm:w-7 sm:h-7">
                    <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
                  </svg>
                  ONLYFANS AGENCIES
                </span>
              </Link>
                </div>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-center px-2 pb-1 leading-none w-full"
              >
                <span className="ainsfw-hero-title whitespace-nowrap inline-block text-[clamp(1.15rem,5.4vw,3.25rem)] sm:text-5xl md:text-6xl">
                  WE HAVE YOUR{' '}
                  <span className="ainsfw-hero-customers-blue">AUDIENCE.</span>
                </span>
              </motion.h1>
            </>
          ) : null}

        </div>

        {!isAdvertise && (
        <>
        <div className="flex justify-center mb-4">
          <Image
            src="/assets/erogram-gold-mascot.png"
            alt=""
            width={530}
            height={502}
            className="w-[140px] sm:w-[180px] h-auto"
          />
        </div>
        {/* ── SUBMISSION FORM ── */}
        {!isAdvertise && (
          <div
            id="submit-form"
            className="max-w-2xl mx-auto p-8 mb-5 bg-white"
            style={{
              border: `3px solid ${SUBMIT_NAVY_BORDER}`,
              boxShadow: `6px 6px 0px ${SUBMIT_NAVY_BORDER}`,
            }}
          >
            <form onSubmit={handleSavePreview} className="space-y-5" noValidate>
              <p className="text-sm sm:text-base text-black/60 leading-relaxed -mt-1 mb-1">
                All the details can be updated later from your listing management page.
              </p>
              {/* Tool Name */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1.5">Tool Name *</label>
                <input
                  type="text"
                  value={form.toolName}
                  onChange={(e) => setForm(f => ({ ...f, toolName: e.target.value }))}
                  placeholder="e.g. DreamGF"
                  className={inputCls}
                  style={{ border: `2px solid ${SUBMIT_NAVY_BORDER}` }}
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1.5">Website URL *</label>
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={form.websiteUrl}
                  onChange={(e) => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                  onBlur={() => {
                    const next = normalizeWebsiteUrl(form.websiteUrl);
                    if (next) setForm((f) => ({ ...f, websiteUrl: next }));
                  }}
                  placeholder="www.name.com or name.com or https://name.com"
                  className={inputCls}
                  style={{ border: `2px solid ${SUBMIT_NAVY_BORDER}` }}
                />
                <p className={`${formFieldHintCls} mt-1.5`}>
                  www.name.com or name.com or https://name.com
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1.5">Contact Email *</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@email.com"
                    className={inputCls}
                    style={{ border: `2px solid ${SUBMIT_NAVY_BORDER}` }}
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1.5">Contact Telegram (optional)</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={form.contactTelegram || ''}
                    onChange={(e) => setForm(f => ({ ...f, contactTelegram: e.target.value }))}
                    placeholder="@telegram"
                    className={inputCls}
                    style={{ border: `2px solid ${SUBMIT_NAVY_BORDER}` }}
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1.5">Logo / Image *</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative cursor-pointer flex flex-col items-center justify-center gap-2 py-6 transition-colors hover:bg-black/[0.03]"
                  style={{ border: `2px dashed ${SUBMIT_NAVY_BORDER}`, background: 'rgba(10,40,64,0.06)' }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded border-2" style={{ borderColor: SUBMIT_NAVY_BORDER }} />
                  ) : (
                    <div className="w-16 h-16 rounded bg-black/[0.05] flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#0099db]">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                  )}
                  <p className={`${formHintCls}`}>
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

              {/* Screenshots */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1.5">Screenshots (optional)</label>
                <p className={`${formFieldHintCls} mb-2`}>Up to 4. JPG, PNG, WebP — max 5 MB each.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {screenshotItems.map((item, i) => (
                    <div key={item.preview} className="relative aspect-video overflow-hidden" style={{ border: `2px solid ${SUBMIT_NAVY_BORDER}` }}>
                      <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black text-white text-sm font-black leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {screenshotItems.length < 4 && (
                    <button
                      type="button"
                      onClick={() => screenshotRef.current?.click()}
                      className="aspect-video flex flex-col items-center justify-center gap-1 hover:bg-black/[0.03]"
                      style={{ border: `2px dashed ${SUBMIT_NAVY_BORDER}`, background: 'rgba(10,40,64,0.06)' }}
                    >
                      <span className="text-lg font-black text-[#0099db]">+</span>
                      <span className={`${formHintCls}`}>Add</span>
                    </button>
                  )}
                </div>
                <input
                  ref={screenshotRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotChange}
                  className="hidden"
                />
              </div>

              {/* Video */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1.5">Video (optional)</label>
                <p className={`${formFieldHintCls} mb-2`}>MP4, WebM, MOV - max 2 MB.</p>
                <div
                  onClick={() => videoFileRef.current?.click()}
                  className="relative cursor-pointer flex flex-col items-center justify-center gap-2 py-6 transition-colors hover:bg-black/[0.03]"
                  style={{ border: `2px dashed ${SUBMIT_NAVY_BORDER}`, background: 'rgba(10,40,64,0.06)' }}
                >
                  {videoItem ? (
                    <video src={videoItem.preview} muted playsInline className="w-full max-h-40 object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-black/[0.05] flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#0099db]">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  )}
                  <p className={`${formHintCls}`}>
                    {videoItem ? 'Click to change' : 'Click to upload'}
                  </p>
                </div>
                {videoItem && (
                  <button type="button" onClick={removeVideo} className="mt-2 text-sm font-bold text-black/60">
                    Remove
                  </button>
                )}
                <input
                  ref={videoFileRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1">
                  Description *
                </label>
                <p className={`${formFieldHintCls} mb-1`}>This can be edited later.</p>
                <p className={`${formFieldHintCls} mb-2`}>Description can be up to 1000 words.</p>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: limitToMaxWords(e.target.value, MAX_DESCRIPTION_WORDS) }))}
                  placeholder="Describe your AI tool — what it does, pricing, key features..."
                  rows={4}
                  className={inputCls + ' resize-y'}
                  style={{ border: `2px solid ${SUBMIT_NAVY_BORDER}` }}
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-3">
                  Categories *
                </label>
                <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-2.5" style={{ border: `1px solid ${SUBMIT_NAVY_BORDER}`, background: 'rgba(10,40,64,0.06)' }}>
                    <span className="text-sm font-semibold text-black/80">
                      You have up to {selectionLimit} categories
                    </span>
                  </div>
                <div className="flex flex-wrap gap-2">
                  {MAIN_CATEGORIES.map((item) => {
                    const active = selectedItems.includes(item);
                    const disabled = !active && selectedItems.length >= selectionLimit;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleItem(item)}
                        disabled={disabled}
                        className="px-3 py-1.5 text-sm sm:text-[11px] font-black transition-all disabled:opacity-30"
                        style={{
                          background: active ? SUBMIT_ACCENT : 'rgba(0,0,0,0.04)',
                          color: active ? '#fff' : 'rgba(0,0,0,0.75)',
                          border: active ? `2px solid ${SUBMIT_ACCENT}` : '2px solid rgba(0,0,0,0.15)',
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
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-1.5">Pricing Model (optional)</label>
                <select
                  value={form.subscription}
                  onChange={(e) => setForm(f => ({ ...f, subscription: e.target.value }))}
                  className={inputCls + ' cursor-pointer appearance-none'}
                  style={{ border: `2px solid ${SUBMIT_NAVY_BORDER}` }}
                >
                  {SUBSCRIPTION_OPTIONS.map((s) => <option key={s} value={s} className="bg-white">{s}</option>)}
                </select>
              </div>

              {/* Payment methods */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#0099db] mb-2">What payment do you accept? (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => togglePayment(pm)}
                      className="px-3 py-2 text-sm sm:text-xs font-bold transition-all"
                      style={{
                        background: form.paymentMethods.includes(pm) ? SUBMIT_ACCENT : 'rgba(0,0,0,0.04)',
                        color: form.paymentMethods.includes(pm) ? '#fff' : 'rgba(0,0,0,0.55)',
                        border: form.paymentMethods.includes(pm) ? `2px solid ${SUBMIT_ACCENT}` : '2px solid rgba(0,0,0,0.12)',
                      }}
                    >
                      {pm === 'Credit Cards' ? '💳' : pm === 'Crypto' ? '₿' : pm === 'Telegram Payment' ? '✈' : 'P'} {pm}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 text-sm font-bold text-white bg-red-600" style={{ border: BORDER }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || uploading}
                className="w-full py-4 text-base sm:text-sm font-black uppercase tracking-widest text-black transition-all disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px]"
                style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
              >
                {uploading
                  ? 'Uploading image...'
                  : loading
                    ? 'Saving preview...'
                    : 'Preview listing →'}
              </button>

              {/* Support */}
              <div className={`pt-2 border-t border-black/10 flex flex-nowrap items-center justify-center gap-x-1.5 whitespace-nowrap text-xs sm:text-sm overflow-x-auto ${formHintCls}`}>
                <span>Questions? Reach us at:</span>
                <a href="mailto:isabella@erogram.biz" className="text-[#0099db] hover:text-[#0099db] transition-colors">
                  isabella@erogram.biz
                </a>
                <span className="text-black/30">·</span>
                <a
                  href="https://t.me/erogramDOTpro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0099db] hover:text-[#0099db] transition-colors"
                >
                  @erogramDOTpro on Telegram
                </a>
              </div>
            </form>
          </div>
        )}

        <AinsfwSubmitFaq tone="blue" />
        <div className="mt-8 mb-2 flex justify-center px-4">
          <Image
            src="/assets/erogram-discovery-hub-banner.webp"
            alt=""
            width={1024}
            height={225}
            className="w-full max-w-md sm:max-w-lg h-auto opacity-60"
          />
        </div>
        </>
        )}

      </main>

      {!isAdvertise && <MobileSubmitStickyBar onSubmit={scrollToPricing} />}

      {urlHelpOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setUrlHelpOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white p-6 text-black"
            style={{ border: BORDER, boxShadow: SHADOW_LG }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-black uppercase tracking-widest text-[#0099db] mb-2">Website URL</p>
            <p className="text-lg font-black mb-3">Enter your website:</p>
            <p className="text-base font-bold leading-relaxed mb-1">www.name.com</p>
            <p className="text-base font-bold leading-relaxed mb-1">name.com</p>
            <p className="text-base font-bold leading-relaxed mb-5">https://name.com</p>
            <button
              type="button"
              onClick={() => setUrlHelpOpen(false)}
              className="w-full py-3 text-sm font-black uppercase tracking-widest text-black"
              style={{ background: CTA, border: BORDER }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
