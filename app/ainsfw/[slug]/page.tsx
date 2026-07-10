import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { getToolBySlug, getToolsByCategory, AI_NSFW_TOOLS, toolSlug, invertToolSlug, getCategoryBySlug, CATEGORY_SLUGS, categoryToSlug } from '@/app/ainsfw/data';
import CategoryClient from '@/app/ainsfw/[slug]/CategoryClient';
import { getBlogArticlesByCategory } from '@/lib/actions/blog';
import type { BlogCard } from '@/lib/actions/blog';
import { AINsfwSubmission } from '@/lib/models';
import type { AINsfwTool } from '@/app/ainsfw/types';
import ToolDetailClient from '@/app/ainsfw/[slug]/ToolDetailClient';
import { getToolStats } from '@/lib/actions/ainsfw';
import { getAinsfwMetaDescription } from '@/lib/ainsfw/metaDescriptions';
import { getPlacementFeedCampaigns } from '@/lib/actions/campaigns';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

// ISR for public pages
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://erogram.pro';

async function getSubmissionTool(slug: string): Promise<AINsfwTool | null> {
  try {
    await connectDB();
    const alt = invertToolSlug(slug);
    const slugQuery = alt && alt !== slug ? { $in: [slug, alt] } : slug;
    const d = await AINsfwSubmission.findOne({ slug: slugQuery, status: 'approved', paymentStatus: 'paid' }).lean() as any;
    if (!d) return null;
    return {
      slug: toolSlug(d.category, d.name), name: d.name, category: d.category, vendor: d.vendor || d.name,
      description: d.description, image: d.image || '/assets/image.jpg', tags: d.tags || [],
      subscription: d.subscription || '', payment: d.payment || [],
      tryNowUrl: d.tryNowUrl || d.websiteUrl, sourceUrl: d.websiteUrl,
    };
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
    const title = `Best ${category} Tools 2026 — Erogram`;
    const description = `Browse the top ${category} tools reviewed and ranked by Erogram. Find the best ${category.toLowerCase()} options with real user ratings.`;
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

    // Title can stay constructed or come from DB for submissions.
    const title = `${aiTool.name} Review — Best ${aiTool.category} Tool 2026`;

    // Description from master list (injected via meta-lab)
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
        imageAlt: `${aiTool.name} NSFW AI ${aiTool.category}`,
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
    const { getAllToolStats } = await import('@/lib/actions/ainsfw');
    const allStats = await getAllToolStats(tools.map(t => t.slug));
    return <CategoryClient category={category} tools={tools} allStats={allStats} />;
  }

  const aiTool = getToolBySlug(slug) || await getSubmissionTool(slug);
  if (!aiTool) {
    notFound();
  }
  if (aiTool.slug !== slug) {
    const { permanentRedirect } = await import('next/navigation');
    permanentRedirect(`/ainsfw/${aiTool.slug}`);
  }

  const categoryTools = getToolsByCategory(aiTool.category).filter((t) => t.slug !== aiTool.slug);
  const otherTools = AI_NSFW_TOOLS.filter((t) => t.slug !== aiTool.slug);

  const { getAllToolStats } = await import('@/lib/actions/ainsfw');

  const [catStats, globalStats, toolStats, sidebarAdsAgnostic, aiArticles] = await Promise.all([
    getAllToolStats(categoryTools.map(t => t.slug)),
    getAllToolStats(otherTools.map(t => t.slug)),
    getToolStats(aiTool.slug),
    getPlacementFeedCampaigns('group-sidebar', 4).catch(() => []),
    getBlogArticlesByCategory('ai-nsfw', 4),
  ]);

  const sortByUpvotes = (list: any[], stats: Record<string, any>) =>
    [...list].sort((a, b) => ((stats[b.slug]?.upvotes || 0) - (stats[a.slug]?.upvotes || 0)));

  const alternatives = sortByUpvotes(categoryTools, catStats).slice(0, 6);
  const mostVoted = sortByUpvotes(otherTools, globalStats).slice(0, 6);

  const toolPageUrl = `${BASE_URL}/ainsfw/${aiTool.slug}`;
  const toolImgUrl = aiTool.image.startsWith('http') ? aiTool.image : `${BASE_URL}${aiTool.image}`;

  const toolBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'AI NSFW Tools', item: `${BASE_URL}/ainsfw` },
      { '@type': 'ListItem', position: 3, name: aiTool.category, item: `${BASE_URL}/ainsfw/${categoryToSlug(aiTool.category)}` },
      { '@type': 'ListItem', position: 4, name: aiTool.name, item: toolPageUrl },
    ],
  };

  const toolWebPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${aiTool.name} — ${aiTool.category} Tool Review`,
    description: aiTool.description,
    url: toolPageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Erogram', url: BASE_URL },
    author: { '@type': 'Organization', name: 'Erogram.pro', url: BASE_URL },
  };

  const toolSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: aiTool.name,
    description: aiTool.description,
    url: toolPageUrl,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: aiTool.subscription.toLowerCase().includes('free') ? '0' : '0',
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
        tool={aiTool}
        alternatives={alternatives}
        mostVoted={mostVoted}
        aiArticles={aiArticles}
        initialStats={toolStats}
        sidebarAds={sidebarAdsAgnostic}
      />
    </>
  );
}
