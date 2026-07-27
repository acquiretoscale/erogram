import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { CircleUser } from 'lucide-react';
import { notFound } from 'next/navigation';
import { EditorialMasthead, EditorialFooter } from '@/app/blog/EditorialChrome';
import { BEST_OF_PAGE_MAP, BEST_OF_PAGES } from '@/app/best-onlyfans-accounts/bestOfPages';
import { hottestRankingPublicPath } from '@/lib/bestOfPageContent/hottestUrls';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary, LOCALES, LOCALE_HREFLANG, localePath } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { getKeywordPlacementCampaigns } from '@/lib/actions/campaigns';
import { getBestOfFillCreators, getBestOfTopByClicks, getBestOfPreviewAvatars } from '@/lib/actions/bestOfCreators';
import { getFeaturedCreatorFeedItems } from '@/lib/actions/publicData';
import BestPageAdBlock from '@/app/best-onlyfans-accounts/BestPageAdBlock';
import BestOfDeleteButton from '@/app/best-onlyfans-accounts/BestOfDeleteButton';
import { BestOfHeroIntro, BestOfEditorialBody } from '@/app/best-onlyfans-accounts/BestOfEditorial';
import { getBestOfPageContent, type BestOfPageContent } from '@/lib/bestOfPageContent';
import { getBodyTranslation } from '@/lib/bestOfPageContent/bodyTranslations';
import { getMetaDescription } from '@/lib/bestOfPageContent/metaDescriptions';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getTagLabel } from '@/lib/tags/labelTranslations';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_BASE;
const OF_BLUE = '#00AFF0';
const OF_BLUE_DARK = '#0078A8';
const PREMIUM_NAVY = 'linear-gradient(135deg, #061018 0%, #0a1c2e 45%, #0d2844 100%)';

function OnlyFansIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden>
      <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
    </svg>
  );
}

/** Is the creator inside their GMT live window right now? */
function ofIsLiveNow(start: number, end: number): boolean {
  if (start < 0 || end < 0) return false;
  const h = new Date().getUTCHours();
  return start <= end ? h >= start && h < end : h >= start || h < end;
}

function rankBadgeStyle(rank: number): { bg: string; color: string; label: string } {
  if (rank === 1) return { bg: 'linear-gradient(135deg,#f5d061,#c9920a)', color: '#3d2e00', label: '#01' };
  if (rank === 2) return { bg: 'linear-gradient(135deg,#eef0f4,#a8adb8)', color: '#2a2d33', label: '#02' };
  if (rank === 3) return { bg: 'linear-gradient(135deg,#e8a86a,#b5651d)', color: '#3d2208', label: '#03' };
  return { bg: 'linear-gradient(135deg,#2B1B28,#1a1018)', color: '#FDFDFD', label: `#${String(rank).padStart(2, '0')}` };
}

/**
 * Page metadata for a Top-10 OnlyFans category page, served at the public URL
 * /onlyfanssearch/top-10-{slug}-onlyfans-models. Returns {} if slug isn't a known best-of page.
 */
/** Per-niche adjective that reads naturally in the hook meta description. Fallback = captivating/exótica/verführerisch. */
const HOOK_ADJECTIVES: Record<string, { en: string; de: string; es: string }> = {
  'big-ass': { en: 'juicy', de: 'knackig', es: 'jugosa' },
  'big-boobs': { en: 'busty', de: 'vollbusig', es: 'pechugona' },
  busty: { en: 'voluptuous', de: 'vollbusig', es: 'pechugona' },
  'big-booty': { en: 'juicy', de: 'knackig', es: 'jugosa' },
  ahegao: { en: 'wild', de: 'wild', es: 'salvaje' },
  fetish: { en: 'kinky', de: 'versaut', es: 'morbosa' },
  latina: { en: 'fiery', de: 'feurig', es: 'ardiente' },
  blonde: { en: 'sunny', de: 'sonnig', es: 'radiante' },
  brunette: { en: 'sultry', de: 'sinnlich', es: 'sensual' },
  redhead: { en: 'fiery', de: 'feurig', es: 'ardiente' },
  goth: { en: 'dark', de: 'düster', es: 'oscura' },
  'goth-girl': { en: 'dark', de: 'düster', es: 'oscura' },
  petite: { en: 'tiny', de: 'zierlich', es: 'menuda' },
  'e-girl': { en: 'edgy', de: 'freche', es: 'atrevida' },
  lesbian: { en: 'sensual', de: 'sinnlich', es: 'sensual' },
  nude: { en: 'bare', de: 'nackt', es: 'desnuda' },
  solo: { en: 'intimate', de: 'intim', es: 'íntima' },
  amateur: { en: 'authentic', de: 'echt', es: 'auténtica' },
  teen: { en: 'fresh', de: 'frisch', es: 'fresca' },
  milf: { en: 'mature', de: 'reif', es: 'madura' },
  asian: { en: 'exotic', de: 'exotisch', es: 'exótica' },
  ebony: { en: 'stunning', de: 'atemberaubend', es: 'espectacular' },
  bbw: { en: 'curvy', de: 'kurvig', es: 'curvilínea' },
  chubby: { en: 'curvy', de: 'kurvig', es: 'curvilínea' },
  thick: { en: 'thick', de: 'kurvig', es: 'curvilínea' },
  pawg: { en: 'thick', de: 'kurvig', es: 'curvilínea' },
  cosplay: { en: 'playful', de: 'verspielt', es: 'juguetona' },
  anime: { en: 'playful', de: 'verspielt', es: 'juguetona' },
  natural: { en: 'natural', de: 'natürlich', es: 'natural' },
  fitness: { en: 'toned', de: 'durchtrainiert', es: 'fitness' },
  dominatrix: { en: 'commanding', de: 'dominant', es: 'dominante' },
  femdom: { en: 'commanding', de: 'dominant', es: 'dominante' },
  british: { en: 'classy', de: 'klassisch', es: 'elegante' },
  brazilian: { en: 'tropical', de: 'tropisch', es: 'tropical' },
  colombian: { en: 'fiery', de: 'feurig', es: 'ardiente' },
  french: { en: 'elegant', de: 'elegant', es: 'elegante' },
  german: { en: 'bold', de: 'selbstbewusst', es: 'atrevida' },
  turkish: { en: 'alluring', de: 'verführerisch', es: 'seductora' },
  australian: { en: 'sun-kissed', de: 'sonnengeküsst', es: 'bronceada' },
  'california': { en: 'golden', de: 'goldene', es: 'dorada' },
  'florida': { en: 'sunny', de: 'sonnig', es: 'radiante' },
  'texas': { en: 'bold', de: 'selbstbewusst', es: 'atrevida' },
  'nevada': { en: 'glamorous', de: 'glamourös', es: 'glamurosa' },
  'new-york': { en: 'electric', de: 'elektrisierend', es: 'eléctrica' },
  'georgia': { en: 'sweet', de: 'süß', es: 'dulce' },
  'michigan': { en: 'fiery', de: 'feurig', es: 'ardiente' },
  'massachusetts': { en: 'charming', de: 'charmant', es: 'encantadora' },
  'colorado': { en: 'adventurous', de: 'abenteuerlustig', es: 'aventurera' },
  'illinois': { en: 'confident', de: 'selbstbewusst', es: 'segura' },
  'north-carolina': { en: 'graceful', de: 'anmutig', es: 'elegante' },
  'arizona': { en: 'sultry', de: 'sinnlich', es: 'ardiente' },
};

function hookAdjective(slug: string, locale: Locale): string {
  const entry = HOOK_ADJECTIVES[slug];
  if (entry) {
    const localized = (entry as Record<string, string>)[locale];
    if (localized) return localized;
    return entry.en;
  }
  return locale === 'de' ? 'verführerisch' : locale === 'es' ? 'cautivadora' : locale === 'pt' ? 'sedutora' : 'captivating';
}

type RankingVariant = 'top10' | 'best';

function applyRankingVariantContent(content: BestOfPageContent, variant: RankingVariant): BestOfPageContent {
  if (variant === 'top10') return content;
  return {
    heroIntro: content.heroIntro
      .replace(/\*\*Top 10 /g, '**Best ')
      .replace(/Top 10 /g, 'Best ')
      .replace(/top 10 /g, 'best '),
    bottomBody: content.bottomBody
      .replace(/\*\*Top 10 /g, '**Best ')
      .replace(/Top 10 /g, 'Best ')
      .replace(/top 10 /g, 'best '),
  };
}

function resolveBestOfContent(slug: string, locale: Locale, variant: RankingVariant): BestOfPageContent | null {
  const en = getBestOfPageContent(slug);
  if (!en) return null;
  const base = locale === 'en'
    ? en
    : {
        heroIntro: getBodyTranslation(slug, locale)?.heroIntro?.trim() || en.heroIntro,
        bottomBody: '',
      };
  return applyRankingVariantContent(base, variant);
}

/** Localized ranking title. Single source of truth for meta title, H1 + JSON-LD. */
function top10RankingTitle(label: string, year: number, locale: Locale): string {
  const map: Record<Locale, string> = {
    en: `Top 10 ${label} OnlyFans Models In ${year}`,
    de: `Top 10 ${label} OnlyFans-Models ${year}`,
    es: `Top 10 modelos ${label} de OnlyFans en ${year}`,
    pt: `Top 10 modelos ${label} de OnlyFans em ${year}`,
  };
  return map[locale] || map.en;
}

function bestRankingTitle(label: string, year: number, locale: Locale): string {
  const map: Record<Locale, string> = {
    en: `10 Best ${label} OnlyFans Accounts & Creators (${year})`,
    de: `Die 10 besten ${label} OnlyFans-Accounts & Creator (${year})`,
    es: `Las 10 mejores cuentas ${label} de OnlyFans (${year})`,
    pt: `As 10 melhores contas ${label} de OnlyFans (${year})`,
  };
  return map[locale] || map.en;
}

function rankingTitle(label: string, year: number, locale: Locale, variant: RankingVariant): string {
  return variant === 'best' ? bestRankingTitle(label, year, locale) : top10RankingTitle(label, year, locale);
}

export async function buildBestOfMetadata(slug: string): Promise<Metadata> {
  const locale = await getLocale();
  const page = BEST_OF_PAGE_MAP.get(slug);
  if (!page) return {};

  const year = new Date().getFullYear();
  const label = getTagLabel(slug, page.label, locale);
  const l = label.toLowerCase();
  const adj = hookAdjective(slug, locale);
  const blogPath = hottestRankingPublicPath(slug, locale);

  // Meta title — PimpBunny replica. The layout template ("%s | Erogram") appends the brand,
  // producing "Top 10 {Label} OnlyFans Models In {year} | Erogram" — do NOT add it here.
  const titleMap: Record<Locale, string> = {
    en: top10RankingTitle(label, year, 'en'),
    de: top10RankingTitle(label, year, 'de'),
    es: top10RankingTitle(label, year, 'es'),
    pt: top10RankingTitle(label, year, 'pt'),
  };
  // Meta description — unique per-page (DeepSeek, stored) with hook-formula fallback.
  const descMap: Record<Locale, string> = {
    en: getMetaDescription(slug, 'en') || `Searching for girls with that ${adj} ${l} energy? Our Top 10 ${l} OnlyFans models are here to deliver exactly what you crave.`,
    de: getMetaDescription(slug, 'de') || `Auf der Suche nach Girls mit dieser ${adj}en ${l} Energie? Unsere Top 10 ${l} OnlyFans-Models liefern genau das, wonach du dich sehnst.`,
    es: getMetaDescription(slug, 'es') || `¿Buscas chicas con esa energía ${l} ${adj}? Nuestro Top 10 de modelos ${l} de OnlyFans te dan justo lo que deseas.`,
    pt: getMetaDescription(slug, 'pt') || `Procurando garotas com aquela energia ${l} ${adj}? Nosso Top 10 de modelos ${l} de OnlyFans entrega exatamente o que você quer.`,
  };
  const ogTitleMap = titleMap;
  const canonical = `${SITE_URL}${blogPath}`;

  return {
    title: titleMap[locale] || titleMap.en,
    description: descMap[locale] || descMap.en,
    alternates: {
      canonical,
    },
    ...buildSocialMeta({
      title: ogTitleMap[locale] || ogTitleMap.en,
      description: descMap[locale] || descMap.en,
      url: canonical,
      type: 'website',
    }),
  };
}

/**
 * The Top-10 OnlyFans category ranking page (served at /onlyfanssearch/top-10-{slug}-onlyfans-models).
 * Ranking spots 1–3 = keyword-targeted best-of campaigns, then top-by-clicks, then fill.
 * Followed by the TRENDING ON EROGRAM featured block + FAQ.
 */
export default async function BestOfPageView({ slug, variant = 'top10' }: { slug: string; variant?: RankingVariant }) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const year = new Date().getFullYear();

  const page = BEST_OF_PAGE_MAP.get(slug);
  if (!page) notFound();

  const pageContent = resolveBestOfContent(slug, locale, variant);
  const label = getTagLabel(slug, page.label, locale);

  const [topByClicks, bestOfAds, trendingFeatured] = await Promise.all([
    getBestOfTopByClicks(page, 10),
    getKeywordPlacementCampaigns('best-of', slug, 6).catch(() => []),
    page.match === 'category' && page.categorySlug
      ? getFeaturedCreatorFeedItems(page.categorySlug).catch(() => [])
      : Promise.resolve([]),
  ]);

  // ── Promoted (TRENDING) campaigns — up to 3, injected at display slots 1, 6, 13 ──
  const promoted: any[] = (bestOfAds as any[]).slice(0, 3).map((ad) => {
    const album: string[] = (ad.ofAlbum && ad.ofAlbum.length ? ad.ofAlbum : [ad.creative]).filter(Boolean);
    const onlineNow = ad.ofLiveHourStart >= 0 && ofIsLiveNow(ad.ofLiveHourStart, ad.ofLiveHourEnd);
    return {
      _id: String(ad._id),
      name: ad.name || ad.ofUsername || '',
      username: ad.ofUsername || '',
      avatar: album[0] || '',
      album,
      bio: ad.ofBio || ad.description || '',
      location: ad.ofLocation || '',
      likesCount: ad.ofLikesCount || 0,
      mediaCount: ad.ofMediaCount || 0,
      photosCount: ad.ofPhotosCount || 0,
      videosCount: ad.ofVideosCount || 0,
      postsCount: ad.ofPostsCount || 0,
      price: ad.ofPrice || 0,
      isFree: ad.ofIsFree || false,
      online: onlineNow,
      trendPercent: ad.ofTrendPercent || 0,
      slug: ad.ofSlug || (ad.ofUsername ? `${ad.ofUsername}-onlyfans` : ''),
      url: ad.destinationUrl || '',
      isTrending: true,
      campaignId: String(ad._id),
    };
  });

  // ── Organic Top-10 (ranked 1–10): top-by-clicks, then fill, excluding promoted unames ──
  const usedUsernames = new Set<string>(promoted.map((p) => (p.username || '').toLowerCase()).filter(Boolean));
  const organic: any[] = [];

  for (const c of topByClicks) {
    if (organic.length >= 10) break;
    if (usedUsernames.has(c.username)) continue;
    usedUsernames.add(c.username);
    organic.push({
      _id: (c._id as any).toString(),
      name: c.name || '',
      username: c.username || '',
      slug: (c as any).slug || c.username || '',
      avatar: c.avatar || '',
      bio: (c as any).bio || '',
      location: (c as any).location || '',
      likesCount: c.likesCount || 0,
      mediaCount: c.mediaCount || 0,
      photosCount: c.photosCount || 0,
      videosCount: c.videosCount || 0,
      postsCount: (c as any).postsCount || 0,
      price: c.price || 0,
      isFree: c.isFree || false,
      url: c.url || '',
      clicks: (c as any).clicks || 0,
      isTrending: false,
    });
  }

  if (organic.length < 10) {
    const fillCreators = await getBestOfFillCreators(page, Array.from(usedUsernames), 10 - organic.length);
    for (const c of fillCreators) {
      organic.push({
        _id: (c._id as any).toString(),
        name: c.name || '',
        username: c.username || '',
        slug: (c as any).slug || c.username || '',
        avatar: c.avatar || '',
        bio: (c as any).bio || '',
        location: (c as any).location || '',
        likesCount: c.likesCount || 0,
        mediaCount: c.mediaCount || 0,
        photosCount: c.photosCount || 0,
        videosCount: c.videosCount || 0,
        postsCount: (c as any).postsCount || 0,
        price: c.price || 0,
        isFree: c.isFree || false,
        url: c.url || '',
        clicks: (c as any).clicks || 0,
        isTrending: false,
      });
    }
  }

  // ── Interleave for display: promoted (no number) at slots 1, 6, 13; organic ranked 1–10 ──
  // Slots are 1-indexed. Build the visible list, assigning rank numbers only to organic.
  const PROMO_SLOTS = [1, 6, 13];
  const display: { item: any; rank: number | null }[] = [];
  const promoQueue = [...promoted];
  const organicQueue = [...organic];
  let organicRank = 0;
  let slot = 1;
  while (promoQueue.length || organicQueue.length) {
    if (PROMO_SLOTS.includes(slot) && promoQueue.length) {
      display.push({ item: promoQueue.shift(), rank: null });
    } else if (organicQueue.length) {
      organicRank += 1;
      display.push({ item: organicQueue.shift(), rank: organicRank });
    } else if (promoQueue.length) {
      // organic exhausted but promos remain — append them
      display.push({ item: promoQueue.shift(), rank: null });
    }
    slot += 1;
    if (slot > 50) break; // safety
  }

  // ── Internal-link cluster: featured cards + 3 typed link groups (niche / country / state) ──
  const CLUSTER_FEATURED = 4;
  const CLUSTER_LINKS_PER_TYPE = 10;
  const clusterCandidates = BEST_OF_PAGES.filter((p) => p.slug !== slug).sort((a, b) => {
    const aSame = a.type === page.type ? 1 : 0;
    const bSame = b.type === page.type ? 1 : 0;
    if (bSame !== aSame) return bSame - aSame;
    return b.count - a.count;
  });
  const featuredCategories = clusterCandidates.slice(0, CLUSTER_FEATURED);
  const nicheLinkPages = BEST_OF_PAGES.filter((p) => p.slug !== slug && p.type === 'niche').sort((a, b) => b.count - a.count).slice(0, CLUSTER_LINKS_PER_TYPE);
  const countryLinkPages = BEST_OF_PAGES.filter((p) => p.slug !== slug && p.type === 'country').sort((a, b) => b.count - a.count).slice(0, CLUSTER_LINKS_PER_TYPE);
  const stateLinkPages = BEST_OF_PAGES.filter((p) => p.slug !== slug && p.type === 'state').sort((a, b) => b.count - a.count).slice(0, CLUSTER_LINKS_PER_TYPE);

  const relatedAvatars = await getBestOfPreviewAvatars(featuredCategories, 4).catch(() => ({} as Record<string, string[]>));

  // ── Erogram editorial palette (same as /trending) ──
  const CREAM = '#F7F4EC';   // page background
  const PLUM = '#2B1B28';    // primary typo + pill bg
  const INK = '#FDFDFD';     // on-plum typo
  const MUTED = '#6B6568';   // secondary body
  const OF_BLUE = '#00AFF0'; // OnlyFans blue — CTA buttons + trending markers
  const PREMIUM_PINK = '#ff2d8a';
  const PREMIUM_PINK_BTN = { background: PREMIUM_PINK, color: '#fff', borderColor: 'transparent', boxShadow: '0 4px 16px rgba(255,45,138,0.38)' };

  const faqItems = (dict.bestOnlyfans.rankingFaq as Array<{q: string; a: string}>).map((item) => ({
    q: item.q.replace('{label}', label),
    a: item.a.replace(/\{label\}/g, label),
  }));

  const pageUrl = `${SITE_URL}${hottestRankingPublicPath(slug, locale)}`;

  return (
    <div className="min-h-screen font-[family-name:var(--font-baloo)]" style={{ backgroundColor: CREAM, color: PLUM }}>
      {pageContent && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: rankingTitle(label, year, locale, variant),
              description: pageContent.heroIntro.replace(/\*\*/g, '').slice(0, 160),
              author: { '@type': 'Organization', name: 'Erogram', url: SITE_URL },
              publisher: { '@type': 'Organization', name: 'Erogram', url: SITE_URL },
              dateModified: new Date().toISOString().slice(0, 10),
              mainEntityOfPage: pageUrl,
            }),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
      <EditorialMasthead />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.12em] uppercase mb-6" style={{ color: MUTED }}>
          <Link href={localePath('/', locale)} className="hover:opacity-70 transition-opacity">{dict.bestOnlyfans.breadcrumbHome}</Link>
          <span style={{ color: 'rgba(43,27,40,0.25)' }}>/</span>
          <Link href={localePath('/onlyfanssearch', locale)} className="hover:opacity-70 transition-opacity">{dict.bestOnlyfans.breadcrumbOfSearch}</Link>
          <span style={{ color: 'rgba(43,27,40,0.25)' }}>/</span>
          <span style={{ color: PLUM }}>{label}</span>
        </nav>

        {/* Header */}
        <header className="mb-8 pt-2">
          <h1 className="font-[family-name:var(--font-baloo)] font-extrabold text-[2.4rem] sm:text-[3.2rem] leading-[0.98] tracking-tight mb-3" style={{ color: PLUM }}>
            {(() => {
              const t = rankingTitle(label, year, locale, variant);
              const parts = t.split(label);
              return parts.length === 2
                ? <>{parts[0]}<span style={{ color: PLUM }}>{label}</span>{parts[1]}</>
                : t;
            })()}
          </h1>
          {pageContent ? (
            <BestOfHeroIntro text={pageContent.heroIntro} />
          ) : (
            <p className="text-[15px] leading-[1.7] max-w-xl" style={{ color: MUTED }}>
              {dict.bestOnlyfans.lookingFor.replace('{category}', label).replace('{year}', String(year))}
            </p>
          )}
        </header>

        {/* Ranked List — organic 1–10 + promoted (TRENDING UP) at slots 1/6/13 */}
        {display.length > 0 ? (
          <>
          <ol className="space-y-5 mb-12 list-none p-0">
            {display.map(({ item: creator, rank }, index: number) => {
              const isPromo = !!creator.isTrending;
              const badge = !isPromo && rank ? rankBadgeStyle(rank) : null;

              const fmt = (n: number) => {
                if (!n) return '0';
                if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
                return `${n}`;
              };
              const likes = creator.likesCount || 0;
              const photos = creator.photosCount || 0;
              const videos = creator.videosCount || 0;
              const media = creator.mediaCount || 0;
              const totalContent = media || (photos + videos);
              const posts = creator.postsCount || 0;

              const textMain = isPromo ? '#FDFDFD' : PLUM;
              const textMuted = isPromo ? 'rgba(255,255,255,0.55)' : MUTED;
              const statBorder = isPromo ? 'rgba(255,255,255,0.10)' : 'rgba(43,27,40,0.10)';

              const stats: { label: string; value: string }[] = [];
              if (likes > 0) stats.push({ label: 'Likes', value: fmt(likes) });
              if (totalContent > 0) stats.push({ label: 'Content', value: fmt(totalContent) });
              if (photos > 0) stats.push({ label: 'Photos', value: fmt(photos) });
              if (videos > 0) stats.push({ label: 'Videos', value: fmt(videos) });
              if (posts > 0) stats.push({ label: 'Posts', value: fmt(posts) });

              const erogramHref = creator.slug
                ? (String(creator.slug).startsWith('/') ? creator.slug : `/${creator.slug}`)
                : creator.username ? `/${creator.username}-onlyfans` : '#';
              const deleteSlug = creator.slug
                ? String(creator.slug).replace(/^\//, '')
                : creator.username
                  ? `${creator.username}-onlyfans`
                  : '';
              const cardRowClass = `relative z-10 flex flex-col sm:flex-row gap-0 sm:gap-5`;
              const CardWrapper = isPromo ? 'div' : 'a';
              const cardWrapperProps = isPromo
                ? { className: cardRowClass }
                : {
                    href: creator.username ? `/go/${creator.username}` : '#',
                    target: '_blank' as const,
                    rel: 'noopener',
                    className: `${cardRowClass} cursor-pointer`,
                  };

              return (
                <li key={creator._id}>
                  <article
                    className={`relative overflow-hidden rounded-[1.35rem] ${isPromo ? 'border border-[#00AFF0]/20 bg-gradient-to-br from-[#061018] via-[#0a1c2e] to-[#0d2844] shadow-[0_20px_50px_-12px_rgba(0,175,240,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)]' : 'border'}`}
                    style={isPromo ? undefined : {
                      background: INK,
                      borderColor: 'rgba(43,27,40,0.10)',
                      boxShadow: '0 20px 60px -40px rgba(43,27,40,0.35)',
                    }}
                  >
                    {!isPromo && <BestOfDeleteButton slug={deleteSlug} />}
                    {isPromo && (
                      <span
                        className="absolute top-3 right-3 z-20 inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[7px] sm:text-[8px] font-black uppercase tracking-[0.14em] shadow-md"
                        style={{
                          background: 'linear-gradient(135deg,#f5d061,#c9920a)',
                          color: '#3d2e00',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
                        }}
                      >
                        {dict.bestOnlyfans.featuredBadge}
                      </span>
                    )}
                    {isPromo && (
                      <>
                        <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-[#00AFF0]/20 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#00D4FF]/12 blur-3xl" />
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(0,175,240,0.06)_0%,transparent_45%,rgba(0,212,255,0.04)_100%)]" />
                      </>
                    )}

                    <CardWrapper {...cardWrapperProps}>
                      {/* Avatar */}
                      <div
                        className="relative flex-shrink-0 w-full sm:w-[11.5rem] h-52 sm:h-auto sm:min-h-[15rem] overflow-hidden sm:rounded-l-[1.35rem]"
                        style={{ backgroundColor: 'rgba(43,27,40,0.06)' }}
                      >
                        {creator.avatar ? (
                          <img
                            src={creator.avatar}
                            alt={isPromo ? `${creator.name}, trending up ${label} OnlyFans on Erogram` : `${creator.name} ${label} OnlyFans, rank #${rank} on Erogram`}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading={index < 4 ? 'eager' : 'lazy'}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-4xl font-black" style={{ color: 'rgba(43,27,40,0.15)' }}>
                            {creator.name.charAt(0)}
                          </div>
                        )}
                        {/* Rank badge on avatar */}
                        {badge && (
                          <span
                            className="absolute top-2.5 left-2.5 inline-flex flex-col items-center justify-center min-w-[2.75rem] px-2 py-1 rounded-lg text-center shadow-lg"
                            style={{ background: badge.bg, color: badge.color, boxShadow: '0 6px 18px rgba(0,0,0,0.3)' }}
                          >
                            <span className="text-[7px] font-bold tracking-[0.22em] uppercase leading-none opacity-80">{dict.bestOnlyfans.rankLabel}</span>
                            <span className="text-[1rem] font-black leading-none mt-0.5 tabular-nums">{badge.label}</span>
                          </span>
                        )}
                        {/* Online badge */}
                        {creator.online && (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide shadow-lg" style={{ backgroundColor: 'rgba(16,185,129,0.95)', color: '#fff' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> {dict.bestOnlyfans.liveLabel}
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0 flex flex-col p-4 sm:py-5 sm:pr-5 sm:pl-0">
                        <div className={isPromo ? 'pr-24 sm:pr-36' : undefined}>
                          <h2 className="font-[family-name:var(--font-baloo)] font-extrabold text-[1.25rem] sm:text-[1.45rem] leading-tight tracking-tight flex items-center gap-1.5 min-w-0" style={{ color: textMain }}>
                            <span className="truncate min-w-0">{creator.name}</span>
                            {isPromo && (
                              <svg className="w-4 h-4 sm:w-[1.1rem] sm:h-[1.1rem] shrink-0" viewBox="0 0 24 24" fill="#1D9BF0" aria-label="Verified">
                                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
                              </svg>
                            )}
                          </h2>
                          <p className="text-[12px] font-semibold mt-1" style={{ color: textMuted }}>
                            @{creator.username}{creator.location ? ` · ${creator.location}` : ''}
                          </p>
                          {!isPromo && (creator.isFree || creator.price > 0) && (
                            <span
                              className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                              style={creator.isFree
                                ? { backgroundColor: '#16a34a', color: '#fff' }
                                : { backgroundColor: 'rgba(43,27,40,0.08)', color: PLUM }}
                            >
                              {creator.isFree ? dict.bestOnlyfans.free : `$${creator.price}/mo`}
                            </span>
                          )}
                        </div>

                        {stats.length > 0 ? (
                          <div
                            className="flex items-stretch gap-0 mt-4 rounded-xl border overflow-hidden"
                            style={{ borderColor: statBorder, backgroundColor: isPromo ? 'rgba(255,255,255,0.04)' : 'rgba(43,27,40,0.02)' }}
                          >
                            {stats.slice(0, 4).map((s, i) => (
                              <div
                                key={s.label}
                                className="flex-1 min-w-0 px-3 py-2.5 text-center"
                                style={{ borderLeft: i > 0 ? `1px solid ${statBorder}` : undefined }}
                              >
                                <div className="text-[8px] font-bold tracking-[0.16em] uppercase truncate" style={{ color: textMuted }}>{dict.bestOnlyfans[`stats${s.label}`] || s.label}</div>
                                <div className="text-[15px] font-extrabold tabular-nums mt-0.5 truncate" style={{ color: textMain }}>{s.value}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 sm:mt-auto pt-1 flex flex-row items-stretch gap-2">
                          {isPromo ? (
                            <>
                              <a
                                href={creator.username ? `/go/${creator.username}` : '#'}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl font-black uppercase text-white px-8 py-4 text-[16px] tracking-[0.14em] transition-opacity hover:opacity-95"
                                style={{ backgroundColor: OF_BLUE, boxShadow: '0 8px 22px rgba(0,175,240,0.35)' }}
                              >
                                <OnlyFansIcon size={18} />
                                {dict.bestOnlyfans.visitProfile}
                              </a>
                              <Link
                                href={erogramHref}
                                title={dict.bestOnlyfans.visitErogramProfile}
                                aria-label={dict.bestOnlyfans.visitErogramProfile}
                                className="inline-flex flex-shrink-0 w-14 sm:w-[3.5rem] items-center justify-center rounded-xl transition-all hover:scale-[1.03] active:scale-[0.98]"
                                style={{
                                  backgroundColor: '#F0EBE3',
                                  border: '1px solid rgba(43,27,40,0.14)',
                                  boxShadow: '0 4px 14px rgba(43,27,40,0.14)',
                                  color: PLUM,
                                }}
                              >
                                <CircleUser size={26} strokeWidth={1.85} />
                              </Link>
                            </>
                          ) : (
                          <span
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl font-black uppercase text-white px-6 py-3 text-[12px] tracking-[0.14em]"
                            style={{ backgroundColor: OF_BLUE, boxShadow: '0 8px 22px rgba(0,175,240,0.35)' }}
                          >
                            <OnlyFansIcon size={15} />
                            {dict.bestOnlyfans.visitProfile}
                          </span>
                          )}
                        </div>

                      </div>
                    </CardWrapper>
                  </article>
                </li>
              );
            })}
          </ol>

          {/* CTA: Explore more of this niche on OFSearch */}
          <div className="mt-6 mb-10 text-center">
            <Link
              href={localePath(`/onlyfanssearch?q=${encodeURIComponent(label)}`, locale)}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[13px] font-bold tracking-[0.06em] border transition-all hover:-translate-y-px hover:opacity-90 active:translate-y-0"
              style={PREMIUM_PINK_BTN}
            >
              {dict.bestOnlyfans.exploreMoreNiche.replace('{label}', label)}
            </Link>
          </div>
        </>
        ) : (
          <div className="text-center py-12 mb-12 rounded-2xl border" style={{ borderColor: 'rgba(43,27,40,0.12)' }}>
            <p className="text-sm" style={{ color: MUTED }}>{dict.bestOnlyfans.curatingMsg}</p>
          </div>
        )}

        {/* TRENDING ON EROGRAM — same featured creators shown on /OFsearch for this category. */}
        <BestPageAdBlock ads={trendingFeatured as any} placement="best-of" />

        {/* ── More Top OnlyFans Rankings (40-link internal cluster) ── */}
        {featuredCategories.length > 0 && (
          <section className="mt-4 pt-12 border-t" style={{ borderColor: 'rgba(43,27,40,0.12)' }} aria-label={`More OnlyFans categories related to ${label}`}>
            <div className="text-[10px] font-bold tracking-[0.32em] uppercase mb-3" style={{ color: MUTED }}>{dict.bestOnlyfans.keepExploring}</div>
            <h2 className="font-[family-name:var(--font-baloo)] font-extrabold text-[1.9rem] sm:text-[2.3rem] leading-tight tracking-tight mb-2" style={{ color: PLUM }}>
              {dict.bestOnlyfans.moreTopRankings}
            </h2>
            <p className="text-[15px] leading-[1.7] mb-8 max-w-xl" style={{ color: MUTED }}>
              {dict.bestOnlyfans.handpickedDesc}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredCategories.map((rc0) => {
                const rc = { ...rc0, label: getTagLabel(rc0.slug, rc0.label, locale) };
                const pics = (relatedAvatars[rc.slug] || []).slice(0, 4);
                return (
                  <Link
                    key={rc.slug}
                    href={hottestRankingPublicPath(rc.slug, locale)}
                    className="group relative flex flex-col p-5 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-32px_rgba(43,27,40,0.5)] shadow-[0_18px_50px_-34px_rgba(43,27,40,0.35)] overflow-hidden"
                    style={{ borderColor: 'rgba(43,27,40,0.10)', backgroundColor: INK }}
                  >
                    {/* 4 miniature creator pictures */}
                    <div className="grid grid-cols-4 gap-1.5 mb-4">
                      {Array.from({ length: 4 }).map((_, idx) => {
                        const src = pics[idx];
                        return (
                          <div
                            key={idx}
                            className="relative aspect-[3/4] rounded-xl overflow-hidden"
                            style={{ backgroundColor: 'rgba(43,27,40,0.06)' }}
                          >
                            {src ? (
                              <img
                                src={src}
                                alt={`${rc.label} OnlyFans model preview`}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                          </div>
                        );
                      })}
                      {/* subtle ranking sheen */}
                      <span className="pointer-events-none absolute -top-px left-5 right-5 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(43,27,40,0.18), transparent)' }} />
                    </div>

                    <div className="flex-1">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.24em] uppercase mb-2 px-2 py-0.5 rounded-full" style={{ color: INK, backgroundColor: PLUM }}>
                        Top 10 · {rc.label}
                      </div>
                      <h3 className="font-[family-name:var(--font-baloo)] font-extrabold text-[1.3rem] leading-[1.1] tracking-tight" style={{ color: PLUM }}>
                        {rankingTitle(rc.label, year, locale, variant)}
                      </h3>
                      <p className="text-[13px] leading-[1.6] mt-2" style={{ color: MUTED }}>
                        {dict.bestOnlyfans.relatedSubhead.replace('{label}', rc.label.toLowerCase())}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-2 mt-5 self-start text-[11px] font-bold tracking-[0.18em] uppercase rounded-full px-5 py-2.5 border transition-all group-hover:gap-3" style={{ color: PLUM, borderColor: 'rgba(43,27,40,0.35)' }}>
                      {dict.bestOnlyfans.seeRanking}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {pageContent && locale === 'en' && pageContent.bottomBody.trim() && (
          <BestOfEditorialBody markdown={pageContent.bottomBody} />
        )}

        {/* ── Explore More Top 10 OnlyFans Model Rankings ── */}
        {(nicheLinkPages.length > 0 || countryLinkPages.length > 0 || stateLinkPages.length > 0) && (
          <nav className="mt-14 pt-8 border-t" style={{ borderColor: 'rgba(43,27,40,0.08)' }} aria-label="Explore more Top 10 OnlyFans model rankings">
            <h2 className="font-[family-name:var(--font-baloo)] font-extrabold text-[1.75rem] sm:text-[2rem] leading-tight tracking-tight mb-3" style={{ color: PLUM }}>
              {dict.bestOnlyfans.exploreMoreHottest}
            </h2>
            <p className="text-[15px] leading-[1.75] mb-8 max-w-2xl" style={{ color: MUTED }}>
              {dict.bestOnlyfans.exploreMoreDesc}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-8">
              {[
                { key: 'niche', title: dict.bestOnlyfans.browseByCategory, pages: nicheLinkPages },
                { key: 'country', title: dict.bestOnlyfans.browseByCountry, pages: countryLinkPages },
                { key: 'state', title: dict.bestOnlyfans.browseByState, pages: stateLinkPages },
              ].map((group) =>
                group.pages.length > 0 ? (
                  <div key={group.key}>
                    <h3 className="font-[family-name:var(--font-baloo)] font-bold text-[1.1rem] sm:text-[1.2rem] mb-4" style={{ color: PLUM }}>
                      {group.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {group.pages.map((rc) => (
                        <Link
                          key={rc.slug}
                          href={hottestRankingPublicPath(rc.slug, locale)}
                          className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-bold border transition-all hover:-translate-y-px hover:opacity-90"
                          style={PREMIUM_PINK_BTN}
                        >
                          {getTagLabel(rc.slug, rc.label, locale)}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={localePath('/onlyfanssearch', locale)}
                      className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-full text-[13px] font-bold border transition-all hover:-translate-y-px hover:opacity-90"
                      style={PREMIUM_PINK_BTN}
                    >
                      {dict.bestOnlyfans.browseAll}
                    </Link>
                  </div>
                ) : null,
              )}
            </div>
          </nav>
        )}

        {/* FAQ — niche-dynamic copy, fully visible HTML + FAQPage JSON-LD for Google */}
        <section className="mt-14" aria-labelledby="ranking-faq-heading">
          <h2 id="ranking-faq-heading" className="font-[family-name:var(--font-baloo)] font-bold text-[1.35rem] sm:text-[1.5rem] mb-5" style={{ color: PLUM }}>
            FAQ
          </h2>
          <div className="space-y-6">
            {faqItems.map((item) => (
              <article key={item.q} className="rounded-2xl border px-4 py-4 sm:px-5 sm:py-5" style={{ borderColor: 'rgba(43,27,40,0.12)', backgroundColor: 'rgba(43,27,40,0.02)' }}>
                <h3 className="font-bold text-[15px] sm:text-[16px] leading-snug mb-2.5" style={{ color: PLUM }}>
                  {item.q}
                </h3>
                <p className="text-[14px] leading-[1.75] m-0" style={{ color: MUTED }}>
                  {item.a}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <EditorialFooter />
    </div>
  );
}
