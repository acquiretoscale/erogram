'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import ErogramDevilGirlFooter from '@/components/ErogramDevilGirlFooter';
import Footer from '@/components/Footer';
import { saveAINSFWListingDraft, checkoutAINSFWListing, type AINSFWFormData } from '@/lib/actions/ainsfwPayment';
import { AINSFW_PLAN_PRICES, type AINSFWPlan } from '@/lib/ainsfw/planPrices';
import { AINSFW_CATEGORIES } from '@/app/ainsfw/types';
import { validateCoupon } from '@/lib/actions/coupons';
import TrustedByLeaders from '@/app/advertise/TrustedByLeaders';
import PromoAudienceProof from '@/app/promo/PromoAudienceProof';
import InFeedAdFormatComparison from './InFeedAdFormatComparison';

function planCheckoutPrice(plan: AINSFWPlan | null, couponResult: { valid?: boolean; discountedStars?: number } | null): number {
  if (couponResult?.valid && couponResult.discountedStars != null) {
    return Math.round(couponResult.discountedStars * 0.013 * 100) / 100;
  }
  if (!plan) return 0;
  return AINSFW_PLAN_PRICES[plan];
}

// Match the /ainsfw directory vibe: green accent on dark-green surfaces
const ACCENT      = '#22c55e';
const ACCENT_DARK = '#16a34a';
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

const TOP_COUNTRIES = [
  { c: 'US', p: '29%' }, { c: 'Germany', p: '7%' }, { c: 'Netherlands', p: '4%' },
  { c: 'UK', p: '4%' }, { c: 'Canada', p: '4%' }, { c: 'Italy', p: '3%' },
  { c: 'Spain', p: '2.5%' }, { c: 'Australia', p: '2%' }, { c: 'Turkey', p: '2%' },
  { c: 'Singapore', p: '2%' }, { c: 'Malaysia', p: '2%' },
] as const;

const TOP_COUNTRIES_PHRASE = TOP_COUNTRIES.map(({ c, p }) => `${c} ${p}`).join(', ');

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
        <p>We receive dozens of requests daily to list AI tools for free in exchange for high affiliate commissions. Unfortunately, we don&apos;t offer commission-based listings.</p>
        <p className="mt-3">To keep EROGRAM fair and accessible to everyone, we&apos;ve intentionally priced our Basic plan as low as possible so great projects of all sizes can get listed.</p>
        <p className="mt-3">If you&apos;re looking for a free option, we also offer free standard listings for eligible AI tools that display a small &quot;Featured on EROGRAM&quot; badge on their website&apos;s Footer or sidebar. All submissions are subject to editorial review.</p>
      </>
    ),
  },
  {
    q: 'I\'m scaling and need a lot of traffic. What\'s the maximum traffic EROGRAM can deliver?',
    a: (
      <>
        <p>If you&apos;re looking to scale aggressively, our custom advertising packages can deliver significantly more traffic than our standard listing plans.</p>
        <p className="mt-3">Campaigns starting at $1,800/month typically begin around 20,000 monthly clicks. Depending on your budget, campaign performance, and available inventory, we can currently scale up to 80,000 clicks per month.</p>
        <p className="mt-3">Traffic is delivered across the EROGRAM ecosystem, including our website, native placements, banner inventory, and our Telegram network with over 30,000 subscribers.</p>
      </>
    ),
  },
  {
    q: 'How much traffic can I expect?',
    a: (
      <>
        <p>Traffic depends on your package, category, and the quality of your listing.</p>
        <p className="mt-3">Standard listings typically receive ongoing organic traffic from Google and EROGRAM visitors, while featured placements generate significantly more visibility. Larger advertising campaigns can deliver anywhere from a few thousand monthly visitors to tens of thousands of targeted clicks.</p>
      </>
    ),
  },
  {
    q: 'What happens when my featured campaign ends?',
    a: (
      <>
        <p>Your permanent listing will remain live on EROGRAM.</p>
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
    q: 'What are In-Feed Ads?',
    a: (
      <>
        <p>In-Feed Ads are native promotional cards displayed throughout EROGRAM&apos;s highest-traffic pages, including AI Tools, Bots, Groups, and other discovery feeds.</p>
        <p className="mt-3">They blend naturally with our content while giving your project premium visibility.</p>
      </>
    ),
  },
  {
    q: 'What does an editorial blog post look like?',
    a: (
      <>
        <p>You can see an example here:</p>
        <p className="mt-3">
          <Link href="/blog/why-millions-are-switching-to-ai-companionship-lately" className="text-[#4ade80] hover:underline">
            Why Millions Are Switching to AI Companionship Lately
          </Link>
        </p>
      </>
    ),
  },
  {
    q: 'What does a listing with a review look like?',
    a: (
      <>
        <p>Here&apos;s an example of one of our SEO-optimized product reviews:</p>
        <p className="mt-3">
          <Link href="/ainsfw/joi-ai-nude-generator" className="text-[#4ade80] hover:underline">
            Listing with review example
          </Link>
        </p>
      </>
    ),
  },
  {
    q: 'I purchased Boost or Authority. How long before my tool is featured?',
    a: (
      <>
        <p>Your listing is usually approved immediately after submission.</p>
        <p className="mt-3">Featured placements, homepage promotion, editorial reviews, and advertising campaigns are configured manually by our team to maximize visibility and performance. Most campaigns go live within a few hours, and always within 24 hours.</p>
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
        <p className="mt-3">If you&apos;re planning a product launch or want to maximize exposure, we&apos;d be happy to build a custom campaign around your goals.</p>
      </>
    ),
  },
  {
    q: 'Can I get listed for free?',
    a: (
      <>
        <p>Yes.</p>
        <p className="mt-3">Eligible AI tools can receive a free permanent listing by displaying a small &quot;Featured on EROGRAM&quot; badge on their website that links back to EROGRAM.</p>
        <p className="mt-3">This helps support our platform while giving your project long-term visibility at no cost. All free submissions are manually reviewed before approval.</p>
        <p className="mt-3">Free listings include a standard listing only. Featured placements, editorial reviews, homepage promotion, and premium advertising are available exclusively through our paid plans.</p>
      </>
    ),
  },
];

// Same main categories as /ainsfw (sans "All")
const MAIN_CATEGORIES = AINSFW_CATEGORIES.filter((c) => c !== 'All');
const MAIN_CATEGORY_SET = new Set<string>(MAIN_CATEGORIES as readonly string[]);

function isMainCategory(item: string): boolean {
  return MAIN_CATEGORY_SET.has(item);
}

/** Max main categories + subcategory tags selectable per plan (matches pricing cards). */
const PLAN_SELECTION_LIMITS: Record<AINSFWPlan, number> = {
  basic: 3,
  boost: 6,
  startup: 8,
};

const PLAN_TIER_NAMES: Record<AINSFWPlan, string> = {
  basic: 'BASIC',
  boost: 'BOOST',
  startup: 'SCALE',
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
const PAYMENT_OPTIONS = ['Credit Cards', 'Crypto', 'PayPal'] as const;

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
    const fetchStats = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.totalViews === 'number') setViews(d.totalViews);
          if (typeof d.activeVisitors === 'number') setLiveNow(d.activeVisitors);
          if (typeof d.last30dClientClicks === 'number') {
            setLast30dAdClicks((prev) => (prev == null ? d.last30dClientClicks : Math.max(prev, d.last30dClientClicks)));
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
}: {
  views: number | null;
  last30dAdClicks: number | null;
}) {
  return (
    <div className="flex justify-center w-full">
      <div
        className="w-full max-w-xl sm:max-w-2xl rounded-lg bg-white overflow-hidden"
        style={{ border: BORDER, boxShadow: SHADOW_LG }}
      >
        <div style={{ borderBottom: BORDER }}>
          <div className="w-full overflow-hidden bg-black">
            <Image
              src="/assets/erogram-discovery-hub-banner.webp"
              alt=""
              width={1024}
              height={225}
              className="w-full h-auto block"
            />
          </div>
          <div
            className="px-3 py-2.5 sm:px-6 sm:py-4"
            style={{ background: 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)' }}
          >
            <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl font-black uppercase tracking-wide text-[#4ade80] leading-snug px-1">
              AD CLICKS THE LAST 30 DAYS.
            </p>
            <p className="text-center text-[9px] sm:text-[10px] text-white/40 mt-1.5 px-2 leading-snug">
              Total traffic delivered to our partners and sponsors.
            </p>
          </div>
        </div>
        <div className="px-3 py-4 sm:py-8 text-center bg-gradient-to-br from-[#ecfdf5] via-white to-[#f0fdf4]">
          <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
            <p className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tabular-nums text-black leading-none">
              {last30dAdClicks != null ? last30dAdClicks.toLocaleString() : '—'}
            </p>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-black/40 leading-tight">
              clicks last 30 days
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center border-t border-black/10 px-3 py-2 sm:py-3">
          <div className="flex flex-col items-center justify-center text-center min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/45 mb-0.5">Page views</span>
            <span className="text-lg sm:text-xl font-black tabular-nums text-[#16a34a] leading-none">
              {views != null ? views.toLocaleString() : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSubmitStickyBar({
  liveNow,
  events,
  onSubmit,
}: {
  liveNow: number | null;
  events: VisitorEvent[];
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[#22c55e]/30"
      style={{ background: 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)' }}
    >
      <div className="flex items-center gap-2 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shrink-0" />
            <p className="text-[9px] font-bold uppercase tracking-wide text-white/55 leading-tight">
              People browsing Erogram right now
            </p>
          </div>
          <div className="flex items-center gap-1 mt-0.5 min-h-[1.25rem]">
            {events.length > 0 && <LiveVisitorFlags events={events.slice(0, 5)} size="sm" />}
            <span className="text-sm font-black tabular-nums text-white leading-none">
              {liveNow != null ? liveNow.toLocaleString() : '—'}
            </span>
          </div>
        </div>
        <GetListedPricingButton onClick={onSubmit} size="compact">
          Submit
        </GetListedPricingButton>
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

const BOOST_FEATURES: PlanFeature[] = [
  { text: 'Dofollow link to your website for higher SEO benefits.' },
  {
    text: 'Add up to 5 screenshots',
    info: 'Add more screenshots, optimized with proper alt text, file size, and formatting to enhance your listing\'s SEO.',
  },
  { text: 'Up to 6 categories and subcategories' },
  { text: '30 days featured in your categories' },
  { text: '30 days featured on the AI NSFW home page.' },
  {
    text: 'Qualify for our Top 10 Rankings',
    info: 'Your AI tool becomes eligible to appear in our highest-traffic pages after the homepage: the Top 10 AI NSFW Tools rankings for each category. The more upvotes and engagement your tool receives from the EROGRAM community, the higher it can climb in the rankings.',
  },
];

const STARTUP_FEATURES: PlanFeature[] = [
  { text: 'Verified badge to make your listing stand out.' },
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

const A_LA_CARTE_ADDONS = [
  {
    title: 'Editorial Article',
    price: '$300',
    description: 'SEO & conversion-optimized editorial article (2,000–3,000 words).',
  },
  {
    title: 'Telegram Boost',
    price: '$400',
    description: '30-day promotion across our NSFW Telegram network (9 groups, 40,000+ subscribers), with 3 sponsored posts per week.',
  },
  {
    title: 'Pinned Telegram Posts',
    price: '$200',
    description: 'Keep your promotion pinned for 30 days across our 8 NSFW Telegram groups, ensuring every new member sees your ad first.',
  },
] as const;

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
};

function ListingContentReview({
  name,
  description,
  imageUrl,
  websiteUrl,
  categories,
  subscription,
  paymentMethods,
  planPrice,
}: {
  name: string;
  description: string;
  imageUrl: string;
  websiteUrl: string;
  categories: string[];
  subscription: string;
  paymentMethods: string[];
  planPrice: number;
}) {
  return (
    <div
      id="listing-preview"
      className="rounded-lg border border-white/15 bg-white/[0.03] p-5 sm:p-6 space-y-5 text-left"
    >
      <div className="flex items-start gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-12 h-12 shrink-0 rounded object-cover border border-white/10"
          />
        ) : (
          <div className="w-12 h-12 shrink-0 rounded bg-white/10 border border-white/10" />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Tool name</p>
          <p className="text-base font-semibold text-white break-words">{name}</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">Description</p>
        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words">{description}</p>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">Pricing</p>
        <p className="text-sm text-white/80">{subscription}</p>
        <p className="text-sm text-white/60 mt-1">Package: ${planPrice}</p>
        {paymentMethods.length > 0 && (
          <p className="text-sm text-white/60 mt-1">Accepts: {paymentMethods.join(', ')}</p>
        )}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">Categories</p>
        <p className="text-sm text-white/80 break-words">{categories.join(', ')}</p>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1">Website</p>
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#4ade80] break-all hover:underline"
        >
          {websiteUrl}
        </a>
      </div>
    </div>
  );
}

const AUTOSAVE_KEY = 'erogram-ainsfw-submit-draft';

type SubmitAutosave = {
  form: AINSFWFormData;
  selectedItems: string[];
  selectedPlan: AINSFWPlan | null;
  draftSubmissionId: string | null;
  savedLogoUrl: string | null;
  formStep: 'edit' | 'preview';
};

export default function AINSFWPricingClient() {
  const [username, setUsername] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AINSFWPlan | null>(null);
  const [form, setForm] = useState<AINSFWFormData>({ ...emptyForm });
  // unified selection — main categories + tags in one list
  const [selectedItems, setSelectedItems] = useState<string[]>(['AI Companion']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discountedStars?: number; savedStars?: number; error?: string } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formStep, setFormStep] = useState<'edit' | 'preview'>('edit');
  const [draftSubmissionId, setDraftSubmissionId] = useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);
  const [autosaveRestored, setAutosaveRestored] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const checkoutPrice = planCheckoutPrice(selectedPlan, couponResult);
  const visitorStats = useLiveVisitorFeed(8000);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) {
        setAutosaveRestored(true);
        return;
      }
      const token = localStorage.getItem('token');
      const parsed = JSON.parse(raw) as SubmitAutosave;
      if (parsed.form) setForm(parsed.form);
      if (parsed.selectedItems?.length) setSelectedItems(parsed.selectedItems);
      if (token) {
        if (parsed.selectedPlan) setSelectedPlan(parsed.selectedPlan);
        if (parsed.draftSubmissionId) setDraftSubmissionId(parsed.draftSubmissionId);
        if (parsed.savedLogoUrl) {
          setSavedLogoUrl(parsed.savedLogoUrl);
          setImagePreview(parsed.savedLogoUrl);
        }
        if (parsed.formStep === 'preview' && parsed.draftSubmissionId) {
          setFormStep('preview');
        }
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
        formStep,
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
    }, 600);
    return () => window.clearTimeout(t);
  }, [autosaveRestored, form, selectedItems, selectedPlan, draftSubmissionId, savedLogoUrl, formStep]);

  const clearAutosave = () => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      /* ignore */
    }
  };

  const requireLoginForSubmit = () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) return true;
    window.location.href = `/login?redirect=${encodeURIComponent('/add/ainsfw')}`;
    return false;
  };

  const openForm = (plan: AINSFWPlan) => {
    if (!requireLoginForSubmit()) return;
    setSelectedPlan(plan);
    setFormStep('edit');
    setDraftSubmissionId(null);
    setPreviewSlug(null);
    setSavedLogoUrl(null);
    setSelectedItems((prev) => trimSelectedItems(prev, plan));
    setError('');
    setTimeout(() => {
      document.getElementById('submit-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const closeForm = () => {
    setSelectedPlan(null);
    setFormStep('edit');
    setDraftSubmissionId(null);
    setPreviewSlug(null);
    setSavedLogoUrl(null);
    setError('');
  };

  const scrollToPricing = () => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const target = document.getElementById(isMobile ? 'pricing-basic' : 'pricing-grid');
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

  const selectionLimit = selectedPlan ? PLAN_SELECTION_LIMITS[selectedPlan] : 3;

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

  const buildSubmissionPayload = async () => {
    const mainCatsSelected = selectedItems.filter((i) => isMainCategory(i));
    const category = mainCatsSelected[0] ?? 'AI Companion';
    let logoUrl = savedLogoUrl || '';
    if (imageFile) {
      setUploading(true);
      logoUrl = await uploadImage(category);
      setUploading(false);
    }
    if (!logoUrl) throw new Error('Logo is required.');
    return {
      mainCatsSelected,
      category,
      logoUrl,
      payload: {
        ...form,
        logoUrl,
        category,
        tags: mainCatsSelected.flatMap((c) => [c, c.toLowerCase()]).join(', '),
        extraCategories: mainCatsSelected,
      } satisfies AINSFWFormData,
    };
  };

  const handleSavePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!form.toolName.trim()) { setError('Tool name is required.'); return; }
    if (!form.websiteUrl.trim() || !form.websiteUrl.startsWith('http')) { setError('Enter a valid URL starting with https://'); return; }
    const hasEmail = form.email.trim() && form.email.includes('@');
    const hasTelegram = !!form.contactTelegram?.trim();
    if (!hasEmail && !hasTelegram) { setError('Provide a contact email or Telegram so we can reach you.'); return; }
    if (!form.description.trim()) { setError('Description is required.'); return; }
    if (countWords(form.description) > MAX_DESCRIPTION_WORDS) {
      setError('Description cannot exceed 1000 words.');
      return;
    }
    if (!imageFile && !savedLogoUrl) { setError('Please upload a logo / image for your tool.'); return; }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Please log in to submit — your listing will be saved to your account.');
      window.location.href = `/login?redirect=${encodeURIComponent('/add/ainsfw')}`;
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { payload, logoUrl } = await buildSubmissionPayload();
      const result = await saveAINSFWListingDraft(
        selectedPlan,
        payload,
        token,
        draftSubmissionId || undefined,
      );
      if (!result.success || !result.submissionId) {
        setError(result.error || 'Something went wrong. Please try again.');
        return;
      }
      setDraftSubmissionId(result.submissionId);
      setPreviewSlug(result.slug || null);
      setSavedLogoUrl(logoUrl);
      setFormStep('preview');
      setTimeout(() => {
        document.getElementById('listing-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch {
      setError('Failed to process. Please try again.');
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !draftSubmissionId) return;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Please log in to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await checkoutAINSFWListing(
        draftSubmissionId,
        selectedPlan,
        couponCode.trim() || undefined,
        token,
      );
      if (result.freeApproval) {
        clearAutosave();
        window.location.href = `/add/ainsfw/thank-you?plan=${selectedPlan}&slug=${result.slug}`;
      } else if (result.success && result.invoiceUrl) {
        clearAutosave();
        window.location.href = result.invoiceUrl;
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* shared input style — white bg for contrast on dark form */
  const inputCls = 'w-full px-4 py-3.5 text-base sm:text-sm font-semibold bg-white text-black placeholder-black/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/60 rounded-none';
  const formHintCls = 'text-sm sm:text-base font-medium text-white';
  const formFieldHintCls = 'text-sm sm:text-base text-white/70 leading-snug';

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar username={username} setUsername={setUsername} />

      <main className="max-w-5xl xl:max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-16">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm font-bold text-white/30 mb-6 uppercase tracking-widest">
          <Link href="/add" className="hover:text-white/60 transition-colors">Add</Link>
          <span className="text-white/20">/</span>
          <span style={{ color: ACCENT }}>AI NSFW Tool</span>
        </div>

        {/* HERO */}
        <div className="mb-10 flex flex-col gap-8 sm:gap-10">
          <CompactHeroStats views={visitorStats.views} last30dAdClicks={visitorStats.last30dAdClicks} />

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mt-6 sm:mt-8 px-2 leading-[0.92]"
          >
            <span className="ainsfw-hero-title text-[clamp(1.35rem,6.8vw,3.5rem)] sm:text-5xl md:text-6xl">
              WE HAVE YOUR{' '}
              <span className="ainsfw-hero-customers">CUSTOMERS.</span>
            </span>
          </motion.h1>

          <div className="hidden sm:flex justify-center -mt-2 sm:mt-0">
            <GetListedPricingButton onClick={scrollToPricing}>
              GET LISTED ON EROGRAM
            </GetListedPricingButton>
          </div>

          <div className="max-w-4xl flex flex-col gap-8 mt-4 sm:mt-6">
              <p className="text-lg sm:text-xl text-white/70 leading-relaxed">
                Stop paying for cold traffic. <strong className="text-white">EROGRAM</strong> connects your AI tool with users actively searching for premium AI experiences. Get discovered by thousands of high-intent buyers every day while your listing keeps generating visibility through our rapidly growing Google presence.
              </p>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-3">
                  <span className="shrink-0" style={{ color: ACCENT }}><Check /></span>
                  <span className="text-lg sm:text-xl text-white/70 leading-relaxed">
                    Get featured on one of the fastest-growing AI discovery platforms with <strong className="text-[#22c55e]">40% month-over-month organic growth</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0" style={{ color: ACCENT }}><Check /></span>
                  <span className="text-lg sm:text-xl text-white/70 leading-relaxed">
                    Reach <strong className="text-white">180,000+ Monthly Visitors</strong> Ready to Buy.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0" style={{ color: ACCENT }}><Check /></span>
                  <span className="text-lg sm:text-xl text-white/70 leading-relaxed">
                    <strong className="text-white">Our top 10 countries:</strong> {TOP_COUNTRIES_PHRASE}.
                  </span>
                </li>
              </ul>
              <div className="flex justify-center mt-4 sm:mt-5">
                <Image
                  src="/assets/ainsfw/ai-authority-badge.png"
                  alt=""
                  width={530}
                  height={502}
                  className="h-20 w-auto sm:h-24 md:h-28 object-contain"
                />
              </div>
          </div>

          <TrustedByLeaders variant="green" />

          <div className="w-full">
            <div
              className="rounded-xl px-4 py-4 sm:px-6 sm:py-4"
              style={{
                background: 'linear-gradient(180deg, rgba(10,31,18,0.95) 0%, rgba(4,20,12,0.98) 100%)',
                border: `2px solid rgba(34,197,94,0.2)`,
                boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
              }}
            >
              <ul className="space-y-2.5 sm:space-y-3">
                <li className="flex items-center gap-3">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e]/15" style={{ color: ACCENT }}>
                    <Check />
                  </span>
                  <p className="text-base sm:text-lg text-white/75 leading-snug lg:whitespace-nowrap">
                    Get your AI tool in front of an audience <strong className="text-white">already searching, comparing, and ready to spend</strong>.
                  </p>
                </li>
                <li className="flex items-center gap-3">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e]/15" style={{ color: ACCENT }}>
                    <Check />
                  </span>
                  <p className="text-base sm:text-lg text-white/75 leading-snug lg:whitespace-nowrap">
                    <strong className="text-white">Every day you&apos;re not listed</strong> is another day users choose someone else.
                  </p>
                </li>
                <li className="flex items-center gap-3">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e]/15" style={{ color: ACCENT }}>
                    <Check />
                  </span>
                  <p className="text-base sm:text-lg text-white/75 leading-snug lg:whitespace-nowrap">
                    Don&apos;t let <strong className="text-[#4ade80]">competitors capture users</strong> searching for your category.
                  </p>
                </li>
              </ul>
              <div className="mt-4 hidden sm:flex justify-center">
                <GetListedPricingButton onClick={scrollToPricing}>
                  Get Listed on Erogram
                </GetListedPricingButton>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-semibold text-white/45">
                <span>Need help? Have a question? Don&apos;t hesitate to get in touch:</span>
                <span className="text-white/20">·</span>
                <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:underline">
                  isabella@erogram.biz
                </a>
                <span className="text-white/20">·</span>
                <span>
                  Telegram :{' '}
                  <a
                    href="https://t.me/erogramDOTpro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4ade80] hover:underline"
                  >
                    @erogramDOTpro
                  </a>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 mb-5">
            <div className="mb-6 sm:mb-8 text-center px-1 sm:px-2">
              <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-[2rem] font-black uppercase tracking-tight text-white leading-snug max-w-4xl mx-auto">
                GET LISTED ON THE FASTEST GROWING ADULT ENTRETAINEMENT DISCOVERY HUB.
              </h2>
            </div>
            <PromoAudienceProof />
          </div>

          <div className="mt-5">
            <TrustedByLeaders variant="green" />
          </div>
        </div>

        {/* PRICING GRID */}
        <div id="pricing-grid" className="mb-5 scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">

          {/* BASIC */}
          <div id="pricing-basic" className="relative flex flex-col bg-white overflow-hidden scroll-mt-24" style={{ border: BORDER, boxShadow: SHADOW_LG, color: '#000' }}>
            <div className="px-6 py-4" style={{ background: PLAN_HEADER_BG }}>
              <p className="font-black uppercase leading-none tracking-tight text-[1.5rem] sm:text-[1.625rem] text-white">
                BASIC
              </p>
              <p className="text-lg sm:text-base font-black uppercase tracking-wide text-white/45 mt-1">Get Seen</p>
            </div>
            <div className="px-6 pb-6 pt-4 flex flex-col flex-1">
            <div className="mb-3">
              <span className="text-5xl sm:text-4xl font-black text-black">$49</span>
              <span className="text-lg sm:text-base font-bold text-black/40 ml-2">· One-time payment</span>
            </div>
            <p className="text-base sm:text-sm text-black/55 leading-relaxed mb-4">
              Perfect for getting your AI tool indexed, discoverable, and visible to thousands of high-intent users.
            </p>
            <ul className="space-y-2.5 mb-8 flex-1 mt-1">
              {[
                'Permanent listing',
                'Lising with tool description, pricing + Logo.',
                'Edit anytime',
                'Lifetime organic exposure',
                'Listed on up to 3 relevant categories to maximise your exposure.',
                'Featured on recently added AI NSFW for 1 month.',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-lg sm:text-base font-semibold text-black/80">
                  <span style={{ color: ACCENT }} className="mt-0.5 shrink-0"><Check /></span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => openForm('basic')}
              className="w-full py-4 text-lg sm:text-base font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px]"
              style={selectedPlan === 'basic'
                ? { background: CTA_DARK, color: '#000', border: BORDER, boxShadow: 'none', transform: 'translate(2px,2px)' }
                : { background: CTA, color: '#000', border: BORDER, boxShadow: SHADOW }}
            >
              {selectedPlan === 'basic' ? '✓ Selected · scroll down' : 'Get Listed · $49'}
            </button>
            </div>
          </div>

          {/* BOOST · $197 */}
          <div
            className="relative flex flex-col bg-white overflow-hidden"
            style={{ border: `3px solid ${ACCENT}`, boxShadow: `6px 6px 0px ${ACCENT}`, color: '#000' }}
          >
            <div className="px-6 py-4" style={{ background: PLAN_HEADER_BG }}>
              <p className="font-black uppercase leading-none tracking-tight text-[1.625rem] sm:text-[1.75rem] text-white">
                BOOST
              </p>
              <p className="text-lg sm:text-base font-black uppercase tracking-wide text-white/45 mt-1">Get More Visibility</p>
            </div>
            <div className="px-6 pb-6 pt-4 flex flex-col flex-1">
            <div className="mb-3">
              <span className="text-5xl sm:text-4xl font-black text-black">$197</span>
            </div>
            <p className="text-base sm:text-sm text-black/55 leading-relaxed mb-4">
              Everything in Basic, plus premium placement that drives significantly more clicks.
            </p>
            <div
              className="mb-3 px-3 py-2 rounded-md text-center"
              style={{ background: 'rgba(34,197,94,0.14)', border: `2px solid ${ACCENT}` }}
            >
              <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-black leading-none">
                Everything in Basic
              </p>
            </div>
            <ul className="space-y-2.5 mb-4 flex-1">
              {BOOST_FEATURES.map((f) => (
                <PlanFeatureItem key={f.text} {...f} usePlus />
              ))}
            </ul>
            <p className="text-base sm:text-sm font-bold text-black/45 mb-4">Best for: Growing products that want more traffic.</p>
            <button
              onClick={() => openForm('boost')}
              className="w-full py-4 text-lg sm:text-base font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px]"
              style={selectedPlan === 'boost'
                ? { background: CTA_DARK, color: '#000', border: BORDER, boxShadow: 'none', transform: 'translate(2px,2px)' }
                : { background: CTA, color: '#000', border: BORDER, boxShadow: SHADOW }}
            >
              {selectedPlan === 'boost' ? '✓ Selected · scroll down' : 'Boost My Tool · $197'}
            </button>
            </div>
          </div>

          {/* SCALE · $497 */}
          <div className="relative flex flex-col bg-white overflow-hidden" style={{ border: BORDER, boxShadow: SHADOW_LG, color: '#000' }}>
            <div className="px-6 py-4" style={{ background: PLAN_HEADER_BG }}>
              <p className="font-black uppercase leading-none tracking-tight text-[1.5rem] sm:text-[1.625rem] text-white">
                SCALE
              </p>
              <p className="text-lg sm:text-base font-black uppercase tracking-wide text-white/45 mt-1">Own Your Category</p>
            </div>
            <div className="px-6 pb-6 pt-4 flex flex-col flex-1">
            <div className="mb-3">
              <span className="text-5xl sm:text-4xl font-black text-black">$497</span>
            </div>
            <p className="text-base sm:text-sm text-black/55 leading-relaxed mb-2">
              Dominate your category and sub-categories and become the brand users see and use first.
            </p>
            <p className="text-base sm:text-sm font-black uppercase tracking-wide text-black/70 mb-3">
              SCALE GETS 10X More exposure than BOOST.
            </p>
            <div
              className="mb-3 px-3 py-2 rounded-md text-center"
              style={{ background: 'rgba(34,197,94,0.14)', border: `2px solid ${ACCENT}` }}
            >
              <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-black leading-none">
                Everything in Basic &amp; Boost
              </p>
            </div>
            <ul className="space-y-2.5 mb-4 flex-1">
              {STARTUP_FEATURES.map((f) => (
                <PlanFeatureItem key={f.text} {...f} usePlus />
              ))}
            </ul>
            <p className="text-base sm:text-sm font-bold text-black/45 mb-4">Best for: Serious brands launching or scaling aggressively.</p>
            <button
              onClick={() => openForm('startup')}
              className="w-full py-4 text-lg sm:text-base font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px]"
              style={selectedPlan === 'startup'
                ? { background: CTA_DARK, color: '#000', border: BORDER, boxShadow: 'none', transform: 'translate(2px,2px)' }
                : { background: CTA, color: '#000', border: BORDER, boxShadow: SHADOW }}
            >
              {selectedPlan === 'startup' ? '✓ Selected · scroll down' : 'Get Scale · $497'}
            </button>
            </div>
          </div>

          </div>

          <div className="mt-6 lg:mt-7 flex flex-col lg:grid lg:grid-cols-2 lg:gap-6 xl:gap-7 lg:items-stretch">
          {/* STARTUP (enterprise) */}
          <div
            className="relative flex flex-col overflow-hidden min-w-0"
            style={{
              background: PLAN_HEADER_BG,
              border: `3px solid ${ACCENT}`,
              boxShadow: `6px 6px 0px ${ACCENT}`,
            }}
          >
            <div className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10 space-y-2 sm:space-y-2.5">
              <h2 className="font-black uppercase leading-none tracking-tight text-[2.25rem] sm:text-[2.75rem] lg:text-[3.5rem] text-white">
                STARTUP
              </h2>
              <p className="text-lg sm:text-xl lg:text-2xl font-black uppercase tracking-wide text-white/50">
                Maximum Exposure
              </p>
              <p className="text-base sm:text-lg text-white/60 leading-snug pt-1">
                For companies that want the highest visibility across EROGRAM.
              </p>
              <p className="text-base sm:text-lg font-bold text-white/80 leading-snug">
                Budget above $1500/Month.
              </p>
              <p className="text-base sm:text-lg font-bold text-white/80 leading-snug">
                Up to 10× more exposure across EROGRAM compared to SCALE.
              </p>
              <ul className="pt-3 space-y-2.5 sm:space-y-3">
                {[
                  'Display banners & video advertising',
                  'Up to 40× more exposure across EROGRAM',
                  'Placement across our highest-traffic pages',
                  'A/B testing of headlines, creatives & messaging',
                  'Campaign analytics & reporting',
                  'Launch and growth consulting',
                  'Custom campaign strategy',
                  'Dedicated account support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-lg sm:text-base font-semibold text-white/90">
                    <span style={{ color: '#34d399' }} className="mt-0.5 shrink-0"><Check /></span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-6 pb-6 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10 pt-0">
              <a
                href="mailto:isabella@erogram.biz?subject=Startup%20Package%20Inquiry"
                className="block w-full max-w-xl mx-auto py-4 lg:py-5 text-lg sm:text-base font-black uppercase tracking-widest text-center text-black transition-all hover:opacity-95 active:translate-x-[2px] active:translate-y-[2px]"
                style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
              >
                Contact us for pricing
              </a>
            </div>
          </div>

        {/* À LA CARTE ADD-ONS */}
        <section className="mb-12 lg:mb-0 min-w-0 flex flex-col">
          <div
            className="overflow-hidden bg-white flex flex-col flex-1 h-full"
            style={{ border: BORDER, boxShadow: SHADOW_LG, color: '#000' }}
          >
            <div className="px-6 py-5 sm:px-8" style={{ background: PLAN_HEADER_BG }}>
              <h2 className="text-2xl sm:text-xl font-black uppercase tracking-tight text-white leading-none">
                À La Carte
              </h2>
              <p className="mt-1 text-lg sm:text-base font-black uppercase tracking-wide text-white/45">
                Growth Add-ons
              </p>
            </div>
            <ul className="divide-y divide-black/10 px-6 py-2 sm:px-8 flex-1">
              {A_LA_CARTE_ADDONS.map((addon) => (
                <li key={addon.title} className="py-5 first:pt-4 last:pb-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
                    <p className="text-xl sm:text-lg font-black text-black">{addon.title}</p>
                    <p className="text-2xl sm:text-xl font-black text-[#16a34a] leading-none shrink-0">{addon.price}</p>
                  </div>
                  <p className="text-lg sm:text-base font-semibold text-black/65 leading-relaxed">
                    {addon.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

          </div>

        </div>

        <InFeedAdFormatComparison />

        {/* Need help */}
        <section className="mb-12 max-w-2xl mx-auto">
          <div
            className="rounded-xl px-6 py-8 sm:px-8 sm:py-10 text-center"
            style={{
              background: PLAN_HEADER_BG,
              border: `3px solid ${ACCENT}`,
              boxShadow: `6px 6px 0px ${ACCENT}`,
            }}
          >
            <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-7 max-w-lg mx-auto">
              Need help? Have a question? Don&apos;t hesitate to get in touch:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              <a
                href="mailto:isabella@erogram.biz"
                className="group flex flex-col items-center justify-center gap-2 rounded-lg bg-white px-5 py-5 text-center transition-transform hover:-translate-y-0.5"
                style={{ border: BORDER, boxShadow: SHADOW }}
              >
                <span className="text-2xl leading-none" aria-hidden="true">✉️</span>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Email</span>
                <span className="text-base sm:text-lg font-black text-black break-all">isabella@erogram.biz</span>
              </a>
              <a
                href="https://t.me/erogramDOTpro"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center justify-center gap-2 rounded-lg px-5 py-5 text-center text-black transition-transform hover:-translate-y-0.5"
                style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
              >
                <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-black/50">Telegram</span>
                <span className="text-base sm:text-lg font-black text-black">@erogramDOTpro</span>
              </a>
            </div>
          </div>
        </section>

        {/* ── SUBMISSION FORM ── */}
        {selectedPlan && (
          <div
            id="submit-form"
            className="max-w-2xl mx-auto p-8 mb-5"
            style={{
              background: 'linear-gradient(180deg, #062416 0%, #04140c 100%)',
              border: `3px solid ${ACCENT}`,
              boxShadow: `6px 6px 0px ${ACCENT}`,
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-[#4ade80] mb-2">Your selected package</p>
                <h2 className="text-4xl sm:text-5xl font-black uppercase leading-none tracking-tight text-white">
                  {selectedPlan === 'basic' && 'Basic'}
                  {selectedPlan === 'boost' && 'Boost'}
                  {selectedPlan === 'startup' && 'Scale'}
                </h2>
                <p className="text-lg sm:text-xl font-black uppercase tracking-wide text-white/45 mt-1.5">
                  {selectedPlan === 'basic' && 'Get Seen'}
                  {selectedPlan === 'boost' && 'Get More Visibility'}
                  {selectedPlan === 'startup' && 'Own Your Category'}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 flex items-center justify-center text-xl text-white/40 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={formStep === 'preview' ? (e) => e.preventDefault() : handleSavePreview} className="space-y-5">

              {formStep === 'edit' && (
              <>
              {/* Tool Name */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#4ade80] mb-1.5">Tool Name *</label>
                <input
                  type="text"
                  value={form.toolName}
                  onChange={(e) => setForm(f => ({ ...f, toolName: e.target.value }))}
                  placeholder="e.g. DreamGF"
                  className={inputCls}
                  style={{ border: `2px solid ${ACCENT}` }}
                />
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#4ade80] mb-1.5">Website URL *</label>
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
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#4ade80] mb-1.5">Logo / Image *</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative cursor-pointer flex flex-col items-center justify-center gap-2 py-6 transition-colors hover:bg-white/[0.06]"
                  style={{ border: `2px dashed ${ACCENT}`, background: 'rgba(14,165,233,0.06)' }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded border-2 border-[#22c55e]/40" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-white/[0.08] flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#4ade80]">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                  )}
                  <p className={`${formHintCls} text-white/85`}>
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
                {selectedPlan && PLANS_WITH_SCREENSHOTS.includes(selectedPlan) && (
                  <div
                    className="mt-3 rounded-lg px-4 py-3"
                    style={{ border: `1px solid ${ACCENT}40`, background: 'rgba(34,197,94,0.08)' }}
                  >
                    <p className="text-sm sm:text-base font-semibold text-white leading-snug">
                      SCREENSHOTS CAN BE UPLOADED LATER
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#4ade80] mb-1">
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
                  style={{ border: `2px solid ${ACCENT}` }}
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#4ade80] mb-3">
                  Categories *
                </label>
                {selectedPlan && (
                  <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-[#22c55e]/25 bg-[#22c55e]/10 px-3 py-2.5">
                    <span className="text-xs font-black uppercase tracking-wide text-[#4ade80]">
                      {PLAN_TIER_NAMES[selectedPlan]}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      You have up to {selectionLimit} categories
                    </span>
                  </div>
                )}
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
                          background: active ? ACCENT : 'rgba(255,255,255,0.08)',
                          color: active ? '#fff' : 'rgba(255,255,255,0.85)',
                          border: active ? `2px solid ${ACCENT}` : '2px solid rgba(255,255,255,0.2)',
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
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#4ade80] mb-1.5">Pricing Model</label>
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
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#4ade80] mb-2">What payment do you accept?</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => togglePayment(pm)}
                      className="px-3 py-2 text-sm sm:text-xs font-bold transition-all"
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
                <label className="block text-sm sm:text-xs font-black uppercase tracking-widest text-[#4ade80] mb-1.5">Contact — Email or Telegram *</label>
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
                <p className="text-sm sm:text-[11px] font-bold text-white/40 mt-1.5">We&apos;ll only use this to reach you about your listing. At least one is required.</p>
              </div>
              </>
              )}

              {formStep === 'preview' && selectedPlan && (
                <div className="space-y-4">
                  <ListingContentReview
                    name={form.toolName}
                    description={form.description}
                    imageUrl={savedLogoUrl || imagePreview || ''}
                    websiteUrl={form.websiteUrl}
                    categories={selectedItems.filter((i) => isMainCategory(i))}
                    subscription={form.subscription}
                    paymentMethods={form.paymentMethods}
                    planPrice={AINSFW_PLAN_PRICES[selectedPlan]}
                  />
                  <button
                    type="button"
                    onClick={() => { setFormStep('edit'); setError(''); }}
                    className="w-full py-3 text-sm font-black uppercase tracking-widest text-white/80 hover:text-white transition-colors"
                    style={{ border: `2px solid rgba(255,255,255,0.2)` }}
                  >
                    Edit
                  </button>
                </div>
              )}

              {error && (
                <div className="px-4 py-3 text-sm font-bold text-white bg-red-600" style={{ border: BORDER }}>
                  {error}
                </div>
              )}

              {formStep === 'preview' && (
              <>
              {/* Crypto notice — bottom */}
              <div
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{ background: 'rgba(14,165,233,0.10)', border: `2px solid ${ACCENT}` }}
              >
                <span className="text-lg">₿</span>
                <span className="text-sm sm:text-xs font-bold text-[#4ade80]">
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
                  className="flex-1 px-3 py-3 bg-white/[0.06] border-2 border-black text-white text-sm sm:text-xs font-bold placeholder:text-white/25 outline-none focus:border-[#22c55e] transition"
                />
                <button
                  type="button"
                  disabled={!couponCode.trim() || validatingCoupon}
                  onClick={async () => {
                    setValidatingCoupon(true);
                    const priceUsd = AINSFW_PLAN_PRICES[selectedPlan!];
                    const starsEquiv = Math.round(priceUsd / 0.013);
                    const res = await validateCoupon(couponCode.trim(), 'ainsfw', starsEquiv);
                    setCouponResult(res);
                    setValidatingCoupon(false);
                  }}
                  className="px-4 py-3 bg-white/[0.1] hover:bg-white/[0.15] border-2 border-black text-white/70 text-sm sm:text-xs font-black uppercase tracking-wider disabled:opacity-30 transition"
                >
                  {validatingCoupon ? '...' : 'Apply'}
                </button>
              </div>
              {couponResult && (
                <p className={`text-sm sm:text-xs font-bold ${couponResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {couponResult.valid
                    ? `✓ Coupon applied! Discount active.`
                    : couponResult.error}
                </p>
              )}

              <button
                type="button"
                disabled={loading || !draftSubmissionId}
                onClick={handleCheckout}
                className="w-full py-4 text-base sm:text-sm font-black uppercase tracking-widest text-black transition-all disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px]"
                style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
              >
                {loading
                  ? 'Processing...'
                  : checkoutPrice <= 0 && couponResult?.valid
                    ? 'Confirm Free Listing →'
                    : `Pay $${checkoutPrice} in Crypto →`}
              </button>
              </>
              )}

              {formStep === 'edit' && (
              <>
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
              </>
              )}

              {/* Support */}
              <div className={`pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-3 ${formHintCls} text-white/80`}>
                <span>Questions? Reach us at:</span>
                <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:text-[#4ade80] transition-colors">
                  isabella@erogram.biz
                </a>
                <span className="hidden sm:inline text-white/15">·</span>
                <a
                  href="https://t.me/erogramDOTpro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4ade80] hover:text-[#4ade80] transition-colors"
                >
                  @erogramDOTpro on Telegram
                </a>
              </div>
            </form>
          </div>
        )}

        {/* FAQ */}
        <section className="mt-8 mb-10 max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {SUBMIT_FAQ.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-[#22c55e]/15 bg-[#0a1f12] overflow-hidden">
                <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 text-white font-semibold text-base sm:text-base list-none [&::-webkit-details-marker]:hidden">
                  <span>{faq.q}</span>
                  <svg className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 text-white/50 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <div className="px-5 pb-5 text-white/70 text-base sm:text-sm leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

      </main>

      <MobileSubmitStickyBar
        liveNow={visitorStats.liveNow}
        events={visitorStats.events}
        onSubmit={scrollToPricing}
      />

      <ErogramDevilGirlFooter variant="mascot-blended" />
      <Footer />
    </div>
  );
}
