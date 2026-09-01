import SubmitLandingPage from './SubmitLandingPage';
import { getErogramReachStats } from '@/lib/submit/erogramReachStats';

export default async function SubmitPage() {
  const stats = await getErogramReachStats();
  return <SubmitLandingPage {...stats} />;
}
