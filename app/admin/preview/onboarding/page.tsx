import WelcomeClient from '@/app/welcome/WelcomeClient';
import { OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { getFeaturedSlugs } from '@/lib/actions/ainsfw';

export default async function OnboardingPreviewPage() {
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
    <div>
      <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-400 text-sm">⚠️</span>
          <span className="text-amber-400 text-sm font-bold">Admin Preview Mode</span>
        </div>
        <p className="text-amber-400/60 text-xs">
          This is exactly what new users see after signing up. No data is saved in preview mode.
          Click &quot;Reset Preview&quot; at the end to restart.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0f]" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <WelcomeClient categories={categories} aiTools={topAITools} isPreview />
      </div>
    </div>
  );
}
