import { Suspense } from 'react';
import { Metadata } from 'next';
import AINSFWPreviewClient from './AINSFWPreviewClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Preview AI NSFW Listing | Erogram';
const description = 'Review your AI NSFW tool listing on Erogram before checkout.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/add/ainsfw/preview`,
    type: 'website',
  }),
};

export default function AINSFWPreviewPage() {
  return (
    <Suspense fallback={<div className="ainsfw-bg min-h-screen" />}>
      <AINSFWPreviewClient />
    </Suspense>
  );
}
