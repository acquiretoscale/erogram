import { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getFreeMajorSubCategories } from '@/lib/onlyfans/freeMajorCategories';
import { buildBestFreeArticleRanking } from '@/lib/onlyfans/bestFreeArticle/buildRanking';
import { bestFreeArticleCopy } from '@/lib/onlyfans/bestFreeArticle/copy';
import BestFreeClient from './BestFreeClient';

const PAGE_PATH = '/onlyfanssearch/best';
const PAGE_URL = `${CANONICAL_BASE}${PAGE_PATH}`;
const PAGE_TITLE = 'Explore the Best OnlyFans Girls & Models Accounts (2026)';

export async function generateMetadata(): Promise<Metadata> {
  const title = `${PAGE_TITLE} | Erogram`;
  const description = 'Browse free OnlyFans creators on Erogram.';
  return {
    title,
    description,
    alternates: { canonical: PAGE_URL },
    ...buildSocialMeta({ title, description, url: PAGE_URL }),
  };
}

export default async function BestFreeOnlyFansPage() {
  const subCategories = getFreeMajorSubCategories();
  const articleRanking = await buildBestFreeArticleRanking(20);

  return (
    <BestFreeClient
      subCategories={subCategories}
      articleRanking={articleRanking}
      articleCopy={bestFreeArticleCopy}
      breadcrumbLabel="Best Free"
      pageTitle={PAGE_TITLE}
    />
  );
}
