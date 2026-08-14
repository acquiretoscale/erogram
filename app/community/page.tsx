import { getCommunityMembers } from '@/lib/actions/communityMembers';
import CommunityClient from './CommunityClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Community Members | Erogram',
  description: 'Browse the Erogram community. See who recently joined the platform.',
  alternates: { canonical: `${CANONICAL_BASE}/community` },
  ...buildSocialMeta({
    title: 'Community Members | Erogram',
    description: 'Browse the Erogram community. See who recently joined the platform.',
    url: `${CANONICAL_BASE}/community`,
    type: 'website',
  }),
};

export default async function CommunityPage() {
  const initial = await getCommunityMembers(1);
  return (
    <>
      <Navbar />
      <CommunityClient initial={initial} />
      <div style={{ background: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)' }}>
        <Footer />
      </div>
    </>
  );
}
