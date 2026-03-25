import connectDB from '@/lib/db/mongodb';
import { SiteConfig } from '@/lib/models';

/** Public: get filter button (text + url) for sidebar. No auth. */
export async function getFilterButton(): Promise<{ text: string; url: string }> {
  await connectDB();
  const doc = await SiteConfig.findOne().select('filterButton').lean();
  const fb = (doc as any)?.filterButton;
  return { text: fb?.text ?? '', url: fb?.url ?? '' };
}

/** Story category config shape stored in generalSettings.storyCategories */
export interface StoryCategoryConfig {
  slug: string;
  label: string;
  enabled: boolean;
  profileImage: string;
  filterType: 'erogram' | 'random-girl' | 'advert' | 'creators';
  filterValue: string;
  sortOrder: number;
  maxItems?: number;
  ctaText?: string;
  ctaUrl?: string;
  verified?: boolean;
  /** R2 subfolder path for background videos, e.g. "stories/AI-GF" */
  r2Folder?: string;
  /** Specific creator slugs to feature (for creators filterType) */
  creatorSlugs?: string[];
}

/** Public: get enabled story categories from SiteConfig. No auth.
 *  If admin has saved categories, uses exactly those (deleted defaults stay deleted).
 *  Falls back to DEFAULT_STORY_CATEGORIES only if nothing is saved yet.
 */
export async function getStoryCategories(): Promise<StoryCategoryConfig[]> {
  await connectDB();
  const doc = await SiteConfig.findOne().select('generalSettings').lean();
  const gs = (doc as any)?.generalSettings;
  const dbCats: StoryCategoryConfig[] = Array.isArray(gs?.storyCategories) ? gs.storyCategories : [];

  // Merge: start with saved categories, inject any missing defaults
  const merged = dbCats.length > 0 ? [...dbCats] : [];
  const existingSlugs = new Set(merged.map(c => c.slug));
  for (const def of DEFAULT_STORY_CATEGORIES) {
    if (!existingSlugs.has(def.slug)) merged.push(def);
  }

  if (merged.length === 0) {
    return DEFAULT_STORY_CATEGORIES
      .filter(c => c.enabled)
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }

  return merged
    .filter(c => c?.slug && c.enabled)
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

/** Default story categories — the 4 fixed story circles */
export const DEFAULT_STORY_CATEGORIES: StoryCategoryConfig[] = [
  { slug: 'erogram', label: 'EROGRAM', enabled: true, profileImage: '', filterType: 'erogram', filterValue: '', sortOrder: 0, maxItems: 6, verified: true, r2Folder: 'tgempire/instabaddies' },
  { slug: 'of-creators', label: 'OnlyFans', enabled: true, profileImage: '', filterType: 'creators', filterValue: '', sortOrder: 1, maxItems: 30, verified: true, r2Folder: 'tgempire/instabaddies' },
  { slug: 'random-girl-1', label: 'Vicky', enabled: true, profileImage: '', filterType: 'random-girl', filterValue: '', sortOrder: 2, maxItems: 3, r2Folder: 'tgempire/instabaddies' },
  { slug: 'ai-gf', label: 'AI GF', enabled: true, profileImage: '', filterType: 'advert', filterValue: '', sortOrder: 3, maxItems: 4, ctaText: 'Try AI Girlfriend', ctaUrl: '/bots', r2Folder: 'stories/AI-GF' },
  { slug: 'random-girl-2', label: 'Carla', enabled: true, profileImage: '', filterType: 'random-girl', filterValue: '', sortOrder: 4, maxItems: 3, r2Folder: 'tgempire/instabaddies' },
];

/** Public: get top banner (image + link). No auth. Used by Groups/Bots/Articles etc. */
export async function getTopBanner(): Promise<{ imageUrl: string; url: string }> {
  await connectDB();
  const doc = await SiteConfig.findOne().select('topBanner').lean();
  const tb = (doc as any)?.topBanner;
  return { imageUrl: tb?.imageUrl ?? '', url: tb?.url ?? '' };
}
