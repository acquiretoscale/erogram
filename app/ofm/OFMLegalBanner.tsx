'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CREATOR_BLACKLIST_COUNT } from '@/lib/onlyfanssearch/creatorBlacklist';

export default function OFMLegalBanner() {
  const pathname = usePathname();
  if (pathname === '/ofm/legal') return null;

  return (
    <div className="mb-6 rounded-xl border-2 border-red-500/45 bg-red-950/35 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-red-300 font-bold text-sm">
          Legal: {CREATOR_BLACKLIST_COUNT} creators permanently blocked (Google DMCA Aug 2026)
        </p>
        <p className="text-red-200/65 text-xs mt-0.5">Never scrape or import these usernames.</p>
      </div>
      <Link
        href="/ofm/legal"
        className="shrink-0 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold text-center transition"
      >
        Legal blocklist
      </Link>
    </div>
  );
}
