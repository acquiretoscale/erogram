'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Film, ImageIcon, Loader2, Play, Trash2, Upload } from 'lucide-react';
import {
  canManageCreatorMedia,
  removeCreatorFeedPhoto,
  removeCreatorFeedVideo,
  uploadCreatorFeedPhoto,
  uploadCreatorFeedVideo,
} from '@/lib/actions/creatorMediaUpload';
import {
  getCreatorMediaEngagement,
  type CreatorMediaEngagement as MediaEngagement,
} from '@/lib/actions/profileFeed';
import CreatorMediaEngagement from '@/components/CreatorMediaEngagement';
import {
  MAX_CREATOR_PHOTO_BYTES,
  MAX_CREATOR_PHOTO_MB,
  MAX_CREATOR_VIDEO_BYTES,
  MAX_CREATOR_VIDEO_MB,
  humanUploadError,
  humanUploadTooLarge,
} from '@/lib/creatorMediaLimits';

type FeedItem = {
  id: string;
  type: 'photo' | 'video';
  url: string;
};

function buildFeedItems(photos: string[], videos: string[]): FeedItem[] {
  const items: FeedItem[] = [];
  const maxLen = Math.max(photos.length, videos.length);
  for (let i = maxLen - 1; i >= 0; i--) {
    if (videos[i]) items.push({ id: `v-${i}-${videos[i]}`, type: 'video', url: videos[i] });
    if (photos[i]) items.push({ id: `p-${i}-${photos[i]}`, type: 'photo', url: photos[i] });
  }
  return items;
}

function FeedVideoCard({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative group rounded-2xl overflow-hidden bg-black/40 border border-white/10">
      <video
        ref={ref}
        src={url}
        className="w-full h-auto block max-h-[520px] object-cover"
        playsInline
        preload="metadata"
        controls={playing}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          aria-label="Play video"
          onClick={() => ref.current?.play()}
          className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors"
        >
          <span className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
          </span>
        </button>
      )}
    </div>
  );
}

export default function CreatorMediaFeed({
  slug,
  creatorId,
  creatorName,
  avatar,
  header,
  extraPhotos,
  extraVideos,
  isAdmin,
  onLightbox,
  onUpdated,
}: {
  slug: string;
  creatorId: string;
  creatorName: string;
  avatar?: string;
  header?: string;
  extraPhotos: string[];
  extraVideos: string[];
  isAdmin: boolean;
  onLightbox: (url: string) => void;
  onUpdated: () => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const feedRootRef = useRef<HTMLElement>(null);
  const [canManage, setCanManage] = useState(isAdmin);
  const [uploadKind, setUploadKind] = useState<'photo' | 'video' | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [engagementMap, setEngagementMap] = useState<Map<string, MediaEngagement>>(new Map());
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [engagementReady, setEngagementReady] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setCanManage(true);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    canManageCreatorMedia(token, slug).then(setCanManage).catch(() => setCanManage(false));
  }, [isAdmin, slug]);

  const feedItems = useMemo(
    () => buildFeedItems(extraPhotos || [], extraVideos || []),
    [extraPhotos, extraVideos],
  );

  const profilePhotos = useMemo(() => {
    const items: { url: string; label: string; id: string }[] = [];
    if (avatar) items.push({ url: avatar, label: 'Profile', id: `profile-${avatar}` });
    if (header) items.push({ url: header, label: 'Cover', id: `cover-${header}` });
    return items;
  }, [avatar, header]);

  const totalPosts = profilePhotos.length + feedItems.length;

  useEffect(() => {
    try {
      setUserPhotoUrl(localStorage.getItem('photoUrl'));
    } catch {
      setUserPhotoUrl(null);
    }
  }, []);

  useEffect(() => {
    const el = feedRootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setEngagementReady(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEngagementReady(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!engagementReady || !creatorId) return;
    const mediaItems = [
      ...profilePhotos.map((p) => ({ type: 'photo' as const, url: p.url })),
      ...feedItems.map((f) => ({ type: f.type, url: f.url })),
    ];
    if (!mediaItems.length) {
      setEngagementMap(new Map());
      return;
    }
    const token = localStorage.getItem('token');
    getCreatorMediaEngagement(token, creatorId, mediaItems)
      .then((res) => {
        if (!res.ok) return;
        setEngagementMap(new Map(res.items.map((row) => [row.mediaKey, row])));
      })
      .catch(() => {});
  }, [engagementReady, creatorId, profilePhotos, feedItems]);

  const engagementFor = (type: 'photo' | 'video', url: string) => {
    const mediaKey = `${creatorId}:${type}:${url}`;
    return (
      engagementMap.get(mediaKey) || {
        mediaKey,
        type,
        url,
        likeCount: 0,
        commentCount: 0,
        liked: false,
        comments: [],
      }
    );
  };

  const handleUpload = useCallback(
    async (file: File, kind: 'photo' | 'video') => {
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (kind === 'photo') {
        if (file.size > MAX_CREATOR_PHOTO_BYTES) {
          setError(humanUploadTooLarge(file.name, false));
          return;
        }
        if (!file.type.startsWith('image/')) {
          setError('Choose a photo file');
          return;
        }
      } else {
        if (file.size > MAX_CREATOR_VIDEO_BYTES) {
          setError(humanUploadTooLarge(file.name, true));
          return;
        }
        if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) {
          setError('Use MP4, WebM, or MOV');
          return;
        }
      }

      setUploadKind(kind);
      try {
        const res =
          kind === 'photo'
            ? await uploadCreatorFeedPhoto(token, slug, file)
            : await uploadCreatorFeedVideo(token, slug, file);
        if ('error' in res) {
          setError(humanUploadError(res.error, file.name));
        } else {
          onUpdated();
        }
      } catch (e: any) {
        setError(humanUploadError(e?.message || 'Upload failed', file.name));
      } finally {
        setUploadKind(null);
      }
    },
    [slug, onUpdated],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!canManage) return;
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const kind = file.type.startsWith('video/') ? 'video' : 'photo';
      handleUpload(file, kind);
    },
    [canManage, handleUpload],
  );

  const handleRemove = async (item: FeedItem) => {
    if (!confirm('Remove this post from your feed?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const res =
      item.type === 'photo'
        ? await removeCreatorFeedPhoto(token, slug, item.url)
        : await removeCreatorFeedVideo(token, slug, item.url);
    if ('error' in res) setError(res.error);
    else onUpdated();
  };

  const showFeed = totalPosts > 0 || canManage;

  if (!showFeed) return null;

  return (
    <section ref={feedRootRef} className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-[#00AFF0]" />
          Feed
        </h2>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {totalPosts} {totalPosts === 1 ? 'item' : 'items'}
        </span>
      </div>

      {canManage && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mb-5 rounded-2xl border-2 border-dashed p-5 transition-all ${
            dragOver
              ? 'border-[#00AFF0]/70 bg-[#00AFF0]/10'
              : 'border-white/15 bg-white/[0.03] hover:border-white/25'
          }`}
        >
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, 'photo');
              e.target.value = '';
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, 'video');
              e.target.value = '';
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white mb-1">Share to your Erogram feed</p>
              <p className="text-xs text-gray-500">
                Photos max {MAX_CREATOR_PHOTO_MB} MB · Videos max {MAX_CREATOR_VIDEO_MB} MB
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={uploadKind !== null}
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00AFF0] text-white text-sm font-bold hover:bg-[#009dd9] disabled:opacity-50 transition-all"
              >
                {uploadKind === 'photo' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                Photo
              </button>
              <button
                type="button"
                disabled={uploadKind !== null}
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-bold hover:bg-white/15 disabled:opacity-50 transition-all"
              >
                {uploadKind === 'video' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Film className="w-4 h-4" />
                )}
                Video
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
            <Upload className="w-3.5 h-3.5" />
            Drag and drop a photo or video here
          </div>

          {error && <p className="mt-3 text-xs font-semibold text-red-400">{error}</p>}
        </div>
      )}

      {profilePhotos.length > 0 && (
        <div className={`grid gap-4 ${profilePhotos.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'} ${feedItems.length > 0 || canManage ? 'mb-5' : ''}`}>
          {profilePhotos.map((item) => {
            const engagement = engagementFor('photo', item.url);
            return (
            <div
              key={item.id}
              className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a1520]"
            >
              <button
                type="button"
                onClick={() => onLightbox(item.url)}
                className="group w-full text-left cursor-zoom-in"
              >
                <img
                  src={item.url}
                  alt={`${creatorName} ${item.label.toLowerCase()} photo`}
                  className={`w-full object-cover block ${item.label === 'Cover' ? 'aspect-[16/9]' : 'aspect-square'}`}
                  loading="lazy"
                  decoding="async"
                  width={item.label === 'Cover' ? 960 : 640}
                  height={item.label === 'Cover' ? 540 : 640}
                />
                <div className="px-3 py-2 flex items-center gap-2 border-t border-white/10 bg-white/[0.03]">
                  <Camera className="w-3.5 h-3.5 text-[#00AFF0]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-[#00AFF0] transition-colors">
                    {item.label}
                  </span>
                </div>
              </button>
              <div className="px-3 pb-3">
                <CreatorMediaEngagement
                  creatorId={creatorId}
                  mediaType="photo"
                  url={item.url}
                  mediaKey={engagement.mediaKey}
                  likeCount={engagement.likeCount}
                  liked={engagement.liked}
                  commentCount={engagement.commentCount}
                  comments={engagement.comments}
                  userPhotoUrl={userPhotoUrl}
                />
              </div>
            </div>
          )})}
        </div>
      )}

      {feedItems.length === 0 ? (
        canManage && profilePhotos.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8 rounded-2xl border border-white/10 bg-white/[0.02]">
            Your feed is empty. Upload your first photo or video above.
          </p>
        ) : null
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {feedItems.map((item) => {
            const engagement = engagementFor(item.type, item.url);
            return (
            <article
              key={item.id}
              className="break-inside-avoid mb-4 group relative rounded-2xl border border-white/10 bg-[#0a1520] overflow-hidden"
            >
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-black/60 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all backdrop-blur-sm"
                  aria-label="Remove post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {item.type === 'photo' ? (
                <button
                  type="button"
                  onClick={() => onLightbox(item.url)}
                  className="w-full hover:border-[#00AFF0]/40 transition-all cursor-zoom-in"
                >
                  <img
                    src={item.url}
                    alt={`${creatorName} feed photo`}
                    className="w-full h-auto block"
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={800}
                  />
                </button>
              ) : (
                <FeedVideoCard url={item.url} />
              )}

              <div className="px-3 pb-3">
                <div className="px-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  {item.type === 'photo' ? (
                    <Camera className="w-3 h-3 text-[#00AFF0]" />
                  ) : (
                    <Film className="w-3 h-3 text-[#00AFF0]" />
                  )}
                  {item.type}
                </div>
                <CreatorMediaEngagement
                  creatorId={creatorId}
                  mediaType={item.type}
                  url={item.url}
                  mediaKey={engagement.mediaKey}
                  likeCount={engagement.likeCount}
                  liked={engagement.liked}
                  commentCount={engagement.commentCount}
                  comments={engagement.comments}
                  userPhotoUrl={userPhotoUrl}
                />
              </div>
            </article>
          )})}
        </div>
      )}
    </section>
  );
}
