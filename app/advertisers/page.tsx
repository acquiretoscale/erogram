import type { Metadata } from 'next';
import AdvertiserPortal from './AdvertiserPortal';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Advertiser Portal | Erogram.pro';
const description = 'Exclusive dashboard for Erogram.pro advertising partners. View your campaign performance, click stats, and ROI in real time.';

export const metadata: Metadata = {
  title,
  description,
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/advertisers`,
    type: 'website',
  }),
};

export default function AdvertisersPage() {
  return <AdvertiserPortal />;
}
