'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomeBlogCard from '@/app/components/HomeBlogCard';
import type { BlogCard } from '@/lib/actions/blog';
import type { Locale } from '@/lib/i18n/config';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';
import type { ExploreCategory, ExploreSite } from '@/lib/explore/topPornSitesData';
import { exploreMascotFallbackSrc, exploreMascotSrc } from '@/lib/explore/mascotIcons';
import { pickLabelForFirstPick } from '@/lib/explore/pickLabels';
import { HOME_DIRECTORY_GROUPS, HOME_LEADER_PREVIEW_SLUGS, homePreviewLimit } from '@/lib/bestDirectory/config';
import { exploreListIconSrc } from '@/lib/explore/siteIconDomain';

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

function outboundHref(site: ExploreSite): string {
  return site.externalUrl ?? site.url;
}

function opensOutboundInNewTab(site: ExploreSite): boolean {
  return Boolean(site.externalUrl) || site.openInNewTab || !isInternalExploreUrl(outboundHref(site));
}

function showDetailIcon(site: ExploreSite): boolean {
  return Boolean(site.externalUrl && isInternalExploreUrl(site.url));
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
          large ? 'w-8 h-8 text-[13px]' : 'w-6 h-6 text-[11px]'
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
  const href = outboundHref(site);

  if (opensOutboundInNewTab(site)) {
    return (
      <a href={href} target="_blank" rel="nofollow noopener noreferrer" className={className}>
        {site.name}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {site.name}
    </Link>
  );
}

function SiteDetailIcon({ site }: { site: ExploreSite }) {
  if (!showDetailIcon(site)) return null;

  return (
    <Link
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 ml-1 p-1 rounded-md text-[#c0392f]/70 hover:text-[#c0392f] hover:bg-red-100/80 transition-all opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
      aria-label={`${site.name} details`}
    >
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    </Link>
  );
}

function LeaderToolPreview({ site, categorySlug }: { site: ExploreSite; categorySlug: string }) {
  const href = outboundHref(site);
  const newTab = opensOutboundInNewTab(site);
  const pickLabel = site.featured ? pickLabelForFirstPick(categorySlug) : null;
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
          <span className="block text-[10px] font-black tracking-[0.12em] uppercase text-white/70">#1</span>
          <span className="block text-[15px] sm:text-base font-black leading-tight text-white truncate">{site.name}</span>
        </div>
        {pickLabel ? (
          <span className="shrink-0 text-[8px] font-black tracking-[0.08em] uppercase text-white bg-[#c0392f] px-1.5 py-0.5 rounded max-w-[92px] text-center leading-tight">
            {pickLabel}
          </span>
        ) : null}
      </div>
    </>
  );
  const className =
    'group relative block w-full aspect-[16/10] overflow-hidden border-b border-[#c0392f]/20 bg-[#120606]';

  if (newTab) {
    return (
      <a href={href} target="_blank" rel="nofollow noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
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
}: {
  category: ExploreCategory;
  categoryIndex: number;
}) {
  const previewLimit = homePreviewLimit(category.slug);
  const total = category.sites.length;
  const visible = total <= previewLimit ? category.sites : category.sites.slice(0, previewLimit);
  const previewHeight = visible.reduce(
    (sum, site) => sum + (site.featured ? FEATURED_ROW_HEIGHT : ROW_HEIGHT),
    12,
  );
  const showLeaderPreview = (HOME_LEADER_PREVIEW_SLUGS as readonly string[]).includes(category.slug);
  const leaderSite =
    showLeaderPreview && category.sites[0]?.image ? category.sites[0] : undefined;

  return (
    <section
      id={category.slug}
      className={`mb-4 rounded-2xl border bg-white overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] ${
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
            <p className="mt-1.5 text-[12px] leading-snug text-white/55 font-medium">
              {category.description}
            </p>
          ) : null}
        </div>
      </div>

      {leaderSite ? <LeaderToolPreview site={leaderSite} categorySlug={category.slug} /> : null}

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
                  ? pickLabelForFirstPick(category.slug)
                  : null;

              if (site.featured) {
                const href = outboundHref(site);
                const newTab = opensOutboundInNewTab(site);
                return (
                  <li key={`${category.slug}-${site.name}-${index}`} style={{ height: `${rowHeight}px` }}>
                    <div className={`${rowClass} h-full`}>
                      <a
                        href={href}
                        target={newTab ? '_blank' : undefined}
                        rel={newTab ? 'nofollow noopener noreferrer' : undefined}
                        className="flex items-center gap-2.5 min-w-0 flex-1 h-full"
                      >
                        <span className={`shrink-0 tabular-nums text-right ${rankClass}`}>{index + 1}</span>
                        <SiteFavicon site={site} large />
                        <span className="min-w-0 text-[16px] font-black leading-tight text-gray-900 truncate group-hover:text-[#c0392f] transition-colors">
                          {site.name}
                        </span>
                        {pickLabel ? (
                          <span className="shrink-0 ml-auto text-[8px] font-black tracking-[0.08em] uppercase text-white bg-[#c0392f] px-1.5 py-0.5 rounded max-w-[92px] text-center leading-tight">
                            {pickLabel}
                          </span>
                        ) : null}
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
                  <SiteDetailIcon site={site} />
                </li>
              );
            })
          )}
        </ol>
      </div>

      <Link
        href={`/${category.slug}`}
        className="block w-full py-2.5 px-3 text-[11px] font-black tracking-[0.14em] uppercase text-white text-center border-t border-[#c0392f]/20 hover:opacity-90"
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
  locale = 'en',
  faq,
}: {
  categories: ExploreCategory[];
  topGroupCategories?: TopGroupCategory[];
  featuredArticles?: BlogCard[];
  locale?: Locale;
  faq?: ReactNode;
}) {
  const { t, dict } = useTranslation();
  const lp = useLocalePath();
  const router = useRouter();
  const bySlug = new Map(categories.map((category) => [category.slug, category]));

  const navCards: { title: string; href: string; icon: React.ReactNode; iconColor: string }[] = [
    {
      title: 'Telegram Groups',
      href: lp('/groups'),
      iconColor: '#000',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/></svg>,
    },
    {
      title: 'Telegram Bots',
      href: lp('/bots'),
      iconColor: '#000',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
    },
    {
      title: 'AI NSFW Tools',
      href: lp('/ainsfw'),
      iconColor: '#000',
      icon: <img src="/assets/lips-icon.png" alt={dict.meta?.ainsfwTitle || 'AI NSFW Tools'} width="16" height="16" style={{ objectFit: 'contain' }} />,
    },
    {
      title: 'Porn Websites',
      href: lp('/best-porn'),
      iconColor: '#000',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/><path d="M12 18v2"/></svg>,
    },
  ];

  const renderCard = (c: typeof navCards[0]) => (
    <button
      key={c.title}
      type="button"
      aria-label={c.title}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTimeout(() => router.push(c.href), 0); }}
      className="hero-nav-card"
    >
      <span className="hero-nav-card__body">
        <span className="hero-nav-card__top">
          <span className="hero-nav-card__bare" style={{ color: c.iconColor }}>{c.icon}</span>
          <span className="hero-nav-card__title">{c.title}</span>
          <svg className="hero-nav-card__arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
        </span>
      </span>
    </button>
  );

  return (
    <div>
    <div className="explore-page explore-bg explore-scanlines min-h-screen text-white relative">
      <Navbar accent={ACCENT} />

      <div className="relative z-10 home-hero-section">
        <div className="home-hero-overlay" aria-hidden="true" />
        <div className="relative z-[1] max-w-[1520px] mx-auto px-5 sm:px-8 lg:px-10 pt-28 sm:pt-32 pb-10 sm:pb-12">
          <div className="text-center max-w-4xl mx-auto mb-5 sm:mb-6">
            <h1 className="home-hero-title text-[30px] sm:text-[44px] md:text-[54px] mb-4 sm:mb-5">
              <span className="home-hero-title-mark">Your #1 ADULT entretainement platform</span>
            </h1>
            <p className="mb-7 sm:mb-8 max-w-xl sm:max-w-2xl mx-auto text-center text-[14px] sm:text-[15px] md:text-base text-white/90 leading-relaxed font-medium">
              Your #1 Porn Telegram, Porn websites &amp; AI NSFW Hub The best{' '}
              <Link href={lp('/groups')} className="text-white underline underline-offset-2 decoration-white/50 hover:text-white hover:decoration-white">
                porn Telegram groups
              </Link>
              , and{' '}
              <Link href={lp('/bots')} className="text-white underline underline-offset-2 decoration-white/50 hover:text-white hover:decoration-white">
                bots
              </Link>
              ,{' '}
              <Link href={lp('/ainsfw')} className="text-white underline underline-offset-2 decoration-white/50 hover:text-white hover:decoration-white">
                AI porn
              </Link>
              {' '}and nude generators, AI girlfriend apps, VR porn, adult games, Reddit communities, live sex cam sites, and{' '}
              <Link href="#best-porn" className="text-white underline underline-offset-2 decoration-white/50 hover:text-white hover:decoration-white">
                the best porn
              </Link>
              {' '}by niche Asian, BDSM, Jav Porn, blowjob, gangbang, and everything in between.
            </p>
          </div>
          <div className="hero-nav-row">
            {navCards.map(renderCard)}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-[1520px] mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-16">
        <div className="space-y-8 sm:space-y-10">
          {HOME_DIRECTORY_GROUPS.map((group) => {
            const row = group.slugs
              .map((slug) => bySlug.get(slug))
              .filter((category): category is ExploreCategory => Boolean(category));
            if (row.length === 0) return null;
            return (
              <div
                key={group.heading || group.slugs.join('-')}
                id={group.heading === 'Best Adult websites' ? 'best-porn' : undefined}
                className={group.heading === 'Best Adult websites' ? 'scroll-mt-28' : undefined}
              >
                {group.heading ? (
                  <h2 className="text-white font-black tracking-[0.08em] uppercase text-sm sm:text-base mb-4">
                    {group.heading}
                  </h2>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {row.map((category) => {
                    const categoryIndex = categories.findIndex((entry) => entry.slug === category.slug);
                    return (
                      <CategoryCard
                        key={category.slug}
                        category={category}
                        categoryIndex={categoryIndex}
                      />
                    );
                  })}
                </div>
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
                  <div className="text-xs text-[#6b7280] mt-1">
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
