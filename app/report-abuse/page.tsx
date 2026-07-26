import { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import ReportAbuseClient from './ReportAbuseClient';

const title = 'Report Abuse – erogram.pro';
const description =
  'Report policy violations, illegal content, or abuse on erogram.pro. All reports are confidential and reviewed promptly.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/report-abuse` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/report-abuse`,
    type: 'website',
  }),
};

export default function ReportAbusePage() {
  return <ReportAbuseClient />;
}
