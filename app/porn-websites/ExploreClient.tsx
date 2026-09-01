'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { EXPLORE_CATEGORIES, type ExploreCategory, type ExploreSite } from '@/lib/explore/topPornSitesData';
import { exploreMascotFallbackSrc, exploreMascotSrc } from '@/lib/explore/mascotIcons';
import { exploreFaviconUrl } from '@/lib/explore/siteIconDomain';
import { pickLabelForFirstPick } from '@/lib/explore/pickLabels';
import { exploreSiteKey } from '@/lib/explore/siteKey';
import { addExploreSite, removeExploreSite, saveExploreCategoryOrder } from '@/lib/actions/exploreAdmin';

const ACCENT = '#c0392f';
const FEATURED_PREVIEW = 12;
const DEFAULT_PREVIEW = 2;
const MASCOT_SIZE = 52;
const ROW_HEIGHT = 40;
const FEATURED_ROW_HEIGHT = 54;

const FEATURED_SLUGS = new Set([
  'best-premium-porn',
  'best-live-sex-cams',
  'best-ai-porn-sites',
  'best-vr-porn',
]);

const CATEGORY_GROUPS: string[][] = [
  ['best-premium-porn', 'best-live-sex-cams', 'best-ai-porn-sites', 'best-vr-porn'],
  ['best-telegram-porn-bots', 'best-ai-porn-generator-sites', 'best-ai-companion-websites'],
  ['best-live-asian-sex-cams', 'best-asian-porn-sites', 'best-premium-asian-porn-sites'],
  [
    'best-lesbian-porn-sites',
    'best-premium-lesbian-porn-site',
    'best-porn-for-women-sites',
    'best-premium-porn-for-women',
  ],
  ['best-premium-fetish-porn-sites', 'best-feet-porn-sites', 'best-premium-amateur-porn-site'],
  [
    'best-free-cam-girl-video-sites',
    'best-sex-chat',
    'best-escorts',
    'best-hookup',
  ],
  [
    'best-sex-toys-websites',
    'best-sex-dolls-brands',
    'best-buy-used-panties',
    'best-male-enhancement',
  ],
];

function faviconUrl(site: ExploreSite): string {
  return exploreFaviconUrl(site.name, site.externalUrl ?? site.url);
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

function groupCategories(categories: ExploreCategory[]): ExploreCategory[][] {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const used = new Set<string>();
  const groups: ExploreCategory[][] = [];

  for (const slugs of CATEGORY_GROUPS) {
    const row = slugs
      .map((slug) => bySlug.get(slug))
      .filter((category): category is ExploreCategory => Boolean(category));
    row.forEach((category) => used.add(category.slug));
    if (row.length > 0) groups.push(row);
  }

  const leftover = categories.filter((category) => !used.has(category.slug));
  if (leftover.length > 0) groups.push(leftover);
  return groups;
}

function isExploreScreenshot(url?: string): boolean {
  return Boolean(url && url.includes('.r2.dev/explore/'));
}

function featuredIndexBefore(sites: ExploreSite[], index: number): number {
  return sites.slice(0, index).filter((site) => site.featured).length;
}

function SiteFavicon({ site, large = false }: { site: ExploreSite; large?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const listingLogo = site.image && !isExploreScreenshot(site.image) && !imageFailed ? site.image : '';
  const favicon = faviconUrl(site);
  const src = listingLogo || (!faviconFailed ? favicon : '');
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
      className={`shrink-0 rounded-md border border-gray-200 bg-white ${
        large ? 'w-8 h-8' : 'w-6 h-6'
      } ${listingLogo ? 'object-cover' : 'object-contain'}`}
      onError={() => {
        if (listingLogo) setImageFailed(true);
        else setFaviconFailed(true);
      }}
    />
  );
}

function SiteNameLink({ site, featured = false }: { site: ExploreSite; featured?: boolean }) {
  const className = featured
    ? 'min-w-0 text-[16px] font-black leading-tight text-gray-900 hover:text-[#c0392f] transition-colors truncate'
    : 'min-w-0 text-[15px] font-semibold leading-tight text-gray-900 hover:text-[#c0392f] transition-colors truncate';
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

function AdminMoveButtons({
  index,
  total,
  onMove,
  onDelete,
  saving,
  deleting,
}: {
  index: number;
  total: number;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}) {
  return (
    <span className="shrink-0 flex items-center gap-1 ml-auto opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
      <button
        type="button"
        disabled={saving || deleting || index === 0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMove('up');
        }}
        className="w-5 h-4 flex items-center justify-center rounded text-[10px] font-black text-[#c0392f] bg-red-100 hover:bg-red-200 disabled:opacity-30"
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={saving || deleting || index >= total - 1}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMove('down');
        }}
        className="w-5 h-4 flex items-center justify-center rounded text-[10px] font-black text-[#c0392f] bg-red-100 hover:bg-red-200 disabled:opacity-30"
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        disabled={saving || deleting}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="w-5 h-5 flex items-center justify-center rounded text-[11px] font-black text-white bg-[#c0392f] hover:opacity-90 disabled:opacity-30"
        aria-label="Remove listing"
      >
        ×
      </button>
    </span>
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
  previewLimit,
  isAdmin,
}: {
  category: ExploreCategory;
  categoryIndex: number;
  previewLimit: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [sites, setSites] = useState(category.sites);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    setSites(category.sites);
  }, [category.sites]);

  const total = sites.length;
  const visible = expanded || total <= previewLimit ? sites : sites.slice(0, previewLimit);
  const previewHeight = visible.reduce(
    (sum, site) => sum + (site.featured ? FEATURED_ROW_HEIGHT : ROW_HEIGHT),
    12,
  );

  async function persistOrder(nextSites: ExploreSite[]) {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSavingOrder(true);
    try {
      await saveExploreCategoryOrder(
        token,
        category.slug,
        nextSites.map((site) => exploreSiteKey(site)),
      );
      setSites(nextSites);
      router.refresh();
    } catch (e) {
      console.error('[explore] save order failed', e);
    } finally {
      setSavingOrder(false);
    }
  }

  function moveSite(index: number, direction: 'up' | 'down') {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= sites.length) return;
    const next = [...sites];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    void persistOrder(next);
  }

  async function deleteSite(site: ExploreSite) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const key = exploreSiteKey(site);
    setDeletingKey(key);
    try {
      await removeExploreSite(token, category.slug, key);
      setSites((prev) => prev.filter((s) => exploreSiteKey(s) !== key));
      router.refresh();
    } catch (e) {
      console.error('[explore] delete failed', e);
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    setAdding(true);
    setAddError('');
    try {
      await addExploreSite(token, {
        categorySlug: category.slug,
        name: newName,
        externalUrl: newUrl,
        description: newDescription,
      });
      setNewName('');
      setNewUrl('');
      setNewDescription('');
      setShowAddForm(false);
      setExpanded(true);
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setAdding(false);
    }
  }

  return (
    <section
      id={category.slug}
      className="mb-4 rounded-2xl border border-[#c0392f]/20 bg-white overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]"
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
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="shrink-0 text-[9px] font-black tracking-[0.1em] uppercase text-white bg-[#c0392f] px-2 py-1 rounded hover:opacity-90"
          >
            {showAddForm ? 'Close' : '+ Add'}
          </button>
        ) : null}
      </div>

      {isAdmin && showAddForm ? (
        <form onSubmit={(e) => void handleAddSite(e)} className="px-3 py-3 border-b border-[#c0392f]/15 bg-red-50/50 space-y-2">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Site name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          />
          <input
            type="url"
            required
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="Website URL"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
          />
          {addError ? <p className="text-xs font-semibold text-red-600">{addError}</p> : null}
          <button
            type="submit"
            disabled={adding}
            className="w-full py-2 rounded-lg text-[10px] font-black tracking-[0.12em] uppercase text-white disabled:opacity-50"
            style={{ background: ACCENT }}
          >
            {adding ? 'Adding...' : 'Add listing'}
          </button>
        </form>
      ) : null}

      <div
        className={`px-3 py-2.5 bg-white ${expanded ? '' : 'overflow-hidden'}`}
        style={!expanded && total > 0 ? { height: `${previewHeight}px` } : undefined}
      >
        <ol>
          {visible.length === 0 ? (
            <li className="py-6 text-center text-sm font-semibold text-gray-400">No sites yet</li>
          ) : (
            visible.map((site, index) => {
              const moveIndex = sites.findIndex((s) => exploreSiteKey(s) === exploreSiteKey(site));
              const safeMoveIndex = moveIndex >= 0 ? moveIndex : index;
              const rowHeight = site.featured ? FEATURED_ROW_HEIGHT : ROW_HEIGHT;
              const rankClass = site.featured
                ? 'w-5 text-sm font-black text-[#c0392f]'
                : 'w-5 text-sm font-black text-[#c0392f]/80';
              const rowClass = `group flex items-center gap-2.5 border-b border-gray-100 last:border-b-0 hover:bg-red-50 ${
                site.featured ? 'bg-red-50/40' : ''
              }`;
              const pickLabel =
                site.featured && featuredIndexBefore(sites, safeMoveIndex) === 0
                  ? pickLabelForFirstPick(category.slug)
                  : null;

              if (site.featured) {
                const href = outboundHref(site);
                const newTab = opensOutboundInNewTab(site);
                return (
                  <li key={`${category.slug}-${exploreSiteKey(site)}-${index}`} style={{ height: `${rowHeight}px` }}>
                    <div className={`${rowClass} h-full`}>
                      <a
                        href={href}
                        target={newTab ? '_blank' : undefined}
                        rel={newTab ? 'nofollow noopener noreferrer' : undefined}
                        className="flex items-center gap-2.5 min-w-0 flex-1 h-full"
                      >
                        <span className={`shrink-0 tabular-nums text-right ${rankClass}`}>{index + 1}</span>
                        <SiteFavicon site={site} large />
                        <span className="min-w-0 text-[16px] font-black leading-tight text-gray-900 truncate">
                          {site.name}
                        </span>
                        {pickLabel ? (
                          <span className="shrink-0 ml-auto text-[8px] font-black tracking-[0.08em] uppercase text-white bg-[#c0392f] px-1.5 py-0.5 rounded max-w-[92px] text-center leading-tight">
                            {pickLabel}
                          </span>
                        ) : null}
                      </a>
                      {isAdmin ? (
                        <AdminMoveButtons
                          index={safeMoveIndex}
                          total={sites.length}
                          onMove={(dir) => moveSite(safeMoveIndex, dir)}
                          onDelete={() => void deleteSite(site)}
                          saving={savingOrder}
                          deleting={deletingKey === exploreSiteKey(site)}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={`${category.slug}-${exploreSiteKey(site)}-${index}`}
                  className={rowClass}
                  style={{ height: `${rowHeight}px` }}
                >
                  <span className={`shrink-0 tabular-nums text-right ${rankClass}`}>{index + 1}</span>
                  <SiteFavicon site={site} />
                  <SiteNameLink site={site} />
                  {isAdmin ? (
                    <AdminMoveButtons
                      index={safeMoveIndex}
                      total={sites.length}
                      onMove={(dir) => moveSite(safeMoveIndex, dir)}
                      onDelete={() => void deleteSite(site)}
                      saving={savingOrder}
                      deleting={deletingKey === exploreSiteKey(site)}
                    />
                  ) : null}
                  <SiteDetailIcon site={site} />
                </li>
              );
            })
          )}
        </ol>
      </div>

      {total > previewLimit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full py-2.5 px-3 text-[11px] font-black tracking-[0.14em] uppercase text-white border-t border-[#c0392f]/20 hover:opacity-90"
          style={{ background: ACCENT }}
        >
          {expanded ? 'SHOW LESS ↑' : `SEE ALL ${total} SITES →`}
        </button>
      )}
    </section>
  );
}

export default function ExploreClient({
  categories = EXPLORE_CATEGORIES,
}: {
  categories?: ExploreCategory[];
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const groups = useMemo(() => groupCategories(categories), [categories]);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.isAdmin) {
          setIsAdmin(true);
          localStorage.setItem('isAdmin', 'true');
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="explore-page explore-bg explore-scanlines min-h-screen text-white relative">
      <Navbar accent={ACCENT} />

      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#c0392f]/15 bg-[#140404]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-3">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5 min-w-0">
            <Link href="/" className="hover:text-white transition-colors shrink-0">
              Home
            </Link>
            <span className="shrink-0">/</span>
            <span className="text-white font-semibold truncate">Porn Websites</span>
          </nav>
        </div>
      </div>

      <div className="relative z-10 max-w-[1520px] mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-16">
        <div className="text-center mb-8 sm:mb-10">
          <div className="explore-hero-title-row mb-3">
            <h1 className="explore-hero-title text-[28px] sm:text-[36px] md:text-[42px]">
              EXPLORE PORN WEBSITES
            </h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/explore/directory-badge.webp"
              alt=""
              width={88}
              height={88}
              className="explore-directory-badge"
              loading="eager"
              decoding="async"
            />
          </div>
          <p className="text-white/45 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            EROGAMX reviews the best porn sites of 2026 and share with you the top ones.
            Find AI porn Tools, adult porn websites all sorted by quality!
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10">
          {groups.map((group) => (
            <div
              key={group.map((category) => category.slug).join('-')}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
            >
              {group.map((category) => {
                const categoryIndex = categories.findIndex((c) => c.slug === category.slug);
                return (
                  <CategoryCard
                    key={category.slug}
                    category={category}
                    categoryIndex={categoryIndex}
                    previewLimit={FEATURED_SLUGS.has(category.slug) ? FEATURED_PREVIEW : DEFAULT_PREVIEW}
                    isAdmin={isAdmin}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
