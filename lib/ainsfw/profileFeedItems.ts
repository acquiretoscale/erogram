import { getToolBySlug } from '@/app/ainsfw/data';
import { AINSFW_TOOL_PREVIEW_VIDEOS } from '@/lib/ainsfw/toolPreviewVideos';

export type AinsfwProfileFeedStub = {
  mediaKey: string;
  type: 'video';
  url: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  profileCategories: { slug: string; label: string }[];
  categoryLabel: string;
  source: 'ainsfw';
  brandLogo: string;
  toolSlug: string;
  tryNowUrl: string;
};

function categorySlug(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
}

function mediaKeyFor(slug: string, url: string) {
  return `ainsfw:${slug}:video:${url}`;
}

function creatorIdFor(slug: string) {
  return `ainsfw:${slug}`;
}

/** AINSFW tools with preview videos — always eligible for profile feed (all users, all interest categories). */
export function getAinsfwProfileFeedStubs(): AinsfwProfileFeedStub[] {
  const items: AinsfwProfileFeedStub[] = [];

  for (const [slug, video] of Object.entries(AINSFW_TOOL_PREVIEW_VIDEOS)) {
    const tool = getToolBySlug(slug);
    if (!tool || !video.mp4?.startsWith('http')) continue;

    const catSlug = categorySlug(tool.category);
    items.push({
      mediaKey: mediaKeyFor(slug, video.mp4),
      type: 'video',
      url: video.mp4,
      creatorId: creatorIdFor(slug),
      creatorName: tool.name,
      creatorUsername: slug,
      profileCategories: [
        { slug: 'ai-nsfw', label: 'AI NSFW' },
        { slug: catSlug, label: tool.category },
      ],
      categoryLabel: tool.category,
      source: 'ainsfw',
      brandLogo: tool.image,
      toolSlug: slug,
      tryNowUrl: tool.tryNowUrl,
    });
  }

  return items;
}

export function parseAinsfwMediaKey(mediaKey: string): { slug: string; url: string } | null {
  if (!mediaKey.startsWith('ainsfw:')) return null;
  const first = mediaKey.indexOf(':');
  const second = mediaKey.indexOf(':video:');
  if (first < 0 || second < 0) return null;
  const slug = mediaKey.slice(first + 1, second);
  const url = mediaKey.slice(second + ':video:'.length);
  if (!slug || !url.startsWith('http')) return null;
  return { slug, url };
}
