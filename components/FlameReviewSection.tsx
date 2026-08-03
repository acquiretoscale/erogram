'use client';

import { useRef, useState } from 'react';

export type FlameReviewItem = {
  authorName: string;
  authorAvatar: string;
  rating: number;
  text: string;
  createdAt: string;
};

type FlameReviewSectionProps = {
  entityName: string;
  promptLabel?: string;
  reviews: FlameReviewItem[];
  loginHref: string;
  onSubmit: (rating: number, text: string) => Promise<string>;
  successTitle?: string;
  successSubtitle?: string;
  requireText?: boolean;
  variant?: 'flame' | 'green';
  onSubmitted?: () => void | Promise<void>;
};

function heatLabel(rating: number) {
  if (rating === 5) return 'ON FIRE!';
  if (rating === 4) return 'Very Hot 🌶️';
  if (rating === 3) return 'Hot';
  if (rating === 2) return 'Warm';
  return 'Lukewarm';
}

const FLAME_BURST_STYLES = `
  @keyframes flameBurstMini {
    0%   { transform: scale(1); }
    20%  { transform: scale(1.8); filter: drop-shadow(0 0 14px rgba(255,120,0,1)) brightness(1.4); }
    50%  { transform: scale(1.35); filter: drop-shadow(0 0 10px rgba(255,80,0,0.9)); }
    100% { transform: scale(1.2); filter: drop-shadow(0 0 6px rgba(255,100,0,0.9)) brightness(1.15); }
  }
`;

type MiniFlameRatingProps = {
  creatorName: string;
  reviewCount: number;
  reviewAvg: number;
  loginHref: string;
  onRate: (rating: number) => Promise<void>;
};

export function MiniFlameRating({ creatorName, reviewCount, reviewAvg, loginHref, onRate }: MiniFlameRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [burstRating, setBurstRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [justRated, setJustRated] = useState(false);

  const idleRating = reviewCount > 0 ? Math.round(reviewAvg) : 0;
  const activeRating = hoverRating || idleRating;

  const handleClick = async (rating: number) => {
    setBurstRating(rating);
    setTimeout(() => setBurstRating(0), 600);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.open(loginHref, '_blank', 'noopener,noreferrer');
      return;
    }

    setSubmitting(true);
    try {
      await onRate(rating);
      setJustRated(true);
      setTimeout(() => setJustRated(false), 1800);
    } catch {
      // full review section handles errors if user scrolls down
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="mt-2 w-full rounded-xl px-2 py-2 text-center"
      style={{
        background: 'linear-gradient(135deg, #1a0a00 0%, #2d0f00 100%)',
        border: '1px solid rgba(251,100,20,0.35)',
        boxShadow: '0 4px 14px rgba(255,69,0,0.15)',
      }}
    >
      <style>{FLAME_BURST_STYLES}</style>
      <div className="flex items-center justify-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            disabled={submitting}
            aria-label={`Rate ${s} out of 5`}
            onClick={() => handleClick(s)}
            onMouseEnter={() => setHoverRating(s)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-base leading-none select-none disabled:opacity-60"
            style={{
              filter: s <= activeRating
                ? 'drop-shadow(0 0 4px rgba(255,100,0,0.9)) brightness(1.15)'
                : 'grayscale(0.7) brightness(0.5)',
              transform: s <= activeRating ? 'scale(1.12)' : 'scale(1)',
              animation: burstRating === s ? 'flameBurstMini 0.45s ease-out forwards' : undefined,
              transition: burstRating === s ? 'none' : 'all 0.15s ease',
            }}
          >
            🔥
          </button>
        ))}
      </div>
      <p className="mt-1 text-[10px] font-bold leading-tight" style={{ color: 'rgba(255,160,80,0.75)' }}>
        {submitting ? 'Saving…' : justRated ? 'Rated!' : `How hot is ${creatorName}`}
      </p>
    </div>
  );
}

export default function FlameReviewSection({
  entityName,
  promptLabel,
  reviews,
  loginHref,
  onSubmit,
  successTitle = 'Review submitted!',
  successSubtitle,
  requireText = true,
  variant = 'flame',
  onSubmitted,
}: FlameReviewSectionProps) {
  const label = promptLabel || entityName;
  const reviewCount = reviews.length;
  const reviewAvg = reviewCount > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  const [reviewForm, setReviewForm] = useState({ rating: 0, content: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [burstRating, setBurstRating] = useState(0);
  const [commentCTAVisible, setCommentCTAVisible] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (reviewSubmitting || reviewSubmitted) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.open(loginHref, '_blank', 'noopener,noreferrer');
      return;
    }
    if (reviewForm.rating < 1) return;
    if (requireText && !reviewForm.content.trim()) return;

    setReviewSubmitting(true);
    setSubmitError('');
    try {
      const message = await onSubmit(reviewForm.rating, reviewForm.content.trim());
      setSubmitMessage(message);
      setReviewSubmitted(true);
      setReviewForm({ rating: 0, content: '' });
      setCommentCTAVisible(false);
      await onSubmitted?.();
    } catch (err: any) {
      setSubmitError(err?.message || 'Could not submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const activeRating = hoverRating || reviewForm.rating;
  const canSubmit = reviewForm.rating >= 1 && (!requireText || reviewForm.content.trim().length > 0);

  const isGreen = variant === 'green';

  return (
    <section
      className={`mb-8 overflow-hidden relative ${isGreen ? 'rounded-3xl bg-[#0a1f12] border border-[#22c55e]/20 shadow-xl' : 'rounded-2xl shadow-lg'}`}
      style={isGreen ? undefined : { background: 'linear-gradient(135deg, #1a0a00 0%, #2d0f00 40%, #1a0a00 100%)', border: '1px solid rgba(251,100,20,0.35)' }}
    >
      {isGreen && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#22c55e]/15 to-emerald-600/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
      )}
      <div className={isGreen ? 'relative z-10' : undefined}>
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'linear-gradient(135deg, #ff6b00, #ff3d00)' }}>
          🔥
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-black text-white leading-tight">
            How hot is{' '}
            <span style={{ background: 'linear-gradient(90deg, #ff8c00, #ff3d00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {entityName}
            </span>
            ?
          </h2>
          {reviewCount > 0 && (
            <p className="text-[12px] font-semibold" style={{ color: 'rgba(255,160,80,0.75)' }}>
              {reviewCount} {reviewCount === 1 ? 'person rated' : 'people rated'} · {reviewAvg}/5
            </p>
          )}
        </div>
      </div>

      {reviewCount > 0 && (
        <div className="px-5 pb-4">
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(reviewAvg / 5) * 100}%`,
                background: reviewAvg >= 4.5
                  ? 'linear-gradient(90deg, #ff6b00, #ff3d00, #ffcc00)'
                  : reviewAvg >= 3
                  ? 'linear-gradient(90deg, #ff8c00, #ff5500)'
                  : 'linear-gradient(90deg, #cc4400, #ff6600)',
                boxShadow: reviewAvg >= 4.5 ? '0 0 12px 2px rgba(255,100,0,0.6)' : 'none',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,160,80,0.5)' }}>Lukewarm</span>
            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,160,80,0.5)' }}>On Fire 🔥</span>
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="px-5 pb-4 space-y-2">
          {reviews.map((r, i) => (
            <div key={`${r.authorName}-${r.createdAt}-${i}`} className="rounded-xl px-4 py-3 bg-white shadow-sm flex gap-3">
              <div className="w-16 h-16 rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-[#ff6b00] to-[#ff3d00] flex items-center justify-center text-white text-lg font-black">
                {r.authorAvatar ? (
                  <img src={r.authorAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  (r.authorName || 'A').charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-bold text-gray-800">{r.authorName || 'Member'}</span>
                  <div className="flex gap-0.5 ml-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span key={idx} className="text-[11px]">{idx < r.rating ? '🔥' : '○'}</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 ml-auto">{r.createdAt}</span>
                </div>
                {r.text && <p className="text-sm text-gray-600 leading-relaxed">{r.text}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 pb-5">
        {!reviewSubmitted ? (
          <div className="rounded-xl p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <style>{`
                  @keyframes flameBurst {
                    0%   { transform: scale(1); }
                    20%  { transform: scale(1.8); filter: drop-shadow(0 0 14px rgba(255,120,0,1)) brightness(1.4); }
                    50%  { transform: scale(1.35); filter: drop-shadow(0 0 10px rgba(255,80,0,0.9)); }
                    100% { transform: scale(1.2); filter: drop-shadow(0 0 6px rgba(255,100,0,0.9)) brightness(1.15); }
                  }
                  @keyframes sparkle {
                    0%   { opacity: 1; transform: translate(0,0) scale(1); }
                    100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.2); }
                  }
                  @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="relative">
                    {burstRating === s && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <span
                        key={i}
                        className="pointer-events-none absolute text-xs select-none"
                        style={{
                          top: '50%',
                          left: '50%',
                          '--tx': `${Math.cos((i / 8) * 2 * Math.PI) * 28}px`,
                          '--ty': `${Math.sin((i / 8) * 2 * Math.PI) * 28}px`,
                          animation: 'sparkle 0.5s ease-out forwards',
                          animationDelay: `${i * 20}ms`,
                        } as React.CSSProperties}
                      >
                        {i % 2 === 0 ? '✦' : '🔥'}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setReviewForm((f) => ({ ...f, rating: s }));
                        setBurstRating(s);
                        setTimeout(() => setBurstRating(0), 600);
                        if (!commentCTAVisible) {
                          setTimeout(() => {
                            setCommentCTAVisible(true);
                            setTimeout(() => commentRef.current?.focus(), 350);
                          }, 500);
                        }
                      }}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-2xl sm:text-3xl select-none"
                      style={{
                        filter: s <= activeRating
                          ? 'drop-shadow(0 0 6px rgba(255,100,0,0.9)) brightness(1.15)'
                          : 'grayscale(0.7) brightness(0.5)',
                        transform: s <= activeRating ? 'scale(1.2)' : 'scale(1)',
                        animation: burstRating === s ? 'flameBurst 0.45s ease-out forwards' : undefined,
                        transition: burstRating === s ? 'none' : 'all 0.15s ease',
                      }}
                    >
                      🔥
                    </button>
                  </div>
                ))}
                {activeRating > 0 && (
                  <span className="ml-1 text-xs font-black" style={{ color: '#ff8c00' }}>
                    {heatLabel(activeRating)}
                  </span>
                )}
              </div>

              {activeRating > 0 && (
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(activeRating / 5) * 100}%`,
                      background: activeRating >= 5
                        ? 'linear-gradient(90deg, #ff6b00, #ff3d00, #ffcc00)'
                        : activeRating >= 3
                        ? 'linear-gradient(90deg, #ff8c00, #ff5500)'
                        : 'linear-gradient(90deg, #cc4400, #ff6600)',
                      boxShadow: activeRating >= 5 ? '0 0 10px 2px rgba(255,100,0,0.7)' : '0 0 6px rgba(255,100,0,0.4)',
                      transition: 'width 0.25s ease, box-shadow 0.25s ease',
                    }}
                  />
                </div>
              )}
            </div>

            {commentCTAVisible && (
              typeof window !== 'undefined' && !localStorage.getItem('token') ? (
                <div
                  className="rounded-xl p-5 text-center space-y-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,120,40,0.25)', animation: 'fadeSlideIn 0.35s ease forwards' }}
                >
                  <p className="text-sm font-bold text-white/80">
                    💬 Share your take on <span className="text-white font-black">{label}</span>
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,160,80,0.65)' }}>
                    Log in to rate and review on Erogram
                  </p>
                  <a
                    href={loginHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 rounded-xl text-white text-sm font-black tracking-wide shadow-lg transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 18px rgba(22,163,74,0.45)' }}
                  >
                    Login / Open free account
                  </a>
                </div>
              ) : (
                <div style={{ animation: 'fadeSlideIn 0.35s ease forwards' }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: 'rgba(255,180,80,0.85)' }}>
                    💬 Share your take on <span className="text-white">{label}</span>
                  </p>
                  <textarea
                    ref={commentRef}
                    placeholder={`What do you like most about ${entityName}?`}
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm((f) => ({ ...f, content: e.target.value }))}
                    maxLength={1000}
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-orange-200/30 outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,120,40,0.35)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,40,0.8)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,120,40,0.35)'; }}
                  />
                </div>
              )
            )}

            {submitError && <p className="text-xs text-red-400">{submitError}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={reviewSubmitting || !canSubmit}
              className="w-full py-2.5 rounded-xl text-white text-sm font-black tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: canSubmit ? 'linear-gradient(90deg, #ff6b00, #ff3d00)' : 'rgba(255,255,255,0.1)',
                boxShadow: canSubmit ? '0 4px 16px rgba(255,80,0,0.45)' : 'none',
              }}
            >
              {reviewSubmitting
                ? 'Submitting…'
                : canSubmit
                ? `Rate ${entityName} ${Array(reviewForm.rating).fill('🔥').join('')}`
                : 'Pick your heat level above'}
            </button>
          </div>
        ) : (
          <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,100,0,0.12)', border: '1px solid rgba(255,120,40,0.3)' }}>
            <p className="text-2xl mb-1">🔥🔥🔥</p>
            <p className="text-sm font-black text-white">{successTitle}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,160,80,0.7)' }}>
              {successSubtitle || submitMessage || `Thanks for rating ${entityName}`}
            </p>
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
