import { Metadata } from 'next';
import AINSFWPricingClient from './AINSFWPricingClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Add AI NSFW Tool | Erogram';
const description = 'List your AI NSFW tool on Erogram. Get featured placement, instant approval, and reach 400K+ monthly visitors.';

export const metadata: Metadata = {
  title,
  description,
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/add/ainsfw`,
    type: 'website',
  }),
};

export default function AddAINSFWPage() {
  return <AINSFWPricingClient />;
}
