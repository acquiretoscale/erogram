import type { Metadata } from 'next';
import PremiumClient from './PremiumClient';

export const metadata: Metadata = {
  title: 'Upgrade to Premium | Erogram.pro',
  description: 'Unlock the Erogram Private Vault — hundreds of hand-picked Telegram groups, unlimited bookmarks, custom folders, and early access to new features.',
};

export default function PremiumPage() {
  return <PremiumClient />;
}
