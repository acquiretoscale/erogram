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
import { AINSFW_GALLERY } from '@/app/ainsfw/galleryMap';
import { AINSFW_TOOL_PREVIEW_VIDEOS } from '@/lib/ainsfw/toolPreviewVideos';
import { ainsfwCtaButtonClass } from '@/lib/ainsfw/ctaButton';
import ToolProsConsSkeleton from '@/components/ainsfw/ToolProsConsSkeleton';
import ToolKeyFeatures from '@/components/ainsfw/ToolKeyFeatures';
import AinsfwVideoListingBadge from '@/components/ainsfw/AinsfwVideoListingBadge';
import TopAINsfwBlock from '../TopAINsfwBlock';
import { hasProsCons, type AINsfwListingBlocks } from '../listingBlocks';

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
  'Crypto': '₿',
  'PayPal': '🅿',
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

function ReviewCta({
  onClick,
  disabled,
  toolName,
}: {
  onClick: () => void;
  disabled: boolean;
  toolName: string;
}) {
  return (
    <div className="mb-8 flex justify-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className={ainsfwCtaButtonClass('md')}
      >
        {disabled ? 'Opening...' : `TRY ${toolName} FREE`}
      </button>
    </div>
  );
}

type ReviewInsertCtx = { galleryIdx: number; paragraphCount: number };

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
  return (
    <button
      type="button"
      onClick={onVisit}
      disabled={isRedirecting}
      className={ainsfwCtaButtonClass(forVideo ? 'videoLg' : 'lg')}
    >
      {isRedirecting ? 'Opening...' : forVideo ? `TRY ${toolName}` : `TRY ${toolName} for free`}
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
      className={`relative rounded-xl overflow-hidden border border-white/10 cursor-pointer ${className}`.trim()}
      onClick={onVisit}
      role="link"
      tabIndex={0}
      title={hoverTitle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onVisit(); } }}
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
          Video Made with {toolName}
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
            {isRedirecting ? 'Opening...' : `TRY ${toolName}`}
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
    isRedirecting: boolean;
    previewVideo?: { mp4: string; poster?: string };
  },
): ReactNode[] {
  const nodes: ReactNode[] = [];
  paragraphs.forEach((para, i) => {
    ctx.paragraphCount += 1;
    nodes.push(
      <p key={`${opts.keyPrefix}-p-${i}`} className={opts.textClassName}>
        {para}
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
      } else if (gallery.length > 0) {
      const imgIdx = ctx.galleryIdx % gallery.length;
      ctx.galleryIdx += 1;
      nodes.push(
        <ReviewInsertBlock key={`${opts.keyPrefix}-insert-${i}`}>
          <button
            type="button"
            onClick={opts.onVisit}
            className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/10 hover:border-[#22c55e]/40 transition-all cursor-pointer"
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
  const placeholder = '/assets/image.jpg';
  const [imageSrc, setImageSrc] = useState(
    tool.image && (tool.image.startsWith('https://') || tool.image.startsWith('/'))
      ? tool.image : placeholder
  );
  const [description, setDescription] = useState(tool.description);

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

    // Fetch processed gallery images
    setGalleryLoading(true);
    fetch(`/api/ainsfw/images?slug=${encodeURIComponent(tool.slug)}&name=${encodeURIComponent(tool.name)}&vendor=${encodeURIComponent(tool.vendor)}`)
      .then(r => r.json())
      .then(d => { if (d.images?.length) setGallery(d.images.slice(0, 8)); })
      .catch(() => {})
      .finally(() => setGalleryLoading(false));
  }, [tool.slug, tool.name, tool.vendor]);

  useEffect(() => {
    setImageSrc(
      tool.image && (tool.image.startsWith('https://') || tool.image.startsWith('/'))
        ? tool.image : placeholder
    );
    setDescription(tool.description);
  }, [tool.image, tool.description]);

  const handleVisit = () => {
    setIsRedirecting(true);
    void trackAinsfwToolClick(tool.slug);
    window.open(tool.tryNowUrl, '_blank', 'noopener');
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
  const reviewGallery = gallery.length > 0 ? gallery : (AINSFW_GALLERY[tool.slug] || []);
  const previewVideo = AINSFW_TOOL_PREVIEW_VIDEOS[tool.slug];
  const reviewInsertCtx = useRef<ReviewInsertCtx>({ galleryIdx: 0, paragraphCount: 0 });

  if (fullReview) {
    reviewInsertCtx.current.galleryIdx = 0;
    reviewInsertCtx.current.paragraphCount = 0;
  }

  const reviewInsertOpts = {
    onVisit: handleVisit,
    isRedirecting,
    previewVideo,
  };

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-[#f5f5f5] font-sans overflow-x-hidden">
      <Navbar />

      {/* Breadcrumb */}
      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <nav className="flex items-center flex-wrap text-xs text-gray-500 gap-1.5 min-w-0">
            <Link href="/" className="hover:text-white transition-colors shrink-0">Home</Link>
            <span className="shrink-0">/</span>
            <Link href="/ainsfw" className="hover:text-white transition-colors shrink-0">AI NSFW Tools</Link>
            <span className="shrink-0">/</span>
            <Link href={`/ainsfw/${categoryToSlug(tool.category)}`} className="text-gray-400 hover:text-white transition-colors truncate max-w-[120px]">{tool.category}</Link>
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
                        {tool.category}
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
                    {isRedirecting ? 'Opening...' : `TRY ${tool.name} FREE`}
                  </button>
                </div>
                )}

                {/* Quick stats grid */}
                <div className="p-4 grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-xl border border-white/10 p-2.5 text-center">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Plan</div>
                    <div className="text-xs font-bold text-white leading-tight">{tool.subscription}</div>
                  </div>
                  <div className="bg-white/5 rounded-xl border border-white/10 p-2.5 text-center">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Vendor</div>
                    <div className="text-xs font-bold text-white truncate leading-tight">{tool.vendor}</div>
                  </div>
                  <div className="col-span-2 bg-white/5 rounded-xl border border-white/10 p-2.5">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Accepts</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tool.payment.length > 0 ? tool.payment.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-[10px] font-black text-white">
                          {PAYMENT_ICON[p] || '💰'} {p}
                        </span>
                      )) : (
                        <span className="text-xs text-gray-400">Not specified</span>
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
                  {reviews.length} review{reviews.length !== 1 ? 's' : ''}
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
                          onClick={handleVisit}
                          className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5 hover:border-white/20 transition-all group cursor-pointer"
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
                  <span className="text-gray-400 text-sm">{reviewAvg}/5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                </button>
              )}

              <div className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 space-y-4">
                {splitDescriptionParagraphs(description).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              <div className="mb-8 flex justify-center">
                <button
                  onClick={handleVisit}
                  disabled={isRedirecting}
                  className={ainsfwCtaButtonClass('full', 'max-w-md')}
                >
                  {isRedirecting ? 'Opening...' : `TRY ${tool.name} FREE`}
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
                    {fullReview.sections.length > 0 && (
                      <div className="space-y-4 mb-2">
                        {renderReviewParagraphs(
                          fullReview.sections[0].body.split(/\n\n+/).filter(Boolean),
                          reviewInsertCtx.current,
                          reviewGallery,
                          tool,
                          {
                            ...reviewInsertOpts,
                            keyPrefix: `${tool.slug}-intro`,
                            textClassName: 'text-gray-200 text-lg sm:text-xl leading-relaxed',
                          },
                        )}
                      </div>
                    )}

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
                            reviewGallery,
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
                      return (
                      <div key={sectionId}>
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
                              {isRedirecting ? 'Opening...' : `TRY ${tool.name} for free`}
                            </button>
                          </div>
                        )}
                        <section id={sectionId} className="scroll-mt-28">
                          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">{section.heading}</h2>
                          <div className="space-y-3">
                            {renderReviewParagraphs(
                              section.body.split(/\n\n+/).filter(Boolean),
                              reviewInsertCtx.current,
                              reviewGallery,
                              tool,
                              {
                                ...reviewInsertOpts,
                                keyPrefix: `${tool.slug}-${sectionId}`,
                                textClassName: 'text-gray-300 text-base sm:text-lg leading-relaxed',
                              },
                            )}
                          </div>
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
                    {isRedirecting ? 'Opening...' : `TRY ${tool.name} FREE`}
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
                <h2 className="text-xl sm:text-2xl font-black text-white">AI NSFW Articles &amp; Guides</h2>
                <p className="text-gray-400 text-sm">In-depth reviews, comparisons and how-tos</p>
              </div>
              <Link href="/blog/category/ai-nsfw" className="text-xs font-bold text-[#22c55e] hover:underline">All AI articles →</Link>
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
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Browse AI NSFW Categories</h2>
          <p className="text-gray-400 text-sm mb-5">Explore tools by type on Erogram</p>
          <div className="flex flex-wrap gap-2">
            {AINSFW_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
              <Link
                key={cat}
                href={`/ainsfw/${categoryToSlug(cat)}`}
                className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/15 text-sm font-black hover:bg-white/15 hover:border-[#22c55e]/40 transition-all"
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {isAdmin && !adminEdit && <ToolDetailAdminFab onEdit={() => setAdminEdit(true)} />}

      {isAdmin && adminEdit && (
        <ToolDetailAdminPanel
          tool={tool}
          initialStats={initialStats}
          gallery={gallery}
          featuredImage={imageSrc === placeholder ? '' : imageSrc}
          onGalleryChange={setGallery}
          onFeaturedChange={(url) => setImageSrc(url || placeholder)}
          onDescriptionChange={setDescription}
          onVotesChange={(up, down) => setVotes({ up, down })}
          onClose={() => setAdminEdit(false)}
        />
      )}
    </div>
  );
}
