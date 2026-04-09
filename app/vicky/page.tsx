import VickyClient from './VickyClient';

export const metadata = {
  title: 'Vicky AI — Your Personal Erogram Assistant',
  robots: { index: false, follow: false },
};

export default function VickyPage() {
  return <VickyClient />;
}
