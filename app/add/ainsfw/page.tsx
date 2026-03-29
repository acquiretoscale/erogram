import { Metadata } from 'next';
import AINSFWPricingClient from './AINSFWPricingClient';

export const metadata: Metadata = {
  title: 'Add AI NSFW Tool | Erogram',
  description: 'List your AI NSFW tool on Erogram. Get featured placement, instant approval, and reach 400K+ monthly visitors.',
};

export default function AddAINSFWPage() {
  return <AINSFWPricingClient />;
}
