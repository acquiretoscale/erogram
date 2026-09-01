import SubmitLandingPage from '@/app/submit/SubmitLandingPage';
import { getErogramReachStats } from '@/lib/submit/erogramReachStats';

export default async function OfmAgenciesPage() {
  const stats = await getErogramReachStats();
  return <SubmitLandingPage variant="ofm-agencies" {...stats} />;
}
