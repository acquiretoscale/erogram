import hashtagsGte10Data from './hashtagsGte10.json';

/** Hashtags used by at least 10 creators — safe to show on profile pages. Bio text untouched in DB. */
const VISIBLE_HASHTAGS = new Set(Object.keys(hashtagsGte10Data.slugs));

export const MIN_HASHTAG_CREATOR_COUNT = hashtagsGte10Data.minCreators;

/** Extract every #hashtag slug from bio (includes rare tags — use for audits/scripts only). */
export function extractBioHashtagSlugs(bio: string): string[] {
  return extractBioHashtagSlugsInternal(bio, false);
}

/** Extract #hashtag slugs that 10+ creators use — for frontend profile tag pills only. */
export function extractVisibleBioHashtagSlugs(bio: string): string[] {
  return extractBioHashtagSlugsInternal(bio, true);
}

function extractBioHashtagSlugsInternal(bio: string, visibleOnly: boolean): string[] {
  if (!bio) return [];
  const re = /#([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]+)/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(bio)) !== null) {
    const slug = m[1].toLowerCase().replace(/_/g, '-');
    if (!slug || seen.has(slug)) continue;
    if (visibleOnly && !VISIBLE_HASHTAGS.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}
