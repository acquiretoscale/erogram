'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CREATOR_BLACKLIST_COUNT,
  getCreatorBlacklistForDisplay,
} from '@/lib/ofsearch/creatorBlacklist';

const ERADICATED_DATE = 'August 8, 2026';
const ERADICATED_COUNT = 23;

type Variant = 'full' | 'compact' | 'banner';

export default function LegalBlacklistPanel({ variant = 'full' }: { variant?: Variant }) {
  const [filter, setFilter] = useState('');
  const all = useMemo(() => getCreatorBlacklistForDisplay(), []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return all;
    return all.filter((u) => u.toLowerCase().includes(q));
  }, [all, filter]);

  if (variant === 'banner') {
    return (
      <div className="rounded-xl border-2 border-red-500/50 bg-red-950/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-black text-xs">
            !
          </span>
          <div className="min-w-0">
            <p className="text-red-300 font-bold text-sm leading-tight">
              Legal: {CREATOR_BLACKLIST_COUNT} creators permanently blocked from scrape and import
            </p>
            <p className="text-red-200/70 text-xs mt-1">
              Google DMCA notices (Aug 2026). {ERADICATED_COUNT} profiles eradicated {ERADICATED_DATE}. Do not re-add.
            </p>
          </div>
        </div>
        <Link
          href="/OF/legal"
          className="shrink-0 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold text-center transition"
        >
          View Legal blocklist
        </Link>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/30 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
            Legal
          </span>
          <h2 className="text-amber-100 font-bold text-base">Permanent DMCA blocklist active</h2>
        </div>
        <p className="text-amber-100/80 text-sm leading-relaxed">
          Google sent copyright removal notices in August 2026. We hard-deleted {ERADICATED_COUNT} profiles on{' '}
          {ERADICATED_DATE}. Scrape and import skip all {CREATOR_BLACKLIST_COUNT} blocked usernames automatically.
        </p>
        <Link
          href="/OF/legal"
          className="inline-flex items-center gap-2 text-sm font-bold text-amber-300 hover:text-amber-200 transition"
        >
          Open full Legal page with every blocked username
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-950/50 to-[#080c10] p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-black uppercase tracking-widest">
            Legal
          </span>
          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs font-bold">
            Forever blocklist
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">DMCA blocklist</h1>
        <p className="text-white/60 text-sm md:text-base max-w-3xl leading-relaxed">
          These creators must never be scraped, imported, or re-added to Erogram. The blocklist is enforced in code on
          every scrape run, admin import, bulk Apify import, and user submission.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">What happened</h2>
        <ul className="space-y-3 text-sm text-white/65 leading-relaxed list-none">
          <li className="flex gap-3">
            <span className="text-red-400 font-bold shrink-0">1.</span>
            <span>
              <strong className="text-white/90">August 2026:</strong> Google Search Console sent multiple copyright
              (DMCA) removal notices for erogram.pro. Claimants included DMCA Piracy Prevention Inc and Bruqi OÜ.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 font-bold shrink-0">2.</span>
            <span>
              Google began removing reported URLs from search results. Many notices also listed the homepage, not just
              individual category or profile pages.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 font-bold shrink-0">3.</span>
            <span>
              <strong className="text-white/90">{ERADICATED_DATE}:</strong> {ERADICATED_COUNT} creator profiles were
              hard-deleted from the database and their R2 images were removed.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 font-bold shrink-0">4.</span>
            <span>
              <strong className="text-white/90">{CREATOR_BLACKLIST_COUNT} usernames and aliases</strong> were added to a
              permanent blocklist in{' '}
              <code className="text-[#00AFF0] text-xs bg-white/5 px-1.5 py-0.5 rounded">creatorBlacklist.ts</code>.
              Any future scrape or import that returns these names is rejected automatically.
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6">
        <h2 className="text-lg font-bold text-amber-100 mb-2">Rules (non-negotiable)</h2>
        <ul className="text-sm text-amber-100/80 space-y-2 list-disc list-inside">
          <li>Never scrape, import, or manually add any username on this list.</li>
          <li>If Apify returns a blacklisted creator in a category batch, the system skips them.</li>
          <li>Adding or removing a name requires an explicit owner order and a code change to the blocklist file.</li>
          <li>Do not file Google counter-notices for these creators without legal advice.</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Blocked usernames ({all.length})</h2>
            <p className="text-white/40 text-xs mt-1">Includes primary names and known aliases from DMCA claims.</p>
          </div>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter list..."
            className="w-full sm:w-64 px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder:text-white/25 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
          />
        </div>
        <div className="max-h-[480px] overflow-y-auto rounded-xl border border-white/[0.06] bg-[#06080c] p-4">
          <div className="flex flex-wrap gap-2">
            {filtered.map((u) => (
              <span
                key={u}
                className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/25 text-red-200/90 text-xs font-mono"
              >
                @{u}
              </span>
            ))}
            {filtered.length === 0 && (
              <p className="text-white/40 text-sm py-4">No matches for &quot;{filter}&quot;</p>
            )}
          </div>
        </div>
        <p className="text-white/30 text-xs mt-3">
          Source of truth: <code className="text-white/50">lib/ofsearch/creatorBlacklist.ts</code>
        </p>
      </div>
    </div>
  );
}
