'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import {
  deleteOFMCreator,
  editOFMPendingCreator,
  getOFMPendingCreators,
  updateOFMPendingCreatorStatus,
} from '@/lib/actions/ofm';

type PendingCreator = {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  bio: string;
  categories: string[];
  location: string;
  price: number;
  url: string;
  extraPhotos?: string[];
  submissionStatus: 'approved' | 'pending' | 'rejected';
  submittedByUsername: string;
  submitterType: 'creator' | 'agency';
  submitterEmail: string;
  submitterTelegram: string;
  submitterAccount: string;
  telegramUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  tiktokUrl: string;
  website: string;
  createdAt: string;
};

export default function PendingCreatorsPanel() {
  const [creators, setCreators] = useState<PendingCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token') || '';
    try {
      const data = await getOFMPendingCreators(token);
      setCreators(data || []);
    } catch {
      showToast('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: string) => {
    const token = localStorage.getItem('token') || '';
    try {
      await updateOFMPendingCreatorStatus(token, id, 'approved');
      setCreators((prev) => prev.map((c) => (c._id === id ? { ...c, submissionStatus: 'approved' } : c)));
      showToast('Approved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Approve failed');
    }
  };

  const handleReject = async (id: string) => {
    const token = localStorage.getItem('token') || '';
    try {
      await updateOFMPendingCreatorStatus(token, id, 'rejected');
      setCreators((prev) => prev.filter((c) => c._id !== id));
      showToast('Rejected');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Reject failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const token = localStorage.getItem('token') || '';
    try {
      await deleteOFMCreator(token, deleteId);
      setCreators((prev) => prev.filter((c) => c._id !== deleteId));
      setDeleteId(null);
      showToast('Deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openEdit = (c: PendingCreator) => {
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
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    const token = localStorage.getItem('token') || '';
    try {
      await editOFMPendingCreator(token, editId, { name: editName, bio: editBio, avatar: editAvatar });
      setCreators((prev) =>
        prev.map((c) =>
          c._id === editId ? { ...c, name: editName, bio: editBio, avatar: editAvatar } : c,
        ),
      );
      setEditId(null);
      showToast('Saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = creators.filter((c) => c.submissionStatus === 'pending').length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      <div>
        <h2 className="text-xl font-black text-white">Pending &amp; Submitted Creators</h2>
        <p className="text-white/40 text-sm mt-0.5">
          {creators.length.toLocaleString()} submissions
          {pendingCount > 0 ? ` · ${pendingCount} pending review` : ''}
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#00AFF0]" />
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center text-white/20 py-12 text-sm">No pending or submitted creators.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Creator', 'Contact', 'Details', 'Submitted', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-left text-[11px] font-bold text-white/30 uppercase tracking-wider whitespace-nowrap${h === 'Actions' ? ' sticky right-0 bg-[#0c1116]' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creators.map((c) => (
                  <Fragment key={c._id}>
                    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition align-top">
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="flex items-start gap-3">
                          <img
                            src={c.avatar || PLACEHOLDER_IMAGE_URL}
                            alt={c.name}
                            className="w-16 h-16 rounded-xl object-cover bg-white/5 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL;
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-white">{c.name}</div>
                            <div className="text-xs text-white/30">@{c.username}</div>
                            {c.submitterType === 'agency' && (
                              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-md">
                                Agency
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="space-y-1 text-xs">
                          {c.submitterEmail ? (
                            <a href={`mailto:${c.submitterEmail}`} className="block text-[#00AFF0] hover:underline break-all">
                              {c.submitterEmail}
                            </a>
                          ) : (
                            <span className="text-white/20">No email</span>
                          )}
                          {c.submitterAccount && (
                            <div className="text-white/50">Erogram @{c.submitterAccount}</div>
                          )}
                          {c.submitterTelegram && (
                            <div className="text-white/50">TG @{c.submitterTelegram.replace(/^@/, '')}</div>
                          )}
                          {c.telegramUrl && (
                            <a href={c.telegramUrl} target="_blank" rel="noopener noreferrer" className="block text-white/40 hover:text-[#00AFF0] break-all">
                              Creator TG
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[240px]">
                        <p className="text-xs text-white/45 line-clamp-3 mb-2">{c.bio || '—'}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(c.categories || []).slice(0, 6).map((cat) => (
                            <span key={cat} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/40">
                              {cat}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px]">
                          {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#00AFF0] hover:underline">
                              OnlyFans
                            </a>
                          )}
                          {c.username && (
                            <a href={ofCreatorProfileUrl(c.username)} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white">
                              Erogram profile
                            </a>
                          )}
                          {c.instagramUrl && (
                            <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white">
                              IG
                            </a>
                          )}
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white break-all">
                              Site
                            </a>
                          )}
                        </div>
                        {(c.extraPhotos?.length || 0) > 0 && (
                          <div className="flex gap-1.5 mt-2">
                            {c.extraPhotos!.slice(0, 4).map((url, i) => (
                              <img key={i} src={url} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/30 text-[11px] whitespace-nowrap">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.submissionStatus === 'approved' && (
                          <span className="text-[10px] font-bold text-green-400 bg-green-500/15 px-2 py-1 rounded-full uppercase tracking-wide">
                            Live
                          </span>
                        )}
                        {c.submissionStatus === 'pending' && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-1 rounded-full uppercase tracking-wide">
                            Pending
                          </span>
                        )}
                        {c.submissionStatus === 'rejected' && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-1 rounded-full uppercase tracking-wide">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 sticky right-0 bg-[#0c1116]">
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          {c.submissionStatus !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleApprove(c._id)}
                              className="px-3 py-1.5 rounded-lg bg-green-600/90 hover:bg-green-500 text-white text-xs font-bold transition"
                            >
                              Approve
                            </button>
                          )}
                          {c.submissionStatus === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleReject(c._id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/30 text-amber-300 text-xs font-bold transition"
                            >
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(c._id)}
                            className="px-3 py-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/30 border border-red-500/25 text-red-400 text-xs font-bold transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editId === c._id && (
                      <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid gap-3 max-w-3xl">
                            <div>
                              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Name</label>
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00AFF0]/40"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Bio</label>
                              <textarea
                                value={editBio}
                                onChange={(e) => setEditBio(e.target.value)}
                                rows={3}
                                className="w-full mt-1 px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00AFF0]/40 resize-y"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Avatar</label>
                              <div className="flex items-center gap-3 mt-1">
                                <img
                                  src={editAvatar || PLACEHOLDER_IMAGE_URL}
                                  alt=""
                                  className="w-16 h-16 rounded-xl object-cover bg-white/5 flex-shrink-0"
                                />
                                <div className="flex-1 space-y-2">
                                  <input
                                    value={editAvatar}
                                    onChange={(e) => setEditAvatar(e.target.value)}
                                    placeholder="Image URL"
                                    className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00AFF0]/40"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={uploading}
                                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-white/50 font-bold hover:text-white transition disabled:opacity-50"
                                  >
                                    {uploading ? 'Uploading…' : 'Upload image'}
                                  </button>
                                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditId(null)}
                                className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white/60 text-sm font-bold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1419] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-2">Delete submission?</h3>
            <p className="text-white/40 text-sm mb-5">This permanently removes the creator record.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-500/80 hover:bg-red-500 rounded-xl text-white text-sm font-bold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
