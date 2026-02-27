import type { Metadata } from 'next';
import MediaKitClient from './MediaKitClient';

export const metadata: Metadata = {
  title: 'Media Kit | Erogram.pro',
  description: 'Erogram.pro advertising rates, packages, and live audience data for advertising partners.',
};

export default function AdvertisePage() {
  return <MediaKitClient />;
}
