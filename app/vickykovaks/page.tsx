import EnzoGonzoClient from '@/app/enzogonzo/EnzoGonzoClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  title: 'Onlygram Beta',
};

export default function VickyKovaksPage() {
  return <EnzoGonzoClient requireAuth={false} slug="vickykovaks" />;
}
