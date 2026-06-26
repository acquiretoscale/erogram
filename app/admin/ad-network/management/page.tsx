'use client';

import AdNetworkClient from '../AdNetworkClient';
import AdNetworkNav from '../AdNetworkNav';

// Management = launch / pause / edit ads, organized by tier. Its own real URL.
export default function AdNetworkManagementPage() {
  return (
    <div className="space-y-5">
      <AdNetworkNav />
      <AdNetworkClient />
    </div>
  );
}
