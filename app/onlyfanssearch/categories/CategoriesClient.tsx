'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLocalePath } from '@/lib/i18n/client';
import type { CategoryBrowseItem, CategoryBrowseSection, CountryBrowseRegion } from '../categoryBrowse';

const OF_BROWSE_HOT_SLUGS = new Set(['teen', 'asian', 'big-boobs', 'big-ass', 'goth', 'pornstar']);

function formatBrowseCount(n?: number) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function CategoryLink({ item, hot }: { item: CategoryBrowseItem; hot?: boolean }) {
  const lp = useLocalePath();
  const count = formatBrowseCount(item.count);

  return (
    <Link
      href={lp(item.href)}
      className="group flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 sm:px-4 sm:py-3.5 hover:border-[#00AFF0]/35 hover:bg-[#00AFF0]/[0.08] transition-all"
    >
      <span className="flex items-center gap-2 min-w-0">
        {hot && (
          <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
            Hot
          </span>
        )}
        <span className="text-sm font-bold text-white/85 group-hover:text-[#00AFF0] transition-colors truncate">
          {item.flag ? `${item.flag} ${item.label}` : item.label}
        </span>
      </span>
      {count && <span className="shrink-0 text-[11px] font-semibold text-white/35 tabular-nums">{count}</span>}
    </Link>
  );
}

function BrowseSection({ section }: { section: CategoryBrowseSection }) {
  return (
    <section id={section.id} className="scroll-mt-28">
      <div className="flex items-baseline justify-between gap-3 mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-black text-white">{section.label}</h2>
        <span className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">
          {section.items.length} categories
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
        {section.items.map((item) => (
          <CategoryLink key={item.slug} item={item} hot={OF_BROWSE_HOT_SLUGS.has(item.slug)} />
        ))}
      </div>
    </section>
  );
}

function CountryRegionBlock({ region }: { region: CountryBrowseRegion }) {
  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-wider text-[#00AFF0]/80 mb-2.5">{region.label}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
        {region.items.map((item) => (
          <CategoryLink key={item.slug} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function CategoriesClient({
  sections,
  countryRegions,
  usStates,
}: {
  sections: CategoryBrowseSection[];
  countryRegions: CountryBrowseRegion[];
  usStates: CategoryBrowseItem[];
}) {
  const lp = useLocalePath();
  const navSections = [
    ...sections.map((s) => ({ id: s.id, label: s.label })),
    { id: 'countries', label: 'Countries' },
    ...(usStates.length > 0 ? [{ id: 'us-states', label: 'US States' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <Navbar variant="onlyfans" />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] font-semibold text-white/40 mb-4">
            <Link href={lp('/onlyfanssearch')} className="hover:text-[#00AFF0] transition-colors">
              OnlyFans
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/70">Categories</span>
          </nav>

          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Browse OnlyFans categories</h1>
            <p className="text-sm sm:text-base text-white/50 max-w-2xl">
              Find creators by type, look, ethnicity, or kink. Updated daily.
            </p>
          </header>

          <div className="sticky top-[58px] z-40 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 mb-8 bg-[#111111]/95 backdrop-blur-md border-y border-white/[0.06]">
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {navSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide border border-white/[0.10] bg-white/[0.04] text-white/60 hover:text-white hover:border-[#00AFF0]/40 hover:bg-[#00AFF0]/10 transition-all"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-10 sm:space-y-12">
            {sections.map((section) => (
              <BrowseSection key={section.id} section={section} />
            ))}

            <section id="countries" className="scroll-mt-28">
              <div className="flex items-baseline justify-between gap-3 mb-4 sm:mb-5">
                <h2 className="text-lg sm:text-xl font-black text-white">Countries</h2>
                <span className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">
                  {countryRegions.reduce((n, r) => n + r.items.length, 0)} countries
                </span>
              </div>
              <div className="space-y-6 sm:space-y-8">
                {countryRegions.map((region) => (
                  <CountryRegionBlock key={region.id} region={region} />
                ))}
                {usStates.length > 0 && (
                  <div id="us-states" className="scroll-mt-28">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#00AFF0]/80 mb-2.5">US States</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                      {usStates.map((item) => (
                        <CategoryLink key={item.slug} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
