'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import {
  postProfileFeedComment,
  toggleProfileFeedLike,
  type ProfileFeedCommentItem,
} from '@/lib/actions/profileFeed';

type EngagementTokens = {
  border: string;
  text: string;
  muted: string;
  accent: string;
  ink: string;
  hover: string;
  fieldBg: string;
};

const darkTokens: EngagementTokens = {
  border: 'rgba(255,255,255,0.12)',
  text: '#ffffff',
  muted: '#9ca3af',
  accent: '#00AFF0',
  ink: '#ffffff',
  hover: 'rgba(255,255,255,0.06)',
  fieldBg: 'rgba(255,255,255,0.04)',
};

export default function CreatorMediaEngagement({
  creatorId,
  mediaType,
  url,
  likeCount: initialLikeCount,
  liked: initialLiked,
  commentCount: initialCommentCount,
  comments: initialComments,
  mediaKey,
  tokens = darkTokens,
  userPhotoUrl,
  showLikeButton = true,
}: {
  creatorId: string;
  mediaType: 'photo' | 'video';
  url: string;
  mediaKey: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  comments: ProfileFeedCommentItem[];
  tokens?: EngagementTokens;
  userPhotoUrl?: string | null;
  showLikeButton?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [comments, setComments] = useState(initialComments);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userPhotoUrl ?? null);

  useEffect(() => {
    setLiked(initialLiked);
    setLikeCount(initialLikeCount);
    setComments(initialComments);
    setCommentCount(initialCommentCount);
  }, [initialLiked, initialLikeCount, initialComments, initialCommentCount, mediaKey]);

  useEffect(() => {
    if (userPhotoUrl !== undefined) {
      setAvatarUrl(userPhotoUrl);
      return;
    }
    try {
      setAvatarUrl(localStorage.getItem('photoUrl'));
    } catch {
      setAvatarUrl(null);
    }
  }, [userPhotoUrl]);

  const handleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    const res = await toggleProfileFeedLike(token, mediaKey, creatorId);
    if (!res.ok) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      return;
    }
    setLiked(res.liked);
    setLikeCount(res.likeCount);
  };

  const submitComment = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setPosting(true);
    try {
      const res = await postProfileFeedComment(token, mediaKey, creatorId, text);
      if (!res.ok) return;
      setComments((prev) => [...prev, res.comment]);
      setCommentCount(res.commentCount);
      setDraft('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t space-y-2.5" style={{ borderColor: tokens.border }}>
      {showLikeButton && (
        <button
          type="button"
          onClick={handleLike}
          className="inline-flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-80"
          style={{ color: liked ? tokens.accent : tokens.text }}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 ? `${likeCount} like${likeCount === 1 ? '' : 's'}` : 'Like photo'}
        </button>
      )}

      {comments.length === 0 ? (
        <p className="text-xs" style={{ color: tokens.muted }}>
          No public comments yet.
        </p>
      ) : (
        comments.map((c) => (
          <div key={c._id} className="text-sm leading-snug">
            <span className="font-bold" style={{ color: tokens.text }}>
              {c.authorName}
            </span>
            <span style={{ color: tokens.muted }}> {c.content}</span>
          </div>
        ))
      )}

      <div className="flex gap-2 pt-1 items-start">
        <div
          className="w-8 h-8 rounded-full overflow-hidden shrink-0 border flex items-center justify-center text-[10px] font-bold uppercase"
          style={{ borderColor: tokens.border, backgroundColor: tokens.hover, color: tokens.muted }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            '?'
          )}
        </div>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add Public comment"
          maxLength={500}
          disabled={posting}
          className="flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/40 disabled:opacity-50"
          style={{
            backgroundColor: tokens.fieldBg,
            borderColor: tokens.border,
            color: tokens.text,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitComment();
          }}
        />
        <button
          type="button"
          onClick={submitComment}
          disabled={posting || !draft.trim()}
          className="px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-40 shrink-0"
          style={{ backgroundColor: tokens.accent, color: tokens.ink }}
        >
          Post
        </button>
      </div>
      {commentCount > comments.length && (
        <p className="text-[10px]" style={{ color: tokens.muted }}>
          {commentCount} public comment{commentCount === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
