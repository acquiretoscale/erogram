import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MyListingsClient from './MyListingsClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Manage Your Campaigns | Erogram';
const description = 'Manage your Erogram listings and advertising campaigns.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/my-listings`,
    type: 'website',
  }),
};

export default function MyListingsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />
      <MyListingsClient />
      <Footer />
    </div>
  );
}
