import type { Metadata } from 'next';
import VideoAdsClient from './VideoAdsClient';

export const metadata: Metadata = {
  title: 'Video Ads',
  robots: { index: false, follow: false },
};

export default function VideoAdsPage() {
  return <VideoAdsClient />;
}
