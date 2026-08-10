/**
 * Category clusters for Top-10 interlinking (best-onlyfans-accounts/{slug}, top-10-*).
 * SOURCE OF TRUTH: tmp/CATEGORY-AUDIT-40PLUS.md — bio keywords with 40+ creator mentions ONLY.
 * NO invented terms. No MENA, no region labels not in bios.
 * terms[] = real bio hits + creator counts from scrape audit 2026-08-01.
 */

export interface BioTermHit {
  term: string;
  /** Creators with this word in bio (audit 2026-08-01) */
  creators: number;
}

export interface CategoryCluster {
  id: string;
  primarySlug: string;
  /** Live Top-10 slugs to interlink (NOT /best/{slug} — that path does not exist) */
  slugs: readonly string[];
  /** Bio keywords from scrape audit — not invented */
  terms: readonly BioTermHit[];
}

export const CATEGORY_CLUSTERS: readonly CategoryCluster[] = [
  {
    id: "colombian",
    primarySlug: "colombian",
    slugs: [
      "colombian",
      "latina"
    ],
    terms: [
      {
        term: "colombia",
        creators: 154
      },
      {
        term: "colombian",
        creators: 133
      },
      {
        term: "latina",
        creators: 1060
      }
    ]
  },
  {
    id: "asian",
    primarySlug: "asian",
    slugs: [
      "asian",
      "japanese",
      "taiwanese",
      "thai"
    ],
    terms: [
      {
        term: "asian",
        creators: 231
      },
      {
        term: "japan",
        creators: 61
      },
      {
        term: "japanese",
        creators: 47
      },
      {
        term: "taiwan",
        creators: 85
      },
      {
        term: "thai",
        creators: 48
      }
    ]
  },
  {
    id: "blonde",
    primarySlug: "blonde",
    slugs: [
      "blonde"
    ],
    terms: [
      {
        term: "blond",
        creators: 664
      },
      {
        term: "blonde",
        creators: 610
      }
    ]
  },
  {
    id: "redhead",
    primarySlug: "redhead",
    slugs: [
      "redhead"
    ],
    terms: [
      {
        term: "redhead",
        creators: 184
      },
      {
        term: "ginger",
        creators: 68
      }
    ]
  },
  {
    id: "tattoo",
    primarySlug: "tattoo",
    slugs: [
      "tattoo",
      "piercing",
      "alt",
      "goth",
      "goth-girl"
    ],
    terms: [
      {
        term: "tattoo",
        creators: 454
      },
      {
        term: "inked",
        creators: 91
      },
      {
        term: "tatted",
        creators: 77
      },
      {
        term: "alt",
        creators: 296
      },
      {
        term: "goth",
        creators: 349
      },
      {
        term: "gothic",
        creators: 43
      },
      {
        term: "emo",
        creators: 45
      }
    ]
  },
  {
    id: "big-ass",
    primarySlug: "big-ass",
    slugs: [
      "big-ass",
      "pawg",
      "big-booty",
      "thick",
      "chubby",
      "bbw"
    ],
    terms: [
      {
        term: "big ass",
        creators: 171
      },
      {
        term: "pawg",
        creators: 334
      },
      {
        term: "curvy",
        creators: 270
      },
      {
        term: "booty",
        creators: 410
      },
      {
        term: "curves",
        creators: 134
      },
      {
        term: "big booty",
        creators: 139
      },
      {
        term: "thick",
        creators: 279
      },
      {
        term: "thicc",
        creators: 66
      },
      {
        term: "bbw",
        creators: 123
      },
      {
        term: "chubby",
        creators: 56
      }
    ]
  },
  {
    id: "big-boobs",
    primarySlug: "big-boobs",
    slugs: [
      "big-boobs",
      "busty"
    ],
    terms: [
      {
        term: "big boobs",
        creators: 99
      },
      {
        term: "big tits",
        creators: 133
      },
      {
        term: "huge tits",
        creators: 68
      },
      {
        term: "busty",
        creators: 93
      }
    ]
  },
  {
    id: "influencer",
    primarySlug: "influencer",
    slugs: [
      "influencer",
      "streamer",
      "instagram",
      "e-girl",
      "gamer"
    ],
    terms: [
      {
        term: "influencer",
        creators: 44
      },
      {
        term: "tiktok",
        creators: 127
      },
      {
        term: "streamer",
        creators: 559
      },
      {
        term: "twitch",
        creators: 257
      },
      {
        term: "youtube",
        creators: 57
      },
      {
        term: "cosplayer",
        creators: 262
      },
      {
        term: "egirl",
        creators: 580
      }
    ]
  },
  {
    id: "british",
    primarySlug: "british",
    slugs: [
      "british"
    ],
    terms: [
      {
        term: "british",
        creators: 112
      },
      {
        term: "london",
        creators: 90
      }
    ]
  },
  {
    id: "arab",
    primarySlug: "arab",
    slugs: [
      "arab",
      "moroccan"
    ],
    terms: [
      {
        term: "morocco",
        creators: 54
      }
    ]
  },
  {
    id: "american",
    primarySlug: "american",
    slugs: [
      "american",
      "nevada",
      "georgia",
      "florida",
      "california",
      "texas",
      "new-york"
    ],
    terms: [
      {
        term: "miami",
        creators: 46
      },
      {
        term: "atlanta",
        creators: 73
      },
      {
        term: "vegas",
        creators: 88
      },
      {
        term: "las vegas",
        creators: 64
      },
      {
        term: "georgia",
        creators: 236
      }
    ]
  },
  {
    id: "brazilian",
    primarySlug: "brazilian",
    slugs: [
      "brazilian"
    ],
    terms: [
      {
        term: "brazil",
        creators: 75
      },
      {
        term: "brazilian",
        creators: 60
      }
    ]
  },
  {
    id: "german",
    primarySlug: "german",
    slugs: [
      "german"
    ],
    terms: [
      {
        term: "german",
        creators: 109
      },
      {
        term: "germany",
        creators: 72
      }
    ]
  },
  {
    id: "greek",
    primarySlug: "greek",
    slugs: [
      "greek"
    ],
    terms: [
      {
        term: "greek",
        creators: 46
      },
      {
        term: "greece",
        creators: 50
      }
    ]
  },
  {
    id: "australian",
    primarySlug: "australian",
    slugs: [
      "australian"
    ],
    terms: [
      {
        term: "australia",
        creators: 50
      }
    ]
  },
  {
    id: "turkish",
    primarySlug: "turkish",
    slugs: [
      "turkish"
    ],
    terms: [
      {
        term: "türk",
        creators: 97
      }
    ]
  },
  {
    id: "petite",
    primarySlug: "petite",
    slugs: [
      "petite"
    ],
    terms: [
      {
        term: "petite",
        creators: 574
      },
      {
        term: "thin",
        creators: 1135
      },
      {
        term: "small",
        creators: 174
      },
      {
        term: "tiny",
        creators: 125
      },
      {
        term: "slim",
        creators: 46
      },
      {
        term: "skinny",
        creators: 40
      }
    ]
  },
  {
    id: "milf",
    primarySlug: "milf",
    slugs: [
      "milf",
      "mommy"
    ],
    terms: [
      {
        term: "milf",
        creators: 478
      },
      {
        term: "mommy",
        creators: 247
      },
      {
        term: "mature",
        creators: 43
      }
    ]
  },
  {
    id: "teen",
    primarySlug: "teen",
    slugs: [
      "teen",
      "college",
      "college-girl"
    ],
    terms: [
      {
        term: "teen",
        creators: 120
      },
      {
        term: "student",
        creators: 100
      }
    ]
  },
  {
    id: "femdom",
    primarySlug: "femdom",
    slugs: [
      "femdom",
      "dominatrix",
      "findom"
    ],
    terms: [
      {
        term: "femdom",
        creators: 147
      },
      {
        term: "dominatrix",
        creators: 77
      },
      {
        term: "findom",
        creators: 122
      },
      {
        term: "mistress",
        creators: 126
      },
      {
        term: "domme",
        creators: 75
      },
      {
        term: "dominant",
        creators: 82
      }
    ]
  },
  {
    id: "submissive",
    primarySlug: "submissive",
    slugs: [
      "submissive"
    ],
    terms: [
      {
        term: "submissive",
        creators: 80
      },
      {
        term: "sub",
        creators: 213
      },
      {
        term: "slave",
        creators: 46
      }
    ]
  },
  {
    id: "cosplay",
    primarySlug: "cosplay",
    slugs: [
      "cosplay",
      "anime",
      "catgirl"
    ],
    terms: []
  },
  {
    id: "lesbian",
    primarySlug: "lesbian",
    slugs: [
      "lesbian",
      "couple-lesbian",
      "bisexual"
    ],
    terms: [
      {
        term: "lesbian",
        creators: 376
      }
    ]
  },
  {
    id: "feet",
    primarySlug: "feet",
    slugs: [
      "feet"
    ],
    terms: [
      {
        term: "feet",
        creators: 370
      },
      {
        term: "foot fetish",
        creators: 57
      }
    ]
  },
  {
    id: "squirt",
    primarySlug: "squirt",
    slugs: [
      "squirt"
    ],
    terms: [
      {
        term: "squirt",
        creators: 304
      },
      {
        term: "squirting",
        creators: 128
      }
    ]
  },
  {
    id: "bdsm",
    primarySlug: "bdsm",
    slugs: [
      "bdsm",
      "bondage",
      "latex"
    ],
    terms: [
      {
        term: "bdsm",
        creators: 103
      },
      {
        term: "bondage",
        creators: 40
      },
      {
        term: "latex",
        creators: 67
      },
      {
        term: "leather",
        creators: 43
      }
    ]
  },
  {
    id: "fitness",
    primarySlug: "fitness",
    slugs: [
      "fitness",
      "yoga"
    ],
    terms: [
      {
        term: "fitness",
        creators: 316
      },
      {
        term: "yoga",
        creators: 57
      }
    ]
  },
  {
    id: "ebony",
    primarySlug: "ebony",
    slugs: [
      "ebony"
    ],
    terms: [
      {
        term: "ebony",
        creators: 246
      }
    ]
  },
  {
    id: "joi",
    primarySlug: "joi",
    slugs: [
      "joi",
      "ahegao"
    ],
    terms: [
      {
        term: "joi",
        creators: 199
      },
      {
        term: "ahegao",
        creators: 368
      }
    ]
  },
  {
    id: "oral",
    primarySlug: "oral",
    slugs: [
      "oral"
    ],
    terms: [
      {
        term: "oral",
        creators: 51
      },
      {
        term: "blowjob",
        creators: 127
      }
    ]
  },
  {
    id: "lingerie",
    primarySlug: "lingerie",
    slugs: [
      "lingerie",
      "bikini",
      "stockings",
      "heels"
    ],
    terms: [
      {
        term: "lingerie",
        creators: 379
      },
      {
        term: "heels",
        creators: 77
      }
    ]
  },
  {
    id: "nude",
    primarySlug: "nude",
    slugs: [
      "nude"
    ],
    terms: []
  },
  {
    id: "fetish",
    primarySlug: "fetish",
    slugs: [
      "fetish"
    ],
    terms: [
      {
        term: "fetish",
        creators: 547
      }
    ]
  },
  {
    id: "model",
    primarySlug: "model",
    slugs: [
      "model"
    ],
    terms: []
  },
  {
    id: "solo",
    primarySlug: "solo",
    slugs: [
      "solo"
    ],
    terms: []
  },
  {
    id: "sexting",
    primarySlug: "sexting",
    slugs: [
      "sexting"
    ],
    terms: []
  },
  {
    id: "custom",
    primarySlug: "custom",
    slugs: [
      "custom"
    ],
    terms: []
  },
  {
    id: "onlyfans-free",
    primarySlug: "onlyfans-free",
    slugs: [
      "onlyfans-free"
    ],
    terms: []
  },
  {
    id: "brunette",
    primarySlug: "brunette",
    slugs: [
      "brunette"
    ],
    terms: [
      {
        term: "brunette",
        creators: 305
      }
    ]
  },
  {
    id: "celebrity",
    primarySlug: "celebrity",
    slugs: [
      "celebrity"
    ],
    terms: []
  },
  {
    id: "anal",
    primarySlug: "anal",
    slugs: [
      "anal"
    ],
    terms: [
      {
        term: "anal",
        creators: 419
      }
    ]
  },
  {
    id: "no-ppv",
    primarySlug: "no-ppv",
    slugs: [
      "no-ppv"
    ],
    terms: []
  },
  {
    id: "pornstar",
    primarySlug: "pornstar",
    slugs: [
      "pornstar"
    ],
    terms: [
      {
        term: "pornstar",
        creators: 100
      }
    ]
  },
  {
    id: "roleplay",
    primarySlug: "roleplay",
    slugs: [
      "roleplay"
    ],
    terms: [
      {
        term: "roleplay",
        creators: 94
      }
    ]
  },
  {
    id: "amateur",
    primarySlug: "amateur",
    slugs: [
      "amateur"
    ],
    terms: []
  },
  {
    id: "neighbor",
    primarySlug: "neighbor",
    slugs: [
      "neighbor"
    ],
    terms: []
  },
  {
    id: "couple",
    primarySlug: "couple",
    slugs: [
      "couple"
    ],
    terms: [
      {
        term: "couple",
        creators: 122
      }
    ]
  },
  {
    id: "dancer",
    primarySlug: "dancer",
    slugs: [
      "dancer"
    ],
    terms: []
  },
  {
    id: "natural",
    primarySlug: "natural",
    slugs: [
      "natural"
    ],
    terms: []
  },
  {
    id: "girl-next-door",
    primarySlug: "girl-next-door",
    slugs: [
      "girl-next-door"
    ],
    terms: []
  },
  {
    id: "video-call",
    primarySlug: "video-call",
    slugs: [
      "video-call"
    ],
    terms: []
  },
  {
    id: "hotwife",
    primarySlug: "hotwife",
    slugs: [
      "hotwife"
    ],
    terms: [
      {
        term: "hotwife",
        creators: 188
      }
    ]
  },
  {
    id: "dick-rating",
    primarySlug: "dick-rating",
    slugs: [
      "dick-rating"
    ],
    terms: []
  },
  {
    id: "pov",
    primarySlug: "pov",
    slugs: [
      "pov"
    ],
    terms: []
  },
  {
    id: "threesome",
    primarySlug: "threesome",
    slugs: [
      "threesome"
    ],
    terms: [
      {
        term: "threesome",
        creators: 70
      }
    ]
  },
  {
    id: "french",
    primarySlug: "french",
    slugs: [
      "french"
    ],
    terms: [
      {
        term: "french",
        creators: 50
      }
    ]
  },
  {
    id: "gfe",
    primarySlug: "gfe",
    slugs: [
      "gfe"
    ],
    terms: []
  },
  {
    id: "canadian",
    primarySlug: "canadian",
    slugs: [
      "canadian"
    ],
    terms: []
  },
  {
    id: "topless",
    primarySlug: "topless",
    slugs: [
      "topless"
    ],
    terms: []
  },
  {
    id: "shaved",
    primarySlug: "shaved",
    slugs: [
      "shaved"
    ],
    terms: []
  },
  {
    id: "italian",
    primarySlug: "italian",
    slugs: [
      "italian"
    ],
    terms: [
      {
        term: "italian",
        creators: 44
      }
    ]
  },
  {
    id: "argentinian",
    primarySlug: "argentinian",
    slugs: [
      "argentinian"
    ],
    terms: []
  },
  {
    id: "spanish",
    primarySlug: "spanish",
    slugs: [
      "spanish"
    ],
    terms: []
  },
  {
    id: "live-show",
    primarySlug: "live-show",
    slugs: [
      "live-show"
    ],
    terms: []
  },
  {
    id: "hairy",
    primarySlug: "hairy",
    slugs: [
      "hairy"
    ],
    terms: [
      {
        term: "hairy",
        creators: 41
      }
    ]
  },
  {
    id: "mexican",
    primarySlug: "mexican",
    slugs: [
      "mexican"
    ],
    terms: []
  },
  {
    id: "nurse",
    primarySlug: "nurse",
    slugs: [
      "nurse"
    ],
    terms: [
      {
        term: "nurse",
        creators: 56
      }
    ]
  },
  {
    id: "pregnant",
    primarySlug: "pregnant",
    slugs: [
      "pregnant"
    ],
    terms: []
  },
  {
    id: "chinese",
    primarySlug: "chinese",
    slugs: [
      "chinese"
    ],
    terms: []
  },
  {
    id: "bunny-girl",
    primarySlug: "bunny-girl",
    slugs: [
      "bunny-girl"
    ],
    terms: []
  },
  {
    id: "asmr",
    primarySlug: "asmr",
    slugs: [
      "asmr"
    ],
    terms: [
      {
        term: "asmr",
        creators: 46
      }
    ]
  },
  {
    id: "exotic",
    primarySlug: "exotic",
    slugs: [
      "exotic"
    ],
    terms: []
  },
  {
    id: "maid",
    primarySlug: "maid",
    slugs: [
      "maid"
    ],
    terms: []
  },
  {
    id: "scottish",
    primarySlug: "scottish",
    slugs: [
      "scottish"
    ],
    terms: []
  },
  {
    id: "ukrainian",
    primarySlug: "ukrainian",
    slugs: [
      "ukrainian"
    ],
    terms: []
  },
  {
    id: "persian",
    primarySlug: "persian",
    slugs: [
      "persian"
    ],
    terms: []
  },
  {
    id: "new-zealand",
    primarySlug: "new-zealand",
    slugs: [
      "new-zealand"
    ],
    terms: []
  },
  {
    id: "michigan",
    primarySlug: "michigan",
    slugs: [
      "michigan"
    ],
    terms: []
  },
  {
    id: "russian",
    primarySlug: "russian",
    slugs: [
      "russian"
    ],
    terms: []
  },
  {
    id: "romanian",
    primarySlug: "romanian",
    slugs: [
      "romanian"
    ],
    terms: []
  },
  {
    id: "polish",
    primarySlug: "polish",
    slugs: [
      "polish"
    ],
    terms: []
  },
  {
    id: "filipina",
    primarySlug: "filipina",
    slugs: [
      "filipina"
    ],
    terms: []
  },
  {
    id: "irish",
    primarySlug: "irish",
    slugs: [
      "irish"
    ],
    terms: []
  },
  {
    id: "colorado",
    primarySlug: "colorado",
    slugs: [
      "colorado"
    ],
    terms: []
  },
  {
    id: "swedish",
    primarySlug: "swedish",
    slugs: [
      "swedish"
    ],
    terms: []
  },
  {
    id: "finnish",
    primarySlug: "finnish",
    slugs: [
      "finnish"
    ],
    terms: []
  },
  {
    id: "dutch",
    primarySlug: "dutch",
    slugs: [
      "dutch"
    ],
    terms: []
  },
  {
    id: "norwegian",
    primarySlug: "norwegian",
    slugs: [
      "norwegian"
    ],
    terms: []
  },
  {
    id: "czech",
    primarySlug: "czech",
    slugs: [
      "czech"
    ],
    terms: []
  },
  {
    id: "chilean",
    primarySlug: "chilean",
    slugs: [
      "chilean"
    ],
    terms: []
  },
  {
    id: "illinois",
    primarySlug: "illinois",
    slugs: [
      "illinois"
    ],
    terms: []
  },
  {
    id: "puerto-rican",
    primarySlug: "puerto-rican",
    slugs: [
      "puerto-rican"
    ],
    terms: []
  },
  {
    id: "north-carolina",
    primarySlug: "north-carolina",
    slugs: [
      "north-carolina"
    ],
    terms: []
  },
  {
    id: "arizona",
    primarySlug: "arizona",
    slugs: [
      "arizona"
    ],
    terms: []
  },
  {
    id: "girlfriend",
    primarySlug: "girlfriend",
    slugs: [
      "girlfriend"
    ],
    terms: []
  },
  {
    id: "toys",
    primarySlug: "toys",
    slugs: [
      "toys"
    ],
    terms: [
      {
        term: "toys",
        creators: 170
      }
    ]
  },
  {
    id: "asexual",
    primarySlug: "asexual",
    slugs: [
      "asexual"
    ],
    terms: []
  },
  {
    id: "bulgarian",
    primarySlug: "bulgarian",
    slugs: [
      "bulgarian"
    ],
    terms: []
  },
  {
    id: "caucasian",
    primarySlug: "caucasian",
    slugs: [
      "caucasian"
    ],
    terms: []
  },
  {
    id: "couple-straight",
    primarySlug: "couple-straight",
    slugs: [
      "couple-straight"
    ],
    terms: []
  },
  {
    id: "croatian",
    primarySlug: "croatian",
    slugs: [
      "croatian"
    ],
    terms: []
  },
  {
    id: "malaysian",
    primarySlug: "malaysian",
    slugs: [
      "malaysian"
    ],
    terms: []
  },
  {
    id: "singaporean",
    primarySlug: "singaporean",
    slugs: [
      "singaporean"
    ],
    terms: []
  },
  {
    id: "slovak",
    primarySlug: "slovak",
    slugs: [
      "slovak"
    ],
    terms: []
  },
  {
    id: "step-fantasy",
    primarySlug: "step-fantasy",
    slugs: [
      "step-fantasy"
    ],
    terms: []
  }
];

const _slugToCluster = new Map<string, CategoryCluster>();
for (const c of CATEGORY_CLUSTERS) for (const s of c.slugs) _slugToCluster.set(s, c);

export function getClusterForSlug(slug: string): CategoryCluster | undefined { return _slugToCluster.get(slug); }

export function getClusterSiblingSlugs(slug: string, excludeSelf = true): string[] {
  const c = getClusterForSlug(slug);
  if (!c) return [];
  return c.slugs.filter((s) => !excludeSelf || s !== slug);
}

export function getClusterSuggestedSlugs(slug: string, counts: Record<string, number>, limit = 4): string[] {
  return getClusterSiblingSlugs(slug).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0)).slice(0, limit);
}

export function expandClusterSlugs(slug: string): string[] {
  const c = getClusterForSlug(slug); return c ? [...c.slugs] : [slug];
}