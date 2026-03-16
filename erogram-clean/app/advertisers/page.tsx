import type { Metadata } from 'next';
import AdvertiserPortal from './AdvertiserPortal';

export const metadata: Metadata = {
  title: 'Advertiser Portal | Erogram.pro',
  description: 'Exclusive dashboard for Erogram.pro advertising partners. View your campaign performance, click stats, and ROI in real time.',
};

export default function AdvertisersPage() {
  return <AdvertiserPortal />;
}
