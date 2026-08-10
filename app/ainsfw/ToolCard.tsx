'use client';

import { useTranslation } from '@/lib/i18n/client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { AINsfwTool } from './types';
import { voteOnTool, unvoteOnTool, submitReview } from '@/lib/actions/ainsfw';
import type { ToolReviewData } from '@/lib/actions/ainsfw';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { trackClick, trackImpression } from '@/lib/actions/campaigns';
import { pickTagHashtagAlt } from '@/lib/ainsfw/imageAlt';
import { resolveGallery } from '@/lib/ainsfw/toolContent';
import { AINSFW_TOOL_PREVIEW_VIDEOS } from '@/lib/ainsfw/toolPreviewVideos';
import { requestHubVideoPlay, releaseHubVideoPlay } from '@/lib/ainsfw/hubVideoPlayManager';
import VerifiedBadge, { AINSFW_VERIFIED_TOOLTIP } from '@/components/VerifiedBadge';
import AinsfwVideoListingBadge from '@/components/ainsfw/AinsfwVideoListingBadge';
import { ainsfwCtaButtonClass } from '@/lib/ainsfw/ctaButton';

// PAUSED (2026-07-24, owner order) — see AdvertCard.tsx. Flip to false to resume.
const IMPRESSION_TRACKING_PAUSED = true;

interface ToolCardProps {
  tool: AINsfwTool;
  index: number;
  initialStats?: ToolStatsData;
  onVoteChange?: (slug: string, score: number) => void;
  featured?: boolean;
  campaignId?: string;
  primaryImageAlt?: string;
  verified?: boolean;
  light?: boolean;
}

const CATEGORY_BADGE: Record<string, string> = {
  'AI Companion': 'bg-blue-700 text-white',
  'Undress AI': 'bg-slate-700 text-white',
  'AI Sexting / Chat': 'bg-emerald-700 text-white',
  'AI NSFW Image Generator': 'bg-amber-600 text-white',
  'AI Porn Generator': 'bg-rose-700 text-white',
  'AI NSFW Roleplay': 'bg-zinc-800 text-white',
  'Adult Games': 'bg-purple-800 text-white',
};

function getBookmarkKey(slug: string) { return `ainsfw_bookmark_${slug}`; }

const VERIFIED_NAME_BADGE_CLS = 'w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0';

/** Cap a description to N words (default 18) so card previews stay short + uniform. */
function capWords(text: string, max = 18): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text;
  return words.slice(0, max).join(' ') + '…';
}

/** Lazy hub-card video (same activate/play pattern as LazyClickableVideoAd). */
function ToolCardPreviewVideo({
  slug,
  mp4,
  poster,
  alt,
  title,
  eager = false,
}: {
  slug: string;
  mp4: string;
  poster?: string;
  alt: string;
  title: string;
  eager?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activatedRef = useRef(false);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let cancelled = false;

    const activate = () => {
      if (cancelled || activatedRef.current) return;
      activatedRef.current = true;
      setSrc(mp4);
    };

    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) activate(); },
      { rootMargin: '240px' },
    );
    io.observe(el);
    el.addEventListener('mouseenter', activate, { once: true });

    return () => {
      cancelled = true;
      io.disconnect();
      releaseHubVideoPlay(slug);
    };
  }, [mp4, slug]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
    const v = videoRef.current;
    const play = () => {
      requestHubVideoPlay(slug, v);
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    };
    play();
    if (v.readyState < 2) v.addEventListener('loadeddata', play, { once: true });
    return () => {
      v.pause();
      releaseHubVideoPlay(slug);
    };
  }, [src, slug]);

  return (
    <div ref={wrapRef} data-ainsfw-hub-video={slug} className="relative w-full h-full overflow-hidden bg-black">
      {poster ? (
        <img
          src={poster}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-75 saturate-125 pointer-events-none"
        />
      ) : null}
      {poster && !playing ? (
        <img
          src={poster}
          alt={alt}
          title={title}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      ) : null}
      <video
        ref={videoRef}
        {...(src ? { src } : {})}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ opacity: playing ? 1 : 0, transition: 'opacity 300ms' }}
      />
    </div>
  );
}

export default function ToolCard({ tool, index, initialStats, onVoteChange, featured, campaignId, verified = false, light = false }: ToolCardProps) {
  const { t } = useTranslation();
  const imageHoverTitle = `${tool.name} - ${tool.category}`;
  const galleryImageAlt = (idx: number) => pickTagHashtagAlt(tool.tags, idx);
  const placeholder = '/assets/image.jpg';
  const mainImg = tool.image && (tool.image.startsWith('https://') || tool.image.startsWith('/'))
    ? tool.image : placeholder;
  const previewVideo = AINSFW_TOOL_PREVIEW_VIDEOS[tool.slug];
  const curatedGallery = resolveGallery(tool.slug, {
    customGallery: initialStats?.customGallery,
    hiddenGalleryUrls: initialStats?.hiddenGalleryUrls,
    galleryManaged: initialStats?.galleryManaged,
  });
  const hasCuratedGallery = curatedGallery.length > 0;
  const hasLogo = mainImg !== placeholder;

  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Gallery carousel — curated R2 previews only (no auto-scrape)
  const [gallery] = useState<string[]>(() =>
    hasCuratedGallery ? curatedGallery : [mainImg],
  );
  const [slideIdx, setSlideIdx] = useState(0);
  const touchStartX = useRef(0);

  const [votes, setVotes] = useState({ up: initialStats?.upvotes ?? 0, down: initialStats?.downvotes ?? 0 });
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviews, setReviews] = useState<ToolReviewData[]>(initialStats?.reviews ?? []);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    try {
      const savedVote = localStorage.getItem(`ainsfw_vote_${tool.slug}`) as 'up' | 'down' | null;
      if (savedVote) setUserVote(savedVote);
      setBookmarked(localStorage.getItem(getBookmarkKey(tool.slug)) === '1');
      setIsLoggedIn(!!localStorage.getItem('token'));
    } catch {}
  }, [tool.slug]);

  const impressionTracked = useRef(false);
  useEffect(() => {
    if (!cardRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { setIsInView(true); obs.disconnect(); } }); },
      { rootMargin: '300px', threshold: 0.01 }
    );
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!IMPRESSION_TRACKING_PAUSED && isInView && featured && campaignId && !impressionTracked.current) {
      impressionTracked.current = true;
      trackImpression(campaignId);
    }
  }, [isInView, featured, campaignId]);

  const handleFeaturedClick = useCallback(() => {
    if (featured && campaignId) trackClick(campaignId, 'ainsfw-featured');
  }, [featured, campaignId]);

  const renderCardMedia = (opts: { eager?: boolean; imgClassName?: string }) => {
    if (!isInView) return null;
    return (
      <img
        key={currentSrc}
        src={currentSrc}
        alt={galleryImageAlt(slideIdx)}
        title={imageHoverTitle}
        className={opts.imgClassName ?? 'w-full h-full object-cover transition-opacity duration-300'}
        loading={index < 8 ? 'eager' : 'lazy'}
        onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
      />
    );
  };

  const isVideoCard = !!previewVideo;
  const hubPreviewVideo = previewVideo ? (
    <ToolCardPreviewVideo
      slug={tool.slug}
      mp4={previewVideo.mp4}
      poster={previewVideo.poster}
      alt={galleryImageAlt(0)}
      title={imageHoverTitle}
      eager={index < 8}
    />
  ) : null;
  const videoCardGradient = isVideoCard ? (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[68%] bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      aria-hidden
    />
  ) : null;

  const goSlide = useCallback((dir: 1 | -1, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setSlideIdx(prev => {
      const next = prev + dir;
      if (next < 0) return gallery.length - 1;
      if (next >= gallery.length) return 0;
      return next;
    });
  }, [gallery.length]);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) goSlide(dx < 0 ? 1 : -1);
  };

  const handleVote = async (e: React.MouseEvent, dir: 'up' | 'down') => {
    e.preventDefault();
    e.stopPropagation();
    if (userVote === dir) {
      setUserVote(null);
      localStorage.setItem(`ainsfw_vote_${tool.slug}`, '');
      const result = await unvoteOnTool(tool.slug, dir);
      setVotes({ up: result.upvotes, down: result.downvotes });
      onVoteChange?.(tool.slug, result.upvotes - result.downvotes);
    } else {
      if (userVote) await unvoteOnTool(tool.slug, userVote);
      setUserVote(dir);
      localStorage.setItem(`ainsfw_vote_${tool.slug}`, dir);
      const result = await voteOnTool(tool.slug, dir);
      setVotes({ up: result.upvotes, down: result.downvotes });
      onVoteChange?.(tool.slug, result.upvotes - result.downvotes);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !bookmarked;
    setBookmarked(next);
    try { localStorage.setItem(getBookmarkKey(tool.slug), next ? '1' : '0'); } catch {}
  };

  const handleReviewOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      window.open(`/join-erogram?redirect=/ainsfw/${tool.slug}`, '_blank', 'noopener,noreferrer');
      return;
    }
    setShowReview(true);
  };

  const handleReviewSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!reviewText.trim()) return;
    setReviewError('');
    const token = localStorage.getItem('token') || '';
    if (!token) {
      window.open(`/join-erogram?redirect=/ainsfw/${tool.slug}`, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const result = await submitReview(tool.slug, reviewText.trim(), reviewRating, token);
      setReviewSubmitted(true);
      setReviewError(result.message);
      setTimeout(() => { setShowReview(false); setReviewText(''); setReviewRating(5); setReviewSubmitted(false); setReviewError(''); }, 2500);
    } catch (err: any) {
      setReviewError(err?.message || 'Could not submit review');
    }
  };

  const score = votes.up - votes.down;
  const badge = CATEGORY_BADGE[tool.category] || 'bg-gray-700 text-white';
  const btnCls = ainsfwCtaButtonClass('card');
  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  const currentSrc = gallery[slideIdx] || mainImg;

  const showLogoBadge = hasLogo && (isVideoCard || hasCuratedGallery);
  const slideCountRight = showLogoBadge && !isVideoCard ? 'right-[4.5rem]' : 'right-10';
  const logoBadgeEl = showLogoBadge ? (
    <AinsfwVideoListingBadge
      src={mainImg}
      alt={`${tool.name} logo`}
      title={imageHoverTitle}
      className="w-5 h-5 sm:w-6 sm:h-6"
    />
  ) : null;
  const galleryLogoOverlay = !isVideoCard && logoBadgeEl ? (
    <div className="absolute top-1.5 right-1.5 z-30 pointer-events-none">
      {logoBadgeEl}
    </div>
  ) : null;
  const videoNicheOverlay = isVideoCard ? (
    <div className={`absolute left-1.5 z-30 pointer-events-none max-w-[55%]${featured ? ' top-9' : ' top-1.5'}`}>
      <span className={`${badge} text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-black/20 shadow-lg truncate block`}>
        {tool.category}
      </span>
    </div>
  ) : null;
  const videoLogoOverlay = isVideoCard && logoBadgeEl ? (
    <div className="absolute top-1.5 right-1.5 z-30 pointer-events-none">
      {logoBadgeEl}
    </div>
  ) : null;

  const cardShell = light
    ? 'relative bg-white rounded-xl overflow-hidden h-full flex flex-col border border-black/10 hover:border-[#22c55e]/50 shadow-sm transition-all duration-150 group'
    : 'relative bg-[#111] rounded-xl overflow-hidden h-full flex flex-col border border-white/10 hover:border-[#22c55e]/50 transition-all duration-150 group';
  const imageShell = light ? 'relative w-full h-[154px] sm:h-[173px] overflow-hidden bg-gray-100 shrink-0' : 'relative w-full h-[154px] sm:h-[173px] overflow-hidden bg-[#0a0a0a] shrink-0';
  const titleCls = light
    ? 'text-xs sm:text-sm font-black text-gray-900 mb-0.5 leading-tight truncate group-hover:text-[#22c55e] transition-colors flex items-center gap-1 min-w-0'
    : 'text-xs sm:text-sm font-black text-white mb-0.5 leading-tight truncate group-hover:text-[#22c55e] transition-colors flex items-center gap-1 min-w-0';
  const descCls = light
    ? 'text-gray-600 text-[10px] sm:text-xs line-clamp-2 leading-relaxed flex-grow mb-2'
    : 'text-white/70 text-[10px] sm:text-xs line-clamp-2 leading-relaxed flex-grow mb-2';
  const reviewCountCls = light ? 'text-[9px] text-gray-500' : 'text-[9px] text-white/50';
  const dividerCls = light
    ? 'flex items-center justify-between gap-2 pt-1.5 border-t border-black/10 mb-2'
    : 'flex items-center justify-between gap-2 pt-1.5 border-t border-white/10 mb-2';
  const voteIdleCls = light ? 'bg-gray-100 text-gray-500' : 'bg-white/10 text-white/50';
  const scoreNeutralCls = light ? 'bg-gray-100 text-gray-400' : 'bg-white/5 text-white/30';
  const starEmptyCls = light ? 'text-gray-200' : 'text-white/20';

  const inlineReviews = reviews.length > 0 ? (
    <div className="flex items-center gap-1 shrink-0 ml-auto pl-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} className={`w-2.5 h-2.5 ${s <= avgRating ? 'text-[#22c55e]' : starEmptyCls}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        ))}
      </div>
      <span className={reviewCountCls}>({reviews.length})</span>
    </div>
  ) : null;

  /* ─── FEATURED: completely different dark premium card ─── */
  if (featured) {
    return (
      <>
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.04 }}
          className="h-full"
        >
          <Link href={`/ainsfw/${tool.slug}`} className="block h-full" onClick={handleFeaturedClick}>
            <div
              ref={cardRef}
              className="group relative h-full rounded-xl overflow-hidden border border-white/10 hover:border-[#22c55e]/40 transition-all flex flex-col bg-[#0a0a0a]"
            >
              <div className="relative w-full h-[154px] sm:h-[173px] overflow-hidden bg-[#0a0a0a] shrink-0">
                {isVideoCard ? hubPreviewVideo : (
                  <>
                    <div
                      className="relative w-full h-full"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                    >
                      {renderCardMedia({ imgClassName: 'w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out' })}

                      {gallery.length > 1 && (
                        <>
                          <button onClick={(e) => goSlide(-1, e)} className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">‹</button>
                          <button onClick={(e) => goSlide(1, e)} className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">›</button>
                        </>
                      )}

                      {gallery.length > 1 && (
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                          {gallery.map((_, i) => (
                            <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSlideIdx(i); }} className={`w-1.5 h-1.5 rounded-full transition-all ${i === slideIdx ? 'bg-white scale-125' : 'bg-white/30'}`} />
                          ))}
                        </div>
                      )}

                      {gallery.length > 1 && (
                        <div className={`absolute top-1.5 ${slideCountRight} z-20 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded`}>
                          {slideIdx + 1}/{gallery.length}
                        </div>
                      )}

                      {galleryLogoOverlay}
                    </div>
                  </>
                )}
              </div>

              {videoCardGradient}

              <div className="absolute top-1.5 left-1.5 z-20 flex flex-col gap-1 items-start">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#22c55e] text-black text-[9px] font-black uppercase tracking-widest">
                  <svg className="w-2 h-2" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3a2 2 0 01-2 2H7a2 2 0 01-2-2v-1h14v1z"/></svg>
                  {t('ainsfw.featured', 'Featured')}
                </span>
              </div>

              {videoNicheOverlay}
              {videoLogoOverlay}

              <div className="p-2.5 sm:p-3 flex flex-col flex-grow relative z-[5]">
                <h3 className="text-xs sm:text-sm font-black text-white mb-0.5 leading-tight truncate group-hover:text-[#FF8C3A] transition-colors flex items-center gap-1 min-w-0">
                  <span className="truncate">{tool.name}</span>
                  {verified && <VerifiedBadge className={VERIFIED_NAME_BADGE_CLS} tooltip={AINSFW_VERIFIED_TOOLTIP} />}
                </h3>

                {/* Description — hard-capped to ~18 words (string-level) + 2-line clamp for a tidy, uniform preview */}
                <p className="text-white/70 text-[10px] sm:text-xs line-clamp-2 leading-relaxed flex-grow mb-2">
                  {capWords(tool.description)}
                </p>

                {/* Votes + reviews row */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.08] mb-2 gap-2">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleVote(e, 'up')}
                      title="Upvote"
                      className={`flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold transition-all ${
                        userVote === 'up'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-white/[0.08] text-white/50 hover:bg-green-500/20 hover:text-green-300'
                      }`}
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4z"/></svg>
                    </button>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      score > 0 ? 'bg-green-500/20 text-green-300' :
                      score < 0 ? 'bg-red-500/20 text-red-300' :
                      'bg-white/[0.06] text-white/30'
                    }`}>
                      {score > 0 ? `+${score}` : score}
                    </span>
                    <button
                      onClick={(e) => handleVote(e, 'down')}
                      title="Downvote"
                      className={`flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold transition-all ${
                        userVote === 'down'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-white/[0.08] text-white/50 hover:bg-red-500/20 hover:text-red-300'
                      }`}
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16z"/></svg>
                    </button>
                  </div>
                  {inlineReviews}
                </div>

                {/* CTA + bookmark */}
                <div className="flex items-center gap-2">
                  <div className={`${btnCls} cursor-pointer flex-1 text-center`}>
                    {t('ainsfw.tryNow', 'TRY NOW →')}
                  </div>
                  <button
                    onClick={handleBookmark}
                    title={bookmarked ? t('ainsfw.save', 'Save') : t('ainsfw.save', 'Save')}
                    className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                      bookmarked
                        ? 'bg-[#f43f5e]/15 border-[#f43f5e]/40 text-[#f43f5e]'
                        : 'bg-white/[0.06] border-white/10 text-white/60 hover:text-white hover:border-white/25'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Review Modal */}
        {showReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowReview(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-[#111] rounded-2xl border border-white/10 p-5 sm:p-6 w-full max-w-sm text-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-white font-black text-base">Review {tool.name}</h3>
                <button onClick={() => setShowReview(false)} className="text-white/40 hover:text-white transition-colors ml-4"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="flex gap-2 mb-4">
                {[1,2,3,4,5].map((s) => (<button key={s} onClick={() => setReviewRating(s)} className={`text-2xl leading-none transition-transform hover:scale-125 ${s <= reviewRating ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>★</button>))}
                <span className="ml-1 text-sm font-bold text-white/50 self-center">{reviewRating}/5</span>
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder={`Share your experience with ${tool.name}...`} rows={4} className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-3 text-base text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 mb-4" />
              {reviews.length > 0 && (
                <div className="mb-4 space-y-3 max-h-48 overflow-y-auto">
                  <p className="text-sm font-bold text-white/60 uppercase tracking-wide mb-1">{t('ainsfw.previousReviews', 'Previous reviews')}</p>
                  {reviews.slice(0, 5).map((r, i) => (
                    <div key={i} className="bg-white/[0.04] rounded-lg px-3 py-3 border border-white/10">
                      <div className="flex items-center gap-2 mb-1"><div className="flex">{[1,2,3,4,5].map((s) => (<svg key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-[#22c55e]' : 'text-white/30'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>))}</div><span className="text-white/40 text-xs">{r.createdAt}</span></div>
                      <p className="text-white/85 text-base leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleReviewSubmit} disabled={!reviewText.trim() || reviewSubmitted} className="w-full py-3 rounded-xl font-black text-base bg-[#22c55e] text-black active:bg-[#16a34a] transition-all disabled:opacity-40">{reviewSubmitted ? t('ainsfw.submitted', '✓ Submitted!') : t('ainsfw.submitReview', 'Submit Review')}</button>
              {reviewError && <p className={`text-xs mt-2 text-center ${reviewSubmitted ? 'text-[#22c55e]' : 'text-red-400'}`}>{reviewError}</p>}
            </motion.div>
          </div>
        )}
      </>
    );
  }

  /* ─── REGULAR card (unchanged) ─── */
  return (
    <>
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.04 }}
        className="h-full"
      >
        <Link href={`/ainsfw/${tool.slug}`} className="block h-full">
          <div
            ref={cardRef}
            className={cardShell}
          >
            <div
              className={imageShell}
              onTouchStart={isVideoCard ? undefined : handleTouchStart}
              onTouchEnd={isVideoCard ? undefined : handleTouchEnd}
            >
              {isVideoCard ? hubPreviewVideo : renderCardMedia({})}

              {!isVideoCard && gallery.length > 1 && (
                <>
                  <button onClick={(e) => goSlide(-1, e)} className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">‹</button>
                  <button onClick={(e) => goSlide(1, e)} className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">›</button>
                </>
              )}

              {!isVideoCard && gallery.length > 1 && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                  {gallery.map((_, i) => (
                    <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSlideIdx(i); }} className={`w-1.5 h-1.5 rounded-full transition-all ${i === slideIdx ? 'bg-white scale-125' : 'bg-white/30'}`} />
                  ))}
                </div>
              )}

              {!isVideoCard && gallery.length > 1 && (
                <div className={`absolute top-1.5 ${slideCountRight} z-20 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded`}>{slideIdx + 1}/{gallery.length}</div>
              )}

              {galleryLogoOverlay}
            </div>

            {videoCardGradient}

            {videoNicheOverlay}
            {videoLogoOverlay}

            {!isVideoCard && (
            <div className="absolute top-1.5 left-1.5 z-20 flex flex-col gap-1 items-start">
              <span className={`${badge} text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-black/20`}>{tool.category}</span>
            </div>
            )}

            {/* Body */}
            <div className="p-2.5 sm:p-3 flex flex-col flex-grow relative z-[5]">
              <h3 className={titleCls}>
                <span className="truncate">{tool.name}</span>
                {verified && <VerifiedBadge className={VERIFIED_NAME_BADGE_CLS} tooltip={AINSFW_VERIFIED_TOOLTIP} />}
              </h3>

              <p className={descCls}>{capWords(tool.description)}</p>

              <div className={dividerCls}>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => handleVote(e, 'up')} title="Upvote" className={`flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold transition-all ${userVote === 'up' ? 'bg-green-500 text-white' : `${voteIdleCls} hover:bg-green-500/20 hover:text-green-600`}`}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4z"/></svg>
                  </button>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${score > 0 ? 'bg-green-500/20 text-green-600' : score < 0 ? 'bg-red-500/20 text-red-500' : scoreNeutralCls}`}>
                    {score > 0 ? `+${score}` : score}
                  </span>
                  <button onClick={(e) => handleVote(e, 'down')} title="Downvote" className={`flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold transition-all ${userVote === 'down' ? 'bg-red-500 text-white' : `${voteIdleCls} hover:bg-red-500/20 hover:text-red-500`}`}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16z"/></svg>
                  </button>
                </div>
                {inlineReviews}
              </div>

              <div className="flex items-center gap-2">
                <div className={`${btnCls} cursor-pointer flex-1 text-center`}>
                  {t('ainsfw.tryNow', 'TRY NOW →')}
                </div>
                <button
                  onClick={handleBookmark}
                  title={bookmarked ? t('ainsfw.save', 'Save') : t('ainsfw.save', 'Save')}
                  className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                    bookmarked
                      ? 'bg-[#f43f5e]/15 border-[#f43f5e]/40 text-[#f43f5e]'
                      : light
                        ? 'bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300'
                        : 'bg-white/[0.06] border-white/10 text-white/60 hover:text-white hover:border-white/25'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowReview(false); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-[#111] rounded-2xl border border-white/10 p-5 sm:p-6 w-full max-w-sm text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-white font-black text-base">Review {tool.name}</h3>
                <button onClick={() => setShowReview(false)} className="text-white/40 hover:text-white transition-colors ml-4"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map((s) => (<button key={s} onClick={() => setReviewRating(s)} className={`text-2xl leading-none transition-transform hover:scale-125 ${s <= reviewRating ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>★</button>))}
              <span className="ml-1 text-sm font-bold text-white/50 self-center">{reviewRating}/5</span>
            </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder={`Share your experience with ${tool.name}...`} rows={4} className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-3 text-base text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 mb-4" />
            {reviews.length > 0 && (
              <div className="mb-4 space-y-3 max-h-48 overflow-y-auto">
                <p className="text-sm font-bold text-white/60 uppercase tracking-wide mb-1">{t('ainsfw.previousReviews', 'Previous reviews')}</p>
                {reviews.slice(0, 5).map((r, i) => (
                    <div key={i} className="bg-white/[0.04] rounded-lg px-3 py-3 border border-white/10">
                      <div className="flex items-center gap-2 mb-1"><div className="flex">{[1,2,3,4,5].map((s) => (<svg key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-[#22c55e]' : 'text-white/30'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>))}</div><span className="text-white/40 text-xs">{r.createdAt}</span></div>
                      <p className="text-white/85 text-base leading-relaxed">{r.text}</p>
                    </div>
                ))}
              </div>
            )}
            <button onClick={handleReviewSubmit} disabled={!reviewText.trim() || reviewSubmitted} className="w-full py-3 rounded-xl font-black text-base bg-[#22c55e] text-black active:bg-[#16a34a] transition-all disabled:opacity-40">{reviewSubmitted ? t('ainsfw.submitted', '✓ Submitted!') : t('ainsfw.submitReview', 'Submit Review')}</button>
            {reviewError && <p className={`text-xs mt-2 text-center ${reviewSubmitted ? 'text-[#22c55e]' : 'text-red-400'}`}>{reviewError}</p>}
          </motion.div>
        </div>
      )}
    </>
  );
}
