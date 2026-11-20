export type OfferKind = 'LISTING' | 'BANNER' | 'BLOG POST';

export type MediaKitOfferRow = {
  num: number;
  offerKind: OfferKind;
  name: string;
  placement: string;
  period: string;
  included: string;
  price: string;
  availability: string;
};

export type MediaKitFaqItem = {
  q: string;
  a: string;
};

export type MediaKitPerformancePack = {
  title: string;
  price: string;
  intro: string;
  slots: string;
  bullets: string[];
  /** Visits, CPC, discount — shown in bottom pricing block. */
  footerLines: string[];
};

export type MediaKitContent = {
  listingOffers: MediaKitOfferRow[];
  otherOffers: MediaKitOfferRow[];
  performancePacks: MediaKitPerformancePack[];
  faq: MediaKitFaqItem[];
};