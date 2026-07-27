'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { listOFMHome, createOFMAgency, importCreatorToOFMAgency } from '@/lib/actions/ofClients';

type HomeCard = {
  kind: 'agency' | 'ofm-creators';
  _id?: string;
  name: string;
  slug: string;
  goalClicks?: number;
  creatorCount: number;
  totalClicks: number;
  last24h: number;
  last48h: number;
};

function fmt(n: number) { return n.toLocaleString(); }

function tok() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
}

export default function OFMHome() {
  const [cards, setCards] = useState<HomeCard[]>([]);
  const [agencies, setAgencies] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [agencyName, setAgencyName] = useState('');
  const [creatingAgency, setCreatingAgency] = useState(false);

  const [importInput, setImportInput] = useState('');
  const [importAgencyId, setImportAgencyId] = useState('ofm-creators');
  const [importing, setImporting] = useState(false);

  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);

  const showToast = (msg: string, ok = true) => {
    setToast(msg);
    setToastOk(ok);
    setTimeout(() => setToast(''), 4000);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listOFMHome(tok());
      const list: HomeCard[] = [...(d.agencies || [])];
      if (d.ofmCreators) list.push(d.ofmCreators);
      setCards(list);
      setAgencies((d.agencies || []).map((a: HomeCard) => ({ _id: a._id!, name: a.name })));
    } catch {
      showToast('Failed to load clients', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreateAgency = async () => {
    const name = agencyName.trim();
    if (!name) return;
    setCreatingAgency(true);
    try {
      const created = await createOFMAgency(tok(), { name });
      showToast(`Agency "${created.name}" created`);
      setAgencyName('');
      setImportAgencyId(created._id);
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Create failed', false);
    } finally {
      setCreatingAgency(false);
    }
  };

  const handleImport = async () => {
    if (!importInput.trim()) return;
    setImporting(true);
    try {
      const res = await importCreatorToOFMAgency(tok(), {
        username: importInput.trim(),
        clientId: importAgencyId,
      });
      const msg = res.syncWarning
        ? `Imported ${res.creator.name} (warning: ${res.syncWarning})`
        : `Imported ${res.creator.name} → ${importAgencyId === 'ofm-creators' ? 'Individual Creators' : 'agency'}`;
      showToast(msg, !res.syncWarning);
      setImportInput('');
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border max-w-sm ${
          toastOk ? 'bg-[#0e1018] border-[#00AFF0]/30 text-[#00AFF0]' : 'bg-[#0e1018] border-red-500/30 text-red-400'
        }`}>
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">OFM</h1>
        <p className="text-white/40 text-sm mt-1">Create agencies, import creators, track performance</p>
      </div>

      {/* Create agency + Import — one panel */}
      <div className="bg-[#0e1018] border border-white/[0.08] rounded-2xl p-5 space-y-5">
        <div>
          <h2 className="text-sm font-black text-white/70 mb-3">Create new agency</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !creatingAgency && handleCreateAgency()}
              placeholder="Agency name, e.g. OF Brazil"
              className="flex-1 min-w-[200px] px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 outline-none focus:border-[#00AFF0]/40"
            />
            <button
              type="button"
              onClick={handleCreateAgency}
              disabled={creatingAgency || !agencyName.trim()}
              className="px-5 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-black text-sm font-bold rounded-xl disabled:opacity-40 transition"
            >
              {creatingAgency ? 'Creating…' : 'Create agency'}
            </button>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-5">
          <h2 className="text-sm font-black text-white/70 mb-3">Import creator</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !importing && handleImport()}
              placeholder="OnlyFans URL or @username"
              className="flex-1 min-w-[180px] px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 outline-none focus:border-[#00AFF0]/40"
            />
            <select
              value={importAgencyId}
              onChange={(e) => setImportAgencyId(e.target.value)}
              className="px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#00AFF0]/40 min-w-[160px]"
            >
              <option value="ofm-creators" className="bg-[#0e1018]">Individual Creators</option>
              {agencies.map((a) => (
                <option key={a._id} value={a._id} className="bg-[#0e1018]">{a.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !importInput.trim()}
              className="px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition"
            >
              {importing ? 'Scraping…' : 'Import'}
            </button>
          </div>
          <p className="text-[11px] text-white/30 mt-2">Scrapes profile, launches ad, assigns to agency. Takes ~30-60s.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00AFF0]" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">No clients yet. Create an agency above.</div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#0c0f16]">
          <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4rem] sm:grid-cols-[minmax(0,1fr)_5rem_5rem_5.5rem] gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 border-b border-white/[0.06] text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
            <span>Client</span>
            <span className="text-right">24h</span>
            <span className="text-right">48h</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {cards.map((c) => (
              <Link
                key={c.slug}
                href={`/ofm/${c.slug}`}
                className="group grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_4rem] sm:grid-cols-[minmax(0,1fr)_5rem_5rem_5.5rem] gap-2 sm:gap-3 items-center px-4 sm:px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-white/90 group-hover:text-[#7ddcff] transition truncate">
                    {c.name}
                    <span className="text-white/35 font-semibold"> · {c.creatorCount} model{c.creatorCount !== 1 ? 's' : ''}</span>
                  </div>
                  {(c.kind !== 'ofm-creators' && ((c.goalClicks ?? 0) > 0 || c.kind === 'agency')) && (
                    <div className="text-[11px] text-white/30 mt-0.5 truncate">
                      {(c.goalClicks ?? 0) > 0 ? `Goal ${fmt(c.goalClicks!)} clicks` : 'Agencies / Partners'}
                    </div>
                  )}
                </div>
                <div className="text-right text-[13px] font-semibold tabular-nums text-white/70">{fmt(c.last24h)}</div>
                <div className="text-right text-[13px] font-semibold tabular-nums text-white/70">{fmt(c.last48h)}</div>
                <div className="text-right text-[13px] font-bold tabular-nums text-[#00AFF0]/90">{fmt(c.totalClicks)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
