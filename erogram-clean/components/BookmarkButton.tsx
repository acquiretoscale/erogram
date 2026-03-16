'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import UpgradeModal from './UpgradeModal';

interface BookmarkButtonProps {
  itemId: string;
  itemType: 'group' | 'bot';
  initialBookmarked?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function BookmarkButton({
  itemId,
  itemType,
  initialBookmarked = false,
  size = 'sm',
  className = '',
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const router = useRouter();

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      if (bookmarked && bookmarkId) {
        await axios.delete(`/api/bookmarks/${bookmarkId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookmarked(false);
        setBookmarkId(null);
      } else {
        const res = await axios.post('/api/bookmarks', { itemType, itemId }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookmarked(true);
        setBookmarkId(res.data._id);
      }
    } catch (err: any) {
      if (err?.response?.status === 403 && err?.response?.data?.upgrade) {
        setShowUpgrade(true);
      } else if (err?.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [bookmarked, bookmarkId, itemId, itemType, router]);

  const iconSize = size === 'sm' ? 18 : 24;

  return (
    <>
      <button
        onClick={toggle}
        disabled={loading}
        className={`flex items-center justify-center transition-all duration-200 ${
          loading ? 'opacity-50' : 'hover:scale-110 active:scale-90'
        } ${className}`}
        aria-label={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
        title={bookmarked ? 'Remove from saved' : 'Save to bookmarks'}
      >
        {bookmarked ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="#f97316" className="drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" className="opacity-80 hover:opacity-100 transition-opacity">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="bookmark_limit"
      />
    </>
  );
}
