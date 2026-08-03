'use client';

import { useEffect, useState } from 'react';
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
import VerifiedBadge, { AINSFW_VERIFIED_TOOLTIP } from '@/components/VerifiedBadge';

interface ToolDetailClientProps {
  tool: AINsfwTool;
  fullReview?: AINsfwFullReview;
  showVerified?: boolean;
  alternatives?: AINsfwTool[];
  aiArticles?: BlogCard[];
  initialStats?: ToolStatsData;
  reviewAuthor?: AuthorProfile;
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

function ReviewAuthorBio({ author }: { author: AuthorProfile }) {
  return (
    <div className="mt-10 pt-10 border-t border-[#22c55e]/25">
      <div className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#22c55e] mb-6">About the Author</div>
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-7 rounded-[10px] bg-[#0a0807] text-white p-7 sm:p-8 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)] border border-white/5">
        {author.avatar && (
          <img
            src={author.avatar}
            alt={author.name}
            width={96}
            height={96}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shrink-0 ring-2 ring-white/15"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="flex-1">
          <div className="font-sans font-black text-[20px] text-white leading-tight">{author.name}</div>
          {author.role && (
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#22c55e] mt-1">{author.role}</div>
          )}
          {author.bio && (
            <p className="text-[15px] leading-[1.7] text-white/65 mt-3">{author.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewCta({
  onClick,
  disabled,
  headline,
  subline,
  button,
}: {
  onClick: () => void;
  disabled: boolean;
  headline: string;
  subline: string;
  button: string;
}) {
  return (
    <div className="rounded-2xl border border-[#22c55e]/25 bg-[#0a1f12]/90 p-5 sm:p-6">
      <p className="text-white font-bold text-base sm:text-lg mb-1">{headline}</p>
      <p className="text-gray-400 text-sm mb-4">{subline}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-yellow-400 text-black text-sm font-black hover:bg-yellow-300 active:bg-yellow-500 transition-all disabled:opacity-70"
      >
        {disabled ? 'Opening...' : button}
      </button>
    </div>
  );
}

export default function ToolDetailClient({ tool, fullReview, showVerified = false, alternatives = [], aiArticles = [], initialStats, reviewAuthor }: ToolDetailClientProps) {
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
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Reviews
  const [reviews, setReviews] = useState<ToolReviewData[]>(
    initialStats?.reviews?.map(r => ({ ...r, createdAt: r.createdAt })) ?? []
  );

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
      .then(d => { if (d.images?.length) setGallery(d.images.slice(0, 6)); })
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
  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : 0;
  const btnColor = CATEGORY_COLOR[tool.category] || 'bg-gray-700';
  const catBadge = CATEGORY_BADGE[tool.category] || 'bg-gray-700 text-white';

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-[#f5f5f5] font-sans overflow-x-hidden">
      <Navbar />

      {/* Breadcrumb */}
      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5 min-w-0">
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
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3 flex flex-wrap items-center gap-2">
                {tool.name}
                {showVerified && <VerifiedBadge className="w-5 h-5 sm:w-6 sm:h-6" tooltip={AINSFW_VERIFIED_TOOLTIP} />}
              </h1>

              {/* Tool image card */}
              <div className="bg-[#0a1f12]/85 rounded-2xl border border-[#22c55e]/15 shadow-2xl overflow-hidden mb-4">
                <div className="relative w-full aspect-square bg-gray-100">
                  <img
                    src={imageSrc}
                    alt={`${tool.name} NSFW AI ${tool.category} tool`}
                    className="absolute inset-0 w-full h-full object-cover"
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
              <div className="flex flex-wrap gap-1.5">
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
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Preview of {tool.name}</h3>
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
                            alt={`${tool.name} NSFW AI ${tool.category} screenshot ${i + 1}`}
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
                    alt={`${tool.name} NSFW AI ${tool.category} screenshot ${lightboxIdx + 1}`}
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
                      <svg key={s} className={`w-4 h-4 ${s <= avgRating ? 'text-[#22c55e]' : 'text-gray-600'}`} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-gray-400 text-sm">{avgRating}/5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                </button>
              )}

              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6 whitespace-pre-line">
                {description}
              </p>

              {AINSFW_TOOL_ARTICLE_LINKS[tool.slug] && (
                <Link
                  href={`/blog/${AINSFW_TOOL_ARTICLE_LINKS[tool.slug].slug}`}
                  className="inline-flex items-center gap-2 mb-8 px-4 py-3 rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e] text-sm font-bold hover:bg-[#22c55e]/15 transition-colors"
                >
                  Read the full guide: {AINSFW_TOOL_ARTICLE_LINKS[tool.slug].title}
                  <span aria-hidden>→</span>
                </Link>
              )}

              {fullReview && (
                <div className="mb-8">
                  <ReviewCta
                    onClick={handleVisit}
                    disabled={isRedirecting}
                    headline={`Try ${tool.name} free`}
                    subline={tool.slug === 'porncreate-undress-ai'
                      ? 'Free diamonds on signup. No credit card required.'
                      : tool.slug === 'joi-ai-nude-generator'
                        ? 'Free plan available. Build a character and test the nude ai generator.'
                        : 'Opens the official site in a new tab.'}
                    button={`Visit ${tool.name}`}
                  />
                </div>
              )}

              {fullReview && (
                <div className="mb-10 pt-10 mt-2 border-t border-[#22c55e]/25">
                  <p className="text-[#22c55e] text-xs font-black uppercase tracking-[0.2em] mb-8">Erogram Team&apos;s Review</p>

                  <div className="space-y-8">
                    {fullReview.sections.length > 0 && (
                      <section key={fullReview.sections[0].heading}>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">{fullReview.sections[0].heading}</h2>
                        <div className="text-gray-300 text-base leading-relaxed whitespace-pre-line space-y-4">
                          {fullReview.sections[0].body.split(/\n\n+/).map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      </section>
                    )}
                    {fullReview.featureHighlights.map((item) => (
                      <section key={item.title}>
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">{item.title}</h2>
                        <div className="text-gray-300 text-base leading-relaxed whitespace-pre-line space-y-4">
                          {item.body.split(/\n\n+/).map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      </section>
                    ))}
                    {fullReview.sections.slice(1).map((section) => (
                      <div key={section.heading}>
                        {/how does it work/i.test(section.heading) && (
                          <div className="flex justify-center my-6">
                            <button
                              onClick={handleVisit}
                              disabled={isRedirecting}
                              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-yellow-400 text-black text-sm font-black hover:bg-yellow-300 active:bg-yellow-500 transition-all disabled:opacity-70"
                            >
                              {isRedirecting ? 'Opening...' : `Try ${tool.name} Now`}
                            </button>
                          </div>
                        )}
                        <section>
                          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">{section.heading}</h2>
                          <div className="text-gray-300 text-base leading-relaxed whitespace-pre-line space-y-4">
                            {section.body.split(/\n\n+/).map((para, i) => (
                              <p key={i}>{para}</p>
                            ))}
                          </div>
                        </section>
                      </div>
                    ))}
                  </div>

                  {reviewAuthor && <ReviewAuthorBio author={reviewAuthor} />}
                </div>
              )}

              {/* CTA card — immediately after description / review */}
              <div className="bg-[#0a1f12] rounded-3xl p-6 sm:p-8 border border-[#22c55e]/20 shadow-xl mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#22c55e]/15 to-emerald-600/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

                <h2 className="text-2xl font-bold text-white relative z-10 mb-2">Ready to try {tool.name}?</h2>
                <p className="text-gray-400 mb-6 relative z-10">Click below to visit {tool.vendor}</p>

                <button
                  onClick={handleVisit}
                  disabled={isRedirecting}
                  className="relative w-full group rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-70 shadow-[0_6px_20px_-4px_rgba(250,204,21,0.5)] transition-all duration-150"
                >
                  <div className="relative w-full px-8 py-5">
                    <div className="flex items-center justify-center">
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

              <div id="tool-reviews" className="scroll-mt-28">
              <FlameReviewSection
                entityName={tool.name}
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

              {/* Most voted alternatives on Erogram */}
              {alternatives.length > 0 && (
                <div className="bg-[#0a1f12]/85 rounded-2xl border border-[#22c55e]/15 shadow-2xl p-6 mb-8">
                  <h2 className="text-lg font-black text-white mb-4">MOST VOTED ALTERNATIVES ON EROGRAM</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {alternatives.slice(0, 6).map((alt, i) => (
                      <Link key={alt.slug} href={`/ainsfw/${alt.slug}`} className="block group">
                        <div className="bg-[#111] rounded-xl overflow-hidden border border-white/10 group-hover:border-[#22c55e]/50 transition-all">
                          <div className="relative w-full aspect-video bg-gray-100">
                            <Image
                              src={alt.image.startsWith('/') || alt.image.startsWith('https://') ? alt.image : placeholder}
                              alt={`${alt.name} NSFW AI ${alt.category} tool`}
                              fill
                              className="object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                            />
                            <div className="absolute top-1 left-1">
                              <span className={`${CATEGORY_BADGE[alt.category] || 'bg-gray-700 text-white'} text-[8px] font-black px-1 py-0.5 rounded uppercase border border-black/20`}>
                                {alt.category}
                              </span>
                            </div>
                          </div>
                          <div className="p-2">
                            <div className="text-xs font-black text-white group-hover:text-[#22c55e] truncate">{alt.name}</div>
                            <div className="text-[9px] text-gray-400 truncate">{alt.vendor}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
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
