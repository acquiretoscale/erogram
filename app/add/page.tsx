import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AddClient from './AddClient';
import { categories, countries } from '@/app/groups/constants';

export const metadata: Metadata = {
  title: 'Add Group or Bot | Erogram',
  description: 'Submit your Telegram group or bot for moderation. No login required.',
};

export default function AddPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <AddClient categories={categories} countries={countries} />
    </div>
  );
}
