import VickyClient from './VickyClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Vicky AI — Your Personal Erogram Assistant';
const description = 'Chat with Vicky, your personal Erogram AI assistant.';

export const metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/vicky`,
    type: 'website',
  }),
};

export default function VickyPage() {
  return <VickyClient />;
}
