'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomeBlogCard from '@/app/components/HomeBlogCard';
import type { BlogCard } from '@/lib/actions/blog';
import type { Locale } from '@/lib/i18n/config';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';
import type { ExploreCategory, ExploreSite } from '@/lib/explore/topPornSitesData';
import { exploreMascotFallbackSrc, exploreMascotSrc } from '@/lib/explore/mascotIcons';
import { pickLabelForFirstPick } from '@/lib/explore/pickLabels';
import { HOME_DIRECTORY_GROUPS, homePreviewLimit } from '@/lib/bestDirectory/config';
import { getHomeFeaturedForAdmin, type HomeFeaturedAdminSlot } from '@/lib/actions/homeFeatured';
import type { HomeFeaturedOfCreator } from '@/lib/explore/homeFeaturedOfCreator';
import HomeOfFeaturedCreatorCard from '@/app/components/HomeOfFeaturedCreatorCard';
import { exploreListIconSrc } from '@/lib/explore/siteIconDomain';
import { exploreSiteOutboundRel } from '@/lib/explore/exploreOutboundRel';

const HomeFeaturedPicker = dynamic(() => import('@/app/components/HomeFeaturedPicker'), { ssr: false });

type FeaturedAdmin = {
  slots: Record<string, HomeFeaturedAdminSlot>;
  onSaved: (cardSlug: string, slot: HomeFeaturedAdminSlot | null) => void;
};

const ACCENT = '#c0392f';
const MASCOT_SIZE = 52;
const ROW_HEIGHT = 40;
const FEATURED_ROW_HEIGHT = 54;
const HERO_TITLE_GRADIENT = {
  fontFamily: 'var(--font-bebas), sans-serif',
  backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #b0b0b0 100%)',
} as const;
const HERO_ACCENT_GRADIENT = {
  fontFamily: 'var(--font-bebas), sans-serif',
  backgroundImage: 'linear-gradient(180deg, #ff8a00 0%, #c0392f 100%)',
} as const;

type TopGroupCategory = {
  name: string;
  slug: string;
  count: number;
};

function SectionTitle({
  children,
  accent,
  className = 'mb-12 sm:mb-16',
  sizeClass = 'text-4xl sm:text-5xl md:text-6xl',
}: {
  children: ReactNode;
  accent?: ReactNode;
  className?: string;
  sizeClass?: string;
}) {
  return (
    <h2
      className={`${sizeClass} tracking-tight leading-[0.95] uppercase text-center ${className}`}
    >
      <span className="bg-clip-text text-transparent" style={HERO_TITLE_GRADIENT}>{children}</span>
      {accent != null && (
        <>
          {' '}
          <span className="bg-clip-text text-transparent" style={HERO_ACCENT_GRADIENT}>{accent}</span>
        </>
      )}
    </h2>
  );
}

function isInternalExploreUrl(url: string): boolean {
  return url.startsWith('/');
}

/** Homepage listings always stay on EROgram when we have an internal page. */
function listingHref(site: ExploreSite): string {
  if (isInternalExploreUrl(site.url)) return site.url;
  return site.externalUrl ?? site.url;
}

function opensListingInNewTab(site: ExploreSite): boolean {
  const href = listingHref(site);
  if (isInternalExploreUrl(href)) return Boolean(site.openInNewTab);
  return true;
}

function featuredIndexBefore(sites: ExploreSite[], index: number): number {
  return sites.slice(0, index).filter((site) => site.featured).length;
}

function SiteFavicon({ site, large = false }: { site: ExploreSite; large?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = !imageFailed ? exploreListIconSrc(site) : '';
  const size = large ? 32 : 24;

  if (!src) {
    return (
      <span
        className={`shrink-0 rounded-md border border-gray-200 bg-gray-100 flex items-center justify-center font-black text-gray-500 ${
          large ? 'w-8 h-8 text-[12px] sm:text-[11px]' : 'w-6 h-6 text-[12px] sm:text-[11px]'
        }`}
        aria-hidden
      >
        {site.name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 rounded-md border border-gray-200 bg-white object-cover ${
        large ? 'w-8 h-8' : 'w-6 h-6'
      }`}
      onError={() => setImageFailed(true)}
    />
  );
}

function SiteNameLink({ site }: { site: ExploreSite }) {
  const className =
    'min-w-0 text-[15px] font-semibold leading-tight text-gray-900 hover:text-[#c0392f] transition-colors truncate';
  const href = listingHref(site);

  if (opensListingInNewTab(site)) {
    return (
      <a href={href} target="_blank" rel={exploreSiteOutboundRel(site)} className={className}>
        {site.name}
      </a>
    );
  }

  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {site.name}
    </Link>
  );
}

function PickBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-[#fff3c4]/70 bg-gradient-to-b from-[#fbe7a1] via-[#e5b94e] to-[#b8862b] px-2 py-1 text-[10px] font-black uppercase leading-none tracking-[0.1em] text-[#3b2a05] shadow-[0_2px_8px_-2px_rgba(184,134,43,0.7),inset_0_1px_0_rgba(255,255,255,0.6)]">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" />
      </svg>
      {label}
    </span>
  );
}

function LeaderToolPreview({ site }: { site: ExploreSite }) {
  const href = listingHref(site);
  const newTab = opensListingInNewTab(site);
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={site.image}
        alt={site.name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-end justify-between gap-2">
        <div className="min-w-0 text-left">
          <span className="block text-[12px] sm:text-[11px] font-black tracking-[0.12em] uppercase text-white/70">#1</span>
          <span className="block text-[15px] sm:text-base font-black leading-tight text-white truncate">{site.name}</span>
        </div>
      </div>
    </>
  );
  const className =
    'group relative block w-full aspect-[16/10] overflow-hidden border-b border-[#c0392f]/20 bg-[#120606]';

  return (
    <a href={href} target="_blank" rel={newTab ? exploreSiteOutboundRel(site) : 'noopener noreferrer'} className={className}>
      {inner}
    </a>
  );
}

function CategoryMascot({ categoryIndex }: { categoryIndex: number }) {
  const [src, setSrc] = useState(exploreMascotSrc(categoryIndex));

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={MASCOT_SIZE}
      height={MASCOT_SIZE}
      loading="lazy"
      decoding="async"
      className="shrink-0 object-contain drop-shadow-[0_0_14px_rgba(192,57,47,0.7)]"
      style={{ width: MASCOT_SIZE, height: MASCOT_SIZE }}
      onError={() => setSrc(exploreMascotFallbackSrc(categoryIndex))}
    />
  );
}

function CategoryCard({
  category,
  categoryIndex,
  featuredAdmin,
}: {
  category: ExploreCategory;
  categoryIndex: number;
  featuredAdmin?: FeaturedAdmin | null;
}) {
  const lp = useLocalePath();
  const previewLimit = homePreviewLimit(category.slug);
  const total = category.sites.length;
  const visible = total <= previewLimit ? category.sites : category.sites.slice(0, previewLimit);
  const previewHeight = visible.reduce(
    (sum, site) => sum + (site.featured ? FEATURED_ROW_HEIGHT : ROW_HEIGHT),
    12,
  );
  const leaderSite = category.sites[0]?.image ? category.sites[0] : undefined;
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  return (
    <section
      id={category.slug}
      className={`mb-4 h-full rounded-2xl border bg-white overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] ${
        leaderSite ? 'border-[#c0392f]/45 ring-1 ring-[#c0392f]/20' : 'border-[#c0392f]/20'
      }`}
    >
      <div className="px-4 py-3 border-b border-[#c0392f]/20 bg-[#1a0808] flex items-start gap-3 shadow-[inset_0_1px_0_rgba(255,138,138,0.1)]">
        <CategoryMascot categoryIndex={categoryIndex} />
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-[15px] font-black tracking-[0.05em] uppercase text-white leading-tight">
            {category.title}
          </h2>
          {category.description ? (
            <div className="mt-1 flex items-start gap-1.5">
              <p
                className={`min-w-0 flex-1 text-[13px] leading-snug text-white/65 font-medium ${
                  descriptionOpen ? '' : 'line-clamp-1'
                }`}
              >
                {category.description}
              </p>
              <button
                type="button"
                onClick={() => setDescriptionOpen((open) => !open)}
                aria-expanded={descriptionOpen}
                className="shrink-0 text-[13px] leading-snug font-bold text-[#ff8a7a] hover:text-white transition-colors"
              >
                {descriptionOpen ? 'less' : 'more'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {featuredAdmin ? (
        <HomeFeaturedPicker
          cardSlug={category.slug}
          current={featuredAdmin.slots[category.slug]}
          onSaved={featuredAdmin.onSaved}
        />
      ) : null}

      {leaderSite ? <LeaderToolPreview site={leaderSite} /> : null}

      <div className="px-3 py-2.5 bg-white overflow-hidden" style={{ height: `${previewHeight}px` }}>
        <ol>
          {visible.length === 0 ? (
            <li className="py-6 text-center text-sm font-semibold text-gray-400">No sites yet</li>
          ) : (
            visible.map((site, index) => {
              const rowHeight = site.featured ? FEATURED_ROW_HEIGHT : ROW_HEIGHT;
              const rankClass = site.featured
                ? 'w-5 text-sm font-black text-[#c0392f]'
                : 'w-5 text-sm font-black text-[#c0392f]/80';
              const rowClass = `group flex items-center gap-2.5 border-b border-gray-100 last:border-b-0 hover:bg-red-50 ${
                site.featured ? 'bg-red-50/40' : ''
              }`;
              const pickLabel =
                site.featured && featuredIndexBefore(category.sites, index) === 0
                  ? category.badgeLabel || pickLabelForFirstPick(category.slug)
                  : null;

              if (site.featured) {
                const href = listingHref(site);
                const newTab = opensListingInNewTab(site);
                const rowInner = (
                  <>
                    <span className={`shrink-0 tabular-nums text-right ${rankClass}`}>{index + 1}</span>
                    <SiteFavicon site={site} large />
                    <span className="min-w-0 text-[16px] font-black leading-tight text-gray-900 truncate group-hover:text-[#c0392f] transition-colors">
                      {site.name}
                    </span>
                    {pickLabel ? <PickBadge label={pickLabel} /> : null}
                  </>
                );
                return (
                  <li key={`${category.slug}-${site.name}-${index}`} style={{ height: `${rowHeight}px` }}>
                    <div className={`${rowClass} h-full`}>
                      <a
                        href={href}
                        target="_blank"
                        rel={newTab ? exploreSiteOutboundRel(site) : 'noopener noreferrer'}
                        className="flex items-center gap-2.5 min-w-0 flex-1 h-full"
                      >
                        {rowInner}
                      </a>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={`${category.slug}-${site.name}-${index}`}
                  className={rowClass}
                  style={{ height: `${rowHeight}px` }}
                >
                  <span className={`shrink-0 tabular-nums text-right ${rankClass}`}>{index + 1}</span>
                  <SiteFavicon site={site} />
                  <SiteNameLink site={site} />
                </li>
              );
            })
          )}
        </ol>
      </div>

      <Link
        href={lp(`/${category.slug}`)}
        className="block w-full py-2.5 px-3 text-[12px] sm:text-[11px] font-black tracking-[0.14em] uppercase text-white text-center border-t border-[#c0392f]/20 hover:opacity-90"
        style={{ background: ACCENT }}
      >
        {total > 0 ? `SEE ALL ${total} SITES →` : 'SEE THE WHOLE LIST →'}
      </Link>
    </section>
  );
}

export default function HomeExploreClient({
  categories,
  topGroupCategories = [],
  featuredArticles = [],
  homeFeaturedOf = null,
  locale = 'en',
  faq,
}: {
  categories: ExploreCategory[];
  topGroupCategories?: TopGroupCategory[];
  featuredArticles?: BlogCard[];
  homeFeaturedOf?: HomeFeaturedOfCreator | null;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string; bannerDevice?: 'all' | 'mobile' | 'desktop' }>;
  locale?: Locale;
  faq?: ReactNode;
}) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const [featuredSlots, setFeaturedSlots] = useState<Record<string, HomeFeaturedAdminSlot> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('isAdmin') !== 'true') return;
    getHomeFeaturedForAdmin(token)
      .then(setFeaturedSlots)
      .catch(() => {});
  }, []);

  const featuredAdmin: FeaturedAdmin | null = featuredSlots
    ? {
        slots: featuredSlots,
        onSaved: (cardSlug, slot) =>
          setFeaturedSlots((prev) => {
            const next = { ...(prev || {}) };
            if (slot) next[cardSlug] = slot;
            else delete next[cardSlug];
            return next;
          }),
      }
    : null;

  return (
    <div>
    <div className="explore-page explore-bg explore-scanlines min-h-screen text-white relative">
      <Navbar accent={ACCENT} />

      <div className="relative z-10 home-hero-section">
        <div className="relative z-[1] max-w-[1520px] mx-auto px-5 sm:px-8 lg:px-10 pt-24 sm:pt-[104px] pb-4 sm:pb-6">
          <div className="text-center max-w-6xl mx-auto">
            <h1 className="home-hero-title whitespace-nowrap text-[clamp(24px,7vw,88px)]">
              <span className="home-hero-title-mark">Your #1 </span>
              <span className="home-hero-title-accent">ADULT</span>
              <span className="home-hero-title-mark"> entretainement Hub</span>
            </h1>
            <span className="home-hero-divider" aria-hidden="true" />
            <p className="home-hero-sub mb-4 sm:mb-5 max-w-2xl mx-auto text-center text-[16px] sm:text-[18px] leading-[1.65] font-normal">
              <span>
              Find the best Adult{' '}
              <Link href={lp('/ainsfw')}>
                AI NSFW tools
              </Link>
              ,{' '}
              <Link href={lp('/ainsfw/undress-ai')}>
                AI nude generators
              </Link>
              ,{' '}
              <Link href={lp('/ainsfw/ai-girlfriend')}>
                Unconsored AI girlfriend
              </Link>
              , and the best{' '}
              <Link href={lp('/best-porn')}>
                Adult websites
              </Link>
              {' '}(
              <Link href={lp('/best-vr-porn')}>
                VR Porn
              </Link>
              ,{' '}
              <Link href={lp('/best-uncensored-jav-porn-websites')}>
                JAV
              </Link>
              ,{' '}
              <Link href={lp('/best-hookup')}>
                Hookup
              </Link>
              ,{' '}
              <Link href={lp('/best-live-sex-cam-websites')}>
                Cams
              </Link>
              ...),{' '}
              <Link href={lp('/groups')}>
                Telegram Porn groups
              </Link>
              {' '}&amp;{' '}
              <Link href={lp('/bots')}>
                Bots
              </Link>
              , and the{' '}
              <Link href={lp('/ofsearch')}>
                hottest Onlyfans accounts to follow
              </Link>
              . Enjoy! ;)
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-[1520px] mx-auto px-5 sm:px-8 lg:px-10 pt-4 sm:pt-6 pb-16">
        <div className="space-y-8 sm:space-y-10">
          {HOME_DIRECTORY_GROUPS.map((group, groupIndex) => {
            const row = group.slugs
              .map((slug) => bySlug.get(slug))
              .filter((category): category is ExploreCategory => Boolean(category));
            if (row.length === 0) return null;
            const injectOfCard = groupIndex === 0 && homeFeaturedOf;
            const nextGroup = HOME_DIRECTORY_GROUPS[groupIndex + 1];
            const mergeTelegramBesideOrphan =
              groupIndex === 0 &&
              Boolean(injectOfCard) &&
              nextGroup?.heading === 'Best Telegram bots';
            const telegramBesideOrphan =
              mergeTelegramBesideOrphan && nextGroup
                ? nextGroup.slugs
                    .map((slug) => bySlug.get(slug))
                    .filter((category): category is ExploreCategory => Boolean(category))
                : [];
            const skipTelegramGroupOnXl =
              groupIndex === 1 &&
              Boolean(homeFeaturedOf) &&
              group.heading === 'Best Telegram bots';

            const buildCategoryCells = (categoriesRow: ExploreCategory[]) =>
              categoriesRow.flatMap((category, rowIndex) => {
                const categoryIndex = categories.findIndex((entry) => entry.slug === category.slug);
                const cells: React.ReactNode[] = [
                  <CategoryCard
                    key={category.slug}
                    category={category}
                    categoryIndex={categoryIndex}
                    featuredAdmin={featuredAdmin}
                  />,
                ];
                if (injectOfCard && rowIndex === 0) {
                  cells.push(
                    <HomeOfFeaturedCreatorCard key="home-featured-of" creator={homeFeaturedOf!} />,
                  );
                }
                return cells;
              });

            const allCells = buildCategoryCells(row);
            const sectionHeadingClass =
              'home-group-heading text-white font-black tracking-[0.08em] uppercase text-sm sm:text-base mb-4';

            return (
              <div
                key={group.heading || group.slugs.join('-')}
                id={group.heading === 'Best Adult websites' ? 'best-porn' : undefined}
                className={[
                  group.heading === 'Best Adult websites' ? 'scroll-mt-28' : undefined,
                  skipTelegramGroupOnXl ? 'xl:hidden' : undefined,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined}
              >
                {group.heading ? <h2 className={sectionHeadingClass}>{group.heading}</h2> : null}
                {mergeTelegramBesideOrphan && telegramBesideOrphan.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:hidden gap-4 items-stretch">
                      {allCells}
                    </div>
                    <div className="hidden xl:block space-y-4">
                      <div className="grid grid-cols-4 gap-4 items-stretch">{allCells.slice(0, 4)}</div>
                      <div className="grid grid-cols-4 grid-rows-[auto_1fr] gap-x-4 gap-y-4 items-stretch">
                        <div className="col-start-2 col-span-3 row-start-1 grid grid-cols-2 gap-x-4">
                          <h2 className={`col-start-1 ${sectionHeadingClass} mb-0`}>
                            {nextGroup!.heading}
                          </h2>
                        </div>
                        <div className="col-start-1 row-start-2 h-full min-h-0 [&_section]:mb-0 [&_section]:h-full">
                          {allCells[4]}
                        </div>
                        <div className="col-start-2 col-span-3 row-start-2 grid grid-cols-2 gap-4 items-stretch h-full [&_section]:mb-0 [&_section]:h-full">
                          {telegramBesideOrphan.map((category) => {
                            const categoryIndex = categories.findIndex(
                              (entry) => entry.slug === category.slug,
                            );
                            return (
                              <CategoryCard
                                key={category.slug}
                                category={category}
                                categoryIndex={categoryIndex}
                                featuredAdmin={featuredAdmin}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
                    {allCells}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {topGroupCategories.length > 0 && (
          <div className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4">
            <SectionTitle
              accent={t('home.curatedTitle2', 'Top Lists')}
              sizeClass="text-2xl sm:text-3xl md:text-4xl"
            >
              {t('home.curatedTitle1', 'Curated')}
            </SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {topGroupCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={lp(`/best-telegram-groups/${cat.slug}`)}
                  className="p-4 rounded-2xl bg-white hover:bg-white/95 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.4)] transition-all hover:scale-105 text-center group"
                >
                  <div className="text-lg font-bold text-[#0a0a0b] group-hover:text-[#c0392f] transition-colors">
                    {t('home.bestGroups', 'Best {category} Groups').replace('{category}', cat.name)}
                  </div>
                  <div className="text-[12px] sm:text-[11px] text-[#6b7280] mt-1">
                    {t('home.topCollections', 'Top 10 Collections')}
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href={lp('/best-telegram-groups')}
                className="text-white/55 hover:text-[#c0392f] text-sm underline underline-offset-4 transition-colors"
              >
                {t('home.viewAllCategories', 'View all categories')}
              </Link>
            </div>
          </div>
        )}

        {locale === 'en' && featuredArticles.length > 0 && (
          <section className="mt-16 sm:mt-20">
            <SectionTitle accent={t('home.latestTitle2', 'Articles')}>
              {t('home.latestTitle1', 'Latest')}
            </SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredArticles.map((article, idx) => (
                <HomeBlogCard
                  key={article._id}
                  article={article}
                  href={lp(`/blog/${article.slug}`)}
                  locale={locale}
                  index={idx}
                />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href={lp('/blog')}
                className="inline-flex rounded-xl bg-white px-6 py-3 text-lg font-semibold text-black shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)]"
              >
                {t('home.viewAllArticles', 'View All Articles')}
              </Link>
            </div>
          </section>
        )}

      </div>
    </div>
      {faq}
      <Footer />
    </div>
  );
}
