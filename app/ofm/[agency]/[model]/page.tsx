'use client';

import { use } from 'react';
import OFMNav from '../../OFMNav';
import OFMModelDetail from './OFMModelDetail';

export default function ModelDetailPage({ params }: { params: Promise<{ agency: string; model: string }> }) {
  const { agency, model } = use(params);
  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      <OFMNav active="dashboard" />
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <OFMModelDetail agencySlug={agency} modelSlug={model} />
      </div>
    </div>
  );
}
