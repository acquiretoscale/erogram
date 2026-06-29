'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  getOFMModelDetail,
  updateOFMCreatorSettings,
  addSplitTestImage,
  removeSplitTestImage,
  toggleVariantPause,
  resetSplitTest,
} from '@/lib/actions/ofManage';

interface Picture { index: number; label: string; url: string; paused: boolean; total: number; last24h: number; last48h: number; last7d: number; last30d: number; }
interface Detail {
  agencyName: string;
  agencySlug: string;
  model: {
    _id: string;
    name: string;
    username: string;
    slug: string;
    avatar: string;
    url: string;
    active: boolean;
    liveOnly: boolean;
    liveHourStart: number;
    liveHourEnd: number;
    album: string[];
    pausedImageUrls: string[];
    splitTestStartedAt: string | null;
  };
  total: number;
  last24h: number;
  last48h: number;
  last7d: number;
  last30d: number;
  impressions: number;
  ctr: number;
  pictures: Picture[];
  winnerIndex: number | null;
  activeCount: number;
}

function tok() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
}
function fmt(n: number) { return n.toLocaleString(); }

export default function OFMModelDetail({ agencySlug, modelSlug }: { agencySlug: string; modelSlug: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [url, setUrl] = useState('');
  const [liveOnly, setLiveOnly] = useState(false);
  const [liveStart, setLiveStart] = useState(-1);
  const [liveEnd, setLiveEnd] = useState(-1);
  const [active, setActive] = useState(true);

  const reload = async () => {
    const d = await getOFMModelDetail(tok(), agencySlug, modelSlug) as Detail | null;
    if (d) {
      setData(d);
      setUrl(d.model.url);
      setLiveOnly(d.model.liveOnly);
      setLiveStart(d.model.liveHourStart);
      setLiveEnd(d.model.liveHourEnd);
      setActive(d.model.active);
    }
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencySlug, modelSlug]);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await updateOFMCreatorSettings(tok(), data.model._id, {
        url, liveOnly, liveHourStart: liveStart, liveHourEnd: liveEnd, active,
      });
      await reload();
    } finally { setSaving(false); }
  };

  const onUpload = async (file: File) => {
    if (!data) return;
    setUploading(true);
    try {
      // Goes through the SAME R2 + EXIF pipeline as scraped photos and joins the creator album.
      const fd = new FormData();
      fd.append('file', file);
      await addSplitTestImage(tok(), data.model._id, fd.get('file') as File);
      await reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00AFF0]" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center gap-3">
        <p className="text-white/50">Model not found.</p>
        <Link href="/ofm" className="text-[#00AFF0] text-sm font-bold">← Back to /ofm</Link>
      </div>
    );
  }

  const m = data.model;
  const stats = [
    { label: '24h', value: data.last24h },
    { label: '48h', value: data.last48h },
    { label: '7d', value: data.last7d },
    { label: '30d', value: data.last30d },
    { label: 'Total', value: data.total, accent: true },
  ];

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/ofm" className="hover:text-white/70">/ofm</Link>
          <span>/</span>
          <span className="text-white/60">{data.agencyName}</span>
          <span>/</span>
          <span className="text-white font-bold">{m.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          {m.avatar
            ? <img src={m.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover bg-white/5" />
            : <div className="w-16 h-16 rounded-2xl bg-[#00AFF0]/15 flex items-center justify-center text-[#00AFF0] text-2xl font-black">{m.name.charAt(0)}</div>}
          <div>
            <h1 className="text-2xl font-black">{m.name}</h1>
            <p className="text-white/40 text-sm">@{m.username}</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-[#0e1018] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
              <div className={`text-lg font-black ${s.accent ? 'text-[#00AFF0]' : 'text-white'}`}>{fmt(s.value)}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/35 font-black mt-0.5">{s.label}</div>
            </div>
          ))}
          <div className="bg-[#0e1018] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
            <div className="text-lg font-black text-emerald-400">{data.ctr}%</div>
            <div className="text-[10px] uppercase tracking-wider text-white/35 font-black mt-0.5">CTR</div>
          </div>
        </div>

        {/* Edit panel */}
        <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-white/50">Settings</h2>

          <div>
            <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">OnlyFans Link</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://onlyfans.com/..."
              className="mt-1 w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00AFF0]/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-[#00AFF0] w-4 h-4" />
              <span className="text-sm">Active (ad running)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={liveOnly} onChange={(e) => setLiveOnly(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
              <span className="text-sm">Live-only (hide ad when offline)</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Live start (GMT hour)</label>
              <input type="number" min={-1} max={23} value={liveStart} onChange={(e) => setLiveStart(Number(e.target.value))}
                className="mt-1 w-24 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00AFF0]/50" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Live end (GMT hour)</label>
              <input type="number" min={-1} max={23} value={liveEnd} onChange={(e) => setLiveEnd(Number(e.target.value))}
                className="mt-1 w-24 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00AFF0]/50" />
            </div>
            <span className="text-[11px] text-white/25 self-end pb-2">-1 = 24/7</span>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="bg-[#00AFF0] text-black font-black text-sm px-5 py-2 rounded-lg hover:bg-[#00C4FF] disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        {/* Split test */}
        <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-white/50">Creator album — split test (up to 4)</h2>
              {data.activeCount > 1 && (
                <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded uppercase tracking-wider">{data.activeCount} live · rotating</span>
              )}
            </div>
            {m.pausedImageUrls.length > 0 && (
              <button
                onClick={async () => { if (!confirm('Resume ALL paused images (nothing is deleted)?')) return; await resetSplitTest(tok(), m._id); await reload(); }}
                className="text-[11px] font-bold text-emerald-400/80 hover:text-emerald-400"
              >
                Resume all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {data.pictures.map((p) => {
              const isPaused = p.paused;
              const isLeader = data.winnerIndex === p.index; // leading by clicks among active
              return (
                <div key={p.index} className={`relative rounded-xl overflow-hidden border-2 ${isPaused ? 'border-white/[0.06] opacity-50' : isLeader ? 'border-[#00AFF0]' : 'border-emerald-500/40'}`}>
                  {p.url
                    ? <img src={p.url} alt={p.label} className="w-full aspect-[3/4] object-cover bg-white/5" />
                    : <div className="w-full aspect-[3/4] bg-white/5 flex items-center justify-center text-white/20 text-xs">no image</div>}
                  <div className="absolute top-1.5 left-1.5 flex gap-1 flex-wrap">
                    <span className="text-[9px] font-black bg-black/70 px-1.5 py-0.5 rounded">{p.label}</span>
                    {isPaused
                      ? <span className="text-[9px] font-black bg-white/20 text-white px-1.5 py-0.5 rounded">PAUSED</span>
                      : <span className="text-[9px] font-black bg-emerald-500/80 text-black px-1.5 py-0.5 rounded">LIVE</span>}
                    {!isPaused && isLeader && <span className="text-[9px] font-black bg-[#00AFF0] text-black px-1.5 py-0.5 rounded">LEADING</span>}
                  </div>
                  <div className="p-2 bg-[#0a0d14]">
                    <div className="flex items-center justify-between text-[10px] text-white/40">
                      <span>{fmt(p.total)} clicks</span>
                      <span className="text-emerald-400">+{fmt(p.last24h)} 24h</span>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {/* Pause / resume ANY variant — including the default avatar. Active ones rotate. */}
                      <button
                        onClick={async () => { await toggleVariantPause(tok(), m._id, p.url, !isPaused); await reload(); }}
                        className={`flex-1 text-[10px] font-black py-1 rounded ${isPaused ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-white/10 text-white/60 hover:bg-white/15'}`}
                      >
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>
                      {p.index >= 1 && (
                        <button
                          onClick={async () => { if (!confirm(`Delete image ${p.label} from the album?`)) return; await removeSplitTestImage(tok(), m._id, p.url); await reload(); }}
                          className="text-[10px] font-black py-1 px-2 rounded bg-white/5 text-white/40 hover:text-red-400"
                          title="Delete this image"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {m.album.length < 4 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-xl border-2 border-dashed border-white/10 aspect-[3/4] flex flex-col items-center justify-center gap-2 text-white/30 hover:text-white/60 hover:border-white/20 transition disabled:opacity-50"
              >
                {uploading
                  ? <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[#00AFF0]" />
                  : <><span className="text-3xl font-thin">+</span><span className="text-[11px] font-bold">Add to album</span></>}
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
          />
          <p className="text-[11px] text-white/25">
            One album: the Default is the scraped profile photo; added images join the SAME creator album (also shown on the public profile). Every LIVE image rotates across the network and earns real clicks (LEADING = most so far). Pause ANY image to take it out of rotation; the rest keep running. To run only your favourite, pause the others. Delete removes an uploaded photo from the album for good.
          </p>
        </div>
      </div>
    </div>
  );
}
