import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AINsfwTool } from '@/app/ainsfw/types';
import { categoryToSlug } from '@/app/ainsfw/data';
import type { SuggestedAlternative } from '@/lib/ainsfw/pickToolAlternatives';

function variationIndex(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h + slug.charCodeAt(i)) % 10;
  }
  return h;
}

function pickLimitForVariation(index: number): number {
  if (index === 0 || index === 1 || index === 7) return 2;
  return 3;
}

function ToolLinks({ tools }: { tools: AINsfwTool[] }) {
  if (tools.length === 0) return null;
  return (
    <>
      {tools.map((alt, i) => (
        <span key={alt.slug}>
          {i > 0 && (i === tools.length - 1 ? ', and ' : ', ')}
          <Link
            href={`/ainsfw/${alt.slug}`}
            className="text-[#22c55e] font-semibold hover:underline"
          >
            {alt.name}
          </Link>
        </span>
      ))}
    </>
  );
}

function CategoryLink({ category }: { category: string }) {
  return (
    <Link
      href={`/ainsfw/${categoryToSlug(category)}`}
      className="text-[#22c55e] font-semibold hover:underline"
    >
      {category}
    </Link>
  );
}

function renderVariation(
  index: number,
  tool: AINsfwTool,
  picks: AINsfwTool[],
): ReactNode {
  const name = tool.name;
  const picksEl = <ToolLinks tools={picks} />;
  const cat = <CategoryLink category={tool.category} />;

  switch (index) {
    case 0:
      return (
        <>
          Readers who like {name} usually also check {picksEl}, two names the Erogram audience
          keeps coming back to in {cat}.
        </>
      );
    case 1:
      return (
        <>
          If {name} is your thing, you might also love {picksEl}. Both sit high on our {cat}{' '}
          shortlist.
        </>
      );
    case 2:
      return (
        <>
          Enjoying {name}? Erogram&apos;s audience tends to pair it with {picksEl}, or with our
          top pick in {cat}.
        </>
      );
    case 3:
      return (
        <>
          {name} fans usually have a second tab open. More often than not it is {picksEl}.
        </>
      );
    case 4:
      return (
        <>
          If {name} clicked for you, {picksEl} are worth a look too. They are among our favourites
          in {cat}.
        </>
      );
    case 5:
      return (
        <>
          People who spend time on {name} also tend to love {picksEl}. Our full top picks live in{' '}
          {cat}.
        </>
      );
    case 6:
      return (
        <>
          Liked {name}? The Erogram crowd also rates {picksEl} in the same space.
        </>
      );
    case 7:
      return (
        <>
          {name} pairs well with {picksEl}, both regulars on our {cat} top list.
        </>
      );
    case 8:
      return (
        <>
          If {name} is on your list, add {picksEl}. They are the ones our readers love most in{' '}
          {cat}.
        </>
      );
    case 9:
    default:
      return (
        <>
          Fans of {name} usually love {picksEl} as well. See the rest of our top picks in {cat}.
        </>
      );
  }
}

export default function AlternativesClosingBlock({
  tool,
  items,
}: {
  tool: AINsfwTool;
  items: SuggestedAlternative[];
}) {
  let index = variationIndex(tool.slug);
  let limit = pickLimitForVariation(index);
  let picks = items.slice(0, limit).map((item) => item.tool);

  if (picks.length === 1 && (index === 0 || index === 1 || index === 7)) {
    index = 3;
  }

  if (picks.length === 0) return null;

  return (
    <p className="mb-8 text-gray-300 text-base sm:text-lg leading-relaxed">
      {renderVariation(index, tool, picks)}
    </p>
  );
}
