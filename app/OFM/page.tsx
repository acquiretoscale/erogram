import { Metadata } from 'next';
import OFMAdsClient from './OFMAdsClient';

const canonicalBase = 'https://erogram.pro';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'OFM Boost — OnlyFans Ads on Erogram',
  description:
    'OFM Boost: promote your OnlyFans on Erogram. Reach high-intent fans searching for creators. Keyword targeting, video & photo ads, Tier-1 & Tier-2 traffic.',
  alternates: { canonical: `${canonicalBase}/OFM` },
  openGraph: {
    title: 'OFM Boost — OnlyFans Ads on Erogram',
    description:
      'Promote your OnlyFans on Erogram. Reach high-intent fans actively searching for creators.',
    type: 'website',
    url: `${canonicalBase}/OFM`,
    siteName: 'Erogram',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OFM Boost — OnlyFans Ads on Erogram',
    description:
      'Promote your OnlyFans on Erogram. Reach high-intent fans actively searching for creators.',
  },
};

export default function OFMAdsPage() {
  return <OFMAdsClient />;
}
