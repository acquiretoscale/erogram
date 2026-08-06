/** Hub browse / search / category feed — items per page. */
export const OF_RESULTS_PAGE_SIZE = 12;

export type ProfilePremiumPriceFilter = 'all' | 'free' | 'paid';

export interface ProfilePremiumSearchFilters {
  price?: ProfilePremiumPriceFilter;
  minMedia?: number;
  minPrice?: number;
  maxPrice?: number;
  hasInstagram?: boolean;
  /** Recently added to Erogram (createdAt), not OF join date */
  joinWithinDays?: number;
  /** Each inner array = OR within silo; outer = AND across silos */
  nicheGroups?: string[][];
}
