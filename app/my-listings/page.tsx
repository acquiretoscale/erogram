import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MyListingsClient from './MyListingsClient';

export const metadata: Metadata = {
  title: 'Manage Your Campaigns | Erogram',
  robots: { index: false, follow: false },
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
