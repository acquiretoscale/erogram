import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
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
import { BestOfHeroIntro, BestOfEditorialBody } from '@/app/best-onlyfans-accounts/BestOfEditorial';
import { getBestOfPageContent, type BestOfPageContent } from '@/lib/bestOfPageContent';
import { getBodyTranslation } from '@/lib/bestOfPageContent/bodyTranslations';
import { getMetaDescription } from '@/lib/bestOfPageContent/metaDescriptions';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getTagLabel } from '@/lib/tags/labelTranslations';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_BASE;
const OF_BLUE = '#00AFF0';
const PREMIUM_NAVY = 'linear-gradient(135deg, #061018 0%, #0a1c2e 45%, #0d2844 100%)';

/** Stable per-creator base % (5–30) seeded from id, so 0-click creators are pre-populated. */
function erogramBase(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 26;
  return 5 + h; // 5..30
}

/** Internal clicks → public "last 30 days on Erogram" % (never expose raw clicks).
 *  Stable base (5–30%) + 0.11% per click. */
function erogramMomentum(id: string, clicks: number): number {
  const val = erogramBase(id) + (clicks || 0) * 0.11;
  return Math.min(94, Math.round(val));
}

/** Stable seed from an id (for deterministic high default %). */
function promoSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Is the creator inside their GMT live window right now? */
function ofIsLiveNow(start: number, end: number): boolean {
  if (start < 0 || end < 0) return false;
  const h = new Date().getUTCHours();
  return start <= end ? h >= start && h < end : h >= start || h < end;
}

/** High-spike trend series for promoted creators — strong upward breakout. */
function buildSpikeSeries(seed: number, len = 12): number[] {
  const out: number[] = [];
  let v = 8 + (seed % 6);
  for (let i = 0; i < len; i++) {
    const wobble = (((seed * (i + 2) + i * 5) % 9) - 4) * 0.6;
    const ramp = i >= len - 4 ? 4.5 + (i - (len - 4)) * 2.4 : 1.1; // sharp spike in the last 4 weeks
    v = Math.min(48, Math.max(5, v + ramp + wobble));
    out.push(v);
  }
  return out;
}

/** Realistic traffic-style series — ups and downs, overall upward (12 weeks). */
function buildTrendSeries(seed: number, len = 12): number[] {
  const out: number[] = [];
  let v = 12 + (seed % 8);
  for (let i = 0; i < len; i++) {
    const wobble = (((seed * (i + 3) + i * i * 7) % 17) - 8) * 0.9; // -7.2..+7.2
    const drift = 1.6; // gentle upward bias
    v = Math.min(46, Math.max(6, v + drift + wobble));
    out.push(v);
  }
  return out;
}

function trendChartSvg(series: number[], w = 120, h = 44, accent = '#16a34a') {
  const pad = 2;
  const step = (w - pad * 2) / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / 50) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.join(' ');
  const area = `${pad},${h - pad} ${line} ${(pad + (series.length - 1) * step).toFixed(1)},${h - pad}`;
  return { line, area, accent };
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
  indian: { en: 'exotic', de: 'exotisch', es: 'exótica' },
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
      bio: '',
      location: '',
      likesCount: ad.ofLikesCount || 0,
      mediaCount: 0,
      photosCount: 0,
      videosCount: 0,
      postsCount: 0,
      price: 0,
      isFree: false,
      online: onlineNow,
      trendPercent: ad.ofTrendPercent || 0,
      slug: (ad.ofUsername || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
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
              // Promo %: owner-set in /OF; if unset, a stable HIGH default (100–400) so it always shows.
              const momentum = isPromo
                ? (creator.trendPercent > 0 ? creator.trendPercent : 100 + (promoSeed(String(creator._id)) % 301))
                : erogramMomentum(String(creator._id), creator.clicks || 0);
              const showTrend = true;
              const chartSeed = isPromo
                ? (creator.username?.length || 17) + momentum
                : Math.floor((creator.clicks || 0) + (creator.likesCount || 0) * 0.01);
              const series = isPromo ? buildSpikeSeries(chartSeed) : buildTrendSeries(chartSeed);
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

              const textMain = PLUM;
              const textMuted = MUTED;
              const statBorder = 'rgba(43,27,40,0.10)';

              const stats: { label: string; value: string }[] = [];
              if (likes > 0) stats.push({ label: 'Likes', value: fmt(likes) });
              if (totalContent > 0) stats.push({ label: 'Content', value: fmt(totalContent) });
              if (photos > 0) stats.push({ label: 'Photos', value: fmt(photos) });
              if (videos > 0) stats.push({ label: 'Videos', value: fmt(videos) });
              if (posts > 0) stats.push({ label: 'Posts', value: fmt(posts) });

              return (
                <li key={creator._id} className={isPromo ? 'pt-3' : undefined}>
                  <div className={isPromo ? 'relative' : undefined}>
                    {isPromo && (
                      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
                        <span
                          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-white whitespace-nowrap shadow-lg"
                          style={{
                            backgroundColor: '#b31b1b',
                            boxShadow: '0 10px 28px rgba(179,27,27,0.45)',
                          }}
                        >
                          {dict.bestOnlyfans.topTrending}
                        </span>
                      </div>
                    )}
                  <article
                    className={`relative overflow-hidden rounded-[1.35rem] ${isPromo ? 'border-2' : 'border'}`}
                    style={{
                      background: INK,
                      borderColor: isPromo ? OF_BLUE : 'rgba(43,27,40,0.10)',
                      boxShadow: isPromo
                        ? '0 12px 40px -12px rgba(0,175,240,0.5), 0 0 0 1px rgba(0,175,240,0.2)'
                        : '0 20px 60px -40px rgba(43,27,40,0.35)',
                    }}
                  >

                    {/* Top-right trend badge */}
                    {showTrend && (
                      <div className={`absolute z-20 flex flex-col items-end gap-1 ${isPromo ? 'top-3.5 right-3.5 sm:top-4 sm:right-4' : 'top-3.5 right-3.5'}`}>
                        <span
                          className={`inline-flex items-center gap-2.5 shadow-lg ${isPromo ? 'pl-3 pr-4 py-2.5 rounded-xl' : 'pl-2 pr-3 py-1.5 rounded-full'}`}
                          style={{
                            backgroundColor: isPromo ? '#0f7a37' : '#0f7a37',
                            boxShadow: '0 8px 22px rgba(0,0,0,0.25)',
                          }}
                        >
                          <svg width={isPromo ? 52 : 34} height={isPromo ? 24 : 16} viewBox={`0 0 ${isPromo ? 52 : 34} ${isPromo ? 24 : 16}`} className="flex-shrink-0">
                            <polyline
                              fill="none"
                              stroke="#fff"
                              strokeOpacity="0.95"
                              strokeWidth={isPromo ? 2 : 1.6}
                              strokeLinejoin="round"
                              strokeLinecap="round"
                              points={trendChartSvg(series, isPromo ? 52 : 34, isPromo ? 24 : 16, '#fff').line}
                            />
                          </svg>
                          <span className={`font-black tabular-nums text-white ${isPromo ? 'text-[18px] sm:text-[20px]' : 'text-[12px]'}`}>+{momentum}%</span>
                        </span>
                        {isPromo && (
                          <span className="text-[9px] font-bold uppercase tracking-[0.14em] pr-1" style={{ color: MUTED }}>
                            {dict.bestOnlyfans.last30Days}
                          </span>
                        )}
                      </div>
                    )}

                    <a
                      href={creator.username ? `/go/${creator.username}` : '#'}
                      target="_blank"
                      rel="noopener"
                      className="relative flex flex-col sm:flex-row gap-0 sm:gap-5 cursor-pointer"
                    >
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
                        <div className={showTrend ? (isPromo ? 'pr-28 sm:pr-36' : 'pr-24 sm:pr-28') : ''}>
                          <h2 className="font-[family-name:var(--font-baloo)] font-extrabold text-[1.25rem] sm:text-[1.45rem] leading-tight tracking-tight truncate" style={{ color: textMain }}>
                            {creator.name}
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
                            style={{ borderColor: statBorder, backgroundColor: 'rgba(43,27,40,0.02)' }}
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

                        <div className="mt-4 sm:mt-auto pt-1">
                          <span
                            className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl font-black uppercase text-white ${
                              isPromo
                                ? 'px-8 py-4 text-[16px] tracking-[0.14em]'
                                : 'px-6 py-3 text-[12px] tracking-[0.14em]'
                            }`}
                            style={{ backgroundColor: OF_BLUE, boxShadow: isPromo ? '0 10px 28px rgba(0,175,240,0.4)' : '0 8px 22px rgba(0,175,240,0.35)' }}
                          >
                            {dict.bestOnlyfans.visitProfile}
                          </span>
                        </div>

                      </div>
                    </a>
                  </article>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* CTA: Explore more of this niche on OFSearch */}
          <div className="mt-6 mb-10 text-center">
            <Link
              href={localePath(`/onlyfanssearch?q=${encodeURIComponent(label)}`, locale)}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[13px] font-bold tracking-[0.06em] transition-all hover:-translate-y-px active:translate-y-0"
              style={{ backgroundColor: PLUM, color: INK }}
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
                          className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all hover:-translate-y-px"
                          style={{ color: PLUM, borderColor: 'rgba(43,27,40,0.14)', backgroundColor: 'rgba(43,27,40,0.03)' }}
                        >
                          {getTagLabel(rc.slug, rc.label, locale)}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={localePath('/onlyfanssearch', locale)}
                      className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-bold hover:opacity-70 transition-opacity"
                      style={{ color: OF_BLUE }}
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
