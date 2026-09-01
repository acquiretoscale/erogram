import type { Metadata } from 'next';
import ImageToVideoClient from './ImageToVideoClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Image to Video | Erogram';
const description = 'Turn a photo into a short AI video clip.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/image-to-video`,
    type: 'website',
  }),
};

export default function ImageToVideoPage() {
  return <ImageToVideoClient />;
}
