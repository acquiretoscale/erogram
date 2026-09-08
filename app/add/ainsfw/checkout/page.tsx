import { Suspense } from 'react';
import { Metadata } from 'next';
import AINSFWCheckoutClient from './AINSFWCheckoutClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Choose AI NSFW Listing Package | Erogram';
const description = 'Choose a package and submit your AI NSFW tool listing on Erogram.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/add/ainsfw/checkout`,
    type: 'website',
  }),
};

export default function AINSFWCheckoutPage() {
  return (
    <Suspense fallback={<div className="ainsfw-bg min-h-screen" />}>
      <AINSFWCheckoutClient />
    </Suspense>
  );
}
