'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearHomeFeaturedImage,
  clearHomeFeaturedSlot,
  searchHomeFeaturedOptions,
  setHomeFeaturedBadge,
  setHomeFeaturedSlot,
  uploadHomeFeaturedImage,
  type HomeFeaturedAdminSlot,
  type HomeFeaturedOption,
} from '@/lib/actions/homeFeatured';

export default function HomeFeaturedPicker({
  cardSlug,
  current,
  onSaved,
}: {
  cardSlug: string;
  current?: HomeFeaturedAdminSlot;
  onSaved: (cardSlug: string, slot: HomeFeaturedAdminSlot | null) => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const currentName = current?.name || '';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<HomeFeaturedOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [badgeDraft, setBadgeDraft] = useState(current?.badgeText || '');

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('token') || '';
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      searchHomeFeaturedOptions(token, cardSlug, query)
        .then((rows) => {
          if (!cancelled) setOptions(rows);
        })
        .catch(() => {
          if (!cancelled) setMessage('Could not load listings');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query, cardSlug]);

  const choose = async (option: HomeFeaturedOption) => {
    const token = localStorage.getItem('token') || '';
    setMessage('Saving…');
    try {
      const res = await setHomeFeaturedSlot(token, cardSlug, option.key);
      onSaved(cardSlug, { name: res.name, imageUrl: '', badgeText: current?.badgeText || '' });
      setMessage(`Saved: ${res.name}`);
      setOpen(false);
      router.refresh();
    } catch {
      setMessage('Save failed');
    }
  };

  const reset = async () => {
    const token = localStorage.getItem('token') || '';
    setMessage('Saving…');
    try {
      await clearHomeFeaturedSlot(token, cardSlug);
      onSaved(cardSlug, null);
      setMessage('Back to default');
      setOpen(false);
      router.refresh();
    } catch {
      setMessage('Save failed');
    }
  };

  const uploadImage = async (file: File) => {
    const token = localStorage.getItem('token') || '';
    const form = new FormData();
    form.set('token', token);
    form.set('cardSlug', cardSlug);
    form.set('file', file);
    setMessage('Uploading…');
    try {
      const res = await uploadHomeFeaturedImage(form);
      onSaved(cardSlug, { name: currentName, imageUrl: res.imageUrl, badgeText: current?.badgeText || '' });
      setMessage('Image saved');
      router.refresh();
    } catch {
      setMessage('Upload failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = async () => {
    const token = localStorage.getItem('token') || '';
    setMessage('Saving…');
    try {
      await clearHomeFeaturedImage(token, cardSlug);
      onSaved(cardSlug, { name: currentName, imageUrl: '', badgeText: current?.badgeText || '' });
      setMessage('Image removed');
      router.refresh();
    } catch {
      setMessage('Save failed');
    }
  };

  const saveBadge = async () => {
    const token = localStorage.getItem('token') || '';
    setMessage('Saving…');
    try {
      const res = await setHomeFeaturedBadge(token, cardSlug, badgeDraft);
      onSaved(cardSlug, { name: currentName, imageUrl: current?.imageUrl || '', badgeText: res.badgeText });
      setBadgeDraft(res.badgeText);
      setMessage(res.badgeText ? 'Badge saved' : 'Badge back to default');
      router.refresh();
    } catch {
      setMessage('Save failed');
    }
  };

  const smallButton =
    'shrink-0 rounded-md border border-[#c0392f]/40 bg-white px-2 py-1 text-[11px] font-bold text-[#c0392f] hover:bg-red-50';

  return (
    <div className="border-b border-[#c0392f]/20 bg-[#fff7f6] px-3 py-2 text-gray-900">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 rounded-md bg-[#c0392f] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white hover:opacity-90"
        >
          {open ? 'Close' : 'Change featured'}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={smallButton}>
          Change image
        </button>
        {current?.imageUrl ? (
          <button type="button" onClick={removeImage} className={smallButton}>
            Remove image
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadImage(file);
          }}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={badgeDraft}
          maxLength={24}
          onChange={(e) => setBadgeDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void saveBadge();
          }}
          placeholder="Badge text (empty = default)"
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-[12px] outline-none focus:border-[#c0392f]"
        />
        <button type="button" onClick={saveBadge} className={smallButton}>
          Save badge
        </button>
      </div>
      <p className="mt-1 truncate text-[11px] font-semibold text-gray-500">
        {message || (currentName ? `Featured: ${currentName}` : 'Default pick')}
      </p>
      {open ? (
        <div className="mt-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            autoFocus
            className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-[#c0392f]"
          />
          <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-gray-100 rounded-md border border-gray-200 bg-white">
            {loading && options.length === 0 ? (
              <li className="px-2.5 py-2 text-[12px] text-gray-400">Loading…</li>
            ) : options.length === 0 ? (
              <li className="px-2.5 py-2 text-[12px] text-gray-400">No match</li>
            ) : (
              options.map((option) => (
                <li key={option.key}>
                  <button
                    type="button"
                    onClick={() => choose(option)}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-red-50"
                  >
                    {option.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={option.image} alt="" className="h-7 w-7 shrink-0 rounded object-cover" loading="lazy" />
                    ) : (
                      <span className="h-7 w-7 shrink-0 rounded bg-gray-100" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{option.name}</span>
                      {option.note ? (
                        <span className="block truncate text-[11px] text-gray-400">{option.note}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          {currentName ? (
            <button
              type="button"
              onClick={reset}
              className="mt-2 text-[11px] font-semibold text-gray-500 underline underline-offset-2 hover:text-[#c0392f]"
            >
              Back to default
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
