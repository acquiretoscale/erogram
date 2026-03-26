'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { AINsfwTool } from './types';
import { voteOnTool, unvoteOnTool, submitReview } from '@/lib/actions/ainsfw';
import type { ToolStatsData } from '@/lib/actions/ainsfw';

interface ToolCardProps {
  tool: AINsfwTool;
  index: number;
  initialStats?: ToolStatsData;
  onVoteChange?: (slug: string, score: number) => void;
}

const CATEGORY_BADGE: Record<string, string> = {
  'AI Girlfriend': 'bg-blue-700 text-white',
  'Undress AI': 'bg-slate-700 text-white',
  'AI Chat': 'bg-emerald-700 text-white',
  'AI Image': 'bg-amber-600 text-white',
  'AI Roleplay': 'bg-zinc-800 text-white',
};

const CATEGORY_BTN: Record<string, string> = {
  'AI Girlfriend': 'bg-blue-700 hover:bg-blue-600 text-white',
  'Undress AI': 'bg-slate-700 hover:bg-slate-600 text-white',
  'AI Chat': 'bg-emerald-700 hover:bg-emerald-600 text-white',
  'AI Image': 'bg-amber-600 hover:bg-amber-500 text-white',
  'AI Roleplay': 'bg-zinc-800 hover:bg-zinc-700 text-white',
};

function getBookmarkKey(slug: string) { return `ainsfw_bookmark_${slug}`; }

export default function ToolCard({ tool, index, initialStats, onVoteChange }: ToolCardProps) {
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

  useEffect(() => {
    if (!cardRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { setIsInView(true); obs.disconnect(); } }); },
      { rootMargin: '300px', threshold: 0.01 }
    );
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, []);

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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.04 }}
        className="h-full relative"
      >
        <Link href={`/${tool.slug}`} className="block h-full">
          <div
            ref={cardRef}
            className="bg-white rounded-xl overflow-hidden h-full flex flex-col border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-y-0.5 transition-all duration-150 group"
          >
            {/* Airbnb-style image carousel */}
            <div
              className="relative w-full h-32 sm:h-36 overflow-hidden bg-gray-100 shrink-0"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {isInView && (
                <img
                  key={currentSrc}
                  src={currentSrc}
                  alt={`${tool.name} — ${tool.category}`}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  loading={index < 8 ? 'eager' : 'lazy'}
                  onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                />
              )}

              {/* Nav arrows — only show if multiple images */}
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={(e) => goSlide(-1, e)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/90 text-black flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
                  >‹</button>
                  <button
                    onClick={(e) => goSlide(1, e)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/90 text-black flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
                  >›</button>
                </>
              )}

              {/* Dot indicators */}
              {gallery.length > 1 && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSlideIdx(i); }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === slideIdx ? 'bg-white scale-125 shadow' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              )}

              {/* Category badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className={`${badge} text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border border-black/20`}>
                  {tool.category}
                </span>
              </div>

              {/* Bookmark — Airbnb heart position */}
              <button
                onClick={handleBookmark}
                title={bookmarked ? 'Remove bookmark' : 'Save'}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={bookmarked ? '#f43f5e' : 'none'} stroke={bookmarked ? '#f43f5e' : '#000'} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>

              {/* Image counter */}
              {gallery.length > 1 && (
                <div className="absolute top-1.5 right-10 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                  {slideIdx + 1}/{gallery.length}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-2.5 sm:p-3 flex-grow flex flex-col">
              <h3 className="text-xs sm:text-sm font-black text-black mb-0.5 leading-tight truncate group-hover:text-indigo-700 transition-colors">
                {tool.name}
              </h3>
              <p className="text-[9px] sm:text-[10px] text-gray-400 mb-1 truncate">{tool.vendor}</p>

              <p className="text-gray-600 text-[10px] sm:text-xs line-clamp-2 leading-relaxed flex-grow mb-2">
                {tool.description}
              </p>

              {/* Star rating */}
              {reviews.length > 0 && (
                <div className="flex items-center gap-1 mb-1.5">
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} className={`w-2.5 h-2.5 ${s <= avgRating ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-[9px] text-gray-400">({reviews.length})</span>
                </div>
              )}

              {/* Votes row */}
              <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 mb-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleVote(e, 'up')}
                    title="Upvote"
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold transition-all ${
                      userVote === 'up'
                        ? 'bg-green-500 border-black text-white shadow-[1px_1px_0_#000]'
                        : 'bg-white border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-600'
                    }`}
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 8H4z"/></svg>
                    {votes.up}
                  </button>
                  <button
                    onClick={(e) => handleVote(e, 'down')}
                    title="Downvote"
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold transition-all ${
                      userVote === 'down'
                        ? 'bg-red-500 border-black text-white shadow-[1px_1px_0_#000]'
                        : 'bg-white border-gray-300 text-gray-500 hover:border-red-500 hover:text-red-600'
                    }`}
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-8h16z"/></svg>
                    {votes.down}
                  </button>
                  <button
                    onClick={handleReviewOpen}
                    title="Write a review"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-300 bg-white text-[10px] font-bold text-gray-500 hover:border-yellow-500 hover:text-yellow-600 transition-all"
                  >
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    {reviews.length > 0 ? reviews.length : '★'}
                  </button>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                  score > 0 ? 'bg-green-100 border-green-400 text-green-700' :
                  score < 0 ? 'bg-red-100 border-red-400 text-red-600' :
                  'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {score > 0 ? `+${score}` : score < 0 ? `${score}` : '0'}
                </span>
              </div>

              {/* Try Now button — full width */}
              <div
                className={`${btnCls} text-[10px] sm:text-xs font-black uppercase tracking-widest text-center py-1.5 rounded border-2 border-black shadow-[2px_2px_0_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all duration-75 cursor-pointer`}
              >
                TRY NOW →
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Review Modal */}
      {showReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReview(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0_#000] p-5 sm:p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-black font-black text-base">Review {tool.name}</h3>
              <button onClick={() => setShowReview(false)} className="text-gray-400 hover:text-black transition-colors ml-4">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map((s) => (
                <button key={s} onClick={() => setReviewRating(s)}
                  className={`text-2xl leading-none transition-transform hover:scale-125 ${s <= reviewRating ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}
                >★</button>
              ))}
              <span className="ml-1 text-sm font-bold text-gray-500 self-center">{reviewRating}/5</span>
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={`Share your experience with ${tool.name}...`}
              rows={3}
              className="w-full bg-gray-50 border-2 border-black rounded-xl px-3 py-2.5 text-sm text-black placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-black mb-4"
            />

            {reviews.length > 0 && (
              <div className="mb-4 space-y-2 max-h-36 overflow-y-auto">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Previous reviews</p>
                {reviews.slice(0, 5).map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="flex">
                        {[1,2,3,4,5].map((s) => (
                          <svg key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        ))}
                      </div>
                      <span className="text-gray-400 text-[10px]">{r.date}</span>
                    </div>
                    <p className="text-gray-600 text-xs line-clamp-2">{r.text}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleReviewSubmit}
              disabled={!reviewText.trim() || reviewSubmitted}
              className="w-full py-2.5 rounded-xl font-black text-sm bg-yellow-400 text-black border-2 border-black shadow-[3px_3px_0_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-40"
            >
              {reviewSubmitted ? '✓ Submitted!' : 'Submit Review'}
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
