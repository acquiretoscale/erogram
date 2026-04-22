'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { AINsfwTool } from '../types';
import { voteOnTool, unvoteOnTool, submitReview } from '@/lib/actions/ainsfw';
import type { ToolStatsData } from '@/lib/actions/ainsfw';

interface ToolDetailClientProps {
  tool: AINsfwTool;
  similar: AINsfwTool[];
  initialStats?: ToolStatsData;
}

const CATEGORY_COLOR: Record<string, string> = {
  'AI Girlfriend': 'bg-blue-700',
  'Undress AI': 'bg-slate-700',
  'AI Chat': 'bg-emerald-700',
  'AI Image': 'bg-amber-600',
  'AI Roleplay': 'bg-zinc-800',
};

const CATEGORY_BADGE: Record<string, string> = {
  'AI Girlfriend': 'bg-blue-700 text-white',
  'Undress AI': 'bg-slate-700 text-white',
  'AI Chat': 'bg-emerald-700 text-white',
  'AI Image': 'bg-amber-600 text-white',
  'AI Roleplay': 'bg-zinc-800 text-white',
};

const PAYMENT_ICON: Record<string, string> = {
  'Credit Cards': '💳',
  'Crypto': '₿',
  'PayPal': '🅿',
};

function getBookmarkKey(slug: string) { return `ainsfw_bookmark_${slug}`; }

export default function ToolDetailClient({ tool, similar, initialStats }: ToolDetailClientProps) {
  const placeholder = '/assets/image.jpg';
  const [imageSrc, setImageSrc] = useState(
    tool.image && (tool.image.startsWith('https://') || tool.image.startsWith('/'))
      ? tool.image : placeholder
  );

  const [isRedirecting, setIsRedirecting] = useState(false);

  // Votes & bookmark
  const [votes, setVotes] = useState({ up: initialStats?.upvotes ?? 0, down: initialStats?.downvotes ?? 0 });
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  // Gallery — admin-uploaded images take priority
  const adminGallery = initialStats?.gallery || [];
  const [gallery, setGallery] = useState<string[]>(adminGallery);
  const [galleryLoading, setGalleryLoading] = useState(adminGallery.length === 0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Reviews
  const [reviews, setReviews] = useState<{ text: string; rating: number; date: string }[]>(
    initialStats?.reviews?.map(r => ({ text: r.text, rating: r.rating, date: r.createdAt })) ?? []
  );
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    try {
      const savedVote = localStorage.getItem(`ainsfw_vote_${tool.slug}`) as 'up' | 'down' | null;
      if (savedVote) setUserVote(savedVote);
      setBookmarked(localStorage.getItem(getBookmarkKey(tool.slug)) === '1');
    } catch {}

    if (adminGallery.length === 0) {
      setGalleryLoading(true);
      fetch(`/api/ainsfw/images?slug=${encodeURIComponent(tool.slug)}&name=${encodeURIComponent(tool.name)}&vendor=${encodeURIComponent(tool.vendor)}`)
        .then(r => r.json())
        .then(d => { if (d.images?.length) setGallery(d.images.slice(0, 6)); })
        .catch(() => {})
        .finally(() => setGalleryLoading(false));
    }
  }, [tool.slug, tool.name, tool.vendor]);

  const handleVisit = () => {
    setIsRedirecting(true);
    try {
      const key = `ainsfw_clicks_${tool.slug}`;
      const prev = parseInt(localStorage.getItem(key) || '0', 10);
      localStorage.setItem(key, String(prev + 1));
    } catch {}
    window.open(tool.tryNowUrl, '_blank', 'noopener,noreferrer');
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

  const handleReviewSubmit = async () => {
    if (!reviewText.trim()) return;
    const result = await submitReview(tool.slug, reviewText.trim(), reviewRating);
    setReviews(result.reviews.map(r => ({ text: r.text, rating: r.rating, date: r.createdAt })));
    setVotes({ up: result.upvotes, down: result.downvotes });
    setReviewSubmitted(true);
    setTimeout(() => { setShowReviewForm(false); setReviewText(''); setReviewRating(5); setReviewSubmitted(false); }, 1200);
  };

  const score = votes.up - votes.down;
  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : 0;
  const btnColor = CATEGORY_COLOR[tool.category] || 'bg-gray-700';
  const catBadge = CATEGORY_BADGE[tool.category] || 'bg-gray-700 text-white';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#07080d] via-[#0b0f17] to-[#07080d] text-[#f5f5f5] font-sans overflow-x-hidden">
      <Navbar />

      {/* Breadcrumb */}
      <div className="relative z-10 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0b1018]/80 backdrop-blur-xl mt-14">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/ainsfw" className="hover:text-white transition-colors">AI NSFW Tools</Link>
            <span>/</span>
            <span className="text-white font-semibold truncate max-w-[180px]">{tool.name}</span>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          {/* Left sticky column */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Tool image card */}
              <div className="bg-[#111827]/85 rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-4">
                <div className="relative w-full aspect-square bg-gray-100">
                  <Image
                    src={imageSrc}
                    alt={tool.name}
                    fill
                    className="object-cover"
                    priority
                    onError={() => setImageSrc(placeholder)}
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`${catBadge} text-xs font-black px-2 py-1 rounded border border-black/20 uppercase tracking-wider`}>
                      {tool.category}
                    </span>
                  </div>
                </div>

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

              {/* Vote + Score + Bookmark row */}
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
                <button
                  onClick={handleBookmark}
                  className={`p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] transition-all ${
                    bookmarked ? 'bg-blue-700 text-white' : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                  </svg>
                </button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {tool.tags.slice(0, 6).map((tag) => (
                  <span key={tag} className="bg-white/10 border border-white/15 rounded px-2 py-0.5 text-[10px] font-black text-gray-200">
                    #{tag.replace(/\s+/g, '-')}
                  </span>
                ))}
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
              {/* Screenshot Gallery — shown first on both mobile and desktop */}
              {(gallery.length > 0 || galleryLoading) && (
                <div className="mb-8">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Screenshots</h3>
                  {galleryLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-video rounded-xl bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {gallery.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => setLightboxIdx(i)}
                          className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5 hover:border-white/20 transition-all group cursor-zoom-in"
                        >
                          <img
                            src={src}
                            alt={`${tool.name} screenshot ${i + 1}`}
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

              {/* Lightbox */}
              {lightboxIdx !== null && gallery[lightboxIdx] && (
                <div
                  className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                  onClick={() => setLightboxIdx(null)}
                >
                  <button
                    onClick={() => setLightboxIdx(null)}
                    className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-bold z-10"
                  >×</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIdx(Math.max(0, lightboxIdx - 1)); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl z-10"
                  >‹</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxIdx(Math.min(gallery.length - 1, lightboxIdx + 1)); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl z-10"
                  >›</button>
                  <img
                    src={gallery[lightboxIdx]}
                    alt={`${tool.name} screenshot ${lightboxIdx + 1}`}
                    className="max-w-full max-h-[85vh] rounded-2xl object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                        className={`w-2 h-2 rounded-full transition-all ${i === lightboxIdx ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/60'}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Title + text */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
                {tool.name}
              </h1>
              <p className="text-gray-400 text-sm mb-2">{tool.vendor}</p>

              {/* Star rating if any */}
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} className={`w-4 h-4 ${s <= avgRating ? 'text-yellow-400' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">{avgRating}/5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-8 whitespace-pre-line">
                {tool.description}
              </p>

              {/* CTA card — immediately after description */}
              <div className="bg-[#151515] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-purple-600/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

                <h2 className="text-2xl font-bold text-white relative z-10 mb-2">Ready to try {tool.name}?</h2>
                <p className="text-gray-400 mb-6 relative z-10">Click below to visit {tool.vendor}</p>

                <button
                  onClick={handleVisit}
                  disabled={isRedirecting}
                  className="relative w-full group rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-[#111] disabled:opacity-70 shadow-[0_6px_20px_-4px_rgba(250,204,21,0.5)] transition-all duration-150"
                >
                  <div className="relative w-full px-8 py-5">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">🚀</span>
                      <span className="text-xl font-black text-black">
                        {isRedirecting ? 'Opening...' : `Visit ${tool.name} Now`}
                      </span>
                    </div>
                  </div>
                </button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  Opens {tool.vendor} in a new tab.
                </p>
              </div>

              {/* Reviews section */}
              <div className="bg-[#111827]/85 rounded-2xl border border-white/10 shadow-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-white">Reviews {reviews.length > 0 && `(${reviews.length})`}</h3>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="text-xs font-black uppercase tracking-wide px-3 py-1.5 bg-white/10 text-white rounded border border-white/20 hover:bg-white/15 transition-all"
                  >
                    {showReviewForm ? 'Cancel' : '+ Write Review'}
                  </button>
                </div>

                {/* Review form */}
                {showReviewForm && (
                  <div className="mb-6 bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((s) => (
                          <button
                            key={s}
                            onClick={() => setReviewRating(s)}
                            className={`text-2xl leading-none transition-transform hover:scale-125 ${s <= reviewRating ? 'text-yellow-400' : 'text-gray-300'}`}
                          >★</button>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-gray-300">{reviewRating}/5</span>
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={`Share your experience with ${tool.name}...`}
                      rows={3}
                      className="w-full bg-[#0b1220] border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-white/30 mb-3"
                    />
                    <button
                      onClick={handleReviewSubmit}
                      disabled={!reviewText.trim() || reviewSubmitted}
                      className="px-5 py-2 font-black text-sm bg-yellow-400 text-black border border-yellow-300 rounded-xl hover:brightness-105 transition-all disabled:opacity-40"
                    >
                      {reviewSubmitted ? '✓ Submitted!' : 'Submit Review'}
                    </button>
                  </div>
                )}

                {/* Existing reviews */}
                {reviews.length > 0 ? (
                  <div className="space-y-3">
                    {reviews.map((r, i) => (
                      <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1,2,3,4,5].map((s) => (
                              <svg key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                            ))}
                          </div>
                          <span className="text-gray-400 text-xs">{r.date}</span>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed">{r.text}</p>
                      </div>
                    ))}
                  </div>
                ) : !showReviewForm && (
                  <p className="text-gray-400 text-sm text-center py-4">No reviews yet — be the first!</p>
                )}
              </div>

              {/* Explore more */}
              <div className="mb-8">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Explore Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {['AI Girlfriend', 'Undress AI', 'AI Chat', 'AI Image', 'AI Roleplay'].map((cat) => (
                    <Link
                      key={cat}
                      href="/ainsfw"
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-white border border-white/15 text-xs font-black hover:bg-white/15 transition-all"
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Similar tools */}
        {similar.length > 0 && (
          <section className="mt-12 border-t border-white/5 pt-10">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-6">More {tool.category} Tools</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {similar.map((s, i) => (
                <Link key={s.slug} href={`/${s.slug}`} className="block group">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="bg-[#111827]/85 rounded-xl border border-white/10 shadow-xl group-hover:-translate-y-0.5 transition-all duration-150 overflow-hidden"
                  >
                    <div className="relative w-full h-24 sm:h-32 bg-gray-100">
                      <Image
                        src={s.image.startsWith('/') || s.image.startsWith('https://') ? s.image : placeholder}
                        alt={`${s.name} — ${s.category}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                      />
                      <div className="absolute top-1.5 left-1.5">
                        <span className={`${CATEGORY_BADGE[s.category] || 'bg-gray-700 text-white'} text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-black/20`}>
                          {s.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <h3 className="text-xs font-black text-white group-hover:text-blue-300 transition-colors truncate">{s.name}</h3>
                      <p className="text-[9px] text-gray-400 mt-0.5 truncate">{s.vendor}</p>
                      <div className={`mt-2 ${CATEGORY_COLOR[s.category] || 'bg-gray-700'} text-white text-[9px] font-black text-center py-1 rounded border border-white/20`}>
                        Try Now →
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
