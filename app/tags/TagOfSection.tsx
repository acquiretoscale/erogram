'use client';

import Link from 'next/link';
import { useLocalePath } from '@/lib/i18n/client';
import type { TagRankingPage } from '@/lib/tags/rankings';

const HEADING = '#331a26';

export default function TagOfSection({
  rankingPages = [],
}: {
  rankingPages?: TagRankingPage[];
  top10?: unknown;
  creators?: unknown;
}) {
  const lp = useLocalePath();
  if (!rankingPages.length) return null;

  return (
    <section className="mt-12 border-t border-[#ececec] pt-10">
      <h2 className="mb-6 text-xl font-bold" style={{ color: HEADING }}>
        OnlyFans
      </h2>
      <h3 className="mb-3 text-sm font-bold text-[#2B1B28]">Top Rankings</h3>
      <nav
        aria-label="OnlyFans rankings"
        className="rounded-xl border border-[rgba(43,27,40,0.1)] bg-[#F7F4EC] px-3 py-4 sm:px-4"
      >
        <ul className="m-0 list-none p-0">
          {rankingPages.map((page) => (
            <li
              key={page.slug}
              className="border-b border-[rgba(43,27,40,0.08)] last:border-b-0"
            >
              <Link
                href={lp(page.href)}
                target="_blank"
                rel="noopener noreferrer"
                className={`block py-2.5 text-[#2B1B28] no-underline ${
                  page.isPrimary ? 'bg-white/40 -mx-1 px-1 rounded-lg' : ''
                }`}
              >
                <span className="text-[11px] font-semibold leading-snug sm:text-[12px]">
                  {page.isPrimary && (
                    <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wide text-[#00AFF0]">
                      Featured ranking
                    </span>
                  )}
                  {page.label} OnlyFans Models
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
