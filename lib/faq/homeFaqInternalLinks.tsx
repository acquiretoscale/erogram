import type { ReactNode } from 'react';
import Link from 'next/link';

type FaqLinkRule = {
  phrase: string;
  href: string;
  budgetKey: string;
  maxLinks: number;
  wordBoundary?: boolean;
};

type FaqMatch = {
  start: number;
  end: number;
  href: string;
  budgetKey: string;
  maxLinks: number;
  text: string;
};

export type FaqLinkBudget = Map<string, number>;

const LINK_CLASS =
  'text-[#c0392f] underline underline-offset-2 decoration-[#c0392f]/40 hover:text-[#a93226] hover:decoration-[#a93226]';

/** Section anchors = homepage category cards. Best pages = dedicated ranking URLs. */
export const HOME_FAQ_LINK_RULES: FaqLinkRule[] = [
  /* ── submit / advertise (high budget, utility links) ── */
  { phrase: 'Advertise with us', href: '/advertise', budgetKey: 'advertise', maxLinks: 20 },
  { phrase: 'Advertising', href: '/advertise', budgetKey: 'advertise', maxLinks: 20 },
  { phrase: 'advertising', href: '/advertise', budgetKey: 'advertise', maxLinks: 20 },
  { phrase: 'Submit your AI NSFW Tool or website', href: '/add/ainsfw', budgetKey: 'submit-ainsfw', maxLinks: 5 },
  { phrase: 'Submit your Telegram Group', href: '/add/group', budgetKey: 'submit-group', maxLinks: 5 },
  { phrase: 'Submit your Telegram Bot', href: '/add/bot', budgetKey: 'submit-bot', maxLinks: 5 },
  { phrase: 'Submit OnlyFans Creator', href: '/submit', budgetKey: 'submit-of', maxLinks: 5 },

  /* ── AI NSFW / AI porn generators ── */
  { phrase: 'AI porn video generators', href: '/best-ai-porn-generator', budgetKey: 'best-ai-porn-generator', maxLinks: 2 },
  { phrase: 'AI porn generators', href: '/best-ai-porn-generator', budgetKey: 'best-ai-porn-generator', maxLinks: 2 },
  { phrase: 'ranked AI NSFW section', href: '/#best-ainsfw', budgetKey: 'section-ainsfw', maxLinks: 2 },
  { phrase: 'AI NSFW tools', href: '/#best-ainsfw', budgetKey: 'section-ainsfw', maxLinks: 2 },
  { phrase: 'AI NSFW tool', href: '/#best-ainsfw', budgetKey: 'section-ainsfw', maxLinks: 2 },
  { phrase: 'AI NSFW chat', href: '/#best-ainsfw', budgetKey: 'section-ainsfw', maxLinks: 2 },
  { phrase: 'AI NSFW directory', href: '/#best-ainsfw', budgetKey: 'section-ainsfw', maxLinks: 2 },
  { phrase: 'AI NSFW reviews', href: '/#best-ainsfw', budgetKey: 'section-ainsfw', maxLinks: 2 },
  { phrase: 'AI NSFW', href: '/#best-ainsfw', budgetKey: 'section-ainsfw', maxLinks: 2 },

  /* ── AI girlfriend / companion ── */
  { phrase: 'AI girlfriend apps', href: '/#best-ai-girlfriend', budgetKey: 'section-ai-girlfriend', maxLinks: 2 },
  { phrase: 'AI girlfriend app', href: '/#best-ai-girlfriend', budgetKey: 'section-ai-girlfriend', maxLinks: 2 },
  { phrase: 'AI girlfriend', href: '/#best-ai-girlfriend', budgetKey: 'section-ai-girlfriend', maxLinks: 2 },
  { phrase: 'uncensored companions', href: '/best-ai-companion-websites', budgetKey: 'best-ai-companion', maxLinks: 2 },
  { phrase: 'AI companions', href: '/best-ai-companion-websites', budgetKey: 'best-ai-companion', maxLinks: 2 },

  /* ── undress / nude generators ── */
  { phrase: 'best nude generators', href: '/best-undress-ai', budgetKey: 'best-undress', maxLinks: 2 },
  { phrase: 'best nude generator', href: '/best-undress-ai', budgetKey: 'best-undress', maxLinks: 2 },
  { phrase: 'nude generators', href: '/best-undress-ai', budgetKey: 'best-undress', maxLinks: 2 },
  { phrase: 'nude generator', href: '/best-undress-ai', budgetKey: 'best-undress', maxLinks: 2 },
  { phrase: 'undress AI', href: '/best-undress-ai', budgetKey: 'best-undress', maxLinks: 2 },

  /* ── Telegram groups & bots ── */
  { phrase: 'best Telegram groups', href: '/best-telegram-groups', budgetKey: 'section-telegram-groups', maxLinks: 2 },
  { phrase: 'Telegram groups', href: '/best-telegram-groups', budgetKey: 'section-telegram-groups', maxLinks: 2 },
  { phrase: 'Telegram uncensored bots', href: '/best-undress-telegram-bots', budgetKey: 'best-telegram-bots', maxLinks: 2 },
  { phrase: 'uncensored bots', href: '/best-undress-telegram-bots', budgetKey: 'best-telegram-bots', maxLinks: 2 },

  /* ── JAV ── */
  { phrase: 'best JAV porn', href: '/best-uncensored-jav-porn-websites', budgetKey: 'best-jav', maxLinks: 2 },
  { phrase: 'JAV porn', href: '/best-uncensored-jav-porn-websites', budgetKey: 'best-jav', maxLinks: 2 },
  { phrase: 'JAV libraries', href: '/best-uncensored-jav-porn-websites', budgetKey: 'best-jav', maxLinks: 2 },
  { phrase: 'JAV platform', href: '/best-uncensored-jav-porn-websites', budgetKey: 'best-jav', maxLinks: 2 },
  { phrase: 'JAV library', href: '/best-uncensored-jav-porn-websites', budgetKey: 'best-jav', maxLinks: 2 },
  { phrase: 'JAV', href: '/best-uncensored-jav-porn-websites', budgetKey: 'best-jav', maxLinks: 2, wordBoundary: true },

  /* ── Asian porn ── */
  { phrase: 'Asian porn sites', href: '/best-asian-porn-sites', budgetKey: 'best-asian-porn', maxLinks: 2 },
  { phrase: 'Asian porn', href: '/best-asian-porn-sites', budgetKey: 'best-asian-porn', maxLinks: 2 },

  /* ── VR porn ── */
  { phrase: 'VR porn platforms', href: '/best-vr-porn', budgetKey: 'best-vr', maxLinks: 2 },
  { phrase: 'VR porn platform', href: '/best-vr-porn', budgetKey: 'best-vr', maxLinks: 2 },
  { phrase: 'VR porn brand', href: '/best-vr-porn', budgetKey: 'best-vr', maxLinks: 2 },
  { phrase: 'VR porn', href: '/best-vr-porn', budgetKey: 'best-vr', maxLinks: 2 },

  /* ── camsites / live cams ── */
  { phrase: 'live adult platforms', href: '/best-live-sex-cam-websites', budgetKey: 'best-cams', maxLinks: 2 },
  { phrase: 'camsites', href: '/best-live-sex-cam-websites', budgetKey: 'best-cams', maxLinks: 2 },
  { phrase: 'camsite', href: '/best-live-sex-cam-websites', budgetKey: 'best-cams', maxLinks: 2 },

  /* ── best porn / adult sites ── */
  { phrase: 'adult websites', href: '/best-porn', budgetKey: 'best-porn', maxLinks: 2 },
  { phrase: 'adult sites', href: '/best-porn', budgetKey: 'best-porn', maxLinks: 2 },
  { phrase: 'adult platforms', href: '/best-porn', budgetKey: 'best-porn', maxLinks: 2 },
  { phrase: 'adult destinations', href: '/best-porn', budgetKey: 'best-porn', maxLinks: 2 },
  { phrase: 'adult porn', href: '/best-porn', budgetKey: 'best-porn', maxLinks: 2 },
  { phrase: 'Porn Hub', href: '/best-porn', budgetKey: 'best-porn', maxLinks: 2 },

  /* ── OnlyFans creators ── */
  { phrase: 'OnlyFans creators', href: '/ofsearch', budgetKey: 'ofsearch', maxLinks: 2 },
  { phrase: 'OnlyFans creator', href: '/ofsearch', budgetKey: 'ofsearch', maxLinks: 2 },

  /* ── niche TG group categories ── */
  { phrase: 'OnlyFans leaks', href: '/best-telegram-groups/onlyfans-leaks', budgetKey: 'best-of-leaks', maxLinks: 2 },
  { phrase: 'Best OnlyFans groups', href: '/best-telegram-groups/onlyfans', budgetKey: 'best-of-groups', maxLinks: 2 },
  { phrase: 'Best Asian groups', href: '/best-telegram-groups/asian', budgetKey: 'best-asian-group', maxLinks: 2 },
  { phrase: 'Best MILF groups', href: '/best-telegram-groups/milf', budgetKey: 'best-milf', maxLinks: 2 },
  { phrase: 'Best fetish groups', href: '/best-telegram-groups/fetish', budgetKey: 'best-fetish', maxLinks: 2 },
  { phrase: 'BDSM', href: '/best-telegram-groups/bdsm', budgetKey: 'best-bdsm', maxLinks: 2, wordBoundary: true },
  { phrase: 'blowjob', href: '/best-telegram-groups/blowjob', budgetKey: 'best-blowjob', maxLinks: 2, wordBoundary: true },
  { phrase: 'cosplay', href: '/best-telegram-groups/cosplay', budgetKey: 'best-cosplay', maxLinks: 2, wordBoundary: true },
  { phrase: 'fetish', href: '/best-telegram-groups/fetish', budgetKey: 'best-fetish', maxLinks: 2, wordBoundary: true },
  { phrase: 'lesbian', href: '/best-telegram-groups/lesbian', budgetKey: 'best-lesbian', maxLinks: 2, wordBoundary: true },
  { phrase: 'Latina', href: '/best-telegram-groups/latina', budgetKey: 'best-latina', maxLinks: 2, wordBoundary: true },
  { phrase: 'MILF', href: '/best-telegram-groups/milf', budgetKey: 'best-milf', maxLinks: 2, wordBoundary: true },
  { phrase: 'amateur', href: '/best-telegram-groups/amateur', budgetKey: 'best-amateur', maxLinks: 2, wordBoundary: true },
  { phrase: 'Asian', href: '/best-telegram-groups/asian', budgetKey: 'best-asian-group', maxLinks: 2, wordBoundary: true },
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(text: string, rules: FaqLinkRule[]): FaqMatch[] {
  const matches: FaqMatch[] = [];

  for (const rule of rules) {
    const pattern = rule.wordBoundary
      ? `\\b${escapeRegex(rule.phrase)}\\b`
      : escapeRegex(rule.phrase);
    const re = new RegExp(pattern, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        href: rule.href,
        budgetKey: rule.budgetKey,
        maxLinks: rule.maxLinks,
        text: match[0],
      });
    }
  }

  matches.sort((a, b) => b.text.length - a.text.length || a.start - b.start);

  const chosen: FaqMatch[] = [];
  for (const candidate of matches) {
    const overlaps = chosen.some(
      (picked) => !(candidate.end <= picked.start || candidate.start >= picked.end),
    );
    if (!overlaps) chosen.push(candidate);
  }

  return chosen.sort((a, b) => a.start - b.start);
}

function takeLink(budget: FaqLinkBudget, key: string, maxLinks: number): boolean {
  const used = budget.get(key) || 0;
  if (used >= maxLinks) return false;
  budget.set(key, used + 1);
  return true;
}

export function renderHomeFaqText(text: string, budget: FaqLinkBudget): ReactNode {
  const matches = findMatches(text, HOME_FAQ_LINK_RULES);
  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }

    if (takeLink(budget, match.budgetKey, match.maxLinks)) {
      nodes.push(
        <Link key={`${match.start}-${match.href}`} href={match.href} className={LINK_CLASS}>
          {match.text}
        </Link>,
      );
    } else {
      nodes.push(match.text);
    }

    cursor = match.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
