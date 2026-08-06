'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Play, X } from 'lucide-react';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import {
  getProfileLikedMedia,
  saveLikedMediaOrder,
  toggleProfileFeedLike,
  type ProfileLikedMediaItem,
} from '@/lib/actions/profileFeed';
import { useToast } from '@/components/Toast';
import { useProfileTheme } from './ProfileThemeContext';
import { type ProfileThemeId } from './profileTheme';
import { ProfileEyebrow, ProfileHeading } from './ProfileTypography';
import {
  loadLikesGridDensity,
  likesGridClass,
  likesGridGapClass,
  saveLikesGridDensity,
  type LikesGridDensity,
} from './profileGridDensity';

function LikesGridIcon({ cols, color }: { cols: LikesGridDensity; color: string }) {
  const rows = 2;
  const gap = cols === 6 ? 1.2 : cols === 3 ? 2.2 : 1.8;
  const cell = cols === 6 ? 2.6 : cols === 3 ? 5.2 : 4;
  const w = cols * cell + (cols - 1) * gap;
  const h = rows * cell + (rows - 1) * gap;
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: c * (cell + gap), y: r * (cell + gap) });
    }
  }
  return (
    <svg width="18" height="14" viewBox={`0 0 ${w} ${h}`} aria-hidden className="block">
      {cells.map((cellPos, i) => (
        <rect
          key={i}
          x={cellPos.x}
          y={cellPos.y}
          width={cell}
          height={cell}
          rx={cols === 6 ? 0.4 : 0.8}
          fill={color}
        />
      ))}
    </svg>
  );
}

function densityLabel(density: LikesGridDensity) {
  return `${density} per row`;
}

export default function MyLikesTab({
  themeMode: _themeMode,
}: {
  isPremium: boolean;
  themeMode?: ProfileThemeId;
}) {
  const { tokens } = useProfileTheme();
  const { toast } = useToast();
  const [mediaItems, setMediaItems] = useState<ProfileLikedMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridDensity, setGridDensity] = useState<LikesGridDensity>(() => loadLikesGridDensity());
  const [zoomItem, setZoomItem] = useState<ProfileLikedMediaItem | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (!zoomItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomItem(null);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const idx = mediaItems.findIndex((m) => m.mediaKey === zoomItem.mediaKey);
        if (idx < 0) return;
        const nextIdx = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
        if (nextIdx >= 0 && nextIdx < mediaItems.length) {
          setZoomItem(mediaItems[nextIdx]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomItem, mediaItems]);

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const mediaRes = await getProfileLikedMedia(token);
      setMediaItems(mediaRes.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const persistOrder = async (nextItems: ProfileLikedMediaItem[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setMediaItems(nextItems);
    const res = await saveLikedMediaOrder(token, nextItems.map((item) => item.mediaKey));
    if (!res.ok) toast('Could not save order', 'error');
  };

  const handleDragStart = (idx: number, e?: React.DragEvent) => {
    dragItem.current = idx;
    dragOverItem.current = idx;
    if (e?.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    }
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    if (from === null || to === null || from === to) return;
    const copy = [...mediaItems];
    const [removed] = copy.splice(from, 1);
    copy.splice(to, 0, removed);
    void persistOrder(copy);
  };

  const handleUnlikeMedia = async (item: ProfileLikedMediaItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const nextItems = mediaItems.filter((m) => m.mediaKey !== item.mediaKey);
    setMediaItems(nextItems);
    const res = await toggleProfileFeedLike(token, item.mediaKey, item.creatorId);
    if (!res.ok) {
      setMediaItems((prev) => [...prev, item]);
      toast('Could not remove like', 'error');
      return;
    }
    await saveLikedMediaOrder(token, nextItems.map((m) => m.mediaKey));
    toast('Removed from likes', 'success');
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <ProfileEyebrow>OnlyFans</ProfileEyebrow>
          <ProfileHeading size="xl" as="h2">My Likes</ProfileHeading>
          <p className="text-sm mt-2" style={{ color: tokens.muted }}>
            Photos and videos you hearted on Feed.
          </p>
        </div>
        {mediaItems.length > 0 && (
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${tokens.border}` }}>
            {([2, 3, 6] as LikesGridDensity[]).map((density) => {
              const active = gridDensity === density;
              const iconColor = active ? tokens.ink : tokens.muted;
              return (
                <button
                  key={density}
                  type="button"
                  onClick={() => {
                    setGridDensity(density);
                    saveLikesGridDensity(density);
                  }}
                  className="px-2.5 py-2 transition-all min-w-[2.75rem] flex items-center justify-center"
                  style={{
                    background: active ? tokens.accent : tokens.hover,
                  }}
                  title={densityLabel(density)}
                  aria-label={densityLabel(density)}
                >
                  <LikesGridIcon cols={density} color={iconColor} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: tokens.muted }}>Loading your likes...</p>
      ) : mediaItems.length === 0 ? (
        <div
          className="rounded-2xl border p-6 text-center"
          style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
        >
          <p className="text-sm font-semibold" style={{ color: tokens.text }}>No likes yet</p>
          <p className="text-sm mt-2" style={{ color: tokens.muted }}>
            Heart posts on Feed to see them here.
          </p>
        </div>
      ) : (
        <div className={`grid ${likesGridClass(gridDensity)} ${likesGridGapClass(gridDensity)}`}>
          {mediaItems.map((item, idx) => (
            <article
              key={item.mediaKey}
              draggable
              onDragStart={(e) => handleDragStart(idx, e)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="rounded-2xl border overflow-hidden group cursor-grab active:cursor-grabbing"
              style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
            >
              <div className="relative aspect-[3/4] bg-black">
                <button
                  type="button"
                  onClick={() => setZoomItem(item)}
                  className="absolute inset-0 w-full h-full cursor-zoom-in"
                  aria-label="View full size"
                >
                  {item.type === 'video' ? (
                    <>
                      <video
                        src={item.url}
                        className="w-full h-full object-cover pointer-events-none"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="absolute top-2 left-2 p-1 rounded-full bg-black/50">
                        <Play size={12} className="text-white" fill="white" />
                      </span>
                    </>
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover pointer-events-none" loading="lazy" />
                  )}
                </button>
                <div
                  className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none"
                  style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.92)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 11V6a2 2 0 0 0-4 0" /><path d="M14 10V4a2 2 0 0 0-4 0v2" /><path d="M10 10.5V5a2 2 0 0 0-4 0v8" />
                    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.7-2.3" />
                  </svg>
                  Drag
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnlikeMedia(item);
                  }}
                  className="absolute top-2 right-2 p-2 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Unlike"
                >
                  <Heart size={14} className="text-[#ef4444]" fill="#ef4444" />
                </button>
              </div>
              <div className="p-3">
                <a
                  href={ofCreatorProfileUrl(item.creatorUsername)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold truncate block hover:opacity-80"
                  style={{ color: tokens.text }}
                >
                  {item.creatorName}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {zoomItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out p-4"
          onClick={() => setZoomItem(null)}
        >
          <button
            type="button"
            onClick={() => setZoomItem(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X size={22} />
          </button>
          {zoomItem.type === 'video' ? (
            <video
              src={zoomItem.url}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={zoomItem.url}
              alt=""
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
