'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';
import {
  getOnlyFansBrowseFilterGroups,
  type BrowseFilterItem,
} from './onlyfansBrowseFilterData';

function itemMatchesQuery(item: BrowseFilterItem, q: string) {
  const hay = `${item.label} ${item.slug}`.toLowerCase();
  return hay.includes(q);
}

export default function OnlyFansBrowseFilter() {
  const lp = useLocalePath();
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('age');

  const groups = useMemo(() => getOnlyFansBrowseFilterGroups(), []);

  const activeGroup = groups.find((g) => g.id === activeId) || groups[0];

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeGroup?.items ?? [];
    const all: BrowseFilterItem[] = [];
    for (const g of groups) all.push(...g.items);
    return all.filter((item) => itemMatchesQuery(item, q));
  }, [activeGroup, groups, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && groups.length && !groups.some((g) => g.id === activeId)) {
      setActiveId(groups[0].id);
    }
  }, [open, groups, activeId]);

  const toggle = () => {
    setOpen((v) => {
      if (!v) setQuery('');
      return !v;
    });
  };

  const renderItem = (item: BrowseFilterItem) => {
    const href = lp(item.href);
    const isSpotlight = ['colombian', 'australian', 'ukrainian'].includes(item.slug);
    const label =
      isSpotlight && item.flag
        ? t('ofSearch.bestOnlyfansCountry').replace('{country}', item.label)
        : item.label;

    return (
      <Link
        key={item.slug}
        href={href}
        onClick={() => setOpen(false)}
        className="group flex items-center gap-2 min-w-0 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:border-[#00AFF0]/40 hover:bg-[#00AFF0]/10 transition-colors"
      >
        {item.flag ? <span className="text-base shrink-0 leading-none" aria-hidden="true">{item.flag}</span> : null}
        <span className="text-[12px] sm:text-[13px] font-bold text-white/80 group-hover:text-[#00AFF0] truncate">{label}</span>
      </Link>
    );
  };

  return (
    <div ref={rootRef} className="relative max-w-2xl mx-auto mt-3 sm:mt-4">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 sm:py-3 rounded-xl border text-left transition-all ${
          open
            ? 'border-[#00AFF0]/50 bg-[#0a1c2e]/90 shadow-[0_0_0_1px_rgba(0,175,240,0.15)]'
            : 'border-white/[0.12] bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.06]'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <SlidersHorizontal size={16} className="text-[#00AFF0] shrink-0" />
          <span className="text-[13px] sm:text-sm font-bold text-white/90 truncate">
            Browse by category, country, or state
          </span>
        </span>
        <ChevronDown size={16} className={`text-white/50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-white/[0.10] bg-[#0d1824] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.75)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.08]">
            <Search size={14} className="text-white/35 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter niches, countries, states..."
              className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/35 outline-none"
              autoFocus
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} className="text-white/40 hover:text-white/70" aria-label="Clear">
                <X size={14} />
              </button>
            ) : null}
          </div>

          {!query.trim() ? (
            <div className="flex flex-col sm:flex-row max-h-[min(70vh,520px)]">
              <div className="sm:w-44 shrink-0 border-b sm:border-b-0 sm:border-r border-white/[0.08] overflow-x-auto sm:overflow-y-auto">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveId(g.id)}
                    className={`w-full text-left px-3 py-2.5 text-[12px] font-bold whitespace-nowrap sm:whitespace-normal transition-colors ${
                      activeGroup?.id === g.id
                        ? 'bg-[#00AFF0]/15 text-[#00AFF0]'
                        : 'text-white/55 hover:text-white/85 hover:bg-white/[0.04]'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
                <Link
                  href={lp('/ofsearch/categories')}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 text-[11px] font-bold text-white/40 hover:text-[#00AFF0] border-t border-white/[0.06]"
                >
                  All categories →
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-2">
                  {activeGroup?.label}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(activeGroup?.items ?? []).map(renderItem)}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[min(70vh,520px)] p-3">
              {filteredItems.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{filteredItems.map(renderItem)}</div>
              ) : (
                <p className="text-center text-[13px] text-white/40 py-8">No matches</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
