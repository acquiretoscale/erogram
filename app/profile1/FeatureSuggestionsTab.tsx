'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSuggestions, submitSuggestion, toggleUpvote, deleteSuggestion } from '@/lib/actions/featureSuggestions';

interface Suggestion {
  _id: string;
  title: string;
  description: string;
  username: string;
  status: string;
  upvoteCount: number;
  voted: boolean;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  reviewed: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  planned: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  done: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function FeatureSuggestionsTab({ isAdmin = false }: { isAdmin?: boolean }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSuggestions(token, 1, sort);
      setSuggestions(res.suggestions);
    } catch {} finally { setLoading(false); }
  }, [token, sort]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!token || !title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await submitSuggestion(token, title, desc);
      if ('error' in res) {
        setError(res.error);
      } else {
        setTitle('');
        setDesc('');
        setShowForm(false);
        load();
      }
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally { setSubmitting(false); }
  };

  const handleVote = async (id: string) => {
    if (!token || votingId) return;
    setVotingId(id);
    try {
      const res = await toggleUpvote(token, id);
      if ('ok' in res && res.ok) {
        setSuggestions(prev => prev.map(s =>
          s._id === id ? { ...s, upvoteCount: res.upvoteCount, voted: res.voted } : s
        ));
      }
    } catch {} finally { setVotingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this suggestion?')) return;
    try {
      const res = await deleteSuggestion(token, id);
      if ('ok' in res) setSuggestions(prev => prev.filter(s => s._id !== id));
    } catch {}
  };

  const timeAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">Feature Suggestions</h2>
          <p className="text-xs text-white/40">Suggest features & vote on ideas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #00aff0, #00d4ff)' }}
        >
          {showForm ? 'Cancel' : '+ Suggest'}
        </button>
      </div>

      {/* Submit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Feature title (e.g. Dark mode for search)"
                maxLength={120}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-[#00aff0]/50 transition"
              />
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Optional: describe why this would be useful..."
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-[#00aff0]/50 transition resize-none"
              />
              {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30">{title.length}/120</span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: '#16a34a' }}
                >
                  {submitting ? 'Posting...' : 'Post suggestion'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sort tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/5">
        {(['top', 'new'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
              sort === s ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {s === 'top' ? '🔥 Top' : '🕐 New'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-white/20 border-t-[#00aff0] rounded-full animate-spin" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">💡</div>
          <p className="text-white/40 text-sm">No suggestions yet — be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map(s => (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-3 flex gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* Upvote */}
              <button
                onClick={() => handleVote(s._id)}
                disabled={!!votingId}
                className={`shrink-0 w-12 h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  s.voted
                    ? 'bg-[#00aff0]/15 border border-[#00aff0]/30'
                    : 'bg-white/[0.03] border border-white/8 hover:border-white/15'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.voted ? '#00aff0' : 'rgba(255,255,255,0.4)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
                <span className={`text-xs font-black ${s.voted ? 'text-[#00aff0]' : 'text-white/50'}`}>{s.upvoteCount}</span>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white leading-snug flex-1">{s.title}</h3>
                  {s.status !== 'new' && (
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${STATUS_COLORS[s.status] || ''}`}>
                      {s.status}
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="text-xs text-white/40 mb-1.5 line-clamp-2">{s.description}</p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-white/25">
                  <span>@{s.username}</span>
                  <span>·</span>
                  <span>{timeAgo(s.createdAt)}</span>
                  {isAdmin && (
                    <button onClick={() => handleDelete(s._id)} className="ml-auto text-red-400/60 hover:text-red-400 transition">
                      🗑
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
