import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AddClient from '@/app/add/AddClient';
import { filterCategories, filterCountries } from '@/app/groups/constants';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Submit Telegram Bot | Erogram';
const description = 'List your Telegram bot on the Erogram directory. Normal listing or instant approval with boost options.';

export const metadata: Metadata = {
  title,
  description,
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/add/bot`,
    type: 'website',
  }),
};

export default function AddBotPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <AddClient categories={filterCategories} countries={filterCountries} defaultTab="bot" />
    </div>
  );
}
