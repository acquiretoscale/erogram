'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_AINSFW_TRENDING, type AinsfwTrendingItem } from '@/lib/ainsfw/trendingTools';
import { listAinsfwTrendingPicker, saveAinsfwTrending, trackAinsfwTrendingClick, uploadAinsfwTrendingIcon } from '@/lib/actions/ainsfwTrending';

type TrendingToolRef = { slug: string; name: string; image?: string; tryNowUrl?: string };

const brandLogos = new Map(DEFAULT_AINSFW_TRENDING.map((item) => [item.slug, item.logo]));
const EMPTY_TOOLS: TrendingToolRef[] = [];

function chipLogo(item: AinsfwTrendingItem, tools: TrendingToolRef[]): string {
  if (item.logo) return item.logo;
  return brandLogos.get(item.slug) || tools.find((tool) => tool.slug === item.slug)?.image || '';
}

export default function TrendingToolsBlock({
  items,
  tools = EMPTY_TOOLS,
  isAdmin = false,
  tone = 'hub',
}: {
  items: AinsfwTrendingItem[];
  tools?: TrendingToolRef[];
  isAdmin?: boolean;
  tone?: 'hub' | 'group';
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [draft, setDraft] = useState<AinsfwTrendingItem[]>(items);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(isAdmin);
  const [picker, setPicker] = useState<TrendingToolRef[]>(tools);

  useEffect(() => {
    if (tools.length > 0) setPicker(tools);
  }, [tools]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (localStorage.getItem('isAdmin') === 'true') setCanEdit(true);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.isAdmin) setCanEdit(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing || picker.length > 0) return;
    listAinsfwTrendingPicker().then(setPicker).catch(() => {});
  }, [editing, picker.length]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(draft.map((item) => item.slug));
    return picker
      .filter((tool) => !taken.has(tool.slug) && `${tool.name} ${tool.slug}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, draft, picker]);

  const addTool = (tool: TrendingToolRef) => {
    const href = (tool.tryNowUrl || '').trim();
    if (!/^https?:\/\//i.test(href)) {
      setMessage('That tool has no website link yet.');
      return;
    }
    setDraft((prev) => [...prev, { slug: tool.slug, name: tool.name, href, logo: tool.image || '' }]);
    setSelectedSlug(tool.slug);
    setQuery('');
    setMessage('Added. Press Save.');
  };

  const selected = draft.find((row) => row.slug === selectedSlug) || null;
  const selectedLogo = selected ? chipLogo(selected, picker) : '';

  const updateSelected = (patch: Partial<AinsfwTrendingItem>) => {
    if (!selected) return;
    setDraft((prev) => prev.map((row) => (row.slug === selected.slug ? { ...row, ...patch } : row)));
  };

  const save = async () => {
    const token = localStorage.getItem('token') || '';
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveAinsfwTrending(token, draft);
      setDraft(saved);
      setEditing(false);
      setMessage('Saved');
      router.refresh();
    } catch {
      setMessage('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const group = tone === 'group';

  return (
    <section className={group ? 'relative z-10' : 'mt-4'}>
      <div className={group ? 'flex flex-wrap items-center justify-center gap-1.5' : 'flex flex-wrap items-center justify-center gap-1'}>
        <span className={group
          ? 'w-full text-center text-[11px] sm:text-xs font-black uppercase tracking-[0.16em] text-[#00AFF0] leading-none mb-1'
          : 'text-[11px] sm:text-xs font-black uppercase tracking-wide text-[#22c55e] leading-none mr-1'}>
          {group ? 'TRENDING ON EROGRAM 👇' : 'TRENDING AI TOOLS'}
        </span>
        {items.map((item) => {
          const logo = chipLogo(item, tools);
          const label = item.name;
          const mark = logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className={group ? 'w-5 h-5 rounded-full object-cover bg-black shrink-0' : 'w-4 h-4 rounded-full object-cover bg-black shrink-0'} />
          ) : (
            <span className={group
              ? 'w-5 h-5 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center shrink-0'
              : 'w-4 h-4 rounded-full bg-black text-white text-[8px] font-black flex items-center justify-center shrink-0'}>
              {label.charAt(0)}
            </span>
          );
          if (group) {
            return (
              <a
                key={item.slug}
                href={item.href}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                onClick={(event) => {
                  if (editing) {
                    event.preventDefault();
                    setSelectedSlug(item.slug);
                    setMessage('');
                    return;
                  }
                  void trackAinsfwTrendingClick(item.href);
                }}
                className={`group/chip inline-flex rounded-xl bg-gradient-to-r from-[#00AFF0] via-[#0099e0] to-[#00D4FF] p-[2px] ${editing && selectedSlug === item.slug ? 'ring-2 ring-white' : ''}`}
              >
                <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#111] px-2.5 py-1.5 text-xs sm:text-sm font-bold leading-none text-white transition-all group-hover/chip:bg-transparent">
                  {mark}
                  {label}
                </span>
              </a>
            );
          }
          return (
            <a
              key={item.slug}
              href={item.href}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              onClick={(event) => {
                if (editing) {
                  event.preventDefault();
                  setSelectedSlug(item.slug);
                  setMessage('');
                  return;
                }
                void trackAinsfwTrendingClick(item.href);
              }}
              className={`inline-flex items-center gap-1 rounded-full bg-[#0a1f12] text-white/70 border border-[#22c55e]/20 hover:border-[#22c55e]/50 hover:text-white pl-0.5 pr-2 py-0.5 text-[11px] sm:text-xs font-bold leading-none transition-colors ${editing && selectedSlug === item.slug ? 'ring-2 ring-white' : ''}`}
            >
              {mark}
              {label}
            </a>
          );
        })}
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              setDraft(items);
              setSelectedSlug(items[0]?.slug || '');
              setEditing((open) => !open);
              setQuery('');
              setMessage('');
            }}
            className="shrink-0 text-[10px] font-black uppercase tracking-wide text-white/40 px-1"
          >
            {editing ? 'Close' : 'Edit'}
          </button>
        ) : null}
      </div>

      {editing && selected ? (
        <div className="mt-3 w-full rounded-2xl border border-white/15 bg-[#111] p-4 text-left space-y-3">
          <p className="text-sm text-white/60">Click a button above to change that one.</p>
          <label className="block text-sm font-bold text-white">
            Button text
            <input
              value={selected.name}
              onChange={(event) => updateSelected({ name: event.target.value })}
              className="mt-1 w-full rounded-xl bg-black border border-white/20 px-3 py-3 text-base text-white"
            />
          </label>
          <div className="flex items-center gap-3">
            {selectedLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedLogo} alt="" className="w-12 h-12 rounded-full object-cover bg-black" />
            ) : (
              <span className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-black">{selected.name.charAt(0)}</span>
            )}
            <label className="cursor-pointer rounded-xl bg-[#00AFF0] px-4 py-3 text-sm font-black text-black">
              {message === 'Uploading' ? 'Uploading…' : 'Upload picture'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  const body = new FormData();
                  body.set('token', localStorage.getItem('token') || '');
                  body.set('file', file);
                  setMessage('Uploading');
                  void uploadAinsfwTrendingIcon(body)
                    .then((logo) => {
                      updateSelected({ logo });
                      setMessage('Picture ready. Press Save.');
                    })
                    .catch(() => setMessage('Upload failed'));
                }}
              />
            </label>
          </div>
          <label className="block text-sm font-bold text-white">
            Link
            <input
              value={selected.href}
              onChange={(event) => updateSelected({ href: event.target.value })}
              className="mt-1 w-full rounded-xl bg-black border border-white/20 px-3 py-3 text-base text-white"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = draft.filter((row) => row.slug !== selected.slug);
                setDraft(next);
                setSelectedSlug(next[0]?.slug || '');
                setMessage('Deleted. Press Save.');
              }}
              className="rounded-xl border border-red-400/50 px-4 py-3 text-sm font-bold text-red-300"
            >
              Delete this button
            </button>
            {message && message !== 'Uploading' ? <span className="text-sm text-white/70">{message}</span> : null}
          </div>
          <label className="block text-sm font-bold text-white">
            Add another
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a tool name"
              className="mt-1 w-full rounded-xl bg-black border border-white/20 px-3 py-3 text-base text-white"
            />
          </label>
          {matches.length > 0 ? (
            <ul className="rounded-xl border border-white/10 overflow-hidden">
              {matches.map((tool) => (
                <li key={tool.slug}>
                  <button
                    type="button"
                    onClick={() => addTool(tool)}
                    className="w-full text-left px-3 py-3 text-base text-white hover:bg-white/10"
                  >
                    {tool.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
