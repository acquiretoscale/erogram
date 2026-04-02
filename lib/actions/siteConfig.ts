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
  filterType: 'erogram' | 'random-girl' | 'advert';
  filterValue: string;
  sortOrder: number;
  maxItems?: number;
  ctaText?: string;
  ctaUrl?: string;
  ctaPosition?: 'top' | 'middle' | 'bottom';
  ctaColor?: string;
  verified?: boolean;
  /** R2 subfolder path for background videos, e.g. "stories/AI-GF" */
  r2Folder?: string;
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

  // If admin has saved categories, use exactly what they saved
  if (dbCats.length > 0) {
    return dbCats
      .filter(c => c?.slug && c.enabled)
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }

  // No saved categories yet — use defaults
  return DEFAULT_STORY_CATEGORIES
    .filter(c => c.enabled)
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

/** Default story categories — the 4 fixed story circles */
export const DEFAULT_STORY_CATEGORIES: StoryCategoryConfig[] = [
  { slug: 'erogram', label: 'EROGRAM', enabled: true, profileImage: '', filterType: 'erogram', filterValue: '', sortOrder: 0, maxItems: 6, verified: true, r2Folder: 'stories/AI-GF' },
  { slug: 'random-girl-1', label: 'Vicky', enabled: true, profileImage: '', filterType: 'random-girl', filterValue: '', sortOrder: 1, maxItems: 3, r2Folder: 'tgempire/instabaddies' },
  { slug: 'ai-gf', label: 'AI GF', enabled: true, profileImage: '', filterType: 'advert', filterValue: '', sortOrder: 2, maxItems: 4, ctaText: 'Try AI Girlfriend', ctaUrl: '/bots', r2Folder: 'stories/AI-GF' },
  { slug: 'random-girl-2', label: 'Carla', enabled: true, profileImage: '', filterType: 'random-girl', filterValue: '', sortOrder: 3, maxItems: 3, r2Folder: 'tgempire/instabaddies' },
];

/** Public: get top banner (image + link). No auth. Used by Groups/Bots/Articles etc. */
export async function getTopBanner(): Promise<{ imageUrl: string; url: string }> {
  await connectDB();
  const doc = await SiteConfig.findOne().select('topBanner').lean();
  const tb = (doc as any)?.topBanner;
  return { imageUrl: tb?.imageUrl ?? '', url: tb?.url ?? '' };
}
