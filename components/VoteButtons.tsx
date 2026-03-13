'use client';

import { useState } from 'react';

interface VoteButtonsProps {
  groupId: string;
  initialLikes: number;
  initialDislikes: number;
  userVote: 'like' | 'dislike' | null;
  size?: 'sm' | 'md';
  compact?: boolean;
}

export default function VoteButtons({ groupId, initialLikes, initialDislikes, userVote: initialVote, size = 'sm', compact }: VoteButtonsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [vote, setVote] = useState<'like' | 'dislike' | null>(initialVote);
  const [busy, setBusy] = useState(false);

  const handleVote = async (type: 'like' | 'dislike') => {
    if (busy) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/vault/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ groupId, vote: type }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setVote(data.userVote);
      }
    } catch { /* silent */ }
    finally { setBusy(false); }
  };

  const iconPx = size === 'sm' ? 13 : 16;
  const textCls = size === 'sm' ? 'text-[10px]' : 'text-[12px]';

  return (
    <div className="flex items-center gap-0.5" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
      <button
        onClick={() => handleVote('like')}
        disabled={busy}
        className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all disabled:opacity-60 ${
          vote === 'like'
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10'
        }`}
        title="Like"
      >
        <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill={vote === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />
        </svg>
        {(!compact || likes > 0) && <span className={`${textCls} font-bold`}>{likes || ''}</span>}
      </button>
      <button
        onClick={() => handleVote('dislike')}
        disabled={busy}
        className={`flex items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all disabled:opacity-60 ${
          vote === 'dislike'
            ? 'bg-red-500/20 text-red-400'
            : 'text-white/30 hover:text-red-400 hover:bg-red-500/10'
        }`}
        title="Dislike"
      >
        <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill={vote === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z" />
        </svg>
        {(!compact || dislikes > 0) && <span className={`${textCls} font-bold`}>{dislikes || ''}</span>}
      </button>
    </div>
  );
}
