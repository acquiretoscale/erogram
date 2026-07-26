import { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import ComplianceClient from './ComplianceClient';

const title = 'Record-Keeping & Content Compliance – erogram.pro';
const description =
  'Record-keeping and content compliance statement for erogram.pro, including the 18 U.S.C. 2257 exemption and our content standards.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/compliance` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/compliance`,
    type: 'website',
  }),
};

export default function CompliancePage() {
  return <ComplianceClient />;
}
