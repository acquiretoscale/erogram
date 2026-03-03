import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AddClient from './AddClient';
import { filterCategories, filterCountries } from '@/app/groups/constants';

export const metadata: Metadata = {
  title: 'Add Group or Bot | Erogram',
  description: 'Submit your Telegram group or bot to Erogram.pro for free. Get listed in the largest NSFW Telegram directory and reach thousands of active users. No login required — fast review and approval.',
};

export default function AddPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <AddClient categories={filterCategories} countries={filterCountries} />
    </div>
  );
}
