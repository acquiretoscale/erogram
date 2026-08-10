import Link from 'next/link';
import {
  getRelatedRankingLinks,
  type RelatedRankingVariant,
} from '@/lib/bestOnlyfansAccounts/relatedRankings';

type Props = {
  slug: string;
  /** Current page variant — related links start with the opposite, then alternate */
  pageVariant?: RelatedRankingVariant;
  /** top = up to 5 same-cluster; bottom = remaining (no overlap); all = full list */
  placement?: 'all' | 'top' | 'bottom';
  /** Locale-aware path builder; receives the English path from getRelatedRankingLinks */
  localizeHref?: (path: string) => string;
  tone?: 'cream' | 'dark';
  ariaLabel?: string;
};

/**
 * Related niche pills: keyword-rich "Top X Models" / "Best X Models",
 * alternating Top ↔ Best destinations.
 */
export default function RelatedRankingLinks({
  slug,
  pageVariant = 'top10',
  placement = 'all',
  localizeHref = (path) => path,
  tone = 'cream',
  ariaLabel = 'Related rankings',
}: Props) {
  const links = getRelatedRankingLinks(slug, pageVariant, placement);
  if (!links.length) return null;

  const isDark = tone === 'dark';

  return (
    <nav
      aria-label={ariaLabel}
      className={`flex flex-wrap items-center gap-2 ${isDark ? 'justify-center' : ''}`}
    >
      {links.map((item) => (
        <Link
          key={`${item.variant}-${item.slug}`}
          href={localizeHref(item.path)}
          className={
            isDark
              ? 'inline-flex items-center rounded-lg bg-[#00AFF0]/15 border border-[#00AFF0]/35 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-[#00AFF0] hover:bg-[#00AFF0] hover:text-black transition-colors'
              : 'inline-flex items-center rounded-full border px-3.5 py-1.5 text-[11px] sm:text-xs font-bold tracking-wide transition-all hover:-translate-y-px'
          }
          style={
            isDark
              ? undefined
              : {
                  color: '#2B1B28',
                  borderColor: 'rgba(43,27,40,0.18)',
                  backgroundColor: '#FDFDFD',
                }
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
