import type { Metadata } from 'next';
import AINSFWListingsClient from './AINSFWListingsClient';

export const metadata: Metadata = {
  title: 'My AI NSFW Listings | Erogram',
  robots: { index: false, follow: false },
};

export default function AINSFWListingsPage() {
  return <AINSFWListingsClient />;
}
