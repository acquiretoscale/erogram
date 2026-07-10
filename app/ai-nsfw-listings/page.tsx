import type { Metadata } from 'next';
import AINSFWListingsClient from './AINSFWListingsClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'My AI NSFW Listings | Erogram';
const description = 'Manage your AI NSFW tool listings on Erogram.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/ai-nsfw-listings`,
    type: 'website',
  }),
};

export default function AINSFWListingsPage() {
  return <AINSFWListingsClient />;
}
