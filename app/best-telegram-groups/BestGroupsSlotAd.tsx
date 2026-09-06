'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getBestGroupsMidAd,
  trackBestGroupsMidAdClick,
  updateSiteConfig,
  type BestGroupsMidAdData,
} from '@/lib/actions/adminConfig';

const DEFAULT_HEIGHT = 520;

const EMPTY: BestGroupsMidAdData = {
  mode: 'code',
  code: '',
  height: DEFAULT_HEIGHT,
  image: '',
  url: '',
  clicks: 0,
  lastClickAt: '',
  placementKey: 'best-groups-mid',
};

function parseIframeSrc(code: string): { src: string; height: number } | null {
  const raw = (code || '').trim();
  if (!raw || /<script/i.test(raw)) return null;

  let src = '';
  let height = DEFAULT_HEIGHT;

  if (/^https:\/\//i.test(raw) && !/\s/.test(raw)) {
    src = raw;
  } else {
    const srcMatch =
      raw.match(/\ssrc\s*=\s*["']([^"']+)["']/i) ||
      raw.match(/\ssrc\s*=\s*([^\s>]+)/i) ||
      raw.match(/^src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch?.[1]) return null;
    src = srcMatch[1].trim();

    if (/\sheight\s*=\s*["']?\d+%/i.test(raw)) {
      height = DEFAULT_HEIGHT;
    } else {
      const hMatch = raw.match(/\sheight\s*=\s*["']?(\d+)/i);
      if (hMatch) height = Number(hMatch[1]);
    }
  }

  try {
    if (new URL(src).protocol !== 'https:') return null;
  } catch {
    return null;
  }

  if (!Number.isFinite(height) || height < 400) height = DEFAULT_HEIGHT;
  if (height > 1200) height = 1200;
  return { src, height };
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export default function BestGroupsSlotAd() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saved, setSaved] = useState<BestGroupsMidAdData>(EMPTY);
  const [draft, setDraft] = useState<BestGroupsMidAdData>(EMPTY);
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReady(true);
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.isAdmin) {
            setIsAdmin(true);
            localStorage.setItem('isAdmin', 'true');
          }
        })
        .catch(() => {});
    }
    getBestGroupsMidAd()
      .then((live) => {
        setSaved(live);
        setDraft(live);
        const hasLive =
          (live.mode === 'image' && live.image && live.url) ||
          (live.mode === 'code' && parseIframeSrc(live.code));
        if (hasLive) setEditing(false);
      })
      .catch(() => {});
  }, []);

  const active = isAdmin && editing ? draft : saved;
  const parsed = active.mode === 'code' ? parseIframeSrc(active.code) : null;
  const imageLive = active.mode === 'image' && isHttpsUrl(active.image) && isHttpsUrl(active.url);

  const hasContent = active.mode === 'image' ? imageLive : !!parsed;

  const persist = async (next: BestGroupsMidAdData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMsg('Not logged in');
      return;
    }
    const empty = !next.code.trim() && !next.image.trim() && !next.url.trim();
    if (!empty) {
      if (next.mode === 'code' && !parseIframeSrc(next.code)) {
        setMsg('Invalid iframe code');
        return;
      }
      if (next.mode === 'image' && (!isHttpsUrl(next.image) || !isHttpsUrl(next.url))) {
        setMsg('Image and link must be https');
        return;
      }
    }
    setBusy(true);
    setMsg('');
    try {
      const p = parseIframeSrc(next.code);
      const payload: BestGroupsMidAdData = {
        mode: next.mode,
        code: next.mode === 'code' ? next.code : '',
        height: p?.height || next.height || DEFAULT_HEIGHT,
        image: next.mode === 'image' ? next.image : '',
        url: isHttpsUrl(next.url) ? next.url : '',
        clicks: saved.clicks,
        lastClickAt: saved.lastClickAt,
        placementKey: 'best-groups-mid',
      };
      await updateSiteConfig(token, { generalSettings: { bestGroupsMidAd: payload } });
      setSaved(payload);
      setDraft(payload);
      if (!empty) {
        setEditing(false);
        setMsg('');
      } else {
        setEditing(true);
        setMsg('Deleted');
      }
    } catch {
      setMsg('Save failed');
    } finally {
      setBusy(false);
    }
  };

  const getOutboundUrl = (data: BestGroupsMidAdData) =>
    isHttpsUrl(data.url) ? data.url : '';

  const outboundClick = (url: string) => {
    if (!isHttpsUrl(url)) return;
    trackBestGroupsMidAdClick()
      .then((n) => {
        const now = new Date().toISOString();
        setSaved((s) => ({ ...s, clicks: n, lastClickAt: now }));
      })
      .catch(() => {});
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const imageClick = () => outboundClick(saved.url);

  const adminClicksBar = isAdmin ? (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
      <span className="text-[11px] font-black uppercase tracking-wide text-[#c0392f]">
        Total clicks: {saved.clicks.toLocaleString()}
      </span>
      {saved.lastClickAt ? (
        <span className="text-[10px] text-black/50">
          Last: {new Date(saved.lastClickAt).toLocaleString()}
        </span>
      ) : null}
      <span className="text-[10px] text-black/30 font-mono">{saved.placementKey}</span>
    </div>
  ) : null;

  const outboundUrl = getOutboundUrl(isAdmin && editing ? draft : saved);
  const showTryIt = !!outboundUrl && !(isAdmin && editing);

  const slotTitle = (
    <div className="mb-3 px-1 w-full flex items-center gap-3 md:gap-4">
      <h3 className="text-lg md:text-2xl font-black uppercase tracking-wide text-black">
        COMMAND AND THEY <span className="text-[#c0392f]">OBEY</span>
      </h3>
      {showTryIt ? (
        <button
          type="button"
          onClick={() => outboundClick(outboundUrl)}
          className="ml-auto min-w-[140px] md:min-w-[196px] px-7 md:px-10 py-2.5 md:py-3 rounded-lg border-2 border-black bg-[#c0392f] text-white text-base md:text-lg font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:bg-[#a93226] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000] transition-all duration-150 shrink-0"
        >
          Try it
        </button>
      ) : null}
    </div>
  );

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', 'best-groups-slot-ad');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) return;
    const data = await res.json();
    if (data.url) setDraft((d) => ({ ...d, image: data.url, mode: 'image' }));
  };

  if (!ready) return null;
  if (!isAdmin && !hasContent) return null;

  const frameHeight = parsed?.height || DEFAULT_HEIGHT;
  const previewImage = isAdmin && editing ? draft.image : saved.image;
  const showImage = active.mode === 'image' && (isAdmin && editing ? !!previewImage : imageLive);

  return (
    <div className="rounded-3xl p-3 md:p-4 border border-black/10 bg-white relative">
      {isAdmin && !editing && hasContent ? (
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-2 py-0.5 rounded-md bg-black/5 text-black text-[10px] font-bold border border-black/10"
          >
            Edit
          </button>
        </div>
      ) : null}

      {slotTitle}
      {adminClicksBar}

      {active.mode === 'code' && parsed ? (
        <iframe
          key={`${parsed.src}-${frameHeight}`}
          src={parsed.src}
          width="100%"
          height={frameHeight}
          title=""
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
          className="block w-full rounded-2xl"
          style={{ height: frameHeight, border: 0 }}
        />
      ) : null}

      {showImage ? (
        <div
          onClick={!isAdmin || !editing ? imageClick : undefined}
          role={!isAdmin || !editing ? 'link' : undefined}
          tabIndex={!isAdmin || !editing ? 0 : undefined}
          onKeyDown={(e) => {
            if ((!isAdmin || !editing) && e.key === 'Enter') imageClick();
          }}
          className={!isAdmin || !editing ? 'cursor-pointer' : ''}
        >
          <img
            src={previewImage}
            alt=""
            className="w-full h-auto block rounded-2xl"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      {isAdmin && editing ? (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, mode: 'code' }))}
              className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                draft.mode === 'code' ? 'bg-[#c0392f] text-white border-[#c0392f]' : 'bg-black/5 text-black/70 border-black/10'
              }`}
            >
              Code
            </button>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, mode: 'image' }))}
              className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                draft.mode === 'image' ? 'bg-[#c0392f] text-white border-[#c0392f]' : 'bg-black/5 text-black/70 border-black/10'
              }`}
            >
              Image + link
            </button>
            <span className="text-[10px] text-[#c0392f] self-center ml-auto font-bold">
              {saved.clicks.toLocaleString()} clicks
            </span>
          </div>

          {draft.mode === 'code' ? (
            <>
              <textarea
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                rows={4}
                className="w-full bg-[#f5f5f5] border border-black/10 rounded-xl px-3 py-2 text-xs text-black font-mono"
              />
              <input
                type="url"
                value={draft.url}
                onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                placeholder="https:// (Try it link)"
                className="w-full bg-[#f5f5f5] border border-black/10 rounded-xl px-3 py-2 text-xs text-black"
              />
            </>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }} />
              {draft.image ? <img src={draft.image} alt="" className="w-full h-auto rounded-xl" /> : null}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 bg-black/5 text-black rounded-lg font-bold text-xs"
              >
                Upload image
              </button>
              <input
                type="url"
                value={draft.url}
                onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                placeholder="https://"
                className="w-full bg-[#f5f5f5] border border-black/10 rounded-xl px-3 py-2 text-xs text-black"
              />
            </>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => persist(draft)}
              className="px-3 py-1.5 bg-[#c0392f] disabled:opacity-50 text-white rounded-lg font-bold text-xs"
            >
              Save
            </button>
            <button
              type="button"
              disabled={busy || !hasContent}
              onClick={() => persist(EMPTY)}
              className="px-3 py-1.5 bg-black/5 text-black rounded-lg font-bold text-xs"
            >
              Delete
            </button>
            {hasContent ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 bg-black/5 text-black rounded-lg font-bold text-xs"
              >
                Cancel
              </button>
            ) : null}
            {msg ? <span className="text-xs text-red-400">{msg}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
