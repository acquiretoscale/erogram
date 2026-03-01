import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Erogram – The Largest NSFW Telegram Directory',
  description:
    'Erogram.pro is the largest directory of NSFW Telegram groups, channels, and AI companion bots. Discover verified adult communities, explore curated categories, and connect with like-minded people worldwide. Safe, moderated, and updated daily.',
  openGraph: {
    title: 'About Erogram – The Largest NSFW Telegram Directory',
    description:
      'Erogram.pro is the largest directory of NSFW Telegram groups, channels, and AI companion bots. Discover verified adult communities and connect with like-minded people worldwide.',
  },
  alternates: {
    canonical: 'https://erogram.pro/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
