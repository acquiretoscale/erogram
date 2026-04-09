import WelcomeClient from './WelcomeClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { getFeaturedSlugs } from '@/lib/actions/ainsfw';

export const metadata = {
  title: 'Welcome to Erogram — Set Up Your Feed',
  robots: { index: false, follow: false },
};

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const params = await searchParams;
  const fromBookmark = params.from === 'bookmark';
  const categories = OF_CATEGORIES.map(c => ({
    name: c.name,
    emoji: c.emoji,
    slug: c.slug,
  }));

  const featuredSlugs = await getFeaturedSlugs();
  const featuredSet = new Set(featuredSlugs);

  const sortedTools = [...AI_NSFW_TOOLS].sort((a, b) => {
    const aF = featuredSet.has(a.slug) ? 1 : 0;
    const bF = featuredSet.has(b.slug) ? 1 : 0;
    return bF - aF;
  });

  const topAITools = sortedTools.slice(0, 3).map(t => ({
    slug: t.slug,
    name: t.name,
    category: t.category,
    image: t.image,
    description: t.description.slice(0, 100),
    tryNowUrl: t.tryNowUrl,
    subscription: t.subscription,
  }));

  return (
    <>
      <Navbar />
      <WelcomeClient categories={categories} aiTools={topAITools} fromBookmark={fromBookmark} />
      <Footer />
    </>
  );
}
