import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import AddClient from '@/app/add/AddClient';
import { filterCategories, filterCountries } from '@/app/groups/constants';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Submit Telegram Group | Erogram';
const description = 'Add your Telegram group to the Erogram directory. Free listing or instant approval with boost options.';

export const metadata: Metadata = {
  title,
  description,
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/add/group`,
    type: 'website',
  }),
};

export default function AddGroupPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <AddClient categories={filterCategories} countries={filterCountries} defaultTab="group" />
    </div>
  );
}
