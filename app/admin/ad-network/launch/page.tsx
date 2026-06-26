'use client';

import AdvertisersTab from '../../components/AdvertisersTab';
import AdNetworkNav from '../AdNetworkNav';

// Launch = create / edit ad campaigns. Reuses the existing feed-ad launcher
// (the same form used in /advertisers), now in its own Ad Network page.
export default function AdNetworkLaunchPage() {
  return (
    <div className="space-y-5">
      <AdNetworkNav />
      <AdvertisersTab initialSection="feedAds" hideSectionTabs openFormOnMount />
    </div>
  );
}
