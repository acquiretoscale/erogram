import type { Metadata } from 'next';
import MediaKitClient from './MediaKitClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Media Kit | Erogram.pro';
const description = 'Advertise on Erogram.pro — the largest NSFW Telegram directory. View live audience stats, ad packages, pricing, and reach thousands of engaged adult users daily. Media kit for advertising partners.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/promo`,
    type: 'website',
  }),
};

export default function AdvertisePage() {
  return <MediaKitClient />;
}
