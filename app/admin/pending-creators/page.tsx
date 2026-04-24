'use client';

import { useState, useEffect, useRef } from 'react';
import { getPendingCreators, updateCreatorStatus, deleteCreator, editCreator } from './actions';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';

export default function PendingCreatorsPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPendingCreators().then(setCreators).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    await updateCreatorStatus(id, 'approved');
    setCreators(prev => prev.filter(c => c._id !== id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this creator permanently?')) return;
    await deleteCreator(id);
    setCreators(prev => prev.filter(c => c._id !== id));
  };

  const openEdit = (c: any) => {
    setEditId(c._id);
    setEditName(c.name);
    setEditBio(c.bio || '');
    setEditAvatar(c.avatar || '');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        setEditAvatar(data.url);
      }
    } catch {}
    setUploading(false);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    await editCreator(editId, { name: editName, bio: editBio, avatar: editAvatar });
    setCreators(prev => prev.map(c => c._id === editId ? { ...c, name: editName, bio: editBio, avatar: editAvatar } : c));
    setEditId(null);
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Submitted Creators ({creators.length})</h1>

      {creators.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">✅</div>
          <p>No pending submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {creators.map((c) => (
            <div key={c._id} className="bg-[#151515] rounded-2xl border border-white/10 p-5">
              <div className="flex gap-5">
                <img
                  src={c.avatar || PLACEHOLDER_IMAGE_URL}
                  alt={c.name}
                  className="w-20 h-20 rounded-xl object-cover bg-[#1a1a1a] shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL; }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-white truncate">
                    {c.name} <span className="text-xs text-gray-500 font-normal">@{c.username}</span>
                    {c.submissionStatus === 'approved' && <span className="ml-2 text-[10px] font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">LIVE</span>}
                    {c.submissionStatus === 'pending' && <span className="ml-2 text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">PENDING</span>}
                  </h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-2">{c.bio}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {c.categories?.map((cat: string) => (
                      <span key={cat} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-400">{cat}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OnlyFans ↗</a>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  {c.extraPhotos?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {c.extraPhotos.map((url: string, i: number) => (
                        <img key={i} src={url} alt="" className="w-14 h-14 rounded-lg object-cover bg-[#1a1a1a]" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0 justify-center">
                  <button onClick={() => handleApprove(c._id)} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors">✓ Approve</button>
                  <button onClick={() => openEdit(c)} className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 text-sm font-bold transition-colors">✏ Edit</button>
                  <button onClick={() => handleDelete(c._id)} className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-sm font-bold transition-colors">🗑 Delete</button>
                </div>
              </div>

              {editId === c._id && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 font-bold">Name</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold">Bio</label>
                    <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm resize-y" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold">Avatar</label>
                    <div className="flex items-center gap-3 mt-1">
                      <img src={editAvatar || PLACEHOLDER_IMAGE_URL} alt="" className="w-16 h-16 rounded-lg object-cover bg-[#1a1a1a] shrink-0" />
                      <div className="flex-1 space-y-2">
                        <input value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="Image URL" className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-white text-sm" />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 font-bold hover:text-white transition-colors disabled:opacity-50"
                        >
                          {uploading ? 'Uploading...' : '📁 Upload new image'}
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold disabled:opacity-50">Save</button>
                    <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-sm font-bold">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
