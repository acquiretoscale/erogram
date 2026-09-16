import type { ReactNode } from 'react';
import FaqObfuscatedEmail from '@/components/FaqObfuscatedEmail';
import {
  renderHomeFaqText,
  type FaqLinkBudget,
} from '@/lib/faq/homeFaqInternalLinks';

type FaqBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

export type HomeFaqItem = {
  q: string;
  blocks: FaqBlock[];
};

export const HOME_FAQ_TAGLINE =
  'ErogramX exists so adults can explore the best AI NSFW, the best JAV porn, the best camsites, the best Asian porn, the best AI girlfriend apps, the best Telegram uncensored bots, the best nude generators, the best OnlyFans creators, the best AI porn video generators, the best VR porn, and the best Telegram groups without starting from zero every night.';

export const HOME_FAQ_INTRO =
  'The #1 Adult Porn Hub for Exploration. Best AI NSFW, Best Telegram Groups, Best OnlyFans Creators & More. ErogramX.com is built for adults who want one place to discover the best AI NSFW tools, the best JAV porn communities, the best camsites, the best Asian porn collections, the best AI girlfriend apps, the best Telegram uncensored bots, the best nude generators, the best OnlyFans creators, the best AI porn video generators, the best VR porn, and the best Telegram groups. This FAQ explains what we are, how the directory works, how listings and Premium work, and how we handle privacy, payments, DMCA, and safety.';

export const HOME_FAQ_ITEMS: HomeFaqItem[] = [
  {
    q: 'What is ErogramX?',
    blocks: [
      {
        type: 'p',
        text: 'ErogramX is the number one adult Porn Hub for exploration. We are a curated directory of adult websites, NSFW Telegram groups, uncensored bots, AI companions, OnlyFans creators, and AI NSFW tools. Instead of bouncing between random search results, dead links, and low-quality lists, users come here to find the best AI NSFW experiences, the best Telegram groups, and the best adult platforms in one place. We cover:',
      },
      {
        type: 'ul',
        items: [
          'the best JAV porn channels and Japanese adult video communities',
          'the best camsites and live adult platforms',
          'the best Asian porn groups and creator lists',
          'the best AI girlfriend apps and uncensored companions',
          'the best Telegram uncensored bots',
          'the best nude generators and undress AI tools',
          'the best OnlyFans creators and leak/discovery communities',
          'the best AI porn video generators',
          'the best VR porn destinations',
          'the best Telegram groups across niches',
        ],
      },
      {
        type: 'p',
        text: 'Listings are organized so you can explore, compare, save favorites, and jump straight to the source.',
      },
    ],
  },
  {
    q: 'Why do people call ErogramX the best AI NSFW directory?',
    blocks: [
      {
        type: 'p',
        text: 'Because discovery is the hard part. The best AI NSFW tools change fast: one week a generator is sharp, the next week it is watermarked, censored, or dead. ErogramX rates AI NSFW tools with two signals:',
      },
      {
        type: 'ul',
        items: [
          'Editorial review from our team (output quality, realism, uncensored features, pricing, free tier, privacy).',
          'User upvotes. The tools with the highest upvotes get the highest exposure.',
        ],
      },
      {
        type: 'p',
        text: 'That mix is how we surface the best AI girlfriend apps, the best nude generators, and the best AI porn video generators instead of whoever paid the most that week. If you are searching for the best AI NSFW chat, the best undress AI, or the best AI porn generators, start with the ranked AI NSFW section and sort by heat, upvotes, and freshness.',
      },
    ],
  },
  {
    q: 'What can I find on ErogramX besides AI tools?',
    blocks: [
      { type: 'p', text: 'A lot more than chatbots.' },
      {
        type: 'p',
        text: 'Best Telegram groups. We list verified NSFW groups by niche: amateur, MILF, Latina, Asian, JAV, OnlyFans leaks, cosplay, fetish, BDSM, blowjob, lesbian, TikTok, Instagram models, and more. Public pages show a sample. ErogramX Premium unlocks a much larger vault of unlisted, high-quality groups.',
      },
      {
        type: 'p',
        text: 'Best Telegram uncensored bots. These are bots for undress, roleplay, sexting, image generation, and private NSFW chat inside Telegram.',
      },
      {
        type: 'p',
        text: 'Best OnlyFans creators. OFsearch and creator pages help fans find the best OnlyFans creators by category, look, country, and niche. Creators can get listed for high-intent exposure from people already searching for adult accounts.',
      },
      {
        type: 'p',
        text: 'Best adult websites. That includes JAV libraries, Asian porn sites, camsites, VR porn platforms, and other adult destinations our team and users keep adding.',
      },
    ],
  },
  {
    q: 'Is ErogramX free?',
    blocks: [
      { type: 'p', text: 'Yes. ErogramX has a free tier and a paid tier.' },
      {
        type: 'ul',
        items: [
          'Free: Browse public listings, discover AI NSFW tools, Telegram groups, bots, OnlyFans creators, and adult sites. Join public communities. Use search and category pages.',
          'ErogramX Premium: A more curated layer. Premium members get high-quality unlisted groups and tools, exclusive drops, better filters, and offers you will not see on the public homepage.',
        ],
      },
      {
        type: 'p',
        text: 'Free is enough to explore. Premium is for people who want the vault: rare niches, fresher links, and fewer dead rooms.',
      },
    ],
  },
  {
    q: 'What is ErogramX Premium?',
    blocks: [
      {
        type: 'p',
        text: 'ErogramX Premium is the curated side of the hub. Public ErogramX is the map. Premium is the locked rooms. Premium typically includes:',
      },
      {
        type: 'ul',
        items: [
          'thousands of hand-picked unlisted Telegram groups updated daily',
          'rare niches and leak communities that do not sit on the public feed',
          'fewer expired links because Premium inventory is checked more aggressively',
          'advanced filters by kink, ethnicity, body type, and category',
          'bookmarks, folders, and a cleaner saved library',
          'exclusive offers around tools, creators, and partner deals',
        ],
      },
      {
        type: 'p',
        text: 'If you already use Telegram for adult content, Premium is usually the difference between "some groups" and "the groups people actually keep."',
      },
    ],
  },
  {
    q: 'How do you choose the best JAV porn, best Asian porn, and best niche lists?',
    blocks: [
      {
        type: 'p',
        text: 'The same way we choose the best AI NSFW tools: editorial review plus community signal. For JAV and Asian porn, we look at activity, language/region fit, update speed, and whether the community matches its label. A "best JAV porn" group that has not posted in months does not stay featured. A "best Asian porn" list that is just spam gets buried. For camsites, VR porn, and OnlyFans, we prioritize:',
      },
      {
        type: 'ul',
        items: [
          'working access paths',
          'adult-only positioning',
          'clear niche',
          'user heat / upvotes',
          'freshness',
        ],
      },
      {
        type: 'p',
        text: 'That is why category pages read like "Best OnlyFans groups," "Best Asian groups," "Best MILF groups," "Best AI girlfriend apps," and so on. Those phrases match how people search, and they match how the directory is actually organized.',
      },
    ],
  },
  {
    q: 'How are AI NSFW tools rated and ranked?',
    blocks: [
      {
        type: 'p',
        text: 'Every major AI NSFW listing is reviewed before it gets real estate. Our team tests:',
      },
      {
        type: 'ul',
        items: [
          'uncensored capability',
          'image/video quality',
          'identity consistency on undress and face tools',
          'chat quality on AI girlfriend apps',
          'free tier vs paywall honesty',
          'speed, watermarks, and privacy claims',
        ],
      },
      {
        type: 'p',
        text: 'Users then upvote. High-upvote tools rise. Low-quality or bait-and-switch tools lose exposure. So "best nude generators," "best AI girlfriend apps," and "best AI porn video generators" on ErogramX are not random affiliate dumps. They are ranked inventories.',
      },
    ],
  },
  {
    q: 'Can I get my website, tool, bot, group, or OnlyFans page listed?',
    blocks: [
      { type: 'p', text: 'Yes. Submit your listing here:' },
      {
        type: 'ul',
        items: [
          'Submit OnlyFans Creator',
          'Submit your AI NSFW Tool or website',
          'Submit your Telegram Group',
          'Submit your Telegram Bot',
        ],
      },
    ],
  },
  {
    q: 'Can I find the best camsites and best VR porn here too?',
    blocks: [
      {
        type: 'p',
        text: 'Yes. The core engine started as Telegram + AI NSFW + OnlyFans discovery, and the catalog expands into the rest of adult exploration: camsites, VR porn platforms, and JAV / Asian porn destinations that are actually active. If a niche has a "best of" version worth ranking, we want it in the directory.',
      },
    ],
  },
];

export function homeFaqPlainText(item: HomeFaqItem): string {
  return item.blocks
    .map((block) => (block.type === 'p' ? block.text : block.items.join(' ')))
    .join(' ');
}

export function homeFaqSchemaText(item: HomeFaqItem): string {
  return homeFaqPlainText(item).replace(/\{\{SUPPORT\}\}/g, 'the support contact email on erogram.biz');
}

function renderRichLine(text: string, budget: FaqLinkBudget): ReactNode {
  const parts = text.split(/(\{\{SUPPORT\}\})/g);
  if (parts.length === 1) return renderHomeFaqText(text, budget);

  return parts.map((part, index) => {
    if (part === '{{SUPPORT}}') {
      return (
        <FaqObfuscatedEmail
          key={`support-${index}`}
          local="support"
          domain="erogram.biz"
          label="support email"
        />
      );
    }
    return <span key={`text-${index}`}>{renderHomeFaqText(part, budget)}</span>;
  });
}

export default function HomeFaq() {
  const linkBudget: FaqLinkBudget = new Map();

  return (
    <section className="bg-[#f4f4f4] text-[#161616]" id="faq">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-14 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">EROGRAMX FAQ</h2>
        <p className="text-base leading-relaxed mb-6">{renderRichLine(HOME_FAQ_TAGLINE, linkBudget)}</p>
        <p className="text-base leading-relaxed mb-10">{renderRichLine(HOME_FAQ_INTRO, linkBudget)}</p>
        {HOME_FAQ_ITEMS.map((item) => (
          <article key={item.q} className="mb-8 last:mb-0">
            <h3 className="text-lg sm:text-xl font-bold mb-3">{renderRichLine(item.q, linkBudget)}</h3>
            {item.blocks.map((block, index) =>
              block.type === 'p' ? (
                <p key={`${item.q}-p-${index}`} className="text-base leading-relaxed mb-3 last:mb-0">
                  {renderRichLine(block.text, linkBudget)}
                </p>
              ) : (
                <ul key={`${item.q}-ul-${index}`} className="list-disc pl-5 mb-3 last:mb-0 space-y-1">
                  {block.items.map((line) => (
                    <li key={line} className="text-base leading-relaxed">
                      {renderRichLine(line, linkBudget)}
                    </li>
                  ))}
                </ul>
              ),
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
