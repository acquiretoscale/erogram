'use client';

import { useEffect, useMemo, useState } from 'react';
import { PLACEMENTS, AD_KEYWORDS, canonicalKeyword, type PlacementDef } from '@/lib/adPlacements';
import { updateOFMModelCampaign } from '@/lib/actions/ofManage';

export interface OFMCampaign {
  _id: string;
  status: string;
  isVisible: boolean;
  startDate: string | null;
  endDate: string | null;
  placements: string[];
  targetKeywords: string[];
  priority: 'normal' | 'boost';
  dailyClickCap: number | null;
  blockFormat: 'banner' | 'card';
}

const PLACEMENT_GROUPS = [
  'Top Groups',
  'In-Feed',
  'Top Bots',
  'Join Pages',
  'AI NSFW',
  'Home',
  'Best Groups',
  'OnlyFans',
  'Banners',
  'Trending on Erogram',
] as const;

function runStatus(c: OFMCampaign): { label: string; cls: string } {
  const now = Date.now();
  const start = c.startDate ? new Date(c.startDate).getTime() : null;
  const end = c.endDate ? new Date(c.endDate).getTime() : null;
  if (c.status === 'ended') return { label: 'Ended', cls: 'bg-red-500/15 text-red-300 border-red-500/30' };
  if (c.status === 'paused') return { label: 'Paused', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
  if (end && end < now) return { label: 'Ended', cls: 'bg-red-500/15 text-red-300 border-red-500/30' };
  if (start && start > now) return { label: 'Scheduled', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
  if (c.status === 'active' && c.isVisible !== false) return { label: 'Running', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  return { label: c.status || 'Unknown', cls: 'bg-white/10 text-white/50 border-white/15' };
}

function fmtDate(iso: string | null) {
  if (!iso) return 'Evergreen';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OFMModelAdPanel({
  creatorId,
  campaign,
  token,
  onSaved,
}: {
  creatorId: string;
  campaign: OFMCampaign | null;
  token: string;
  onSaved: () => void | Promise<void>;
}) {
  const [draftPlacements, setDraftPlacements] = useState<string[]>([]);
  const [draftKeywords, setDraftKeywords] = useState('');
  const [draftPriority, setDraftPriority] = useState<'normal' | 'boost'>('normal');
  const [draftCap, setDraftCap] = useState('');
  const [draftBlockFormat, setDraftBlockFormat] = useState<'banner' | 'card'>('card');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!campaign) return;
    setDraftPlacements(campaign.placements || []);
    setDraftKeywords((campaign.targetKeywords || []).join(', '));
    setDraftPriority(campaign.priority || 'normal');
    setDraftBlockFormat(campaign.blockFormat || 'card');
    setDraftCap(campaign.dailyClickCap && campaign.dailyClickCap > 0 ? String(campaign.dailyClickCap) : '');
  }, [campaign]);

  const status = useMemo(() => (campaign ? runStatus(campaign) : null), [campaign]);
  const keywordSelected = useMemo(
    () => new Set(draftKeywords.split(',').map((k) => canonicalKeyword(k)).filter(Boolean)),
    [draftKeywords],
  );

  const togglePlacement = (id: string) => {
    setDraftPlacements((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleKeyword = (slug: string) => {
    const next = new Set(keywordSelected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setDraftKeywords([...next].join(', '));
  };

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const savePlacements = async () => {
    if (!campaign) return;
    setSaving(true);
    try {
      const keywords = [...new Set(draftKeywords.split(',').map((k) => canonicalKeyword(k)).filter(Boolean))];
      const cap = draftCap.trim() === '' ? 0 : Math.max(0, Math.floor(Number(draftCap) || 0));
      const targetsHome = draftPlacements.some((p) => p === 'home-block-1' || p === 'home-block-2');
      await updateOFMModelCampaign(token, creatorId, {
        placements: draftPlacements,
        targetKeywords: keywords,
        priority: draftPriority,
        dailyClickCap: cap > 0 ? cap : null,
        ...(targetsHome ? { blockFormat: draftBlockFormat } : {}),
      });
      flash('Saved');
      await onSaved();
    } catch (e) {
      flash((e as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const lifecycle = async (patch: Parameters<typeof updateOFMModelCampaign>[2]) => {
    if (!campaign) return;
    setActing(true);
    try {
      await updateOFMModelCampaign(token, creatorId, patch);
      flash('Updated');
      await onSaved();
    } catch (e) {
      flash((e as Error).message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const pauseResume = async () => {
    if (!campaign || !status) return;
    if (status.label === 'Running') {
      await lifecycle({ status: 'paused', isVisible: true });
      return;
    }
    const now = Date.now();
    const patch: Parameters<typeof updateOFMModelCampaign>[2] = { status: 'active', isVisible: true };
    if (campaign.startDate && new Date(campaign.startDate).getTime() > now) patch.startDate = new Date().toISOString();
    if (campaign.endDate && new Date(campaign.endDate).getTime() < now) {
      patch.endDate = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    await lifecycle(patch);
  };

  if (!campaign) {
    return (
      <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-5">
        <h2 className="text-sm font-black uppercase tracking-wider text-white/50 mb-2">Ad traffic</h2>
        <p className="text-sm text-white/40">No linked ad campaign for this model yet.</p>
      </div>
    );
  }

  const showKeywords = draftPlacements.some((p) => p === 'best-of' || p === 'best-groups' || p === 'of-cat');

  return (
    <div className="bg-[#0e1018] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-white/50">Ad traffic</h2>
        {msg && <span className="text-xs font-bold text-[#00AFF0]">{msg}</span>}
      </div>
      <p className="text-[11px] text-white/35">Manage placements and caps here. Changes sync to the ad network automatically.</p>

      <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {status && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.cls}`}>{status.label}</span>}
          <span className="text-xs text-white/40">{fmtDate(campaign.startDate)} → {fmtDate(campaign.endDate)}</span>
          <div className="flex-1" />
          <button type="button" onClick={pauseResume} disabled={acting} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-50">
            {status?.label === 'Running' ? 'Pause' : 'Resume'}
          </button>
          <button type="button" onClick={() => lifecycle({ status: 'active', isVisible: true, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 7 * 86400000).toISOString() })} disabled={acting} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-50">1 week</button>
          <button type="button" onClick={() => lifecycle({ status: 'active', isVisible: true, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 86400000).toISOString() })} disabled={acting} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-50">1 month</button>
          <button type="button" onClick={() => lifecycle({ status: 'active', isVisible: true, startDate: new Date().toISOString(), endDate: null })} disabled={acting} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00AFF0]/20 text-[#00AFF0] hover:bg-[#00AFF0]/30 disabled:opacity-50">Lifetime</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLACEMENT_GROUPS.map((g) => {
          const items = PLACEMENTS.filter((p) => p.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-2">{g}</div>
              <div className="space-y-1.5">
                {items.map((p: PlacementDef) => (
                  <label key={p.id} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftPlacements.includes(p.id)}
                      onChange={() => togglePlacement(p.id)}
                      className="accent-[#00AFF0] mt-0.5"
                    />
                    <span className="text-white/75 text-[12px] leading-snug">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(draftPlacements.includes('home-block-1') || draftPlacements.includes('home-block-2')) && (
        <div className="rounded-lg border border-[#00AFF0]/20 bg-[#00AFF0]/[0.04] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#00AFF0]/80 mb-2">Trending block format</div>
          <div className="flex gap-2">
            {([['card', 'Card grid'], ['banner', 'Wide banner']] as const).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setDraftBlockFormat(val)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${draftBlockFormat === val ? 'bg-[#00AFF0] text-black border-[#00AFF0]' : 'bg-white/[0.04] text-white/60 border-white/10'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {showKeywords && (() => {
        const allSelected = keywordSelected.size >= AD_KEYWORDS.length;
        return (
        <div className="rounded-lg border border-[#00AFF0]/20 bg-[#00AFF0]/[0.04] p-3">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#00AFF0]/80">Keyword targeting (Top 10 / category pages)</div>
            <button
              type="button"
              onClick={() => setDraftKeywords(allSelected ? '' : AD_KEYWORDS.map((k) => k.slug).join(', '))}
              className="px-2 py-1 rounded-md text-[11px] font-bold border border-[#00AFF0]/50 text-[#00AFF0] hover:bg-[#00AFF0]/10"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AD_KEYWORDS.map((kw) => {
              const on = keywordSelected.has(kw.slug);
              return (
                <button
                  key={kw.slug}
                  type="button"
                  onClick={() => toggleKeyword(kw.slug)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${on ? 'bg-[#00AFF0] text-black border-[#00AFF0]' : 'bg-white/[0.04] text-white/60 border-white/10'}`}
                >
                  {kw.label}
                </button>
              );
            })}
          </div>
        </div>
        );
      })()}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Priority</label>
          <select
            value={draftPriority}
            onChange={(e) => setDraftPriority(e.target.value as 'normal' | 'boost')}
            className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#00AFF0]/50"
          >
            <option value="normal">Normal</option>
            <option value="boost">Boost (wins slot)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Daily click cap</label>
          <input
            value={draftCap}
            onChange={(e) => setDraftCap(e.target.value)}
            placeholder="0 = unlimited"
            className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm outline-none focus:border-[#00AFF0]/50"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={savePlacements}
        disabled={saving}
        className="bg-[#00AFF0] text-black font-black text-sm px-5 py-2 rounded-lg hover:bg-[#00C4FF] disabled:opacity-50 transition"
      >
        {saving ? 'Saving…' : 'Save ad settings'}
      </button>
    </div>
  );
}
