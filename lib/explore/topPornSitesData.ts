/** Explore directory lists — keep only ordered sections below. */

import { PREMIUM_PORN_LISTINGS } from '@/lib/explore/premiumPornListings';
import { LISTINGS as LIVE_SEX_CAMS_LISTINGS } from '@/lib/explore/liveSexCamsListings';
import { LISTINGS as VR_PORN_LISTINGS } from '@/lib/explore/vrPornListings';
import { LISTINGS as PREMIUM_ASIAN_PORN_LISTINGS } from '@/lib/explore/premiumAsianPornListings';
import { exploreSitesForCategory, exploreSitesFromListings, getExploreSiteListing } from '@/lib/explore/exploreSiteListings';

export type ExploreSite = {
  name: string;
  url: string;
  externalUrl?: string;
  description?: string;
  image?: string;
  openInNewTab?: boolean;
  featured?: boolean;
};
export type ExploreCategory = { slug: string; title: string; description: string; sites: ExploreSite[] };

function premiumAsianPornExploreSites(): ExploreSite[] {
  const javhd = PREMIUM_PORN_LISTINGS.find((listing) => listing.slug === 'javhd');
  const zenra = getExploreSiteListing('zenra');
  const bySlug = new Map(PREMIUM_ASIAN_PORN_LISTINGS.map((listing) => [listing.slug, listing]));
  const ordered: ExploreSite[] = [];

  if (javhd) {
    ordered.push(
      ...exploreSitesFromListings([{ ...javhd, name: 'JAVHD' }]),
    );
  }
  for (const slug of ['erito', 'japanhdv', 'asian-sex-diary'] as const) {
    const listing = bySlug.get(slug);
    if (listing) ordered.push(...exploreSitesFromListings([listing]));
  }
  if (zenra) {
    ordered.push(...exploreSitesFromListings([zenra]));
  }
  return ordered;
}

export const EXPLORE_CATEGORIES: ExploreCategory[] = [
  {
    slug: 'best-premium-porn',
    title: 'Best Premium Porn',
    description:
      'The top premium porn sites with the best full-length HD and 4K movies from famous studios. Stream exclusive adult DVDs with the hottest porn stars.',
    sites: exploreSitesFromListings(PREMIUM_PORN_LISTINGS),
  },
  {
    slug: 'best-live-sex-cams',
    title: 'Best Live Sex Cams',
    description:
      'The top live sex cam sites with the hottest webcam girls stripping and chatting in HD. Free public shows or private sessions with your favorite model.',
    sites: exploreSitesFromListings(LIVE_SEX_CAMS_LISTINGS),
  },
  {
    slug: 'best-ai-porn-sites',
    title: 'Best AI Porn Sites',
    description:
      'The top AI porn sites to generate custom nudes and sex scenes in seconds. Create photorealistic pics, hentai, and more from your prompts.',
    sites: exploreSitesForCategory('best-ai-porn-sites'),
  },
  {
    slug: 'best-vr-porn',
    title: 'Best VR Porn',
    description:
      'The best VR porn sites with top full-length 4K virtual reality videos in 360 degrees. Stream immersive 3D adult content with no annoying ads.',
    sites: exploreSitesFromListings(VR_PORN_LISTINGS),
  },
  {
    slug: 'best-ai-porn-generator-sites',
    title: 'Best AI Porn Generator Sites',
    description:
      'The best AI porn generator platforms with top realistic images, hentai-style art, and advanced video tools plus free trials. 18+ only.',
    sites: exploreSitesForCategory('best-ai-porn-generator-sites'),
  },
  {
    slug: 'best-live-asian-sex-cams',
    title: 'Best Live Asian Sex Cams',
    description:
      'The top live Asian sex cams with the best Oriental and Japanese webcam girls in uncensored HD chat and private live shows.',
    sites: exploreSitesForCategory('best-live-asian-sex-cams'),
  },
  {
    slug: 'best-asian-porn-sites',
    title: 'Best Asian Porn Sites',
    description:
      'The best Asian porn sites with top free HD JAV videos, Japanese porn stars, and uncensored streams on desktop and mobile.',
    sites: exploreSitesForCategory('best-asian-porn-sites'),
  },
  {
    slug: 'best-premium-asian-porn-sites',
    title: 'Premium Asian Porn Sites',
    description:
      'Want full-length HD porn movies of JAV pornstars, Japanese Idols & Asian girls?',
    sites: premiumAsianPornExploreSites(),
  },
  {
    slug: 'best-lesbian-porn-sites',
    title: 'Best Lesbian Porn Sites',
    description:
      'The top free lesbian porn sites with the best girl-on-girl HD videos, kissing, and hardcore lez action from the hottest tubes.',
    sites: exploreSitesForCategory('best-lesbian-porn-sites'),
  },
  {
    slug: 'best-premium-lesbian-porn-site',
    title: 'Best Premium Lesbian Porn Site',
    description:
      'The best premium lesbian porn sites with top exclusive full-length HD girl-on-girl movies from the most famous porn studios.',
    sites: exploreSitesForCategory('best-premium-lesbian-porn-site'),
  },
  {
    slug: 'best-porn-for-women-sites',
    title: 'Best Porn for Women Sites',
    description:
      'The top porn for women sites with the best female-friendly HD videos, sensual storylines, and passionate chemistry on free tubes.',
    sites: exploreSitesForCategory('best-porn-for-women-sites'),
  },
  {
    slug: 'best-premium-porn-for-women',
    title: 'Best Premium Porn For Women',
    description:
      'The best premium porn for women with top exclusive 720p to 4K movies focused on real pleasure and passionate full-length scenes.',
    sites: exploreSitesForCategory('best-premium-porn-for-women'),
  },
  {
    slug: 'best-premium-fetish-porn-sites',
    title: 'Best Premium Fetish Porn Sites',
    description:
      'The top premium fetish and BDSM sites with the best exclusive HD bondage, kink, and domination videos from famous studios.',
    sites: exploreSitesForCategory('best-premium-fetish-porn-sites'),
  },
  {
    slug: 'best-feet-porn-sites',
    title: 'Best Feet Porn Sites',
    description:
      'The best feet porn sites with top free soles, arches, and toe content on tubes, paysites, and VR from hot pornstars and amateurs.',
    sites: exploreSitesForCategory('best-feet-porn-sites'),
  },
  {
    slug: 'best-premium-amateur-porn-site',
    title: 'Best Premium Amateur Porn Site',
    description:
      'The best premium amateur porn sites with top homemade sex tapes, real girls next door, and exclusive 720p to 4K amateur movies.',
    sites: exploreSitesForCategory('best-premium-amateur-porn-site'),
  },
  {
    slug: 'best-free-cam-girl-video-sites',
    title: 'Best Free Cam Girl Video Sites',
    description:
      'The best free cam girl video sites to stream and download top samples from Chaturbate, LiveJasmin, MyFreeCams, and other popular cam platforms.',
    sites: exploreSitesForCategory('best-free-cam-girl-video-sites'),
  },
  {
    slug: 'best-sex-chat',
    title: 'Best Sex Chat',
    description:
      'The top sex chat sites to meet random strangers for free adult chat, dirty talk, and webcam fun with horny women online.',
    sites: exploreSitesForCategory('best-sex-chat'),
  },
  {
    slug: 'best-escorts',
    title: 'Best Escorts',
    description:
      'The top escort sites with the best verified companions and porn star escorts. Browse, call, and meet discreetly at home or a hotel.',
    sites: exploreSitesForCategory('best-escorts'),
  },
  {
    slug: 'best-hookup',
    title: 'Best Hookup',
    description:
      'The best hookup sites to find real local girls for sex tonight. Top platforms for horny singles looking for a casual encounter.',
    sites: exploreSitesForCategory('best-hookup'),
  },
  {
    slug: 'best-sex-toys-websites',
    title: 'Best Sex Toys websites',
    description:
      'The best online sex toy shops with top vibrators, dildos, Fleshlight, lingerie, and more from trusted adult stores with discreet shipping.',
    sites: exploreSitesForCategory('best-sex-toys-websites'),
  },
  {
    slug: 'best-sex-dolls-brands',
    title: 'Best Sex Dolls brands',
    description:
      'The top sex doll brands and shops with the best lifelike love dolls, custom bodies, and premium silicone companions worldwide.',
    sites: exploreSitesForCategory('best-sex-dolls-brands'),
  },
  {
    slug: 'best-buy-used-panties',
    title: 'Best Buy Used Panties',
    description:
      'The best used panty marketplaces to buy real G-strings, thongs, bras, socks, and more from verified sellers with discreet delivery.',
    sites: exploreSitesForCategory('best-buy-used-panties'),
  },
  {
    slug: 'best-male-enhancement',
    title: 'Best Male Enhancement Pills',
    description:
      'The top male enhancement pill sites with the best legit Viagra, Cialis, and ED options via online consults and discreet home delivery.',
    sites: exploreSitesForCategory('best-male-enhancement'),
  },
];

export function withErogramExploreLists(
  latestAiNsfw: ExploreSite[],
  paidBots: ExploreSite[],
  companions: ExploreSite[],
): ExploreCategory[] {
  const cats = EXPLORE_CATEGORIES.map((category) => {
    if (category.slug === 'best-ai-porn-sites' && latestAiNsfw.length > 0) {
      return { ...category, sites: latestAiNsfw };
    }
    return category;
  });

  const extraBots: ExploreCategory = {
    slug: 'best-telegram-porn-bots',
    title: 'Best Telegram porn bots',
    description:
      'Browse and discover amazing NSFW Telegram bots. Find AI companions, chat bots, and adult entertainment bots by category, country, and interests.',
    sites: paidBots,
  };
  const extraCompanions: ExploreCategory = {
    slug: 'best-ai-companion-websites',
    title: 'Best AI companion websites',
    description:
      'The top AI companion apps with the leading virtual partners, memory, voice, images, and uncensored NSFW chat.',
    sites: companions,
  };

  const vrAt = cats.findIndex((c) => c.slug === 'best-vr-porn');
  cats.splice(vrAt >= 0 ? vrAt + 1 : cats.length, 0, extraBots);

  const generatorAt = cats.findIndex((c) => c.slug === 'best-ai-porn-generator-sites');
  cats.splice(generatorAt >= 0 ? generatorAt + 1 : cats.length, 0, extraCompanions);
  return cats;
}
