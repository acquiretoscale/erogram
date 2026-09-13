'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAdVideos, renameAdVideoFile, type AdVideoRow } from '@/lib/actions/adVideoAdmin';

function formatBytes(bytes: number): string {
  if (!bytes) return 'unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function filenameWithoutExt(filename: string): string {
  return filename.replace(/\.mp4$/i, '');
}

export default function VideoAdsClient() {
  const [videos, setVideos] = useState<AdVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'live' | 'unused'>('all');
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('token') || '';
    setLoading(true);
    setError('');
    const res = await listAdVideos(token);
    if (!res.ok) {
      setError(res.error);
      setVideos([]);
    } else {
      setVideos(res.videos);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'live') return videos.filter((v) => v.liveCampaignCount > 0);
    if (filter === 'unused') return videos.filter((v) => v.campaigns.length === 0);
    return videos;
  }, [videos, filter]);

  const stats = useMemo(() => ({
    total: videos.length,
    live: videos.filter((v) => v.liveCampaignCount > 0).length,
    totalBytes: videos.reduce((sum, v) => sum + v.size, 0),
  }), [videos]);

  const startRename = (video: AdVideoRow) => {
    setEditingUrl(video.url);
    setDraftName(filenameWithoutExt(video.filename));
    setMessage('');
  };

  const cancelRename = () => {
    setEditingUrl(null);
    setDraftName('');
  };

  const saveRename = async (video: AdVideoRow) => {
    const token = localStorage.getItem('token') || '';
    setSavingUrl(video.url);
    setMessage('');
    const res = await renameAdVideoFile(token, video.url, draftName);
    setSavingUrl(null);
    if (!res.ok) {
      setMessage(res.error);
      return;
    }
    setEditingUrl(null);
    setDraftName('');
    setMessage(`Renamed. Updated ${res.updatedCampaigns} campaign(s).`);
    await load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Video Ads</h1>
        <p className="text-white/40 text-sm mt-1">
          {stats.total} files · {stats.live} live · {formatBytes(stats.totalBytes)} total on R2
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {([
          ['all', 'All'],
          ['live', 'Live only'],
          ['unused', 'Unused on R2'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              filter === key
                ? 'bg-violet-600/20 border-violet-500/40 text-violet-200'
                : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white/70'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white/[0.03] border-white/10 text-white/50 hover:text-white/70"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-white/40">Loading videos...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-white/40">No videos match this filter.</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((video) => {
            const isEditing = editingUrl === video.url;
            const isSaving = savingUrl === video.url;
            return (
              <div
                key={video.url}
                className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <div className="grid md:grid-cols-[220px_1fr] gap-4 p-4">
                  <div className="relative aspect-[2/3] bg-black rounded-xl overflow-hidden border border-white/10">
                    <video
                      src={video.url}
                      muted
                      playsInline
                      loop
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                      onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    />
                    {video.liveCampaignCount > 0 && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-[10px] font-bold uppercase">
                        {video.liveCampaignCount} live
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-white/30 mb-1">Filename</div>
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="flex-1 min-w-[180px] px-3 py-2 rounded-lg bg-[#111] border border-white/10 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="advertiser-niche-erogram-ad"
                          />
                          <span className="text-white/40 text-sm">.mp4</span>
                          <button
                            type="button"
                            disabled={isSaving || !draftName.trim()}
                            onClick={() => saveRename(video)}
                            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-sm text-violet-200 break-all">{video.filename}</code>
                          {video.isR2 && (
                            <button
                              type="button"
                              onClick={() => startRename(video)}
                              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] font-bold"
                            >
                              Rename
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-white/50">
                      <span>{formatBytes(video.size)}</span>
                      {video.lastModified && (
                        <span>{new Date(video.lastModified).toLocaleString()}</span>
                      )}
                      {!video.isR2 && <span className="text-amber-400">External URL</span>}
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-white/30 mb-1">Public URL</div>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-400 hover:text-sky-300 break-all"
                      >
                        {video.url}
                      </a>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-white/30 mb-1">
                        Campaigns ({video.campaigns.length})
                      </div>
                      {video.campaigns.length === 0 ? (
                        <p className="text-xs text-white/30">No campaigns linked.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {video.campaigns.map((c) => (
                            <div
                              key={c._id}
                              className="flex flex-wrap items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/5"
                            >
                              <span className="font-semibold text-white/80">{c.name}</span>
                              {c.internalName && (
                                <span className="text-white/30">({c.internalName})</span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                c.status === 'active' && c.isVisible
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-white/10 text-white/40'
                              }`}>
                                {c.status}{!c.isVisible ? ' · hidden' : ''}
                              </span>
                              <span className="text-white/30">{c.impressions} imp · {c.clicks} clicks</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
