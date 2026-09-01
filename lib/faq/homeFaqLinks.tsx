import Link from 'next/link';
import type { ReactNode } from 'react';
import { rankingEnglishPublicPath } from '@/lib/bestOfPageContent/hottestUrls';

export type HomeFaqSectionId = 'telegram' | 'ainsfw' | 'onlyfans';

type FaqLinkRule = {
  phrase: string;
  href: string;
  priority: 1 | 2 | 3;
  wordBoundary?: boolean;
};

type FaqMatch = {
  start: number;
  end: number;
  href: string;
  priority: 1 | 2 | 3;
  text: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rule(
  phrase: string,
  href: string,
  priority: 1 | 2 | 3,
  wordBoundary = false,
): FaqLinkRule {
  return { phrase, href, priority, wordBoundary };
}

function blog(slug: string) {
  return `/blog/${slug}`;
}

function getRules(section: HomeFaqSectionId, lp: (path: string) => string): FaqLinkRule[] {
  const tg = (cat: string) => lp(`/best-telegram-groups/${cat}`);
  const of = (cat: string) => lp(rankingEnglishPublicPath(cat, 'best'));
  const ai = (cat: string) => lp(`/ainsfw/${cat}`);

  if (section === 'telegram') {
    return [
      rule('best porn Telegram groups', lp('/best-telegram-groups'), 1),
      rule('porn Telegram groups', lp('/groups'), 1),
      rule('NSFW channels', lp('/groups'), 1),
      rule('AI companion bots', lp('/bots'), 1),
      rule('joining communities', lp('/groups'), 1),
      rule('browsing groups', lp('/groups'), 1),
      rule('using bots', lp('/bots'), 1),
      rule('fresh groups', lp('/groups'), 1),
      rule('Groups are', lp('/groups'), 1),
      rule('bots are', lp('/bots'), 1),
      rule("'Add' button", lp('/add'), 1),
      rule('group', lp('/groups'), 1, true),
      rule('bot', lp('/bots'), 1, true),
      rule('groups', lp('/groups'), 1, true),
      rule('bots', lp('/bots'), 1, true),
      rule('amateur', tg('amateur'), 2),
      rule('anal', tg('anal'), 2),
      rule('lesbian', tg('lesbian'), 2),
      rule('MILF', tg('milf'), 2),
      rule('onlyfans', tg('onlyfans'), 2),
      rule('BDSM', tg('bdsm'), 2),
      rule('threesome', tg('threesome'), 2),
      rule('engaging AI companions', blog('why-millions-are-switching-to-ai-companionship-lately'), 3),
      rule('personalized conversations', blog('the-rise-of-ai-companions-a-look-into-telegrams-virtual-relationships'), 3),
    ];
  }

  if (section === 'ainsfw') {
    return [
      rule('AI NSFW tools', lp('/ainsfw'), 1),
      rule('dedicated section', lp('/ainsfw'), 1),
      rule('AI girlfriend apps', ai('ai-girlfriend'), 2),
      rule('undress AI generators', ai('undress-ai'), 2),
      rule('NSFW chat companions', ai('ai-chat'), 2),
      rule('reviewed and ranked', blog('lovescape-is-the-future-of-ai-companions'), 3),
      rule('free tier', blog('ai-girlfriend-chatbots-vs-dating-apps'), 3),
      rule('NSFW conversations', blog('ai-girlfriend-chat-changing-relationships'), 3),
    ];
  }

  return [
    rule('OFsearch', '/ofsearch', 1),
    rule('OnlyFans creator profiles', '/ofsearch', 1),
    rule('OnlyFans creators', '/ofsearch', 1),
    rule('browse by category', '/ofsearch', 1),
    rule('trending creators', '/ofsearch', 1),
    rule('Curated top lists', lp('/best-onlyfans-accounts'), 1),
    rule('Asian', of('asian'), 2),
    rule('MILF', of('milf'), 2),
    rule('Latina', of('latina'), 2),
    rule('Goth', of('goth'), 2),
    rule('Petite', of('petite'), 2),
  ];
}

function findMatches(text: string, rules: FaqLinkRule[]): FaqMatch[] {
  const matches: FaqMatch[] = [];

  for (const linkRule of rules) {
    const pattern = linkRule.wordBoundary
      ? `\\b${escapeRegex(linkRule.phrase)}\\b`
      : escapeRegex(linkRule.phrase);
    const re = new RegExp(pattern, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        href: linkRule.href,
        priority: linkRule.priority,
        text: match[0],
      });
    }
  }

  matches.sort((a, b) => a.priority - b.priority || b.text.length - a.text.length || a.start - b.start);

  const chosen: FaqMatch[] = [];
  for (const candidate of matches) {
    const overlaps = chosen.some(
      (picked) => !(candidate.end <= picked.start || candidate.start >= picked.end),
    );
    if (!overlaps) chosen.push(candidate);
  }

  return chosen.sort((a, b) => a.start - b.start);
}

export function renderFaqAnswer(
  text: string,
  section: HomeFaqSectionId,
  lp: (path: string) => string,
): ReactNode {
  const rules = getRules(section, lp);
  const matches = findMatches(text, rules);

  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }
    nodes.push(
      <Link
        key={`${match.start}-${match.href}`}
        href={match.href}
        className="text-[#ff8a00] hover:text-[#ffb347] underline underline-offset-2 transition-colors"
      >
        {match.text}
      </Link>,
    );
    cursor = match.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}
