'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, CircleUser, Heart, Play, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getProfileMediaFeed,
  toggleProfileFeedLike,
  type ProfileFeedMediaItem,
} from '@/lib/actions/profileFeed';
import CreatorMediaEngagement from '@/components/CreatorMediaEngagement';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import { useProfileTheme } from './ProfileThemeContext';
import { ProfileHeading } from './ProfileTypography';
import ProfileCategoryPills from './ProfileCategoryPills';
import {
  markProfileFeedExplored,
} from '@/lib/profileHomeSetup';

function OnlyFansIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
      <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
    </svg>
  );
}

function FeedVisitButtons({ username }: { username: string }) {
  const iconBtn =
    'inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all hover:opacity-95 active:scale-[0.96]';
  return (
    <div className="flex flex-row gap-2">
      <a
        href={`/go/${username}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Profile"
        title="Visit Profile"
        className={iconBtn}
        style={{
          color: '#ffffff',
          backgroundColor: '#00AFF0',
          boxShadow: '0 4px 14px rgba(0,175,240,0.35)',
        }}
      >
        <OnlyFansIcon size={16} />
      </a>
      <a
        href={ofCreatorProfileUrl(username)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Erogram profile"
        title="Visit Erogram profile"
        className={iconBtn}
        style={{
          color: '#111827',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0,0,0,0.14)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <CircleUser size={18} strokeWidth={2} />
      </a>
    </div>
  );
}

function FeedLazyImage({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || src) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSrc(url);
          observer.disconnect();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [url, src]);

  return (
    <div ref={ref} className="bg-black min-h-[240px] flex items-center justify-center">
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full max-h-[72vh] object-contain mx-auto block"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="w-full aspect-[4/5] max-h-[72vh] animate-pulse mx-auto"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        />
      )}
    </div>
  );
}

function FeedVideoCard({ url }: { url: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || src) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSrc(url);
      },
      { rootMargin: '240px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [url, src]);

  useEffect(() => {
    const el = wrapRef.current;
    const video = videoRef.current;
    if (!el || !video || !src) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          video.play().catch(() => {});
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.45, 0.75] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={wrapRef} className="relative w-full bg-black min-h-[240px]">
      {!src ? (
        <div
          className="w-full aspect-[4/5] max-h-[72vh] animate-pulse mx-auto"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            src={src}
            className="w-full max-h-[72vh] object-contain mx-auto block"
            playsInline
            loop
            muted
            preload="none"
            controls={playing}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          {!playing && (
            <button
              type="button"
              aria-label="Play video"
              onClick={() => videoRef.current?.play()}
              className="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              <span className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Play size={22} className="text-white ml-1" fill="white" />
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

function FeedPostCard({
  item,
  saved,
  onLike,
  onSave,
  tokens,
  userPhotoUrl,
}: {
  item: ProfileFeedMediaItem;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  tokens: { border: string; card: string; text: string; muted: string; accent: string; ink: string; hover: string };
  userPhotoUrl: string | null;
}) {

  return (
    <article
      className="rounded-2xl border overflow-hidden mb-5 last:mb-0"
      style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
    >
      <div className="relative">
        {item.type === 'video' ? (
          <FeedVideoCard url={item.url} />
        ) : (
          <FeedLazyImage url={item.url} />
        )}
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
          <ProfileCategoryPills
            categories={item.profileCategories}
            accent={tokens.accent}
            muted={tokens.muted}
            border={tokens.border}
            variant="overlay"
          />
        </div>
      </div>

      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        <FeedVisitButtons username={item.creatorUsername} />
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onLike}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
            style={{
              color: item.liked ? tokens.accent : tokens.text,
              backgroundColor: item.liked ? `${tokens.accent}22` : tokens.hover,
            }}
          >
            <Heart size={15} fill={item.liked ? 'currentColor' : 'none'} />
            {item.likeCount > 0 ? item.likeCount : 'Like'}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{
              color: saved ? tokens.accent : tokens.muted,
              backgroundColor: tokens.hover,
            }}
            aria-label={saved ? 'Remove from saved' : 'Save creator'}
          >
            <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
        <CreatorMediaEngagement
          creatorId={item.creatorId}
          mediaType={item.type}
          url={item.url}
          mediaKey={item.mediaKey}
          likeCount={item.likeCount}
          liked={item.liked}
          commentCount={item.commentCount}
          comments={item.comments}
          showLikeButton={false}
          userPhotoUrl={userPhotoUrl}
          tokens={{
            border: tokens.border,
            text: tokens.text,
            muted: tokens.muted,
            accent: tokens.accent,
            ink: tokens.ink,
            hover: tokens.hover,
            fieldBg: tokens.hover,
          }}
        />
      </div>
    </article>
  );
}

export default function ProfileFeedTab({
  interests,
  preferredPlatforms,
  onNavigateSettings,
}: {
  interests: string[];
  preferredPlatforms: string[];
  onNavigateSettings: () => void;
}) {
  const { tokens } = useProfileTheme();
  const { toast } = useToast();
  const [savedCreatorIds, setSavedCreatorIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<ProfileFeedMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [needsInterests, setNeedsInterests] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const feedSeedRef = useRef('initial');
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasOfInterests = interests.length > 0;

  useEffect(() => {
    markProfileFeedExplored();
  }, []);

  useEffect(() => {
    try {
      setUserPhotoUrl(localStorage.getItem('photoUrl'));
    } catch {
      setUserPhotoUrl(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/onlyfans/save', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { savedIds: [] }))
      .then((data) => setSavedCreatorIds(new Set(Array.isArray(data.savedIds) ? data.savedIds : [])))
      .catch(() => {});
  }, []);

  const handleToggleSave = async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const alreadySaved = savedCreatorIds.has(creatorId);
    setSavedCreatorIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });
    try {
      const res = await fetch('/api/onlyfans/save', {
        method: alreadySaved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast(alreadySaved ? 'Removed from saved' : 'Saved', 'success');
    } catch {
      setSavedCreatorIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(creatorId);
        else next.delete(creatorId);
        return next;
      });
      toast('Could not save creator', 'error');
    }
  };

  const fetchFeedPage = useCallback(async (mode: 'reset' | 'more') => {
    const token = localStorage.getItem('token');
    if (!token || loadingRef.current) return;

    loadingRef.current = true;
    if (mode === 'reset') {
      feedSeedRef.current = String(Date.now());
      offsetRef.current = 0;
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await getProfileMediaFeed(token, {
        rotateSeed: feedSeedRef.current,
        offset: mode === 'reset' ? 0 : offsetRef.current,
      });
      if (res.needsInterests) {
        setNeedsInterests(true);
        setItems([]);
        setHasMore(false);
        return;
      }
      setNeedsInterests(false);
      if (mode === 'reset') {
        setItems(res.items);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((row) => row.mediaKey));
          const next = res.items.filter((row) => !seen.has(row.mediaKey));
          return next.length ? [...prev, ...next] : prev;
        });
      }
      offsetRef.current = res.nextOffset;
      setHasMore(res.hasMore);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (hasOfInterests) void fetchFeedPage('reset');
    else {
      setLoading(false);
      setNeedsInterests(true);
    }
  }, [hasOfInterests, fetchFeedPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          void fetchFeedPage('more');
        }
      },
      { rootMargin: '320px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchFeedPage, items.length]);

  const handleLike = async (item: ProfileFeedMediaItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setItems((prev) =>
      prev.map((row) =>
        row.mediaKey === item.mediaKey
          ? {
              ...row,
              liked: !row.liked,
              likeCount: row.liked ? Math.max(0, row.likeCount - 1) : row.likeCount + 1,
            }
          : row,
      ),
    );
    const res = await toggleProfileFeedLike(token, item.mediaKey, item.creatorId);
    if (!res.ok) {
      setItems((prev) =>
        prev.map((row) => (row.mediaKey === item.mediaKey ? item : row)),
      );
      return;
    }
    setItems((prev) =>
      prev.map((row) =>
        row.mediaKey === item.mediaKey
          ? { ...row, liked: res.liked, likeCount: res.likeCount }
          : row,
      ),
    );
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-3 border-b pb-4 mb-5" style={{ borderColor: tokens.border }}>
        <ProfileHeading size="md" as="h3" className="!mt-0">
          My Feed
        </ProfileHeading>
        {hasOfInterests && (items.length > 0 || loading) && (
          <button
            type="button"
            onClick={() => void fetchFeedPage('reset')}
            disabled={loading || loadingMore}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ color: tokens.text }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="rounded-2xl border overflow-hidden animate-pulse"
              style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
            >
              <div className="aspect-[4/5]" style={{ backgroundColor: tokens.hover }} />
              <div className="h-16" style={{ backgroundColor: tokens.hover }} />
            </div>
          ))}
        </div>
      ) : needsInterests ? (
        <div
          className="rounded-2xl border px-5 py-8 text-center"
          style={{ borderColor: tokens.border, backgroundColor: tokens.hover }}
        >
          <p className="text-sm mb-4" style={{ color: tokens.muted }}>
            Add OnlyFans interests in Settings to personalize your feed.
          </p>
          <button
            type="button"
            onClick={onNavigateSettings}
            className="text-[11px] font-bold tracking-[0.2em] uppercase px-5 py-2.5 rounded-full border transition-opacity hover:opacity-90"
            style={{ borderColor: tokens.border, color: tokens.text, backgroundColor: tokens.card }}
          >
            Settings
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: tokens.muted }}>
          No media found for your interests yet.
        </p>
      ) : (
        <div className="max-w-xl mx-auto">
          {items.map((item) => (
            <FeedPostCard
              key={item.mediaKey}
              item={item}
              saved={savedCreatorIds.has(item.creatorId)}
              onLike={() => handleLike(item)}
              onSave={() => handleToggleSave(item.creatorId)}
              tokens={tokens}
              userPhotoUrl={userPhotoUrl}
            />
          ))}
          <div ref={sentinelRef} className="h-1" aria-hidden />
          {loadingMore && (
            <div className="py-6 flex justify-center">
              <RefreshCw size={18} className="animate-spin" style={{ color: tokens.muted }} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
