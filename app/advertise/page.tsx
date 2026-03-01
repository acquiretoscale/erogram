import type { Metadata } from 'next';
import MediaKitClient from './MediaKitClient';

export const metadata: Metadata = {
  title: 'Media Kit | Erogram.pro',
  description: 'Advertise on Erogram.pro — the largest NSFW Telegram directory. View live audience stats, ad packages, pricing, and reach thousands of engaged adult users daily. Media kit for advertising partners.',
};

export default function AdvertisePage() {
  return <MediaKitClient />;
}
