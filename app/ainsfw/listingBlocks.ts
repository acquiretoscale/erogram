/** Pros, cons, and key features for paid + verified + editorial-reviewed AINSFW listings. */
export interface AINsfwListingBlocks {
  pros?: string[];
  cons?: string[];
  keyFeatures?: string[];
  bestFor?: string;
  notIdealFor?: string;
}

export const AINSFW_LISTING_BLOCKS: Record<string, AINsfwListingBlocks> = {
  'girlfriendgpt-ai-girlfriend': {
    bestFor: 'Privacy-focused users who will accept uneven output for anonymous crypto billing',
    notIdealFor: 'Anyone who expects images to match the character they just built',
  },
  'joi-ai-nude-generator': {
    bestFor: 'Casual users dipping in for short, light conversations',
    notIdealFor: 'Anyone settling in for a long session, or wanting genuinely unrestricted roleplay',
  },
  'nudiva-undress-ai': {
    bestFor: 'Users who want fast undress results on phone via Telegram without a subscription',
    notIdealFor: 'Anyone who needs hand-tuned editing on every render',
  },
  'genesis-porn-ai-image': {
    bestFor: 'Creators who want preset-driven control and a shared settings library',
    notIdealFor: 'Anyone expecting unlimited free generation out of the box',
  },
  'free-nudifier-undress-ai': {
    bestFor: 'First-time undress testers who want a free, no-account door',
    notIdealFor: 'Heavy users who need video and pose packs without buying credits',
  },
  'porncreate-undress-ai': {
    bestFor: 'Creators who want undress, face swap, and video in one browser workflow',
    notIdealFor: 'Anyone who needs unlimited output before buying diamonds',
  },
  'lovescape-ai-girlfriend': {
    keyFeatures: [
      'Photorealistic 2K and 4K image generation',
      'Video generation with native sound, 720p to 1080p',
      'Relationship progression system, dating sim style',
      'Around 350,000 community created characters',
      'Character backstories up to 6,000 words',
      'Voice messages and real time voice calls',
      'NSFW mode with realistic and anime styles',
      'Creator revenue sharing up to 30%',
      'Six chat languages: EN, DE, FR, IT, ES, JA',
      'Discreet billing descriptor',
    ],
    bestFor: 'Users who want visuals, voice, and a companion that develops over weeks',
    notIdealFor: 'Anyone who wants a minimal text-only chatbot with nothing to install',
  },
};

export function getListingBlocks(slug: string): AINsfwListingBlocks | undefined {
  return AINSFW_LISTING_BLOCKS[slug];
}

export function hasListingBlocks(slug: string): boolean {
  return slug in AINSFW_LISTING_BLOCKS;
}

export function hasProsCons(slug: string): boolean {
  const blocks = AINSFW_LISTING_BLOCKS[slug];
  if (!blocks) return false;
  return (blocks.pros?.length ?? 0) > 0 || (blocks.cons?.length ?? 0) > 0;
}
