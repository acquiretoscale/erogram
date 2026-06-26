'use client';

import AdvertisersTab from '../components/AdvertisersTab';
import AdNetworkNav from './AdNetworkNav';

// Overview = ALL your ad numbers in one place. Reuses the existing tracking dashboard.
export default function AdNetworkOverviewPage() {
  return (
    <div className="space-y-5">
      <AdNetworkNav />
      <AdvertisersTab initialSection="overview" hideSectionTabs />
    </div>
  );
}
