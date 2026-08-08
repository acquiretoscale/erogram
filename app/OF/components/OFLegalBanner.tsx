'use client';

import { usePathname } from 'next/navigation';
import LegalBlacklistPanel from './LegalBlacklistPanel';

export default function OFLegalBanner() {
  const pathname = usePathname();
  if (pathname === '/OF/legal') return null;
  return (
    <div className="mb-6">
      <LegalBlacklistPanel variant="banner" />
    </div>
  );
}
