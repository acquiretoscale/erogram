'use client';

import { useEffect, useState } from 'react';
import { getAdminSuggestions, updateSuggestionStatus, deleteSuggestion } from '@/lib/actions/featureSuggestions';

interface Suggestion {
  _id: string;
  title: string;
  description: string;
  username: string;
  status: string;
  upvoteCount: number;
  createdAt: string;
}

const STATUSES = ['new', 'reviewed', 'planned', 'done', 'rejected'] as const;
const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-300',
  reviewed: 'bg-yellow-500/20 text-yellow-300',
  planned: 'bg-purple-500/20 text-purple-300',
  done: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
};

export default function AdminSuggestionsPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await getAdminSuggestions(token);
      if (Array.isArray(res)) setItems(res);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this suggestion?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setUpdating(id);
    try {
      await deleteSuggestion(token, id);
      setItems(prev => prev.filter(s => s._id !== id));
    } catch {} finally { setUpdating(null); }
  };

  const changeStatus = async (id: string, status: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setUpdating(id);
    try {
      await updateSuggestionStatus(token, id, status);
      setItems(prev => prev.map(s => s._id === id ? { ...s, status } : s));
    } catch {} finally { setUpdating(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Feature Suggestions</h1>
          <p className="text-sm text-white/40">{items.length} suggestions from users</p>
        </div>
        <button onClick={load} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white transition">
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-white/30">No suggestions yet</div>
      ) : (
        <div className="space-y-3">
          {items.map(s => (
            <div key={s._id} className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-white/5 flex flex-col items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg>
                  <span className="text-xs font-black text-white/60">{s.upvoteCount}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">{s.title}</h3>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${STATUS_STYLES[s.status] || ''}`}>{s.status}</span>
                  </div>
                  {s.description && <p className="text-xs text-white/40 mb-2">{s.description}</p>}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/25">@{s.username}</span>
                    <span className="text-[10px] text-white/25">{new Date(s.createdAt).toLocaleDateString()}</span>
                    <div className="ml-auto flex gap-1">
                      {STATUSES.map(st => (
                        <button
                          key={st}
                          onClick={() => changeStatus(s._id, st)}
                          disabled={s.status === st || updating === s._id}
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase transition ${
                            s.status === st ? STATUS_STYLES[st] : 'bg-white/5 text-white/30 hover:text-white/60'
                          } disabled:opacity-40`}
                        >
                          {st}
                        </button>
                      ))}
                      <button
                        onClick={() => handleDelete(s._id)}
                        disabled={updating === s._id}
                        className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-40 ml-1"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
