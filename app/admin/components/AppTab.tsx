'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPwaInstalls } from '@/lib/actions/pwaInstall';

type InstallRow = {
  id: string;
  clientId: string;
  createdAt: string | Date;
  userId: string | null;
  username: string | null;
  email: string | null;
  status: 'guest' | 'free' | 'paid';
  statusLabel: string;
};

export default function AppTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [linked, setLinked] = useState(0);
  const [guests, setGuests] = useState(0);
  const [paid, setPaid] = useState(0);
  const [free, setFree] = useState(0);
  const [installs, setInstalls] = useState<InstallRow[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      const data = await getPwaInstalls(token);
      setTotal(data.total);
      setLinked(data.linked);
      setGuests(data.guests);
      setPaid(data.paid || 0);
      setFree(data.free || 0);
      setInstalls(data.installs as InstallRow[]);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">APP</h1>
          <p className="text-[#999] text-sm">Mobile app installs (PWA)</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider mb-1">Total</p>
          <p className="text-[22px] font-bold text-emerald-300 tabular-nums leading-none">{total.toLocaleString()}</p>
        </div>
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Guests</p>
          <p className="text-[22px] font-bold text-white tabular-nums leading-none">{guests.toLocaleString()}</p>
          <p className="text-[11px] text-white/30 mt-1">Not registered</p>
        </div>
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Accounts</p>
          <p className="text-[22px] font-bold text-white tabular-nums leading-none">{linked.toLocaleString()}</p>
        </div>
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Free</p>
          <p className="text-[22px] font-bold text-white tabular-nums leading-none">{free.toLocaleString()}</p>
        </div>
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1">Paid</p>
          <p className="text-[22px] font-bold text-amber-300 tabular-nums leading-none">{paid.toLocaleString()}</p>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#999]">Loading installs...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-400">{error}</div>
        ) : installs.length === 0 ? (
          <div className="p-12 text-center text-[#999]">No installs yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">When</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {installs.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-gray-300 text-sm whitespace-nowrap">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {row.status === 'paid' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          Paid · {row.statusLabel}
                        </span>
                      ) : row.status === 'free' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          Free
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/50 border border-white/10">
                          Guest
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {row.username ? (
                        <div>
                          <p className="text-white font-medium">{row.username}</p>
                          {row.email && <p className="text-[11px] text-white/30">{row.email}</p>}
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs">Not registered</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-white/30 font-mono truncate max-w-[180px]" title={row.clientId}>
                      {row.clientId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
