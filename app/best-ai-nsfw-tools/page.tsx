import { Metadata } from 'next';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { BEST_AI_NSFW_TOOL_PAGES, getToolsForBestAiPage } from '@/lib/bestAiNsfwTools/pages';
import { BEST_AI_TOOLS_HUB_HERO } from '@/lib/bestAiNsfwTools/heroIntros';
import BestAiToolsIndexClient from '@/app/best-ai-nsfw-tools/BestAiToolsIndexClient';

export const revalidate = 300;

const canonicalBase = CANONICAL_BASE;
const INDEX_TITLE = 'Best Adult AI Tools Rankings | Erogram';
const INDEX_DESC =
  'Browse Erogram top 10 rankings of the best adult AI tools by category. Curated lists of AI girlfriends, undress apps, NSFW generators, sexting chat, and more.';

export async function generateMetadata(): Promise<Metadata> {
  const pathname = await getPathname();
  const canonical = `${canonicalBase}${pathname}`;
  return {
    title: INDEX_TITLE,
    description: INDEX_DESC,
    alternates: { canonical },
    other: { rating: 'adult' },
    ...buildSocialMeta({
      title: INDEX_TITLE,
      description: INDEX_DESC,
      url: canonical,
      type: 'website',
    }),
  };
}

export default async function BestAiToolsIndexPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const b = dict.bestAiTools ?? {};

  const pages = BEST_AI_NSFW_TOOL_PAGES.map((page) => ({
    slug: page.slug,
    label: page.label,
    count: getToolsForBestAiPage(page).length,
  })).filter((page) => page.count > 0);

  return (
    <BestAiToolsIndexClient
      pages={pages}
      curatedTitle={b.curatedTitle || 'Curated'}
      topLists={b.topLists || 'Adult AI Tools'}
      indexDesc={BEST_AI_TOOLS_HUB_HERO}
      bestCategoryLabel={b.bestCategory || 'Best {category} Tools'}
      top10Label={b.top10 || 'Top 10 {category} tools'}
    />
  );
}
