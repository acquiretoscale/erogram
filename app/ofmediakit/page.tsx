import { Metadata } from 'next';
import OFMAdsClient from './OFMAdsClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const canonicalBase = CANONICAL_BASE;
const ofmTitle = 'OFM Boost — OnlyFans Ads on Erogram';
const ofmDescription =
  'Promote your OnlyFans on Erogram. Reach high-intent fans actively searching for creators.';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: ofmTitle,
  description:
    'OFM Boost: promote your OnlyFans on Erogram. Reach high-intent fans searching for creators. Keyword targeting, video & photo ads, Tier-1 & Tier-2 traffic.',
  alternates: { canonical: `${canonicalBase}/ofmediakit` },
  ...buildSocialMeta({
    title: ofmTitle,
    description: ofmDescription,
    url: `${canonicalBase}/ofmediakit`,
    type: 'website',
  }),
};

export default function OFMAdsPage() {
  return <OFMAdsClient />;
}
