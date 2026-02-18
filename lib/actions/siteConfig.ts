import connectDB from '@/lib/db/mongodb';
import { SiteConfig } from '@/lib/models';

/** Public: get filter button (text + url) for sidebar. No auth. */
export async function getFilterButton(): Promise<{ text: string; url: string }> {
  await connectDB();
  const doc = await SiteConfig.findOne().select('filterButton').lean();
  const fb = (doc as any)?.filterButton;
  return { text: fb?.text ?? '', url: fb?.url ?? '' };
}

/** Public: get top banner (image + link). No auth. Used by Groups/Bots/Articles etc. */
export async function getTopBanner(): Promise<{ imageUrl: string; url: string }> {
  await connectDB();
  const doc = await SiteConfig.findOne().select('topBanner').lean();
  const tb = (doc as any)?.topBanner;
  return { imageUrl: tb?.imageUrl ?? '', url: tb?.url ?? '' };
}
