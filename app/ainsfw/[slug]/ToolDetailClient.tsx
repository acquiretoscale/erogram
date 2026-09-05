'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { AINsfwTool } from '../types';
import type { AINsfwFullReview } from '../reviewTypes';
import { voteOnTool, unvoteOnTool, submitReview, trackAinsfwToolClick, type ToolReviewData } from '@/lib/actions/ainsfw';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import type { AuthorProfile } from '@/lib/actions/authors';
import type { BlogCard } from '@/lib/actions/blog';
import { getAinsfwTagHref } from '@/lib/ainsfw/internalLinks';
import { categoryToSlug } from '../data';
import { AINSFW_CATEGORIES } from '../types';
import { AINSFW_TOOL_ARTICLE_LINKS } from '@/lib/ainsfw/toolArticles';
import ToolDetailAdminPanel, { ToolDetailAdminFab } from '../ToolDetailAdminPanel';
import AinsfwHeaderActions from '@/components/AinsfwHeaderActions';
import FlameReviewSection from '@/components/FlameReviewSection';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { VerifiedByErogramLabel } from '@/components/VerifiedBadge';
import { pickTagHashtagAlt } from '@/lib/ainsfw/imageAlt';
import { AINSFW_REVIEW_EXAMPLE_VIDEOS, AINSFW_TOOL_PREVIEW_VIDEOS } from '@/lib/ainsfw/toolPreviewVideos';
import { ainsfwCtaButtonClass } from '@/lib/ainsfw/ctaButton';
import ToolProsConsSkeleton from '@/components/ainsfw/ToolProsConsSkeleton';
import ToolKeyFeatures from '@/components/ainsfw/ToolKeyFeatures';
import AinsfwVideoListingBadge from '@/components/ainsfw/AinsfwVideoListingBadge';
import TopAINsfwBlock from '../TopAINsfwBlock';
import { hasProsCons, type AINsfwListingBlocks } from '../listingBlocks';
import { getMemoryPeers } from '../memoryPeers';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';

function useAinsfwChrome() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  return {
    t,
    lp,
    catLabel: (cat: string) => t(`ainsfw.categories.${cat}`, cat),
    tryFree: (name: string) =>
      name === 'AI SLUTBOT' || name === 'AISLUTBOT' ? 'TRY AI SLUTBOT' : t('ainsfw.tryFree', 'TRY {name} FREE').replace(/\{name\}/g, name),
    tryForFree: (name: string) =>
      name === 'AI SLUTBOT' || name === 'AISLUTBOT' ? 'TRY AI SLUTBOT' : t('ainsfw.tryForFree', 'TRY {name} for free').replace(/\{name\}/g, name),
    tryName: (name: string) =>
      name === 'AI SLUTBOT' || name === 'AISLUTBOT' ? 'TRY AI SLUTBOT' : t('ainsfw.tryName', 'TRY {name}').replace(/\{name\}/g, name),
    reviewsLabel: (count: number) =>
      (count === 1
        ? t('ainsfw.reviewOne', '{count} review')
        : t('ainsfw.reviews', '{count} reviews')
      ).replace(/\{count\}/g, String(count)),
  };
}

interface ToolDetailClientProps {
  tool: AINsfwTool;
  fullReview?: AINsfwFullReview;
  showVerified?: boolean;
  aiArticles?: BlogCard[];
  initialStats?: ToolStatsData;
  reviewAuthor?: AuthorProfile;
  listingBlocks?: AINsfwListingBlocks;
  featuredHubSlugs?: string[];
  featuredHubTools?: AINsfwTool[];
  featuredHubStats?: Record<string, ToolStatsData>;
  verifiedSlugs?: string[];
}

const CATEGORY_COLOR: Record<string, string> = {
  'AI Companion': 'bg-blue-700',
  'Undress AI': 'bg-slate-700',
  'AI Sexting / Chat': 'bg-emerald-700',
  'AI NSFW Image Generator': 'bg-amber-600',
  'AI Porn Generator': 'bg-rose-700',
  'AI NSFW Roleplay': 'bg-zinc-800',
  'Adult Games': 'bg-purple-800',
};

const CATEGORY_BADGE: Record<string, string> = {
  'AI Companion': 'bg-blue-700 text-white',
  'Undress AI': 'bg-slate-700 text-white',
  'AI Sexting / Chat': 'bg-emerald-700 text-white',
  'AI NSFW Image Generator': 'bg-amber-600 text-white',
  'AI Porn Generator': 'bg-rose-700 text-white',
  'AI NSFW Roleplay': 'bg-zinc-800 text-white',
  'Adult Games': 'bg-purple-800 text-white',
};

const PAYMENT_ICON: Record<string, string> = {
  'Credit Cards': '💳',
  'Debit Cards': '💳',
  'Crypto': '₿',
  'PayPal': '🅿',
  'Telegram Stars': '⭐',
};

function getBookmarkKey(slug: string) { return `ainsfw_bookmark_${slug}`; }

function getReviewAuthorAvatar(author: AuthorProfile) {
  return author.avatar || '/assets/blog/authors/eros.webp';
}

function getReviewAuthorBio(author: AuthorProfile) {
  return author.bio || '';
}

function ReviewAuthorMini({ author }: { author: AuthorProfile }) {
  const avatarSrc = getReviewAuthorAvatar(author);
  return (
    <div className="mb-8 sm:mb-10 flex items-center justify-center gap-3">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-[#22c55e]/30">
        <img
          src={avatarSrc}
          alt={author.name}
          width={44}
          height={44}
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="min-w-0 text-left">
        <div className="font-bold text-sm sm:text-base text-white leading-tight">{author.name}</div>
        {author.role && (
          <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#22c55e]/90 mt-0.5">{author.role}</div>
        )}
      </div>
    </div>
  );
}

function ReviewAuthorBox({ author }: { author: AuthorProfile }) {
  const avatarSrc = getReviewAuthorAvatar(author);
  const bio = getReviewAuthorBio(author);
  return (
    <div className="mt-10 pt-8 border-t border-[#22c55e]/15">
      <div className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#22c55e]/80 mb-4">About the Author</div>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7 rounded-xl border border-[#22c55e]/20 bg-[#061510]/90 p-6 sm:p-8 shadow-[0_16px_48px_-24px_rgba(0,0,0,0.5)]">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shrink-0 ring-2 ring-[#22c55e]/35 shadow-[0_0_24px_rgba(34,197,94,0.12)]">
          <img
            src={avatarSrc}
            alt={author.name}
            width={96}
            height={96}
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="font-black text-xl sm:text-[22px] text-white leading-tight">{author.name}</div>
          {author.role && (
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#22c55e] mt-1.5">{author.role}</div>
          )}
          {bio && (
            <p className="text-[15px] sm:text-base leading-[1.7] text-white/70 mt-3">{bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AislutCryptoOffer({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText('EROGRAM25OFF');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = 'EROGRAM25OFF';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="inline-flex flex-col items-center rounded-xl bg-[#22c55e] px-6 py-3 shadow-lg shadow-[#22c55e]/40">
        <p className="text-sm font-black leading-tight text-black text-center whitespace-nowrap">
          Erogram exclusive · 25% off USDT · First 20
        </p>
        <button
          type="button"
          onClick={copyCode}
          aria-label={copied ? 'Coupon code copied' : 'Copy coupon code EROGRAM25OFF'}
          className="mt-1.5 inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 px-4 py-1.5 transition-colors"
        >
          <span className="text-sm font-black tracking-wide text-black whitespace-nowrap">EROGRAM25OFF</span>
          <span className="text-[10px] font-black uppercase text-black/75 whitespace-nowrap">
            {copied ? 'Copied' : 'Copy'}
          </span>
        </button>
      </div>
    </div>
  );
}

function AislutPricingBlock() {
  const tiers = [
    { name: 'The Starter', bonus: '', output: '72 images or 36 videos', stars: '750 Stars', price: '~$9.97' },
    { name: 'The novice', bonus: 'GET 4% MORE', output: '156 images or 78 videos', stars: '1,500 Stars', price: '~$19.94' },
    { name: 'The Player', bonus: 'GET 8% MORE', output: '280 images or 140 videos', stars: '2,500 Stars', price: '~$33.23' },
    { name: 'The Aislutboss', bonus: 'GET 20% MORE', output: '672 images or 336 videos', stars: '5,000 Stars', price: '~$66.47' },
  ];

  return (
    <div className="space-y-5">
      <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
        <strong className="font-bold text-white">AI SLUTBOT</strong> skips subscriptions entirely. You buy Telegram Stars once and spend them as needed, and Stars never expire. Crucially, the higher tiers don&apos;t just hand you more credit, they unlock better value per Star, so the more you buy, the more generations you get for free.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-xl border px-4 py-3.5 ${
              tier.name === 'The Aislutboss'
                ? 'border-[#22c55e]/50 bg-[#0a1f12]'
                : 'border-[#22c55e]/20 bg-[#071a10]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-black text-white">{tier.name}</p>
              {tier.bonus ? (
                <span className="shrink-0 rounded-md bg-[#22c55e] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                  {tier.bonus}
                </span>
              ) : null}
            </div>
            <p className="text-sm font-bold text-[#86efac]">{tier.output}</p>
            <p className="mt-1 text-xs text-white/60">{tier.stars} · {tier.price}</p>
          </div>
        ))}
      </div>
      <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
        In practice, the novice tier hands you a handful of bonus generations, the Player adds around 20 extra images (or 10 videos), and the Aislutboss stacks nearly 100 extra images (or ~48 extra videos) on top of the base rate, plus 1080p, up to 20-second clips, and priority access.
      </p>
      <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
        Payment is smooth and safe. You can pay by credit or debit card straight through Telegram Stars. No sketchy processors and no adult descriptor on your bank statement. USDT crypto checkout is cheaper still. Erogram readers get 25% off with code EROGRAM25OFF, limited to the first 20 users, first come first served.
      </p>
    </div>
  );
}

function AislutReviewIntro() {
  const link = 'text-[#22c55e] hover:underline';
  return (
    <div className="space-y-4 mb-2">
      <p className="text-gray-200 text-lg sm:text-xl leading-relaxed">
        <strong className="font-bold text-white">AI SLUTBOT</strong> is listed among Erogram&apos;s{' '}
        <Link href="/ainsfw" className={link}>AI NSFW tools</Link>
        {' '}as an <strong className="font-bold text-white">AI SLUTBOT</strong> nude generator that turns one photo into{' '}
        <strong className="font-bold text-white">AI nude</strong> images and short adult clips. It sits with the rest of the{' '}
        <Link href="/ainsfw/undress-ai" className={link}>undress AI</Link>
        {' '}category, and people comparing still-image options usually also check the{' '}
        <Link href="/ainsfw/ai-nsfw-image-generator" className={link}>AI NSFW image generator</Link>
        {' '}listings.
      </p>
      <p className="text-gray-200 text-lg sm:text-xl leading-relaxed">
        The model behind <strong className="font-bold text-white">AI SLUTBOT</strong> is a purpose-trained{' '}
        <a
          href="https://en.wikipedia.org/wiki/Large_language_model"
          target="_blank"
          rel="noopener"
          className={link}
        >
          LLM
        </a>
        , tuned for anatomy, lighting, and skin.
      </p>
    </div>
  );
}

function ReviewCta({
  onClick,
  disabled,
  toolName,
}: {
  onClick: () => void;
  disabled: boolean;
  toolName: string;
}) {
  const { t, tryFree } = useAinsfwChrome();
  return (
    <div className="mb-8 flex justify-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className={ainsfwCtaButtonClass('md')}
      >
        {disabled ? t('ainsfw.opening', 'Opening...') : tryFree(toolName)}
      </button>
    </div>
  );
}

type ReviewInsertCtx = { galleryIdx: number; paragraphCount: number; exampleVideoIdx: number };

function splitDescriptionParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const existing = trimmed.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (existing.length >= 2) {
    if (existing.length <= 3) return existing;
    const size = Math.ceil(existing.length / 3);
    return [
      existing.slice(0, size).join(' '),
      existing.slice(size, size * 2).join(' '),
      existing.slice(size * 2).join(' '),
    ].filter(Boolean);
  }

  return [trimmed];
}

function ReviewInsertCta({
  toolName,
  onVisit,
  isRedirecting,
  forVideo = false,
}: {
  toolName: string;
  onVisit: () => void;
  isRedirecting: boolean;
  forVideo?: boolean;
}) {
  const { t, tryName, tryForFree } = useAinsfwChrome();
  return (
    <button
      type="button"
      onClick={onVisit}
      disabled={isRedirecting}
      className={ainsfwCtaButtonClass(forVideo ? 'videoLg' : 'lg')}
    >
      {isRedirecting ? t('ainsfw.opening', 'Opening...') : forVideo ? tryName(toolName) : tryForFree(toolName)}
    </button>
  );
}

function ReviewInsertBlock({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 rounded-2xl border border-[#22c55e]/25 bg-[#071a10] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(34,197,94,0.08)]">
      {children}
    </div>
  );
}

function ToolPreviewVideoBlock({
  mp4,
  poster,
  toolName,
  toolCategory,
  posterAlt,
  categoryBadge,
  onVisit,
  isRedirecting,
  className = '',
  largeReviewCta = false,
}: {
  mp4: string;
  poster?: string;
  toolName: string;
  toolCategory?: string;
  posterAlt?: string;
  categoryBadge?: ReactNode;
  onVisit: () => void;
  isRedirecting: boolean;
  className?: string;
  largeReviewCta?: boolean;
}) {
  const { t, tryName } = useAinsfwChrome();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const hoverTitle = toolCategory ? `${toolName} - ${toolCategory}` : toolName;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { rootMargin: '120px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !videoRef.current) return;
    const v = videoRef.current;
    const onReady = () => setVideoReady(true);
    v.addEventListener('canplay', onReady);
    if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) onReady();
    return () => v.removeEventListener('canplay', onReady);
  }, [inView]);

  useEffect(() => {
    if (!inView || !videoReady || !videoRef.current) return;
    void videoRef.current.play().catch(() => {});
  }, [inView, videoReady]);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden border border-white/10 ${className}`.trim()}
      title={hoverTitle}
    >
      <div className="relative w-full bg-black" style={{ aspectRatio: '360 / 608' }}>
        {poster ? (
          <img
            src={poster}
            alt={posterAlt ?? hoverTitle}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoReady ? 'opacity-0' : 'opacity-100'}`}
            loading="eager"
            decoding="async"
          />
        ) : null}
        {inView ? (
          <video
            ref={videoRef}
            src={mp4}
            muted
            loop
            playsInline
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : null}
      </div>
      {categoryBadge ? (
        <div className="absolute top-3 right-3 z-10">{categoryBadge}</div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-3 pb-3 pt-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
        <p className="text-white/70 text-xs sm:text-sm font-bold text-center tracking-wide">
          {t('ainsfw.videoMadeWith', 'Video Made with {name}').replace(/\{name\}/g, toolName)}
        </p>
        {largeReviewCta ? (
          <div onClick={(e) => e.stopPropagation()}>
            <ReviewInsertCta toolName={toolName} onVisit={onVisit} isRedirecting={isRedirecting} forVideo />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onVisit(); }}
            disabled={isRedirecting}
            className={ainsfwCtaButtonClass('videoSm')}
          >
            {isRedirecting ? t('ainsfw.opening', 'Opening...') : tryName(toolName)}
          </button>
        )}
      </div>
    </div>
  );
}

function renderReviewParagraphs(
  paragraphs: string[],
  ctx: ReviewInsertCtx,
  gallery: string[],
  tool: Pick<AINsfwTool, 'name' | 'category' | 'tags'>,
  opts: {
    keyPrefix: string;
    textClassName: string;
    onVisit: () => void;
    onPreviewImage: (src: string) => void;
    isRedirecting: boolean;
    previewVideo?: { mp4: string; poster?: string };
    exampleVideos?: { mp4: string; poster?: string }[];
  },
): ReactNode[] {
  const nodes: ReactNode[] = [];
  paragraphs.forEach((para, i) => {
    ctx.paragraphCount += 1;
    nodes.push(
      <p key={`${opts.keyPrefix}-p-${i}`} className={opts.textClassName}>
        {tool.name === 'AI SLUTBOT' ? boldAislutName(para) : para}
      </p>,
    );
    if (ctx.paragraphCount % 2 === 0) {
      if (ctx.paragraphCount === 2 && opts.previewVideo) {
        nodes.push(
          <ReviewInsertBlock key={`${opts.keyPrefix}-video-${i}`}>
            <div className="w-[60vw] max-w-[60vw] flex-none mx-auto lg:w-full lg:max-w-sm">
              <ToolPreviewVideoBlock
                mp4={opts.previewVideo.mp4}
                poster={opts.previewVideo.poster}
                toolName={tool.name}
                toolCategory={tool.category}
                posterAlt={pickTagHashtagAlt(tool.tags, 0)}
                onVisit={opts.onVisit}
                isRedirecting={opts.isRedirecting}
                largeReviewCta
              />
            </div>
          </ReviewInsertBlock>,
        );
      } else if (opts.exampleVideos && ctx.exampleVideoIdx < opts.exampleVideos.length) {
        const example = opts.exampleVideos[ctx.exampleVideoIdx];
        ctx.exampleVideoIdx += 1;
        nodes.push(
          <ReviewInsertBlock key={`${opts.keyPrefix}-example-video-${i}`}>
            <div className="w-[60vw] max-w-[60vw] flex-none mx-auto lg:w-full lg:max-w-sm">
              <ToolPreviewVideoBlock
                mp4={example.mp4}
                poster={example.poster}
                toolName={tool.name}
                toolCategory={tool.category}
                posterAlt={pickTagHashtagAlt(tool.tags, ctx.exampleVideoIdx)}
                onVisit={opts.onVisit}
                isRedirecting={opts.isRedirecting}
                largeReviewCta
              />
            </div>
          </ReviewInsertBlock>,
        );
      } else if (gallery.length > 0) {
      const imgIdx = ctx.galleryIdx % gallery.length;
      ctx.galleryIdx += 1;
      nodes.push(
        <ReviewInsertBlock key={`${opts.keyPrefix}-insert-${i}`}>
          <button
            type="button"
            onClick={() => opts.onPreviewImage(gallery[imgIdx])}
            className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/10 hover:border-[#22c55e]/40 transition-all cursor-zoom-in"
          >
            <img
              src={gallery[imgIdx]}
              alt={pickTagHashtagAlt(tool.tags, imgIdx)}
              title={`${tool.name} - ${tool.category}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
          <div className="flex justify-center pt-4 mt-4 border-t border-[#22c55e]/15">
            <ReviewInsertCta
              toolName={tool.name}
              onVisit={opts.onVisit}
              isRedirecting={opts.isRedirecting}
            />
          </div>
        </ReviewInsertBlock>,
      );
      }
    }
  });
  return nodes;
}

function boldAislutName(text: string): ReactNode[] {
  return text.split(/(AI SLUTBOT)/g).map((part, i) =>
    part === 'AI SLUTBOT'
      ? <strong key={i} className="font-bold text-white">{part}</strong>
      : part,
  );
}

function reviewSectionId(toolSlug: string, heading: string): string {
  const base = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `review-${toolSlug}-${base}`;
}

function scrollToReviewSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}

function ReviewGlossary({
  toolSlug,
  items,
}: {
  toolSlug: string;
  items: Array<{ heading: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Review glossary" className="mb-8 rounded-2xl border border-[#22c55e]/20 bg-[#0a1f12]/60 p-5">
      <p className="text-[#22c55e] text-xs font-black uppercase tracking-[0.2em] mb-4">Glossary · Quick Access</p>
      <ul className="space-y-2">
        {items.map((item) => {
          const id = reviewSectionId(toolSlug, item.heading);
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollToReviewSection(id)}
                className="block w-full text-left rounded-lg border border-[#22c55e]/25 bg-[#22c55e]/10 px-3 py-2 text-sm font-bold text-[#86efac] hover:bg-[#22c55e]/20 transition-colors"
              >
                {item.heading}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function ToolDetailClient({ tool, fullReview, showVerified = false, aiArticles = [], initialStats, reviewAuthor, listingBlocks, featuredHubSlugs = [], featuredHubTools = [], featuredHubStats = {}, verifiedSlugs = [] }: ToolDetailClientProps) {
  const { t, lp, catLabel, tryFree, tryForFree, reviewsLabel } = useAinsfwChrome();
  const placeholder = '/assets/image.jpg';
  const [imageSrc, setImageSrc] = useState(
    tool.image && (tool.image.startsWith('https://') || tool.image.startsWith('/'))
      ? tool.image : placeholder
  );
  const [description, setDescription] = useState(tool.description);
  const [visitUrl, setVisitUrl] = useState(tool.tryNowUrl);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEdit, setAdminEdit] = useState(false);

  const [isRedirecting, setIsRedirecting] = useState(false);

  // Votes & bookmark
  const [votes, setVotes] = useState({ up: initialStats?.upvotes ?? 0, down: initialStats?.downvotes ?? 0 });
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  // Gallery
  const [gallery, setGallery] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Reviews
  const [reviews, setReviews] = useState<ToolReviewData[]>(
    initialStats?.reviews?.map(r => ({ ...r, createdAt: r.createdAt })) ?? []
  );

  const handleFeaturedVoteChange = useCallback((_slug: string, _score: number) => {}, []);

  useEffect(() => {
    try {
      const savedVote = localStorage.getItem(`ainsfw_vote_${tool.slug}`) as 'up' | 'down' | null;
      if (savedVote) setUserVote(savedVote);
      setBookmarked(localStorage.getItem(getBookmarkKey(tool.slug)) === '1');
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    } catch {}

    // Gallery from admin/listing-owner saves only (API already applies resolveGallery).
    // Empty array means intentionally empty — do NOT fall back to hardcoded map.
    setGalleryLoading(true);
    fetch(`/api/ainsfw/images?slug=${encodeURIComponent(tool.slug)}&name=${encodeURIComponent(tool.name)}&vendor=${encodeURIComponent(tool.vendor)}`)
      .then(r => r.json())
      .then(d => { setGallery(Array.isArray(d.images) ? d.images.slice(0, 8) : []); })
      .catch(() => { setGallery([]); })
      .finally(() => setGalleryLoading(false));
  }, [tool.slug, tool.name, tool.vendor]);

  useEffect(() => {
    setImageSrc(
      tool.image && (tool.image.startsWith('https://') || tool.image.startsWith('/'))
        ? tool.image : placeholder
    );
    setDescription(tool.description);
    setVisitUrl(tool.tryNowUrl);
  }, [tool.image, tool.description, tool.tryNowUrl]);

  const handleVisit = () => {
    setIsRedirecting(true);
    void trackAinsfwToolClick(tool.slug);
    window.open(visitUrl, '_blank', 'noopener');
  };

  const handleVote = async (dir: 'up' | 'down') => {
    if (userVote === dir) {
      setUserVote(null);
      localStorage.setItem(`ainsfw_vote_${tool.slug}`, '');
      const result = await unvoteOnTool(tool.slug, dir);
      setVotes({ up: result.upvotes, down: result.downvotes });
    } else {
      if (userVote) await unvoteOnTool(tool.slug, userVote);
      setUserVote(dir);
      localStorage.setItem(`ainsfw_vote_${tool.slug}`, dir);
      const result = await voteOnTool(tool.slug, dir);
      setVotes({ up: result.upvotes, down: result.downvotes });
    }
  };

  const handleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    try { localStorage.setItem(getBookmarkKey(tool.slug), next ? '1' : '0'); } catch {}
  };

  const handleFlameReviewSubmit = async (rating: number, text: string) => {
    const token = localStorage.getItem('token') || '';
    const result = await submitReview(tool.slug, text, rating, token);
    return result.message;
  };

  const score = votes.up - votes.down;
  const reviewAvg = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  const flameRating = Math.round(reviewAvg);
  const btnColor = CATEGORY_COLOR[tool.category] || 'bg-gray-700';
  const catBadge = CATEGORY_BADGE[tool.category] || 'bg-gray-700 text-white';
  const imageHoverTitle = `${tool.name} - ${tool.category}`;
  const reviewGallery = gallery;
  const reviewInsertGallery = tool.slug === 'aislutbot-ai-nude-generator' ? [] : reviewGallery;
  const previewVideo = AINSFW_TOOL_PREVIEW_VIDEOS[tool.slug];
  const reviewInsertCtx = useRef<ReviewInsertCtx>({ galleryIdx: 0, paragraphCount: 0, exampleVideoIdx: 0 });
  const exampleVideos = AINSFW_REVIEW_EXAMPLE_VIDEOS[tool.slug];

  if (fullReview) {
    reviewInsertCtx.current.galleryIdx = 0;
    reviewInsertCtx.current.paragraphCount = 0;
    reviewInsertCtx.current.exampleVideoIdx = 0;
  }

  const reviewInsertOpts = {
    onVisit: handleVisit,
    onPreviewImage: setLightboxSrc,
    isRedirecting,
    previewVideo: tool.slug === 'aislutbot-ai-nude-generator' ? undefined : previewVideo,
    exampleVideos: tool.slug === 'aislutbot-ai-nude-generator' ? exampleVideos?.slice(0, 1) : exampleVideos,
  };

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-[#f5f5f5] font-sans overflow-x-hidden">
      <Navbar />

      {/* Breadcrumb */}
      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <nav className="flex items-center flex-wrap text-xs text-gray-500 gap-1.5 min-w-0">
            <Link href={lp('/')} className="hover:text-white transition-colors shrink-0">{t('ainsfw.home', 'Home')}</Link>
            <span className="shrink-0">/</span>
            <Link href={lp('/ainsfw')} className="hover:text-white transition-colors shrink-0">{t('ainsfw.breadcrumbHub', 'AI NSFW Tools')}</Link>
            <span className="shrink-0">/</span>
            <Link href={lp(`/ainsfw/${categoryToSlug(tool.category)}`)} className="text-gray-400 hover:text-white transition-colors truncate max-w-[120px]">{catLabel(tool.category)}</Link>
            <span className="shrink-0">/</span>
            <span className="text-white font-semibold truncate max-w-[140px] sm:max-w-[180px]">{tool.name}</span>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleBookmark}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this page'}
              title={bookmarked ? 'Bookmarked' : 'Bookmark this page'}
              className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all ${
                bookmarked
                  ? 'bg-[#22c55e] border-[#22c55e] text-black shadow-lg shadow-[#22c55e]/25'
                  : 'bg-white/[0.06] border-white/[0.12] text-gray-400 hover:text-white hover:border-white/25 hover:bg-white/[0.1]'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
            </button>
            <AinsfwHeaderActions
              part="submit"
              shareText={`Check out ${tool.name} on Erogram`}
              emailSubject={`${tool.name} - AI NSFW Tool on Erogram`}
              fallbackUrl={`${CANONICAL_BASE}/ainsfw/${tool.slug}`}
            />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          {/* Left sticky column */}
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-gray-100 ring-2 ring-[#22c55e]/25 shrink-0">
                  <img
                    src={imageSrc}
                    alt={`${tool.name} logo`}
                    title={imageHoverTitle}
                    className="w-full h-full object-cover"
                    onError={() => setImageSrc(placeholder)}
                  />
                </div>
                <span className="truncate min-w-0">{tool.name}</span>
                {showVerified && <VerifiedByErogramLabel size="detail" />}
              </h1>

              {/* Tool image card */}
              <div className="bg-[#0a1f12]/85 rounded-2xl border border-[#22c55e]/15 shadow-2xl overflow-hidden mb-4">
                {previewVideo ? (
                  <div className="px-4 pt-4 pb-4 flex justify-center lg:block">
                    <div className="w-[60vw] max-w-[60vw] flex-none mx-auto lg:w-full lg:max-w-none">
                      <ToolPreviewVideoBlock
                        mp4={previewVideo.mp4}
                        poster={previewVideo.poster}
                        toolName={tool.name}
                        toolCategory={tool.category}
                        posterAlt={pickTagHashtagAlt(tool.tags, 0)}
                        onVisit={handleVisit}
                        isRedirecting={isRedirecting}
                        categoryBadge={
                          <AinsfwVideoListingBadge
                            src={imageSrc}
                            alt={pickTagHashtagAlt(tool.tags, 0)}
                            title={imageHoverTitle}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg"
                          />
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full aspect-square bg-gray-100">
                    <img
                      src={imageSrc}
                      alt={pickTagHashtagAlt(tool.tags, 0)}
                      title={imageHoverTitle}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => setImageSrc(placeholder)}
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`${catBadge} text-xs font-black px-2 py-1 rounded border border-black/20 uppercase tracking-wider`}>
                        {catLabel(tool.category)}
                      </span>
                    </div>
                  </div>
                )}

                {!previewVideo && (
                <div className="px-4 pt-3">
                  <button
                    type="button"
                    onClick={handleVisit}
                    disabled={isRedirecting}
                    className={ainsfwCtaButtonClass('md', 'w-full')}
                  >
                    {isRedirecting ? t('ainsfw.opening', 'Opening...') : tryFree(tool.name)}
                  </button>
                </div>
                )}

                {/* Quick stats grid */}
                <div className="p-4 grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-xl border border-white/10 p-2.5 text-center">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{t('ainsfw.plan', 'Plan')}</div>
                    <div className="text-xs font-bold text-white leading-tight">{tool.subscription}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl border border-white/10 p-2.5 text-center">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">{t('ainsfw.vendor', 'Vendor')}</div>
                    <div className="text-xs font-bold text-white truncate leading-tight">{tool.vendor}</div>
                  </div>
                  <div className="col-span-2 bg-white/5 rounded-xl border border-white/10 p-2.5">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">{t('ainsfw.accepts', 'Accepts')}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tool.payment.length > 0 ? tool.payment.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-[10px] font-black text-white">
                          {PAYMENT_ICON[p] || '💰'} {p}
                        </span>
                      )) : (
                        <span className="text-xs text-gray-400">{t('ainsfw.notSpecified', 'Not specified')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => document.getElementById('tool-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-full flex items-center justify-center gap-2 mb-4 py-3 rounded-xl border border-[#22c55e]/20 bg-[#0a1f12]/85 hover:bg-[#22c55e]/10 transition-colors"
                aria-label={`See all ${reviews.length} reviews`}
              >
                <div className="flex items-center gap-0.5 shrink-0" aria-hidden>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className={`w-4 h-4 ${reviews.length > 0 && s <= flameRating ? 'text-[#22c55e]' : 'text-gray-600'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-base font-bold text-[#22c55e]">
                  {reviewsLabel(reviews.length)}
                </span>
              </button>

              {/* Vote + Score row */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => handleVote('up')}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border font-black text-sm transition-all ${
                    userVote === 'up' ? 'bg-green-500 text-white border-green-400' : 'bg-white/10 text-white/70 border-white/15 hover:bg-green-500/20 hover:text-green-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4z"/></svg>
                </button>
                <span className={`flex-1 text-center text-sm font-black py-2.5 rounded-xl border ${
                  score > 0 ? 'bg-green-500/20 text-green-300 border-green-500/30' : score < 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-white/10 text-gray-300 border-white/15'
                }`}>
                  {score > 0 ? `+${score}` : score}
                </span>
                <button
                  onClick={() => handleVote('down')}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border font-black text-sm transition-all ${
                    userVote === 'down' ? 'bg-red-500 text-white border-red-400' : 'bg-white/10 text-white/70 border-white/15 hover:bg-red-500/20 hover:text-red-300'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16z"/></svg>
                </button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tool.tags.slice(0, 6).map((tag) => {
                  const href = getAinsfwTagHref(tag);
                  const label = `#${tag.replace(/\s+/g, '-')}`;
                  const className = 'bg-white/10 border border-white/15 rounded px-2 py-0.5 text-[10px] font-black text-gray-200 hover:bg-white/15 hover:border-[#22c55e]/40 hover:text-[#22c55e] transition-all';
                  return href ? (
                    <Link key={tag} href={href} className={className}>
                      {label}
                    </Link>
                  ) : (
                    <span key={tag} className={className}>
                      {label}
                    </span>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10">
                <AinsfwHeaderActions
                  part="share"
                  shareText={`Check out ${tool.name} on Erogram`}
                  emailSubject={`${tool.name} - AI NSFW Tool on Erogram`}
                  fallbackUrl={`${CANONICAL_BASE}/ainsfw/${tool.slug}`}
                />
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {previewVideo && (
                <h3 className="hidden lg:flex items-center min-h-14 mb-3 text-sm font-black text-gray-400 uppercase tracking-widest">
                  Preview of {tool.name}
                </h3>
              )}

              {/* Screenshot Gallery — shown first on both mobile and desktop */}
              {(reviewGallery.length > 0 || galleryLoading) && (
                <div className={`mb-8${previewVideo ? ' lg:pt-4' : ''}`}>
                  <h3 className={`text-sm font-black text-gray-400 uppercase tracking-widest mb-3${previewVideo ? ' lg:hidden' : ''}`}>Preview of {tool.name}</h3>
                  {galleryLoading && reviewGallery.length === 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-video rounded-xl bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {reviewGallery.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLightboxSrc(src)}
                          className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5 hover:border-white/20 transition-all group cursor-zoom-in"
                        >
                          <img
                            src={src}
                            alt={pickTagHashtagAlt(tool.tags, i)}
                            title={imageHoverTitle}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title + text */}
              {(tool.sourceUrl || tool.tryNowUrl) ? (
                <a
                  href={tool.sourceUrl || tool.tryNowUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-block text-gray-400 text-sm mb-2 hover:text-[#22c55e] transition-colors"
                >
                  {tool.vendor}
                </a>
              ) : (
                <p className="text-gray-400 text-sm mb-2">{tool.vendor}</p>
              )}

              {/* Star rating if any */}
              {reviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => document.getElementById('tool-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex items-center gap-2 mb-4 text-left hover:opacity-80 transition-opacity cursor-pointer"
                  aria-label={`Jump to ${reviews.length} reviews`}
                >
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} className={`w-4 h-4 ${s <= flameRating ? 'text-[#22c55e]' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">{reviewAvg}/5 · {reviewsLabel(reviews.length)}</span>
                </button>
              )}

              <div className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 space-y-4">
                {splitDescriptionParagraphs(description).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              {tool.slug === 'aislutbot-ai-nude-generator' && (
                <AislutCryptoOffer className="mb-6" />
              )}

              {(() => {
                const memoryPeers = getMemoryPeers(tool.slug);
                if (!memoryPeers) return null;
                return (
                  <section className="mb-8 rounded-2xl border border-white/10 bg-[#0d0d0d] px-4 sm:px-6 py-5 sm:py-6">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1.5">
                      {tool.name} Conversation &amp; Memory strength
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">
                      What our peers say about the conversation and memory strength
                    </p>
                    <ul className="space-y-4">
                      {memoryPeers.map((peer, i) => (
                        <li key={`${peer.peer}-${i}`} className="text-gray-300 text-sm sm:text-base leading-relaxed">
                          <p className="mb-1.5">&ldquo;{peer.text}&rdquo;</p>
                          <a
                            href={peer.homepage}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#22c55e] font-semibold hover:underline"
                          >
                            {peer.peer}
                            <span aria-hidden className="text-[10px] opacity-70">↗</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })()}

              <div className="mb-8 flex justify-center">
                <button
                  onClick={handleVisit}
                  disabled={isRedirecting}
                  className={ainsfwCtaButtonClass('full', 'max-w-md')}
                >
                  {isRedirecting ? t('ainsfw.opening', 'Opening...') : tryFree(tool.name)}
                </button>
              </div>

              {!fullReview && listingBlocks && hasProsCons(tool.slug) && (
                <ToolProsConsSkeleton pros={listingBlocks.pros} cons={listingBlocks.cons} />
              )}

              {AINSFW_TOOL_ARTICLE_LINKS[tool.slug] && (() => {
                const article = AINSFW_TOOL_ARTICLE_LINKS[tool.slug];
                return (
                  <Link
                    href={`/blog/${article.slug}`}
                    className="block mb-8 group rounded-2xl border border-[#22c55e]/25 bg-[#0a1f12]/90 overflow-hidden hover:border-[#22c55e]/50 hover:shadow-[0_20px_50px_-24px_rgba(34,197,94,0.45)] transition-all shadow-lg"
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative w-full sm:w-56 md:w-64 aspect-[16/10] sm:aspect-auto sm:min-h-[168px] shrink-0 bg-[#111]">
                        <img
                          src={article.image}
                          alt={article.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a1f12]/80 sm:block hidden pointer-events-none" aria-hidden />
                      </div>
                      <div className="p-4 sm:p-5 flex flex-col justify-center min-w-0 flex-1 border-t sm:border-t-0 sm:border-l border-[#22c55e]/15">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22c55e] text-black text-[9px] font-black uppercase tracking-[0.14em]">
                            Editorial Article
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#22c55e]/80">
                            Erogram Blog
                          </span>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-white/45 mb-1.5">
                          Featuring {tool.name}
                        </p>
                        <h3 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-[#22c55e] transition-colors line-clamp-2 mb-3">
                          {article.title}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 text-sm font-black text-[#22c55e] group-hover:gap-2.5 transition-all">
                          Read the full article
                          <span aria-hidden>→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })()}

              {fullReview && (
                <section className="mt-16 sm:mt-20 mb-10 scroll-mt-28">
                  <div className="rounded-2xl border border-[#22c55e]/20 bg-[#0a1f12]/90 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.55)] px-5 sm:px-8 lg:px-10 py-10 sm:py-12">
                    <div className="text-center mb-8 sm:mb-10">
                      <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[0.95] tracking-tight">
                        Erogram Review
                      </h2>
                    </div>

                  {reviewAuthor && <ReviewAuthorMini author={reviewAuthor} />}

                  <ReviewCta
                    onClick={handleVisit}
                    disabled={isRedirecting}
                    toolName={tool.name}
                  />

                  <div className="space-y-8">
                    {tool.slug === 'aislutbot-ai-nude-generator' ? (
                      <AislutReviewIntro />
                    ) : fullReview.sections.length > 0 && fullReview.sections[0].body.trim() ? (
                      <div className="space-y-4 mb-2">
                        {renderReviewParagraphs(
                          fullReview.sections[0].body.split(/\n\n+/).filter(Boolean),
                          reviewInsertCtx.current,
                          reviewInsertGallery,
                          tool,
                          {
                            ...reviewInsertOpts,
                            keyPrefix: `${tool.slug}-intro`,
                            textClassName: 'text-gray-200 text-lg sm:text-xl leading-relaxed',
                          },
                        )}
                      </div>
                    ) : null}

                    <ReviewGlossary
                      toolSlug={tool.slug}
                      items={[
                        ...fullReview.featureHighlights.map((item) => ({ heading: item.title })),
                        ...fullReview.sections.slice(1).map((section) => ({ heading: section.heading })),
                      ]}
                    />

                    {fullReview.featureHighlights.map((item) => {
                      const sectionId = reviewSectionId(tool.slug, item.title);
                      return (
                      <section key={sectionId} id={sectionId} className="scroll-mt-28">
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">{item.title}</h2>
                        <div className="space-y-3">
                          {renderReviewParagraphs(
                            item.body.split(/\n\n+/).filter(Boolean),
                          reviewInsertCtx.current,
                          reviewInsertGallery,
                          tool,
                          {
                            ...reviewInsertOpts,
                            keyPrefix: `${tool.slug}-${sectionId}`,
                            textClassName: 'text-gray-300 text-base sm:text-lg leading-relaxed',
                          },
                        )}
                      </div>
                      {item.title === 'What Lovescape Does' &&
                          listingBlocks?.keyFeatures &&
                          listingBlocks.keyFeatures.length > 0 && (
                          <ToolKeyFeatures features={listingBlocks.keyFeatures} />
                        )}
                      </section>
                      );
                    })}
                    {fullReview.sections.slice(1).map((section) => {
                      const sectionId = reviewSectionId(tool.slug, section.heading);
                      const isFinalVerdict = /final verdict/i.test(section.heading);
                      const aislutLastVideo = tool.slug === 'aislutbot-ai-nude-generator' && section.heading === 'Privacy'
                        ? exampleVideos?.[1]
                        : undefined;
                      return (
                      <div key={sectionId}>
                        {aislutLastVideo && (
                          <ReviewInsertBlock>
                            <div className="w-[60vw] max-w-[60vw] flex-none mx-auto lg:w-full lg:max-w-sm">
                              <ToolPreviewVideoBlock
                                mp4={aislutLastVideo.mp4}
                                poster={aislutLastVideo.poster}
                                toolName={tool.name}
                                toolCategory={tool.category}
                                posterAlt={pickTagHashtagAlt(tool.tags, 2)}
                                onVisit={handleVisit}
                                isRedirecting={isRedirecting}
                                largeReviewCta
                              />
                            </div>
                          </ReviewInsertBlock>
                        )}
                        {isFinalVerdict && listingBlocks && hasProsCons(tool.slug) && (
                          <ToolProsConsSkeleton pros={listingBlocks.pros} cons={listingBlocks.cons} />
                        )}
                        {/how does it work/i.test(section.heading) && (
                          <div className="flex justify-center my-6">
                            <button
                              onClick={handleVisit}
                              disabled={isRedirecting}
                              className={ainsfwCtaButtonClass('md')}
                            >
                              {isRedirecting ? t('ainsfw.opening', 'Opening...') : tryForFree(tool.name)}
                            </button>
                          </div>
                        )}
                        <section id={sectionId} className="scroll-mt-28">
                          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">{section.heading}</h2>
                          {tool.slug === 'aislutbot-ai-nude-generator' && section.heading === 'Pricing and Stars' ? (
                            <AislutPricingBlock />
                          ) : (
                          <div className="space-y-3">
                            {renderReviewParagraphs(
                              section.body.split(/\n\n+/).filter(Boolean),
                              reviewInsertCtx.current,
                              reviewInsertGallery,
                              tool,
                              {
                                ...reviewInsertOpts,
                                keyPrefix: `${tool.slug}-${sectionId}`,
                                textClassName: 'text-gray-300 text-base sm:text-lg leading-relaxed',
                              },
                            )}
                          </div>
                          )}
                          {tool.slug === 'aislutbot-ai-nude-generator' && section.heading === 'Pricing and Stars' && (
                            <AislutCryptoOffer className="mt-4" />
                          )}
                        </section>
                      </div>
                      );
                    })}
                  </div>

                  {reviewAuthor && <ReviewAuthorBox author={reviewAuthor} />}

                  </div>
                </section>
              )}

              {fullReview && (
                <div className="mb-8 flex justify-center">
                  <button
                    onClick={handleVisit}
                    disabled={isRedirecting}
                    className={ainsfwCtaButtonClass('full', 'max-w-md')}
                  >
                    {isRedirecting ? t('ainsfw.opening', 'Opening...') : tryFree(tool.name)}
                  </button>
                </div>
              )}

              <div id="tool-reviews" className="scroll-mt-28">
              <FlameReviewSection
                entityName={tool.name}
                variant="green"
                reviews={reviews.map((r) => ({
                  authorName: r.authorName,
                  authorAvatar: r.authorAvatar,
                  rating: r.rating,
                  text: r.text,
                  createdAt: r.createdAt,
                }))}
                loginHref={`/join-erogram?redirect=/ainsfw/${tool.slug}`}
                onSubmit={handleFlameReviewSubmit}
                successTitle="Your review is live!"
                successSubtitle={`Thanks for rating ${tool.name}`}
                requireText
              />
              </div>

              {featuredHubTools.length > 0 && (
                <TopAINsfwBlock
                  tools={featuredHubTools}
                  featuredHubSlugs={featuredHubSlugs}
                  allStats={featuredHubStats}
                  onVoteChange={handleFeaturedVoteChange}
                  verifiedSlugs={verifiedSlugs}
                />
              )}

            </motion.div>
          </div>
        </div>

        {/* AI NSFW Articles — internal link building + richer content */}
        {aiArticles.length > 0 && (
          <section className="mt-12 border-t border-white/5 pt-10">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{t('ainsfw.articlesTitle', 'AI NSFW Articles & Guides')}</h2>
                <p className="text-gray-400 text-sm">{t('ainsfw.articlesSub', 'In-depth reviews, comparisons and how-tos')}</p>
              </div>
              <Link href={lp('/blog/category/ai-nsfw')} className="text-xs font-bold text-[#22c55e] hover:underline">{t('ainsfw.allAiArticles', 'All AI articles →')}</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiArticles.map((article, i) => (
                <Link key={i} href={`/blog/${article.slug}`} className="group block bg-[#111] rounded-xl border border-white/10 overflow-hidden hover:border-[#22c55e]/50 transition-all">
                  {article.featuredImage ? (
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-28 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-28 bg-gradient-to-br from-[#1a2a1f] to-black" />
                  )}
                  <div className="p-3">
                    <div className="text-[10px] font-black tracking-[1px] uppercase text-[#22c55e] mb-1">AI NSFW</div>
                    <h4 className="font-bold text-sm leading-tight group-hover:text-[#22c55e] line-clamp-2">{article.title}</h4>
                    {article.excerpt && (
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{article.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 border-t border-white/5 pt-10">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">{t('ainsfw.browseCategories', 'Browse AI NSFW Categories')}</h2>
          <p className="text-gray-400 text-sm mb-5">{t('ainsfw.browseCategoriesSub', 'Explore tools by type on Erogram')}</p>
          <div className="flex flex-wrap gap-2">
            {AINSFW_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
              <Link
                key={cat}
                href={lp(`/ainsfw/${categoryToSlug(cat)}`)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/15 text-sm font-black hover:bg-white/15 hover:border-[#22c55e]/40 transition-all"
              >
                {catLabel(cat)}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <img
            src={lightboxSrc}
            alt={pickTagHashtagAlt(tool.tags, 0)}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {isAdmin && !adminEdit && <ToolDetailAdminFab onEdit={() => setAdminEdit(true)} />}

      {isAdmin && adminEdit && (
        <ToolDetailAdminPanel
          tool={{ ...tool, tryNowUrl: visitUrl }}
          initialStats={initialStats}
          gallery={gallery}
          featuredImage={imageSrc === placeholder ? '' : imageSrc}
          onGalleryChange={setGallery}
          onFeaturedChange={(url) => setImageSrc(url || placeholder)}
          onDescriptionChange={setDescription}
          onTryNowUrlChange={setVisitUrl}
          onVotesChange={(up, down) => setVotes({ up, down })}
          onClose={() => setAdminEdit(false)}
        />
      )}
    </div>
  );
}
