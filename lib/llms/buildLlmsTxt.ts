import connectDB from '@/lib/db/mongodb';
import { Article, Bot, Group, OnlyFansCreator } from '@/lib/models';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { AI_NSFW_TOOLS } from '@/app/ainsfw/data';
import { getApprovedSubmissions } from '@/lib/actions/ainsfw';
import { EXPLORE_CATEGORIES } from '@/lib/explore/topPornSitesData';

/** Same public OFsearch inventory base as the homepage stats. */
const OF_CREATORS_BASE = 1_813_055;
const BLOG_LIMIT = 10;

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function escTitle(s: string): string {
  return s.replace(/[\[\]]/g, '').replace(/\u2014/g, '-').trim();
}

function note(s: string): string {
  return s.replace(/\u2014/g, '-').replace(/\s+/g, ' ').trim();
}

function link(name: string, path: string, details: string): string {
  return `- [${escTitle(name)}](${CANONICAL_BASE}${path}): ${note(details)}`;
}

type LlmsData = {
  groupCount: number;
  botCount: number;
  ofCreatorsCount: number;
  aiNsfwCount: number;
  articles: { title: string; slug: string }[];
};

async function loadLlmsData(): Promise<LlmsData> {
  const fallback: LlmsData = {
    groupCount: 0,
    botCount: 0,
    ofCreatorsCount: OF_CREATORS_BASE,
    aiNsfwCount: AI_NSFW_TOOLS.length,
    articles: [],
  };

  try {
    await connectDB();
    const staticSlugs = new Set(AI_NSFW_TOOLS.map((t) => t.slug));
    const [groupCount, botCount, ofCount, submissions, articles] = await Promise.all([
      Group.countDocuments({ status: 'approved', isAdvertisement: { $ne: true } }),
      Bot.countDocuments({ status: 'approved', isAdvertisement: { $ne: true } }),
      OnlyFansCreator.countDocuments({ deleted: { $ne: true } }),
      getApprovedSubmissions(staticSlugs),
      Article.find({ status: 'published' })
        .select('title slug')
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(BLOG_LIMIT)
        .lean(),
    ]);

    return {
      groupCount: groupCount || 0,
      botCount: botCount || 0,
      ofCreatorsCount: OF_CREATORS_BASE + (ofCount || 0),
      aiNsfwCount: AI_NSFW_TOOLS.length + submissions.length,
      articles: (articles as { title?: string; slug?: string }[])
        .filter((a) => a.slug && a.title)
        .map((a) => ({ title: String(a.title), slug: String(a.slug) })),
    };
  } catch (error) {
    console.error('[llms.txt] live data failed:', error);
    return fallback;
  }
}

export async function buildLlmsTxt(): Promise<string> {
  const data = await loadLlmsData();
  const generated = new Date().toISOString();
  const exploreLinks = EXPLORE_CATEGORIES
    .filter((c) => !/india/i.test(c.slug) && !/india/i.test(c.title))
    .map((c) => link(c.title, `/porn-websites/${c.slug}`, c.description));
  const blogLinks = data.articles.map((a) =>
    link(a.title, `/blog/${a.slug}`, 'Erogram blog article'),
  );

  const lines = [
    '# Erogram',
    '',
    '> Erogram (erogramx.com) is the #1 hub for porn Telegram groups, NSFW bots, AI companions and tools, and OnlyFans creators. Adult directory. 18+. Updated daily.',
    '',
    'Erogram is an 18+ (RTA) discovery directory. It is not Telegram and not OnlyFans. Users browse listings on Erogram, then leave to Telegram or to a creator\'s OnlyFans page. Browsing is free. No account is required to browse. Listings are reviewed before they go live.',
    '',
    `OFsearch has ${fmt(data.ofCreatorsCount)} OnlyFans creator profiles. The directory currently lists ${fmt(data.groupCount)} Telegram groups, ${fmt(data.botCount)} bots, and ${fmt(data.aiNsfwCount)} AI NSFW tools. Telegram groups and bots are listed by category, country, and popularity. AI NSFW tools are reviewed and ranked. The porn websites directory lists adult sites by category.`,
    '',
    `Generated: ${generated}`,
    'Official site: https://erogramx.com',
    'Contact: support@erogram.biz',
    'Telegram: https://t.me/erogramDOTpro',
    '',
    '## Directories',
    '',
    link('Groups Directory', '/groups', 'Browse thousands of porn and NSFW Telegram groups by category, country, and popularity'),
    link('Bots Directory', '/bots', 'Discover AI companion bots and adult Telegram bots'),
    link('Best Telegram Groups', '/best-telegram-groups', 'Curated top lists of porn and NSFW Telegram groups by category'),
    link('Porn Websites', '/porn-websites', 'Adult website directory by category'),
    link('Tags', '/tags', 'Alphabetical index of NSFW Telegram group and OnlyFans creator tags'),
    '',
    '## AI NSFW',
    '',
    link('AI NSFW Tools', '/ainsfw', 'Curated AI Girlfriend apps, Undress AI generators, and AI Chat companions'),
    link('Best Adult AI Tools Rankings', '/best-ai-nsfw-tools', 'Top 10 rankings of adult AI tools by category'),
    '',
    '## Porn Websites Categories',
    '',
    ...exploreLinks,
    '',
    '## Blog',
    '',
    link('The Erogram Blog', '/blog', 'Guides, lists, and investigations: AI NSFW, NSFW Telegram groups and bots, OnlyFans creators, and adult entertainment'),
    ...(blogLinks.length ? ['', '### Latest articles', '', ...blogLinks] : []),
    '',
    '## Submit',
    '',
    link('Submit a Group or Bot', '/add', 'Submit a Telegram group or bot for review'),
    link('Submit an OnlyFans Creator', '/submit', 'Creators and agencies can submit OnlyFans accounts to be listed'),
    link('OFM Agencies', '/ofm-agencies', 'Get listed on Erogram for OnlyFans agencies'),
    '',
    '## Optional',
    '',
    link('Full site documentation for LLMs', '/llms-full.txt', 'Full Erogram documentation for LLMs'),
    link('About', '/about', 'About Erogram'),
    link('Contact', '/contact', 'Contact Erogram'),
    link('Privacy Policy', '/privacy', 'Privacy policy'),
    link('Terms of Service', '/terms', 'Terms of service'),
    link('DMCA', '/dmca', 'DMCA and takedown'),
    '',
    '## How It Works',
    '',
    '1. Users browse or search Erogram by category, country, tag, or keyword.',
    '2. Group and bot listings show a description, member count, category, and country. Clicking Join opens Telegram.',
    '3. OnlyFans creator listings show a profile on Erogram. The subscribe action happens on OnlyFans.',
    '4. AI NSFW tool listings show what the tool does, with a link to the tool.',
    '5. Users can submit a group, bot, or OnlyFans creator for review.',
    '',
    '## Content Guidelines',
    '',
    '- Listed groups, bots, and tools are reviewed before approval.',
    '- Content is labeled adult / NSFW (RTA rated).',
    '- Reported listings are reviewed.',
    '- Users can report abuse at https://erogramx.com/report-abuse',
    '',
    '## Frequently Asked Questions',
    '',
    'Q: What is Erogram?',
    'A: Erogram is the ultimate directory for discovering the best porn Telegram groups, NSFW channels, and AI companion bots. We curate and verify adult-oriented communities and bots to help you find like-minded people and engaging AI companions that match your interests.',
    '',
    'Q: What are the best porn Telegram groups?',
    'A: Erogram curates the best porn Telegram groups across dozens of categories including amateur, anal, lesbian, MILF, onlyfans, BDSM, threesome, and many more. All groups are verified for safety and quality, and our directory is updated daily with new communities.',
    '',
    'Q: What\'s the difference between groups and bots?',
    'A: Groups are community spaces where multiple people chat and interact, while bots are AI-powered companions that provide personalized conversations, entertainment, and interactive experiences. Both are fully integrated into our platform.',
    '',
    'Q: Are all communities and bots safe?',
    'A: Yes, we take safety seriously. All groups and bots listed on Erogram are verified and moderated to ensure they meet our community standards. We regularly review content to maintain a safe environment for all users.',
    '',
    'Q: How do I join a Telegram group or use a bot?',
    'A: Simply click on any group or bot card and follow the Telegram link. You\'ll be redirected to Telegram where you can join the group or start chatting with the bot instantly. Make sure you have the Telegram app installed for the best experience.',
    '',
    'Q: Is Erogram free to use?',
    'A: Yes, Erogram is completely free to use. We don\'t charge for browsing groups, using bots, joining communities, or accessing our content. Our service is supported through partnerships and donations.',
    '',
    'Q: How often are new groups and bots added?',
    'A: We add fresh groups and bots daily from our community submissions. Our team reviews and approves new content regularly to ensure quality and relevance. Check back often for the latest additions!',
    '',
    'Q: Can I submit my own group or bot?',
    'A: Yes! You can submit your own group or bot using the \'Add\' button in the navigation bar. Fill out the form with your details, and our team will review and approve it. Once approved, your content will be visible to all users on our platform.',
    '',
    'Q: What are AI NSFW tools?',
    'A: AI NSFW tools are apps that generate adult content or conversation using artificial intelligence. The main types are AI girlfriend apps, undress AI generators, and NSFW chat companions. Erogram lists these tools in a dedicated section, each one reviewed and ranked so visitors know what a tool actually does before signing up.',
    '',
    'Q: Are AI girlfriend apps free to use?',
    'A: Most AI girlfriend apps offer a free tier with a limited number of messages per day, which is enough to test the chemistry. Image generation, voice, and full NSFW conversations usually sit behind a subscription. Erogram lists the real pricing for each tool so there are no surprises at checkout.',
    '',
    'Q: How does Erogram rank AI NSFW tools?',
    'A: Every tool listed on Erogram is tested before it goes live. Rankings consider output quality, pricing, free tier generosity, and how well the NSFW features actually work. Listings are updated when tools change their plans or features, and new tools are added regularly.',
    '',
    'Q: What is OFsearch on Erogram?',
    'A: OFsearch is a free search engine with over 1.8 million OnlyFans creator profiles. Visitors can search by name, browse by category or country, and check trending creators. It works as a discovery layer, since OnlyFans itself has almost no search function.',
    '',
    'Q: How do I find OnlyFans creators by category?',
    'A: Erogram organizes creators into categories such as Asian, MILF, Latina, Goth, Petite, and many more, plus country filters. Each creator has a profile page with bio, stats, and a link to their OnlyFans. Curated top lists rank the best accounts in each category, updated daily.',
    '',
    'Q: Is OFsearch free?',
    'A: Yes, searching and browsing creator profiles costs nothing and no account is needed. Subscribing to a creator happens on OnlyFans itself, at whatever price the creator sets. Erogram only handles the discovery part.',
    '',
  ];

  return lines.join('\n');
}

export async function llmsTxtResponse(): Promise<Response> {
  const body = await buildLlmsTxt();
  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
}
