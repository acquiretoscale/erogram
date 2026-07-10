import { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const aboutTitle = 'About Erogram – The Largest NSFW Telegram Directory';
const aboutDescription =
  'Erogram.pro is the largest directory of NSFW Telegram groups, channels, and AI companion bots. Discover verified adult communities and connect with like-minded people worldwide.';

export const metadata: Metadata = {
  title: aboutTitle,
  description:
    'Erogram.pro is the largest directory of NSFW Telegram groups, channels, and AI companion bots. Discover verified adult communities, explore curated categories, and connect with like-minded people worldwide. Safe, moderated, and updated daily.',
  alternates: {
    canonical: `${CANONICAL_BASE}/about`,
  },
  ...buildSocialMeta({
    title: aboutTitle,
    description: aboutDescription,
    url: `${CANONICAL_BASE}/about`,
    type: 'website',
  }),
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
