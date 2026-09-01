import type { Metadata } from 'next';
import ArchiveClient from './ArchiveClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Generation Archive | Erogram';
const description = 'View your past image and video generations.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/image-to-video/archive`,
    type: 'website',
  }),
};

export default function ImageToVideoArchivePage() {
  return <ArchiveClient />;
}
