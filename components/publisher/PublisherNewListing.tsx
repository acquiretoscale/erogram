'use client';

import { useEffect, useState } from 'react';
import { getPublisherListingChoices, submitPublisherDraft } from '@/lib/actions/publisher';
import { adminUploadToolCoverImage, adminUploadToolGalleryImage } from '@/lib/actions/ainsfwAdmin';

type Choices = {
  ainsfw: string[];
  porn: { slug: string; title: string }[];
};

const FEATURED = [
  { id: 'off' as const, label: 'Off' },
  { id: '7' as const, label: '7 days' },
  { id: '14' as const, label: '14 days' },
  { id: '30' as const, label: '30 days' },
  { id: 'lifetime' as const, label: 'Lifetime' },
];

const field = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm';

export default function PublisherNewListing({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<'ainsfw' | 'porn'>('ainsfw');
  const [choices, setChoices] = useState<Choices | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [pornCategory, setPornCategory] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [featuredDuration, setFeaturedDuration] = useState<(typeof FEATURED)[number]['id']>('off');
  const [reviewIntro, setReviewIntro] = useState('');
  const [reviewBlocks, setReviewBlocks] = useState<{ title: string; body: string }[]>([{ title: '', body: '' }]);
  const [cover, setCover] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    getPublisherListingChoices().then((next) => {
      setChoices(next);
      setCategories((prev) => prev.length ? prev : next.ainsfw.slice(0, 1));
      setPornCategory((prev) => prev || next.porn[0]?.slug || '');
    }).catch(() => setError('Could not load categories'));
  }, []);

  const toggleCategory = (cat: string) => {
    setCategories((prev) => {
      if (prev.includes(cat)) return prev.length === 1 ? prev : prev.filter((c) => c !== cat);
      if (prev.length >= 6) return prev;
      return [...prev, cat];
    });
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || '';
      const result = await submitPublisherDraft(token, {
        section,
        name,
        url,
        category: section === 'ainsfw' ? categories[0] : pornCategory,
        categories: section === 'ainsfw' ? categories : undefined,
        description,
        ctaText: section === 'ainsfw' ? ctaText : undefined,
        featuredDuration: section === 'ainsfw' ? featuredDuration : undefined,
        reviewIntro: section === 'ainsfw' ? reviewIntro : undefined,
        reviewBlocks: section === 'ainsfw' ? reviewBlocks : undefined,
      });
      if (section === 'ainsfw' && result.slug) {
        if (cover) {
          const fd = new FormData();
          fd.append('file', cover);
          const uploaded = await adminUploadToolCoverImage(token, result.slug, fd);
          if ('error' in uploaded) throw new Error(uploaded.error);
        }
        for (const file of gallery) {
          const fd = new FormData();
          fd.append('file', file);
          const uploaded = await adminUploadToolGalleryImage(token, result.slug, fd);
          if ('error' in uploaded) throw new Error(uploaded.error);
        }
      }
      setDone(section === 'ainsfw'
        ? 'Saved as a draft. It sits at the top of AI NSFW until you approve it.'
        : 'Saved as a draft. You approve it at the top of Porn websites.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 p-4 pt-20 overflow-y-auto" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#141210] p-5 shadow-2xl my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-black text-lg">New listing</h2>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white text-sm font-bold">Close</button>
        </div>

        {done ? (
          <p className="text-sm text-[#86efac] font-semibold">{done}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSection('ainsfw')} className={`py-2 rounded-lg text-xs font-black uppercase ${section === 'ainsfw' ? 'bg-[#22c55e] text-black' : 'bg-white/10 text-white'}`}>AI NSFW</button>
              <button type="button" onClick={() => setSection('porn')} className={`py-2 rounded-lg text-xs font-black uppercase ${section === 'porn' ? 'bg-[#c0392f] text-white' : 'bg-white/10 text-white'}`}>Porn websites</button>
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={field} />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={field} />

            {section === 'porn' ? (
              <select value={pornCategory} onChange={(e) => setPornCategory(e.target.value)} className={field}>
                {(choices?.porn || []).map((cat) => <option key={cat.slug} value={cat.slug} className="bg-[#141210]">{cat.title}</option>)}
              </select>
            ) : (
              <div>
                <p className="text-[11px] font-bold uppercase text-white/50 mb-2">Categories, up to 6</p>
                <div className="flex flex-wrap gap-1.5">
                  {(choices?.ainsfw || []).map((cat) => {
                    const on = categories.includes(cat);
                    return (
                      <button key={cat} type="button" disabled={!on && categories.length >= 6} onClick={() => toggleCategory(cat)} className={`rounded px-2 py-1 text-[10px] font-black border disabled:opacity-30 ${on ? 'bg-[#22c55e]/25 text-white border-[#22c55e]/50' : 'bg-white/10 text-gray-200 border-white/15'}`}>
                        {on ? '✓ ' : ''}{cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Description" className={`${field} resize-y`} />

            {section === 'ainsfw' && (
              <>
                <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={80} placeholder="Button text" className={field} />
                <div>
                  <p className="text-[11px] font-bold uppercase text-white/50 mb-2">Featured</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FEATURED.map((choice) => (
                      <button key={choice.id} type="button" onClick={() => setFeaturedDuration(choice.id)} className={`rounded px-2.5 py-1 text-[11px] font-black border ${featuredDuration === choice.id ? 'bg-[#22c55e] text-black border-[#22c55e]' : 'bg-white/10 text-gray-200 border-white/15'}`}>
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-white/50 mb-2">Cover picture</p>
                  <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} className="text-xs text-white/70" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase text-white/50 mb-2">Gallery</p>
                  <input type="file" accept="image/*" multiple onChange={(e) => setGallery(Array.from(e.target.files || []).slice(0, 4))} className="text-xs text-white/70" />
                </div>
                <textarea value={reviewIntro} onChange={(e) => setReviewIntro(e.target.value)} rows={3} placeholder="Review intro" className={`${field} resize-y`} />
                {reviewBlocks.map((block, i) => (
                  <div key={i} className="rounded-lg border border-white/10 p-2 space-y-2">
                    <input value={block.title} onChange={(e) => setReviewBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, title: e.target.value } : b))} placeholder="Section title" className={field} />
                    <textarea value={block.body} onChange={(e) => setReviewBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, body: e.target.value } : b))} rows={3} placeholder="Section text" className={`${field} resize-y`} />
                  </div>
                ))}
                {reviewBlocks.length < 6 && (
                  <button type="button" onClick={() => setReviewBlocks((prev) => [...prev, { title: '', body: '' }])} className="text-[11px] font-black uppercase text-[#22c55e]">Add section</button>
                )}
              </>
            )}

            {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
            <button type="button" disabled={busy} onClick={() => void save()} className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-black disabled:opacity-50">
              {busy ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
