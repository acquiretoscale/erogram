/**
 * WRITING MODEL: fill this file.
 *
 * Page: http://127.0.0.1:3939/onlyfanssearch/best
 * Voice: /submit + ainsfw. Direct. No poetry. No em dashes.
 *
 * Per creator (20 total, usernames from buildBestFreeArticleRanking):
 *   tagline       - short niche label after name (NOT emoji spam)
 *   intro         - 80-120 words. Start from facts.bioHandwritten or facts.bioDb when present.
 *   whatYouGet    - 3 bullets. Verifiable only.
 *   worthChecking - 3 bullets. Upsells OK if standard OF behavior (PPV, custom).
 *   whyOnList     - 2-4 sentences. Why she ranks on Erogram free list.
 *   bestFor       - one line: "Best for: ..."
 *   headsUp       - 1-3 real caveats (free + PPV, sparse posts, etc.). NO fake "follower count missing".
 *   tip           - one line CTA to open Erogram profile before subscribing on OF.
 *
 * Banned: captivating, magnetic, tantalizing, "not just another model", "breath of fresh air",
 *         "replies to every message" unless in bio source, invented ages, invented TOP 10 claims.
 *
 * Links (auto-rendered, do not duplicate in copy):
 *   profileUrl = /{username}-onlyfans
 *
 * Run buildBestFreeArticleRanking once to see which usernames land in top 20, then add keys below.
 */
import type { BestFreeArticleCopy } from './types';

export const bestFreeArticleCopy: BestFreeArticleCopy = {
  h1: '',
  introParagraphs: [],
  outroParagraphs: [],
  authorName: 'Enzo Delacroix',
  authorTitle: 'Chief Editor, Erogram',
  authorBio: '',
  creators: {
    // example:
    // shayerivers: {
    //   tagline: 'Free redhead with 2.7M likes',
    //   intro: '...',
    //   whatYouGet: ['...', '...', '...'],
    //   worthChecking: ['...', '...', '...'],
    //   whyOnList: '...',
    //   bestFor: 'Fans who want a top-tier free page that still posts regularly.',
    //   headsUp: ['Free sub does not mean zero PPV.'],
    //   tip: 'Open her Erogram profile first to see style and tags before you subscribe on OnlyFans.',
    // },
  },
};
