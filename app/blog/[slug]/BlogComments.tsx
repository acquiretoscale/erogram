'use client';

import { useRef, useState } from 'react';
import { submitArticleComment, type ArticleCommentData } from '@/lib/actions/articleComments';

function timeAgo(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initial(name: string): string {
  return (name || 'A').trim().charAt(0).toUpperCase();
}

const AVATAR_TINTS = [
  'linear-gradient(135deg,#ff6b00,#ff3d00)',
  'linear-gradient(135deg,#8e44ad,#5b2c83)',
  'linear-gradient(135deg,#2980b9,#1a5276)',
  'linear-gradient(135deg,#16a085,#0e6655)',
  'linear-gradient(135deg,#c0392f,#7d241b)',
  'linear-gradient(135deg,#d35400,#9c3a00)',
];
function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

export default function BlogComments({ slug, initialComments }: { slug: string; initialComments: ArticleCommentData[] }) {
  const [comments] = useState<ArticleCommentData[]>(initialComments);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const ready = content.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!ready) { setError('Please write a comment first.'); return; }
    setSubmitting(true);
    try {
      const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
      await submitArticleComment(slug, content, name, token);
      setDone(true);
      setContent('');
      setName('');
    } catch (err: any) {
      setError(err?.message || 'Could not post your comment. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="comments" className="not-prose mt-16 scroll-mt-24">
      <style>{`
        @keyframes blogFadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="font-sans font-black text-[1.6rem] sm:text-[1.9rem] tracking-tight text-[#0f0c0a]">
          Join the conversation
        </h2>
        <span className="text-[13px] font-semibold tracking-wide text-[#9a8f88] tabular-nums">
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      {/* Composer — premium dark panel matching creator pages */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-7 mb-12"
        style={{
          background: 'linear-gradient(135deg,#120d0b 0%,#1a0f0c 55%,#0a0706 100%)',
          border: '1px solid rgba(192,57,47,0.28)',
          boxShadow: '0 28px 70px -34px rgba(0,0,0,0.7), inset 0 1px 0 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="pointer-events-none absolute -top-24 -right-16 h-52 w-52 rounded-full bg-[#c0392f]/20 blur-3xl" />
        <div className="relative">
          {done ? (
            <div className="flex items-center gap-4 py-2" style={{ animation: 'blogFadeIn 0.35s ease forwards' }}>
              <span className="flex items-center justify-center w-11 h-11 rounded-full text-xl shrink-0" style={{ background: 'rgba(22,163,74,0.16)', color: '#34d399' }}>✓</span>
              <div>
                <p className="font-sans font-black text-[15px] text-white">Thanks — your comment is in review.</p>
                <p className="text-[13px] text-white/55 mt-0.5">It’ll appear here once approved by our editors.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(255,150,90,0.85)' }}>
                Share your take
              </p>
              <textarea
                ref={taRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="What did you think of this piece? Add to the discussion…"
                className="w-full rounded-xl px-4 py-3 text-[15px] leading-[1.6] text-white placeholder:text-white/30 outline-none resize-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(192,57,47,0.35)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,90,70,0.85)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(192,57,47,0.18)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(192,57,47,0.35)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="Your name (optional)"
                  className="flex-1 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder:text-white/30 outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,90,70,0.6)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="submit"
                  disabled={submitting || !ready}
                  className="shrink-0 rounded-xl text-white text-[13px] font-black tracking-[0.08em] uppercase px-7 py-3 transition-all disabled:cursor-not-allowed"
                  style={{
                    background: ready ? 'linear-gradient(90deg,#ff6b00,#ff3d00)' : 'rgba(255,255,255,0.08)',
                    boxShadow: ready ? '0 6px 20px rgba(255,80,0,0.4)' : 'none',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Posting…' : 'Post comment'}
                </button>
              </div>
              {error && <p className="text-[13px] text-[#ff6b5e] mt-3">{error}</p>}
              <p className="text-[12px] text-white/40 mt-3">Comments are moderated before they appear. Keep it respectful.</p>
            </form>
          )}
        </div>
      </div>

      {/* List */}
      {comments.length === 0 ? (
        <p className="text-[15px] text-[#6a6258] py-2">No comments yet — be the first to start the conversation.</p>
      ) : (
        <ul className="space-y-6">
          {comments.map((c) => (
            <li key={c._id} className="flex gap-4 rounded-xl border border-black/[0.07] bg-[#faf8f6] p-5">
              {c.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.authorAvatar} alt={c.authorName} className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-black/10" referrerPolicy="no-referrer" />
              ) : (
                <span
                  className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 text-white font-black text-[16px]"
                  style={{ background: tintFor(c.authorName) }}
                >
                  {initial(c.authorName)}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-black text-[14px] text-[#0f0c0a]">{c.authorName}</span>
                  <span className="text-[12px] text-[#a09890]">· {timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-[15px] leading-[1.65] text-[#2a2622] mt-1.5 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
