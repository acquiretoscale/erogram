import Link from 'next/link';
import OFMNav from '../OFMNav';
import LegalBlacklistPanel from '@/app/OF/components/LegalBlacklistPanel';

export default function OFMLegalPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <OFMNav active="legal" />
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-4">
        <p className="text-white/40 text-xs">
          Same blocklist as{' '}
          <Link href="/OF/legal" className="text-[#00AFF0] hover:underline">
            OF Admin Legal
          </Link>
          . Enforced on all scrape and import paths.
        </p>
        <LegalBlacklistPanel variant="full" />
      </div>
    </div>
  );
}
