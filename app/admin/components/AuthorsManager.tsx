'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { upsertAuthor, deleteAuthor, type AuthorProfile } from '@/lib/actions/authors';
import { compressImage } from '@/lib/utils/compressImage';

const BLANK: AuthorProfile = {
  slug: '',
  name: '',
  role: 'Staff Writer',
  bio: '',
  avatar: '',
  socials: { x: '', telegram: '', instagram: '', website: '' },
};

function AuthorRow({ initial, isNew, onSaved }: { initial: AuthorProfile; isNew?: boolean; onSaved: () => void }) {
  const [a, setA] = useState<AuthorProfile>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { setA(initial); }, [initial.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<AuthorProfile>) => setA((prev) => ({ ...prev, ...patch }));

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      set({ avatar: res.data.url });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!a.name.trim()) { alert('Name is required'); return; }
    setSaving(true);
    setMsg('');
    try {
      const token = localStorage.getItem('token') || '';
      await upsertAuthor(token, a);
      setMsg('Saved');
      onSaved();
      setTimeout(() => setMsg(''), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save author');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete author "${a.name}"?`)) return;
    try {
      const token = localStorage.getItem('token') || '';
      await deleteAuthor(token, a.slug);
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to delete author');
    }
  };

  const input = 'w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] outline-none';

  return (
    <div className="rounded-xl border border-white/10 bg-[#161616] p-4">
      <div className="flex gap-4">
        <div className="shrink-0 text-center">
          {a.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.avatar} alt={a.name} className="w-20 h-20 rounded-full object-cover ring-1 ring-white/15" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#222] flex items-center justify-center text-gray-600 text-2xl">?</div>
          )}
          <label className="block mt-2 text-[11px] text-[#b31b1b] hover:text-[#e23] cursor-pointer">
            {uploading ? 'Uploading…' : 'Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          </label>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input className={input} placeholder="Name *" value={a.name} onChange={(e) => set({ name: e.target.value })} />
          <input className={input} placeholder="Role (e.g. Chief Editor)" value={a.role} onChange={(e) => set({ role: e.target.value })} />
          <textarea className={`${input} sm:col-span-2 resize-none`} rows={2} placeholder="Short bio" value={a.bio} onChange={(e) => set({ bio: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-gray-500">
          {isNew ? 'New author' : <>slug: <span className="text-gray-400">{a.slug}</span></>}
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-green-400">{msg}</span>}
          {!isNew && a.slug !== 'eros' && (
            <button type="button" onClick={remove} className="text-xs font-semibold text-gray-500 hover:text-red-400">Delete</button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-[#b31b1b] hover:bg-[#d11] text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : isNew ? 'Add author' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthorsManager({ authors, onChanged }: { authors: AuthorProfile[]; onChanged: () => void }) {
  const [addKey, setAddKey] = useState(0); // reset the "new" row after a successful add

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-[#0f0f0f] p-4 space-y-3">
      <p className="text-xs text-[#777]">
        Manage the authors that appear as bylines on the blog. Edit details, add new authors, or upload a photo. The site default author (currently <span className="text-gray-300">Enzo Delacroix</span>) can’t be deleted.
      </p>
      {authors.map((a) => (
        <AuthorRow key={a.slug} initial={a} onSaved={onChanged} />
      ))}
      <AuthorRow
        key={`new-${addKey}`}
        initial={BLANK}
        isNew
        onSaved={() => { onChanged(); setAddKey((k) => k + 1); }}
      />
    </div>
  );
}
