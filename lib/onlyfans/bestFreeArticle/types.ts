/** Facts from DB + creatorBios. Never invent these in copy. */
export type BestFreeCreatorFacts = {
  rank: number;
  username: string;
  name: string;
  slug: string;
  avatar: string;
  likesCount: number;
  photosCount?: number;
  videosCount?: number;
  mediaCount?: number;
  joinDate?: string;
  location?: string;
  categories: string[];
  /** Raw bio from MongoDB */
  bioDb?: string;
  /** Hand-written bio from app/onlyfans/creatorBios.ts */
  bioHandwritten?: string;
  /** Public Erogram creator page */
  profileUrl: string;
  telegram?: string;
  priceLabel: 'Free';
};

/** Marketing copy per creator. Writing model fills lib/ofsearch/bestFreeArticle/copy.ts */
export type BestFreeCreatorCopy = {
  tagline: string;
  intro: string;
  whatYouGet: [string, string, string];
  worthChecking: [string, string, string];
  whyOnList: string;
  bestFor: string;
  /** Real caveats only. Use facts.missingFields hints, not fake "no follower count". */
  headsUp: string[];
  tip: string;
};

export type BestFreeCreatorEntry = {
  facts: BestFreeCreatorFacts;
  copy: BestFreeCreatorCopy | null;
};

export type BestFreeArticleCopy = {
  h1: string;
  introParagraphs: string[];
  outroParagraphs: string[];
  authorName: string;
  authorTitle: string;
  authorBio: string;
  /** Keyed by lowercase username */
  creators: Record<string, BestFreeCreatorCopy>;
};
