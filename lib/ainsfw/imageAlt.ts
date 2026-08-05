/** Turn a tool tag into a hashtag alt fragment, e.g. "ai girlfriend" → "#ai-girlfriend". */
export function tagToHashtag(tag: string): string {
  const slug = tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug ? `#${slug}` : '#ai-nsfw';
}

/** Pick a tag hashtag alt for an image index (rotates through tool tags). */
export function pickTagHashtagAlt(tags: string[] | undefined, index = 0): string {
  if (!tags?.length) return '#ai-nsfw';
  return tagToHashtag(tags[Math.abs(index) % tags.length]);
}
