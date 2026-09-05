'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Save, X } from 'lucide-react';
import ToolCard from './ToolCard';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import { adminSetFeaturedHubSlugs } from '@/lib/actions/ainsfwAdmin';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';

export function loadAllScores(allStats?: Record<string, ToolStatsData>): Record<string, number> {
  const map: Record<string, number> = {};
  if (allStats) {
    for (const [slug, stats] of Object.entries(allStats)) {
      map[slug] = (stats.upvotes ?? 0) - (stats.downvotes ?? 0);
    }
  }
  return map;
}

interface TopAINsfwBlockProps {
  tools: AINsfwTool[];
  featuredHubSlugs: string[];
  allStats?: Record<string, ToolStatsData>;
  featuredCampaignMap?: Record<string, string>;
  onVoteChange: (slug: string, score: number) => void;
  verifiedSlugs?: string[];
}

export default function TopAINsfwBlock({
  tools,
  featuredHubSlugs,
  allStats,
  featuredCampaignMap = {},
  onVoteChange,
  verifiedSlugs = [],
}: TopAINsfwBlockProps) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const verifiedSet = new Set(verifiedSlugs);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hubSlugs, setHubSlugs] = useState(featuredHubSlugs);
  const [draft, setDraft] = useState<string[]>(featuredHubSlugs);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    setHubSlugs(featuredHubSlugs);
  }, [featuredHubSlugs]);

  const bySlug = new Map(tools.map((tool) => [tool.slug, tool]));
  const featuredTools = hubSlugs
    .map((slug) => bySlug.get(slug))
    .filter(Boolean) as AINsfwTool[];

  const displayTools =
    featuredTools.length >= 4
      ? featuredTools.slice(0, 4)
      : featuredTools.length >= 2
        ? featuredTools.slice(0, 2)
        : [];

  const canEdit = isAdmin && tools.length > 4;

  const q = search.trim().toLowerCase();
  const pickerTools = tools.filter((tool) => {
    if (draft.includes(tool.slug)) return false;
    if (!q) return true;
    return (
      tool.name.toLowerCase().includes(q) ||
      tool.vendor.toLowerCase().includes(q) ||
      tool.slug.includes(q)
    );
  }).slice(0, 12);

  const openEdit = () => {
    setDraft(hubSlugs.slice(0, 4));
    setSearch('');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (draft.length !== 2 && draft.length !== 4) {
      alert('Pick 2 or 4 tools');
      return;
    }
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
      const result = await adminSetFeaturedHubSlugs(token, draft);
      setHubSlugs(result.slugs);
      setEditing(false);
    } catch (e: any) {
      alert(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (displayTools.length !== 2 && displayTools.length !== 4 && !editing) return null;

  const gridCols =
    displayTools.length === 4
      ? 'grid grid-cols-2 lg:grid-cols-4 gap-3'
      : 'grid grid-cols-2 gap-3 max-w-xl mx-auto w-full';

  return (
    <section className="mb-10 sm:mb-14">
      <div className="bg-white rounded-2xl border border-black/10 p-4 sm:p-5">
        <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
          <h2 className="inline-block px-2.5 py-1 rounded-lg bg-[#22c55e] text-black text-sm sm:text-base font-black uppercase tracking-wider">
            {t('ainsfw.featuredOn', 'Featured on Erogram')}
          </h2>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={openEdit}
                className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 shrink-0 rounded-md px-3 sm:px-4 bg-[#22c55e] hover:bg-[#16a34a] text-black text-[9px] sm:text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <Link
              href={lp('/add/ainsfw')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-9 sm:h-10 shrink-0 rounded-md px-3 sm:px-4 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-colors"
            >
              {t('ainsfw.getFeatured', 'GET FEATURED')}
            </Link>
          </div>
        </div>
        {displayTools.length === 2 || displayTools.length === 4 ? (
          <div className={gridCols}>
            {displayTools.map((tool, i) => (
              <ToolCard
                key={tool.slug}
                tool={tool}
                index={i}
                initialStats={allStats?.[tool.slug]}
                onVoteChange={onVoteChange}
                verified={verifiedSet.has(tool.slug)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditing(false)}>
          <div className="bg-[#141414] rounded-2xl border border-white/[0.10] shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">Edit</h3>
              <button type="button" onClick={() => setEditing(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/40 text-xs mb-4">{draft.length} / 4</p>

            <div className="space-y-2 mb-4">
              {draft.map((slug) => {
                const tool = bySlug.get(slug);
                return (
                  <div key={slug} className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2">
                    <span className="text-white text-sm font-bold truncate">{tool?.name || slug}</span>
                    <button
                      type="button"
                      onClick={() => setDraft((prev) => prev.filter((s) => s !== slug))}
                      className="ml-auto text-red-400 hover:text-red-300 text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            {draft.length < 4 && (
              <div className="mb-4">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tools..."
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50 mb-2"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {pickerTools.map((tool) => (
                    <button
                      key={tool.slug}
                      type="button"
                      onClick={() => setDraft((prev) => prev.length >= 4 ? prev : [...prev, tool.slug])}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-white text-sm"
                    >
                      {tool.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#22c55e] text-black font-black text-sm hover:bg-[#16a34a] transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:text-white transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
