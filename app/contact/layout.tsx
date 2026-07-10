import type { Metadata } from 'next';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Contact — Erogram';
const description = 'Get in touch with Erogram support, advertising, and content removal teams.';

export const metadata: Metadata = {
  title,
  description,
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/contact`,
    type: 'website',
  }),
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
