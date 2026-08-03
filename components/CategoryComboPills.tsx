'use client';

import Link from 'next/link';
import type { ComboPillItem } from '@/lib/onlyfans/categoryComboPills';

interface Props {
  pills: ComboPillItem[];
  variant?: 'dark' | 'light';
}

export default function CategoryComboPills({ pills, variant = 'dark' }: Props) {
  if (!pills.length) return null;

  const isLight = variant === 'light';

  return (
    <nav aria-label="Related niches" className="flex flex-wrap gap-2.5 mb-10 pb-2">
      {pills.map((pill) => (
        <Link
          key={pill.href}
          href={pill.href}
          className="inline-flex items-center px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={
            isLight
              ? { backgroundColor: '#fff', color: '#2B1B28', border: '1px solid rgba(43,27,40,0.14)', boxShadow: '0 2px 8px rgba(43,27,40,0.06)' }
              : { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }
          }
        >
          {pill.label}
        </Link>
      ))}
    </nav>
  );
}
