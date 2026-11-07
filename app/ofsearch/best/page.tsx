import { Metadata } from 'next';
import { buildSocialMeta, buildMetadataAlternates, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getFreeMajorSubCategories } from '@/lib/onlyfans/freeMajorCategories';
import { buildBestFreeArticleRanking } from '@/lib/onlyfans/bestFreeArticle/buildRanking';
import { bestFreeArticleCopy } from '@/lib/onlyfans/bestFreeArticle/copy';
import { getTopOfPagesFeaturedCreators } from '@/lib/ofsearch/pinnedTopFeaturedCreator';
import BestFreeClient from './BestFreeClient';

const PAGE_PATH = '/ofsearch/best';
const PAGE_URL = `${CANONICAL_BASE}${PAGE_PATH}`;
const PAGE_TITLE = 'The Best 100 OnlyFans Models to follow in 2026';
const PAGE_DESCRIPTION =
  'Best 100 OnlyFans models to follow in 2026, big ass, Alt, Asian, Big boobs, Latina, ahegao and hundreds of other categories';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const title = `${PAGE_TITLE}`;
  const description = PAGE_DESCRIPTION;
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
  const paidFeatured = await getTopOfPagesFeaturedCreators();

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
