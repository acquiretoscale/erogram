import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AddClient from '@/app/add/AddClient';
import { filterCategories, filterCountries } from '@/app/groups/constants';

export const metadata: Metadata = {
  title: 'Submit Telegram Bot | Erogram',
  description: 'List your Telegram bot on the Erogram directory. Normal listing or instant approval with boost options.',
};

export default function AddBotPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <AddClient categories={filterCategories} countries={filterCountries} defaultTab="bot" />
    </div>
  );
}
