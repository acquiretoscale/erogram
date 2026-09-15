'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import FallbackImage from '@/components/FallbackImage';
import UpgradeModal from '@/components/UpgradeModal';
import type { DirectoryRankItem } from './types';

const PLACEHOLDER = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';
const PENDING_KEY = 'pendingDirectoryBookmark';

function imageSrc(image: string) {
  if (!image) return PLACEHOLDER;
  if (image.startsWith('https://') || image.startsWith('http://') || image.startsWith('/')) return image;
  return PLACEHOLDER;
}

function localBookmarkKey(kind: 'ainsfw' | 'explore', id: string) {
  return kind === 'ainsfw' ? `ainsfw_bookmark_${id}` : `explore_bookmark_${id}`;
}

type Props = {
  item: DirectoryRankItem;
  rank: number;
  ctaLabel: string;
  viewsLabel: string;
};

function RankBookmark({ item }: { item: DirectoryRankItem }) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [bookmarkDocId, setBookmarkDocId] = useState<string | null>(null);

  const applyLocal = useCallback(
    (on: boolean) => {
      if (item.bookmarkKind === 'bot') return;
      try {
        localStorage.setItem(localBookmarkKey(item.bookmarkKind, item.bookmarkId), on ? '1' : '0');
      } catch {}
      setBookmarked(on);
    },
    [item.bookmarkId, item.bookmarkKind],
  );

  const saveBot = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (bookmarked && bookmarkDocId) {
      await axios.delete(`/api/bookmarks/${bookmarkDocId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookmarked(false);
      setBookmarkDocId(null);
      return;
    }
    const res = await axios.post(
      '/api/bookmarks',
      { itemType: 'bot', itemId: item.bookmarkId },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setBookmarked(true);
    setBookmarkDocId(res.data._id);
  }, [bookmarked, bookmarkDocId, item.bookmarkId]);

  useEffect(() => {
    try {
      if (item.bookmarkKind !== 'bot') {
        setBookmarked(localStorage.getItem(localBookmarkKey(item.bookmarkKind, item.bookmarkId)) === '1');
      }
      const raw = localStorage.getItem(PENDING_KEY);
      const token = localStorage.getItem('token');
      if (!raw || !token) return;
      const pending = JSON.parse(raw) as { kind?: string; id?: string };
      if (pending.kind !== item.bookmarkKind || pending.id !== item.bookmarkId) return;
      localStorage.removeItem(PENDING_KEY);
      if (item.bookmarkKind === 'bot') {
        saveBot().catch(() => {});
      } else {
        applyLocal(true);
      }
    } catch {}
  }, [applyLocal, item.bookmarkId, item.bookmarkKind, saveBot]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) {
      try {
        if (item.bookmarkKind === 'bot') {
          localStorage.setItem('pendingBookmark', JSON.stringify({ itemId: item.bookmarkId, itemType: 'bot' }));
        } else {
          localStorage.setItem(PENDING_KEY, JSON.stringify({ kind: item.bookmarkKind, id: item.bookmarkId }));
        }
      } catch {}
      const redirect =
        item.bookmarkKind === 'bot' ? '/profile' : `${window.location.pathname}${window.location.search}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    setLoading(true);
    try {
      if (item.bookmarkKind === 'bot') await saveBot();
      else applyLocal(!bookmarked);
    } catch (err: any) {
      if (err?.response?.status === 403 && err?.response?.data?.upgrade) {
        setShowUpgrade(true);
      } else if (err?.response?.status === 401) {
        try {
          localStorage.setItem('pendingBookmark', JSON.stringify({ itemId: item.bookmarkId, itemType: 'bot' }));
        } catch {}
        router.push('/login?redirect=%2Fprofile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`inline-flex items-center justify-center w-14 shrink-0 border border-gray-200 bg-white hover:border-[#c0392f] hover:bg-[#c0392f]/5 transition-colors ${
          loading ? 'opacity-50' : ''
        } ${bookmarked ? 'border-[#c0392f] bg-[#c0392f]/5' : ''}`}
        aria-label={bookmarked ? 'Remove from saved' : 'Save'}
        title={bookmarked ? 'Remove from saved' : 'Save'}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" fill={bookmarked ? '#c0392f' : 'none'} stroke={bookmarked ? '#c0392f' : '#111111'} strokeWidth="1.7" strokeLinejoin="round">
          <path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v16L12 16.25 5.5 21V5A1.5 1.5 0 0 1 7 3.5z" />
        </svg>
      </button>
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} reason="bookmark_limit" />
    </>
  );
}

export default function BestDirectoryRankCard({ item, rank, ctaLabel, viewsLabel }: Props) {
  const metaLine = [
    typeof item.views === 'number' && item.views > 0 ? `${item.views.toLocaleString()} ${viewsLabel}` : null,
    item.country || null,
    item.category || null,
  ].filter(Boolean) as string[];

  return (
    <article className="relative bg-white rounded-xl border border-black/[0.06] p-4 md:p-5 pr-16 md:pr-20">
      <span className="absolute top-3 right-4 md:top-4 md:right-5 text-[40px] md:text-[56px] font-semibold tabular-nums leading-none text-[#c0392f] tracking-tight">
        {String(rank).padStart(2, '0')}
      </span>

      <div className="flex flex-col md:flex-row gap-5 md:gap-6">
        <div className="w-full md:w-1/3 flex-shrink-0">
          <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100 ring-1 ring-inset ring-black/5">
            <FallbackImage src={imageSrc(item.image)} alt={item.name} className="object-cover" />
          </div>
        </div>

        <div className="flex-grow flex flex-col justify-center min-w-0">
          <h2 className="text-[26px] md:text-[30px] font-medium tracking-tight text-gray-900 mb-2 leading-none">
            <Link href={item.href} className="hover:text-[#c0392f]">
              {item.name}
            </Link>
          </h2>
          {metaLine.length > 0 ? (
            <p className="text-[11px] tracking-[0.14em] uppercase text-gray-400 mb-3">{metaLine.join('  ·  ')}</p>
          ) : null}
          {item.description ? (
            <p className="text-[15px] text-gray-500 mb-4 leading-relaxed">{item.description}</p>
          ) : null}
          <div className="flex items-stretch gap-2">
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block flex-1 md:flex-none text-center py-4 px-8 bg-[#c0392f] text-white text-[11px] font-semibold tracking-[0.22em] uppercase hover:opacity-90 transition-opacity"
            >
              {ctaLabel}
            </a>
            <RankBookmark item={item} />
          </div>
        </div>
      </div>
    </article>
  );
}
