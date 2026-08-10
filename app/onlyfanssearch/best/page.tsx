import { Metadata } from 'next';
import { buildSocialMeta, buildMetadataAlternates, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getFreeMajorSubCategories } from '@/lib/onlyfans/freeMajorCategories';
import { buildBestFreeArticleRanking } from '@/lib/onlyfans/bestFreeArticle/buildRanking';
import { bestFreeArticleCopy } from '@/lib/onlyfans/bestFreeArticle/copy';
import { getPlacementFeedCampaigns } from '@/lib/actions/campaigns';
import BestFreeClient from './BestFreeClient';

const PAGE_PATH = '/onlyfanssearch/best';
const PAGE_URL = `${CANONICAL_BASE}${PAGE_PATH}`;
const PAGE_TITLE = 'Explore the Best OnlyFans Girls & Models Accounts (2026)';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const title = `${PAGE_TITLE} | Erogram`;
  const description = 'Browse free OnlyFans creators on Erogram.';
  const alternates = buildMetadataAlternates(pathname, locale);
  const url = alternates?.canonical?.toString() || PAGE_URL;

  return {
    title,
    description,
    alternates,
    ...buildSocialMeta({ title, description, url }),
  };
}

export default async function BestFreeOnlyFansPage() {
  const subCategories = getFreeMajorSubCategories();
  const articleRanking = await buildBestFreeArticleRanking(20);
  const ofSearchFeaturedRaw = await getPlacementFeedCampaigns('of-search-featured', 8).catch(() => []);
  const paidFeatured = (ofSearchFeaturedRaw as any[])
    .filter((c) => c.adType === 'onlyfans-creator' && (c.creative || c.ofUsername))
    .map((c) => ({
      _id: c._id,
      campaignId: c._id,
      name: c.name || c.ofUsername || '',
      username: c.ofUsername || '',
      avatar: (c.ofAlbum && c.ofAlbum[0]) || c.creative || '',
      album: c.ofAlbum || [],
      albumIdx: c.ofAlbumIdx || [],
      url: c.destinationUrl || '',
      bio: c.description || '',
      likesCount: c.ofLikesCount || 0,
      liveHourStart: c.ofLiveHourStart ?? -1,
      liveHourEnd: c.ofLiveHourEnd ?? -1,
      isPaidCampaign: true,
    }));

  return (
    <BestFreeClient
      subCategories={subCategories}
      articleRanking={articleRanking}
      articleCopy={bestFreeArticleCopy}
      breadcrumbLabel="Best Free"
      pageTitle={PAGE_TITLE}
      paidFeatured={paidFeatured}
    />
  );
}
