'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProfileOFPremiumSearch from '@/app/profile/ProfileOFPremiumSearch';
import { OF_SEARCH_TOKENS, ofSearchNavProps } from '@/app/onlyfanssearch/ofSearchTokens';
import { useLocale, useLocalePath, useTranslation } from '@/lib/i18n/client';
import { bestFreeCategoryPath } from '@/lib/onlyfans/freeMajorCategories';
import { ofCategoryPublicPath } from '@/lib/bestOnlyfansAccounts/boaUrls';
import type { BestFreeArticleCopy, BestFreeCreatorEntry } from '@/lib/onlyfans/bestFreeArticle/types';
import BestFreeEditorialArticle from './BestFreeEditorialArticle';

export interface FreeSubCategory {
  slug: string;
  label: string;
  href: string;
}

/** Best ranking hubs linked from /onlyfanssearch/best */
const BEST_RANKING_HUB_LINKS = [
  { slug: 'big-ass', name: 'Big Ass' },
  { slug: 'big-boobs', name: 'Big Boobs' },
  { slug: 'pornstar', name: 'Pornstar' },
  { slug: 'teen', name: 'Teen' },
  { slug: 'ahegao', name: 'Ahegao' },
  { slug: 'asian', name: 'Asian' },
] as const;

interface BestFreeClientProps {
  subCategories: FreeSubCategory[];
  categorySlug?: string;
  categoryLabel?: string;
  breadcrumbLabel?: string;
  pageTitle?: string;
  articleRanking?: BestFreeCreatorEntry[];
  articleCopy?: BestFreeArticleCopy;
  paidFeatured?: any[];
}

export default function BestFreeClient({
  subCategories,
  categorySlug,
  categoryLabel,
  breadcrumbLabel,
  pageTitle,
  articleRanking = [],
  articleCopy,
  paidFeatured = [],
}: BestFreeClientProps) {
  const lp = useLocalePath();
  const locale = useLocale();
  const { t } = useTranslation();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const activeSlug = categorySlug || '';
  const pagePath = categorySlug ? bestFreeCategoryPath(categorySlug) : '/onlyfanssearch/best';
  const isHub = !categorySlug;
  const headerLabel = categoryLabel || 'free';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/onlyfans/save', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.savedIds)) setSavedIds(new Set(data.savedIds));
      })
      .catch(() => {});
  }, []);

  const handleToggleSave = useCallback(async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(lp(pagePath))}`;
      return;
    }

    const alreadySaved = savedIds.has(creatorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });

    try {
      await fetch('/api/onlyfans/save', {
        method: alreadySaved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(creatorId);
        else next.delete(creatorId);
        return next;
      });
    }
  }, [savedIds, lp, pagePath]);

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-20 pb-10">
        <section className="bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-5 pb-6 sm:pt-6 sm:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/40 mb-4">
              <Link href={lp('/')} className="hover:text-[#00AFF0] transition-colors">
                {t('bestOnlyfans.breadcrumbHome')}
              </Link>
              <span aria-hidden="true">/</span>
              <Link href={lp('/onlyfanssearch')} className="hover:text-[#00AFF0] transition-colors">
                {t('bestOnlyfans.breadcrumbOfSearch')}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-white/70">{categoryLabel || breadcrumbLabel}</span>
            </nav>

            <div className="text-center">
              {pageTitle ? (
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white max-w-3xl mx-auto">
                  {pageTitle}
                </h1>
              ) : null}
              <p className="mt-2 text-sm sm:text-base text-white/50 max-w-lg mx-auto">
                {t('ofSearch.browseVerified').replace(/\{label\}/g, headerLabel.toLowerCase())}
              </p>

              <ProfileOFPremiumSearch
                tokens={OF_SEARCH_TOKENS}
                isPremium={false}
                freeAccess
                hideHeading
                layout="hero"
                minimalFilters
                bestModelsPage
                freeOnlyPage
                freeCategorySlug={categorySlug}
                freeCategoryLabel={categoryLabel}
                loginRedirect={lp(pagePath)}
                searchHubHref={lp('/onlyfanssearch')}
                savedCreatorIds={savedIds}
                onToggleSave={handleToggleSave}
                paidFeatured={paidFeatured}
                {...ofSearchNavProps(lp)}
              />

              {isHub && (
                <div className="mt-5 max-w-3xl mx-auto">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40 mb-2.5">
                    {t('bestOnlyfans.keepExploring')}
                  </p>
                  <nav
                    aria-label="Best OnlyFans rankings"
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {BEST_RANKING_HUB_LINKS.map((item) => (
                      <Link
                        key={item.slug}
                        href={lp(ofCategoryPublicPath(item.slug, locale))}
                        className="inline-flex items-center rounded-lg bg-[#00AFF0]/15 border border-[#00AFF0]/35 px-3 py-1.5 text-[11px] sm:text-xs font-bold text-[#00AFF0] hover:bg-[#00AFF0] hover:text-black transition-colors"
                      >
                        {`Best ${item.name} Models`}
                      </Link>
                    ))}
                  </nav>
                </div>
              )}

              {subCategories.length > 0 && (
                <div className="max-w-4xl mx-auto mt-6 mb-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link
                      href={lp('/onlyfanssearch/best')}
                      className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-opacity hover:opacity-90 ${
                        !activeSlug
                          ? 'bg-[#00AFF0] border-[#00AFF0] text-white'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                      }`}
                    >
                      All free
                    </Link>
                    {subCategories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={lp(cat.href)}
                        className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-opacity hover:opacity-90 ${
                          activeSlug === cat.slug
                            ? 'bg-[#00AFF0] border-[#00AFF0] text-white'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                        }`}
                      >
                        Free {cat.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {!categorySlug && articleCopy && articleRanking.length > 0 ? (
          <BestFreeEditorialArticle ranking={articleRanking} copy={articleCopy} />
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
