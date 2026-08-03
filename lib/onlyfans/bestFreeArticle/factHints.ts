import type { BestFreeCreatorFacts } from './types';

/** Hints for writers: empty DB fields. Do not invent copy for these. */
export function missingFactHints(facts: BestFreeCreatorFacts): string[] {
  const hints: string[] = [];
  if (!facts.photosCount && !facts.videosCount && !facts.mediaCount) {
    hints.push('Post count not in our index. Do not invent volume.');
  }
  if (!facts.joinDate) hints.push('Join date unknown.');
  if (!facts.location) hints.push('Location not listed.');
  if (!facts.bioHandwritten && !facts.bioDb) hints.push('No bio on file. Write from categories + likes only.');
  return hints;
}
