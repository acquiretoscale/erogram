import Link from 'next/link';
import Navbar from '@/components/Navbar';
import BestDirectoryRankCard from './BestDirectoryRankCard';
import type { DirectoryPageConfig } from './config';
import type { DirectoryRankItem } from './types';

const ACCENT = '#c0392f';

type Props = {
  page: DirectoryPageConfig;
  items: DirectoryRankItem[];
  month: string;
  year: number;
  updatedLabel: string;
  theBestTemplate: string;
  theBestFallback: string;
  heroIntro: string;
  ctaLabel: string;
  viewsLabel: string;
  curatingMsg: string;
  wantMore: string;
  wantMoreDesc: string;
  browseAll: string;
};

export default function RankingPageView({
  page,
  items,
  month,
  year,
  updatedLabel,
  theBestTemplate,
  theBestFallback,
  heroIntro,
  ctaLabel,
  viewsLabel,
  curatingMsg,
  wantMore,
  wantMoreDesc,
  browseAll,
}: Props) {
  const count = Math.min(items.length, 30);
  const h1Prefix =
    items.length > 0
      ? theBestTemplate.replace('{count}', String(count)).split('{category}')[0]
      : theBestFallback.split('{category}')[0];
  const h1Suffix = (items.length > 0 ? theBestTemplate : theBestFallback).split('{category}')[1] || '';

  return (
    <div className="explore-page explore-bg explore-scanlines min-h-screen text-white relative">
      <Navbar accent={ACCENT} />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <header className="text-center mb-16">
          <div className="inline-block px-4 py-1 bg-[#c0392f]/20 text-[#c0392f] rounded-full text-sm font-bold mb-4 border border-[#c0392f]/30">
            {updatedLabel.replace('{month}', month).replace('{year}', String(year))}
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight">
            {h1Prefix}
            <span className="text-[#c0392f]">{page.label}</span>
            {h1Suffix}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">{heroIntro}</p>
        </header>

        {items.length > 0 ? (
          <div className="space-y-6 mb-16">
            {items.map((item, index) => (
              <BestDirectoryRankCard
                key={`${item.href}-${index}`}
                item={item}
                rank={index + 1}
                ctaLabel={ctaLabel}
                viewsLabel={viewsLabel}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 mb-20">
            <p className="text-xl text-gray-400">{curatingMsg}</p>
          </div>
        )}

        <div className="text-center p-10 rounded-3xl border border-[#c0392f]/25 bg-[#1a0808]/90">
          <h3 className="text-2xl font-bold mb-4">{wantMore}</h3>
          <p className="text-gray-400 mb-8">{wantMoreDesc}</p>
          <Link
            href={page.browseHref}
            className="inline-block bg-[#c0392f] text-white px-8 py-4 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            {browseAll}
          </Link>
        </div>
      </main>
    </div>
  );
}
