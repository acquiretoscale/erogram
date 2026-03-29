import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AddClient from '@/app/add/AddClient';
import { filterCategories, filterCountries } from '@/app/groups/constants';

export const metadata: Metadata = {
  title: 'Submit Telegram Group | Erogram',
  description: 'Add your Telegram group to the Erogram directory. Free listing or instant approval with boost options.',
};

export default function AddGroupPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <AddClient categories={filterCategories} countries={filterCountries} defaultTab="group" />
    </div>
  );
}
