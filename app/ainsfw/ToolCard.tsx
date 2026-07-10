'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { AINsfwTool } from './types';
import { voteOnTool, unvoteOnTool, submitReview } from '@/lib/actions/ainsfw';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { trackClick, trackImpression } from '@/lib/actions/campaigns';

interface ToolCardProps {
  tool: AINsfwTool;
  index: number;
  initialStats?: ToolStatsData;
  onVoteChange?: (slug: string, score: number) => void;
  featured?: boolean;
  campaignId?: string;
}

const CATEGORY_BADGE: Record<string, string> = {
  'AI Girlfriend': 'bg-blue-700 text-white',
  'Undress AI': 'bg-slate-700 text-white',
  'AI Chat': 'bg-emerald-700 text-white',
  'AI Image': 'bg-amber-600 text-white',
  'AI Roleplay': 'bg-zinc-800 text-white',
};

const CATEGORY_BTN: Record<string, string> = {
  'AI Girlfriend': 'bg-yellow-400 hover:bg-yellow-300 text-black',
  'Undress AI': 'bg-yellow-400 hover:bg-yellow-300 text-black',
  'AI Chat': 'bg-yellow-400 hover:bg-yellow-300 text-black',
  'AI Image': 'bg-yellow-400 hover:bg-yellow-300 text-black',
  'AI Roleplay': 'bg-yellow-400 hover:bg-yellow-300 text-black',
};

function getBookmarkKey(slug: string) { return `ainsfw_bookmark_${slug}`; }

/** Cap a description to N words (default 18) so card previews stay short + uniform. */
function capWords(text: string, max = 18): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text;
  return words.slice(0, max).join(' ') + '…';
}

export default function ToolCard({ tool, index, initialStats, onVoteChange, featured, campaignId }: ToolCardProps) {
  const placeholder = '/assets/image.jpg';
  const mainImg = tool.image && (tool.image.startsWith('https://') || tool.image.startsWith('/'))
    ? tool.image : placeholder;

  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Gallery carousel
  const [gallery, setGallery] = useState<string[]>([mainImg]);
  const [slideIdx, setSlideIdx] = useState(0);
  const [galleryFetched, setGalleryFetched] = useState(false);
  const touchStartX = useRef(0);

  const [votes, setVotes] = useState({ up: initialStats?.upvotes ?? 0, down: initialStats?.downvotes ?? 0 });
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviews, setReviews] = useState<{ text: string; rating: number; date: string }[]>(
    initialStats?.reviews?.map(r => ({ text: r.text, rating: r.rating, date: r.createdAt })) ?? []
  );
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    try {
      const savedVote = localStorage.getItem(`ainsfw_vote_${tool.slug}`) as 'up' | 'down' | null;
      if (savedVote) setUserVote(savedVote);
      setBookmarked(localStorage.getItem(getBookmarkKey(tool.slug)) === '1');
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
    if (isInView && featured && campaignId && !impressionTracked.current) {
      impressionTracked.current = true;
      trackImpression(campaignId);
    }
  }, [isInView, featured, campaignId]);

  const handleFeaturedClick = useCallback(() => {
    if (featured && campaignId) trackClick(campaignId, 'ainsfw-featured');
  }, [featured, campaignId]);

  // Fetch gallery when card enters viewport
  useEffect(() => {
    if (!isInView || galleryFetched) return;
    setGalleryFetched(true);
    fetch(`/api/ainsfw/images?slug=${encodeURIComponent(tool.slug)}&name=${encodeURIComponent(tool.name)}&vendor=${encodeURIComponent(tool.vendor)}`)
      .then(r => r.json())
      .then(d => {
        if (d.images?.length) {
          setGallery([mainImg, ...d.images.filter((img: string) => img !== mainImg)].slice(0, 7));
        }
      })
      .catch(() => {});
  }, [isInView, galleryFetched, tool.slug, tool.name, tool.vendor, mainImg]);

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

  const handleReviewOpen = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShowReview(true); };

  const handleReviewSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!reviewText.trim()) return;
    const result = await submitReview(tool.slug, reviewText.trim(), reviewRating);
    setReviews(result.reviews.map(r => ({ text: r.text, rating: r.rating, date: r.createdAt })));
    setVotes({ up: result.upvotes, down: result.downvotes });
    setReviewSubmitted(true);
    setTimeout(() => { setShowReview(false); setReviewText(''); setReviewRating(5); setReviewSubmitted(false); }, 1200);
  };

  const score = votes.up - votes.down;
  const badge = CATEGORY_BADGE[tool.category] || 'bg-gray-700 text-white';
  const btnCls = CATEGORY_BTN[tool.category] || 'bg-gray-700 hover:bg-gray-600 text-white';
  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  const currentSrc = gallery[slideIdx] || mainImg;

  /* ─── FEATURED: completely different dark premium card ─── */
  if (featured) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.04 }}
          className="h-full"
        >
          <Link href={`/ainsfw/${tool.slug}`} className="block h-full" onClick={handleFeaturedClick}>
            <div
              ref={cardRef}
              className="group h-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 hover:border-[#22c55e]/40 transition-all flex flex-col"
            >
              {/* Image */}
              <div
                className="relative w-full h-32 sm:h-36 overflow-hidden bg-[#0a0a0a] shrink-0"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {isInView && (
                  <img
                    key={currentSrc}
                    src={currentSrc}
                    alt={slideIdx === 0 ? `${tool.name} NSFW AI ${tool.category} tool` : `${tool.name} NSFW AI ${tool.category} screenshot ${slideIdx}`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                    loading={index < 8 ? 'eager' : 'lazy'}
                    onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                  />
                )}

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

                {/* Featured badge */}
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#22c55e] text-black text-[9px] font-black uppercase tracking-widest">
                    <svg className="w-2 h-2" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3a2 2 0 01-2 2H7a2 2 0 01-2-2v-1h14v1z"/></svg>
                    Featured
                  </span>
                </div>

                {/* Bookmark */}
                <button
                  onClick={handleBookmark}
                  title={bookmarked ? 'Remove bookmark' : 'Save'}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 hover:bg-black/60"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={bookmarked ? '#f43f5e' : 'none'} stroke={bookmarked ? '#f43f5e' : '#fff'} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>

                {gallery.length > 1 && (
                  <div className="absolute top-1.5 right-10 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                    {slideIdx + 1}/{gallery.length}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-2.5 sm:p-3 flex-grow flex flex-col">
                <h3 className="text-xs sm:text-sm font-black text-white mb-0.5 leading-tight truncate group-hover:text-[#FF8C3A] transition-colors">
                  {tool.name}
                </h3>
                <p className="text-[9px] sm:text-[10px] text-[#7BAEFF] mb-1 truncate">{tool.vendor}</p>

                {/* Description — hard-capped to ~18 words (string-level) + 2-line clamp for a tidy, uniform preview */}
                <p className="text-white/70 text-[10px] sm:text-xs line-clamp-2 leading-relaxed flex-grow mb-2">
                  {capWords(tool.description)}
                </p>

                {/* Votes row */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.08] mb-2">
                  <div className="flex items-center gap-1">
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
                </div>

                {/* CTA */}
                <div className="bg-yellow-400 hover:bg-yellow-300 text-black text-[10px] sm:text-xs font-black uppercase tracking-[1px] text-center py-1.5 rounded-lg transition-colors cursor-pointer">
                  TRY NOW →
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
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder={`Share your experience with ${tool.name}...`} rows={3} className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 mb-4" />
              {reviews.length > 0 && (
                <div className="mb-4 space-y-2 max-h-36 overflow-y-auto">
                  <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1">Previous reviews</p>
                  {reviews.slice(0, 5).map((r, i) => (
                    <div key={i} className="bg-white/[0.04] rounded-lg px-3 py-2 border border-white/10">
                      <div className="flex items-center gap-2 mb-0.5"><div className="flex">{[1,2,3,4,5].map((s) => (<svg key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-[#22c55e]' : 'text-white/30'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>))}</div><span className="text-white/40 text-[10px]">{r.date}</span></div>
                      <p className="text-white/70 text-xs line-clamp-2">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleReviewSubmit} disabled={!reviewText.trim() || reviewSubmitted} className="w-full py-2.5 rounded-xl font-black text-sm bg-[#22c55e] text-black active:bg-[#16a34a] transition-all disabled:opacity-40">{reviewSubmitted ? '✓ Submitted!' : 'Submit Review'}</button>
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
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.04 }}
        className="h-full"
      >
        <Link href={`/ainsfw/${tool.slug}`} className="block h-full">
          <div
            ref={cardRef}
            className="bg-[#111] rounded-xl overflow-hidden h-full flex flex-col border border-white/10 hover:border-[#22c55e]/50 transition-all duration-150 group"
          >
            {/* Image carousel */}
            <div
              className="relative w-full h-32 sm:h-36 overflow-hidden bg-[#0a0a0a] shrink-0"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {isInView && (
                <img
                  key={currentSrc}
                  src={currentSrc}
                  alt={slideIdx === 0 ? `${tool.name} NSFW AI ${tool.category} tool` : `${tool.name} NSFW AI ${tool.category} screenshot ${slideIdx}`}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  loading={index < 8 ? 'eager' : 'lazy'}
                  onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                />
              )}

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

              <div className="absolute top-1.5 left-1.5">
                <span className={`${badge} text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-black/20`}>{tool.category}</span>
              </div>

              <button onClick={handleBookmark} title={bookmarked ? 'Remove bookmark' : 'Save'} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 hover:bg-black/70">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={bookmarked ? '#f43f5e' : 'none'} stroke={bookmarked ? '#f43f5e' : '#fff'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>

              {gallery.length > 1 && (
                <div className="absolute top-1.5 right-10 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">{slideIdx + 1}/{gallery.length}</div>
              )}
            </div>

            {/* Body */}
            <div className="p-2.5 sm:p-3 flex-grow flex flex-col">
              <h3 className="text-xs sm:text-sm font-black text-white mb-0.5 leading-tight truncate group-hover:text-[#22c55e] transition-colors">{tool.name}</h3>
              <p className="text-[9px] sm:text-[10px] text-white/50 mb-1 truncate">{tool.vendor}</p>

              <p className="text-white/70 text-[10px] sm:text-xs line-clamp-2 leading-relaxed flex-grow mb-2">{capWords(tool.description)}</p>

              {reviews.length > 0 && (
                <div className="flex items-center gap-1 mb-1.5">
                  <div className="flex">{[1,2,3,4,5].map((s) => (<svg key={s} className={`w-2.5 h-2.5 ${s <= avgRating ? 'text-[#22c55e]' : 'text-white/20'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>))}</div>
                  <span className="text-[9px] text-white/50">({reviews.length})</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1.5 border-t border-white/10 mb-2">
                <div className="flex items-center gap-1">
                  <button onClick={(e) => handleVote(e, 'up')} title="Upvote" className={`flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold transition-all ${userVote === 'up' ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50 hover:bg-green-500/20 hover:text-green-300'}`}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4z"/></svg>
                  </button>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${score > 0 ? 'bg-green-500/20 text-green-300' : score < 0 ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white/30'}`}>
                    {score > 0 ? `+${score}` : score}
                  </span>
                  <button onClick={(e) => handleVote(e, 'down')} title="Downvote" className={`flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold transition-all ${userVote === 'down' ? 'bg-red-500 text-white' : 'bg-white/10 text-white/50 hover:bg-red-500/20 hover:text-red-300'}`}>
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16z"/></svg>
                  </button>
                </div>
              </div>

              <div className={`${btnCls} text-[10px] sm:text-xs font-black uppercase tracking-[1px] text-center py-1.5 rounded transition-all cursor-pointer`}>
                TRY NOW →
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
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder={`Share your experience with ${tool.name}...`} rows={3} className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 mb-4" />
            {reviews.length > 0 && (
              <div className="mb-4 space-y-2 max-h-36 overflow-y-auto">
                <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1">Previous reviews</p>
                {reviews.slice(0, 5).map((r, i) => (
                    <div key={i} className="bg-white/[0.04] rounded-lg px-3 py-2 border border-white/10">
                      <div className="flex items-center gap-2 mb-0.5"><div className="flex">{[1,2,3,4,5].map((s) => (<svg key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-[#22c55e]' : 'text-white/30'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>))}</div><span className="text-white/40 text-[10px]">{r.date}</span></div>
                      <p className="text-white/70 text-xs line-clamp-2">{r.text}</p>
                    </div>
                ))}
              </div>
            )}
            <button onClick={handleReviewSubmit} disabled={!reviewText.trim() || reviewSubmitted} className="w-full py-2.5 rounded-xl font-black text-sm bg-[#22c55e] text-black active:bg-[#16a34a] transition-all disabled:opacity-40">{reviewSubmitted ? '✓ Submitted!' : 'Submit Review'}</button>
          </motion.div>
        </div>
      )}
    </>
  );
}
