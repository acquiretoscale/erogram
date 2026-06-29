'use client';

import { use } from 'react';
import OFMModelDetail from './OFMModelDetail';

export default function ModelDetailPage({ params }: { params: Promise<{ agency: string; model: string }> }) {
  const { agency, model } = use(params);
  return <OFMModelDetail agencySlug={agency} modelSlug={model} />;
}
