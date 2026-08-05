import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { getToolBySlug, getToolsByCategory, AI_NSFW_TOOLS, toolSlug, invertToolSlug, getCategoryBySlug, CATEGORY_SLUGS, categoryToSlug, getLegacyToolSlugRedirect } from '@/app/ainsfw/data';
import CategoryClient from '@/app/ainsfw/[slug]/CategoryClient';
import { getBlogArticlesByCategory } from '@/lib/actions/blog';
import type { BlogCard } from '@/lib/actions/blog';
import { AINsfwSubmission } from '@/lib/models';
import type { AINsfwTool } from '@/app/ainsfw/types';
import ToolDetailClient from '@/app/ainsfw/[slug]/ToolDetailClient';
import { getFullReview, getVerifiedSlugs, isPaidClientTool } from '@/app/ainsfw/fullReviews';
import { getListingBlocks } from '@/app/ainsfw/listingBlocks';
import { getToolStats, getAllToolStats, getApprovedSubmissions } from '@/lib/actions/ainsfw';
import { getFeaturedHubSlugs } from '@/lib/ainsfw/featuredHub';
import { pickRecentCategoryTools } from '@/app/ainsfw/recentCategoryTools';
import { getAuthorBySlug } from '@/lib/actions/authors';
import { getAinsfwCategoryMeta, getAinsfwMetaDescription, getAinsfwMetaTitle } from '@/lib/ainsfw/metaDescriptions';
import { pickTagHashtagAlt } from '@/lib/ainsfw/imageAlt';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

// Pre-built at deploy (generateStaticParams below) + background refresh every
// 5 minutes (ISR): stable server HTML for Google, fresh stats/ads for users.
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

function submissionSlugCandidates(slug: string): string[] {
  const out = new Set<string>([slug]);
  const legacy = getLegacyToolSlugRedirect(slug);
  if (legacy) out.add(legacy);
  const alt = invertToolSlug(slug);
  if (alt) out.add(alt);
  return [...out];
}

function mapSubmissionToTool(d: {
  slug?: string;
  name: string;
  category: string;
  vendor?: string;
  description?: string;
  image?: string;
  tags?: string[];
  subscription?: string;
  payment?: string[];
  tryNowUrl?: string;
  websiteUrl?: string;
}): AINsfwTool {
  return {
    slug: d.slug || toolSlug(d.category, d.name),
    name: d.name,
    category: d.category,
    vendor: d.vendor || d.name,
    description: d.description || '',
    image: d.image || '/assets/image.jpg',
    tags: d.tags || [],
    subscription: d.subscription || '',
    payment: d.payment || [],
    tryNowUrl: d.tryNowUrl || d.websiteUrl || '',
    sourceUrl: d.websiteUrl,
  };
}

async function getSubmissionTool(slug: string): Promise<AINsfwTool | null> {
  try {
    await connectDB();
    const candidates = submissionSlugCandidates(slug);
    const paidFilter = { status: 'approved', paymentStatus: 'paid', unlisted: { $ne: true } };

    let d = await AINsfwSubmission.findOne({ slug: { $in: candidates }, ...paidFilter }).lean() as any;
    if (!d) {
      const all = await AINsfwSubmission.find(paidFilter).lean() as any[];
      d = all.find((row) => {
        const stored = row.slug || toolSlug(row.category, row.name);
        const computed = toolSlug(row.category, row.name);
        return candidates.includes(stored) || candidates.includes(computed) || candidates.includes(row.slug);
      }) ?? null;
    }
    if (!d) return null;
    return mapSubmissionToTool(d);
  } catch { return null; }
}

export async function generateStaticParams() {
  const toolParams = AI_NSFW_TOOLS.map((tool) => ({ slug: tool.slug }));
  const catParams = Object.keys(CATEGORY_SLUGS).map((slug) => ({ slug }));
  return [...toolParams, ...catParams];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Category page
  const category = getCategoryBySlug(slug);
  if (category) {
    const customCatMeta = getAinsfwCategoryMeta(slug);
    const title = customCatMeta?.title ?? `Best ${category} Tools 2026 — Erogram`;
    const description = customCatMeta?.en ?? `Browse the top ${category} tools reviewed and ranked by Erogram. Find the best ${category.toLowerCase()} options with real user ratings.`;
    const url = `${BASE_URL}/ainsfw/${slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      other: { rating: 'adult' },
      ...buildSocialMeta({ title, description, url, type: 'website' }),
    };
  }

  const aiTool = getToolBySlug(slug) || await getSubmissionTool(slug);
  if (aiTool) {
    if (aiTool.slug !== slug) {
      const { permanentRedirect } = await import('next/navigation');
      permanentRedirect(`/ainsfw/${aiTool.slug}`);
    }
    const toolPageUrl = `${BASE_URL}/ainsfw/${aiTool.slug}`;
    const toolImgUrl = aiTool.image.startsWith('http') ? aiTool.image : `${BASE_URL}${aiTool.image}`;

    const customTitle = getAinsfwMetaTitle(aiTool.slug);
    const title = customTitle ?? `${aiTool.name} Review — Best ${aiTool.category} Tool 2026`;

    const masterDesc = getAinsfwMetaDescription(aiTool.slug);
    const toolDesc = masterDesc || (aiTool.description ? aiTool.description.slice(0, 157) + (aiTool.description.length > 157 ? '...' : '') : '');

    return {
      title,
      description: toolDesc,
      keywords: `${aiTool.name}, ${aiTool.category}, ai nsfw tools, ${aiTool.tags.slice(0, 5).join(', ')}, erogram, best ${aiTool.category.toLowerCase()} 2026`,
      other: { rating: 'adult' },
      alternates: { canonical: toolPageUrl },
      ...buildSocialMeta({
        title,
        description: toolDesc,
        url: toolPageUrl,
        type: 'website',
        image: toolImgUrl,
        imageAlt: pickTagHashtagAlt(aiTool.tags, 0),
      }),
    };
  }

  return {
    title: 'Not Found',
    robots: { index: false, follow: false }
  };
}

export default async function AINsfwToolPage({ params }: PageProps) {
  const { slug } = await params;

  // Category page
  const category = getCategoryBySlug(slug);
  if (category) {
    const tools = getToolsByCategory(category);
    const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
    const [allStats, paidSubmissions] = await Promise.all([
      getAllToolStats(tools.map((t) => t.slug)),
      getApprovedSubmissions(staticSlugs),
    ]);
    const catalogToolsBySlug = new Map([
      ...AI_NSFW_TOOLS.map((t) => [t.slug, t] as const),
      ...paidSubmissions.map((t) => [t.slug, t] as const),
    ]);
    const recentTools = pickRecentCategoryTools(
      category,
      catalogToolsBySlug,
      paidSubmissions as Array<(typeof paidSubmissions)[number] & { createdAt?: string }>,
    );
    const recentStats = await getAllToolStats(recentTools.map((t) => t.slug));
    const verifiedSlugs = getVerifiedSlugs(paidSubmissions.map((t) => t.slug));
    const featuredHubSlugs = getFeaturedHubSlugs();
    const featuredCatalogTools = [
      ...AI_NSFW_TOOLS,
      ...paidSubmissions.filter((t) => !staticSlugs.has(t.slug)),
    ];
    const featuredHubStats = await getAllToolStats(featuredHubSlugs);
    return (
      <CategoryClient
        category={category}
        tools={tools}
        allStats={allStats}
        recentTools={recentTools}
        recentStats={recentStats}
        featuredHubSlugs={featuredHubSlugs}
        featuredCatalogTools={featuredCatalogTools}
        featuredHubStats={featuredHubStats}
        verifiedSlugs={verifiedSlugs}
      />
    );
  }

  const catalogTool = getToolBySlug(slug);
  const submissionTool = catalogTool ? null : await getSubmissionTool(slug);
  const aiTool = catalogTool || submissionTool;
  if (!aiTool) {
    notFound();
  }
  if (aiTool.slug !== slug) {
    const { permanentRedirect } = await import('next/navigation');
    permanentRedirect(`/ainsfw/${aiTool.slug}`);
  }

  const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
  const paidSubmissions = await getApprovedSubmissions(staticSlugs);

  const fullReview = getFullReview(aiTool.slug);
  const isPaidClientListing = isPaidClientTool(aiTool.slug) || !!submissionTool;
  const showVerified = isPaidClientListing;
  const reviewAuthor = fullReview ? await getAuthorBySlug('eros') : undefined;
  const listingBlocksRaw = getListingBlocks(aiTool.slug);
  const showListingBlocks = !!listingBlocksRaw && (
    !!fullReview || isPaidClientTool(aiTool.slug) || !!submissionTool
  );
  const listingBlocks = showListingBlocks ? listingBlocksRaw : undefined;

  const [toolStats, aiArticles] = await Promise.all([
    getToolStats(aiTool.slug),
    getBlogArticlesByCategory('ai-nsfw', 4),
  ]);

  const featuredHubSlugs = getFeaturedHubSlugs();
  const featuredToolsBySlug = new Map([
    ...AI_NSFW_TOOLS.map((t) => [t.slug, t] as const),
    ...paidSubmissions.map((t) => [t.slug, t] as const),
  ]);
  const featuredHubToolsRaw = featuredHubSlugs
    .map((s) => featuredToolsBySlug.get(s))
    .filter(Boolean) as AINsfwTool[];
  const featuredHubStats = await getAllToolStats(featuredHubSlugs);
  const verifiedSlugs = getVerifiedSlugs(paidSubmissions.map((t) => t.slug));

  const { mergeToolContent } = await import('@/lib/ainsfw/toolContent');
  const displayTool = mergeToolContent(aiTool, toolStats);
  const featuredHubTools = featuredHubToolsRaw.map((t) => mergeToolContent(t, featuredHubStats[t.slug]));

  const toolPageUrl = `${BASE_URL}/ainsfw/${displayTool.slug}`;
  const toolImgUrl = displayTool.image.startsWith('http') ? displayTool.image : `${BASE_URL}${displayTool.image}`;

  const toolBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'AI NSFW Tools', item: `${BASE_URL}/ainsfw` },
      { '@type': 'ListItem', position: 3, name: displayTool.category, item: `${BASE_URL}/ainsfw/${categoryToSlug(displayTool.category)}` },
      { '@type': 'ListItem', position: 4, name: displayTool.name, item: toolPageUrl },
    ],
  };

  const toolWebPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${displayTool.name} — ${displayTool.category} Tool Review`,
    description: displayTool.description,
    url: toolPageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Erogram', url: BASE_URL },
    author: { '@type': 'Organization', name: 'Erogram.pro', url: BASE_URL },
  };

  const toolSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: displayTool.name,
    description: displayTool.description,
    url: toolPageUrl,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: displayTool.subscription.toLowerCase().includes('free') ? '0' : '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    provider: { '@type': 'Organization', name: 'Erogram.pro', url: BASE_URL },
    image: toolImgUrl,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolBreadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolWebPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolSoftware) }} />
      <ToolDetailClient
        tool={displayTool}
        fullReview={fullReview}
        showVerified={showVerified}
        reviewAuthor={reviewAuthor}
        aiArticles={aiArticles}
        initialStats={toolStats}
        listingBlocks={listingBlocks}
        featuredHubSlugs={featuredHubSlugs}
        featuredHubTools={featuredHubTools}
        featuredHubStats={featuredHubStats}
        verifiedSlugs={verifiedSlugs}
      />
    </>
  );
}
