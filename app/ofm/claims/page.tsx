'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OFMNav from '../OFMNav';
import {
  listProfileClaims,
  approveProfileClaim,
  rejectProfileClaim,
  type ProfileClaimRow,
} from '@/lib/actions/creatorProfileClaim';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';

function tok() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
}

export default function OFMClaims() {
  const [rows, setRows] = useState<ProfileClaimRow[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProfileClaims(tok(), filter);
      setRows(data);
    } catch (e: any) {
      setToast(e.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { reload(); }, [reload]);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await approveProfileClaim(tok(), id);
      if ('error' in res) setToast(res.error);
      else {
        setToast('Claim approved');
        await reload();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this claim?')) return;
    setBusyId(id);
    try {
      const res = await rejectProfileClaim(tok(), id);
      if ('error' in res) setToast(res.error);
      else {
        setToast('Claim rejected');
        await reload();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <OFMNav active="claims" />
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <h1 className="text-2xl font-black mb-2">Claimed Profiles</h1>
        <p className="text-sm text-white/45 mb-6">Review ownership claims from creators and agencies.</p>

        <div className="flex flex-wrap gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${filter === f ? 'bg-[#00AFF0] text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {toast && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-white/10 text-sm text-white">{toast}</div>
        )}

        {loading ? (
          <p className="text-white/40 text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-white/40 text-sm">No claims in this tab.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={row._id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-lg font-black">{row.creatorName || row.creatorUsername}</div>
                    <div className="text-[#00AFF0] text-sm font-bold">@{row.creatorUsername}</div>
                    <Link
                      href={ofCreatorProfileUrl(row.creatorUsername)}
                      target="_blank"
                      className="text-xs text-white/40 hover:text-[#00AFF0] mt-1 inline-block"
                    >
                      View profile
                    </Link>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${row.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : row.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {row.status}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                  <div><span className="text-white/40">Full name:</span> <span className="font-semibold">{row.fullName}</span></div>
                  <div><span className="text-white/40">Email:</span> <span className="font-semibold">{row.email}</span></div>
                  <div><span className="text-white/40">Contact:</span> <span className="font-semibold">{row.contact}</span></div>
                  <div><span className="text-white/40">Type:</span> <span className="font-semibold capitalize">{row.accountType}</span></div>
                  <div><span className="text-white/40">Erogram account:</span> <span className="font-semibold">{row.erogramUsername ? `@${row.erogramUsername}` : '—'}</span></div>
                  <div><span className="text-white/40">Submitted:</span> <span className="font-semibold">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</span></div>
                </div>

                <div className="text-sm mb-4">
                  <div className="text-white/40 text-xs font-bold uppercase mb-1">Why claim</div>
                  <p className="text-white/80 leading-relaxed">{row.reason}</p>
                </div>

                {row.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === row._id}
                      onClick={() => handleApprove(row._id)}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-xs font-black hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row._id}
                      onClick={() => handleReject(row._id)}
                      className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-600/40 text-red-300 text-xs font-black hover:bg-red-600/30 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
