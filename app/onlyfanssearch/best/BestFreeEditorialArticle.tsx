import Link from 'next/link';
import Image from 'next/image';
import type { BestFreeArticleCopy, BestFreeCreatorEntry } from '@/lib/onlyfans/bestFreeArticle/types';
import BestFreeCreatorEntry from './BestFreeCreatorEntry';

type Props = {
  ranking: BestFreeCreatorEntry[];
  copy: BestFreeArticleCopy;
};

export default function BestFreeEditorialArticle({ ranking, copy }: Props) {
  if (!ranking.length) return null;

  const h1 = copy.h1 || 'Best Free OnlyFans Accounts';
  const showIntro = copy.introParagraphs.length > 0;
  const showOutro = copy.outroParagraphs.length > 0;

  return (
    <article className="max-w-xl mx-auto px-4 sm:px-6 pb-16 text-base sm:text-lg leading-relaxed text-white/55">
      <header className="pt-10 sm:pt-12 border-t border-white/[0.06]">
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight">{h1}</h1>
        {showIntro
          ? copy.introParagraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mb-4">
                {p}
              </p>
            ))
          : null}
        <p className="mb-8 text-sm text-white/40">
          Ranked by Erogram clicks and likes. Updated from live index.{' '}
          <Link href="/onlyfanssearch" className="text-[#00AFF0] hover:underline">
            Browse all OnlyFans
          </Link>
          {' · '}
          <Link href="/submit" className="text-[#00AFF0] hover:underline">
            Get listed free
          </Link>
        </p>
      </header>

      <nav className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <p className="text-xs font-black uppercase tracking-wider text-white/40 mb-3">On this page</p>
        <ol className="space-y-1.5 text-sm">
          {ranking.map(({ facts }) => (
            <li key={facts.username}>
              <a href={`#creator-${facts.username}`} className="text-[#00AFF0] hover:underline">
                #{facts.rank} {facts.name}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {ranking.map((entry) => (
        <BestFreeCreatorEntry key={entry.facts.username} entry={entry} />
      ))}

      {showOutro ? (
        <footer className="pt-10 border-t border-white/[0.06]">
          {copy.outroParagraphs.map((p) => (
            <p key={p.slice(0, 40)} className="mb-4">
              {p}
            </p>
          ))}
        </footer>
      ) : null}

      <footer className="flex items-center gap-5 pt-8 mt-8 border-t border-white/[0.08]">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-2 ring-[#00AFF0]/30 shrink-0">
          <Image
            src="/assets/blog/authors/eros.webp"
            alt={copy.authorName}
            width={96}
            height={96}
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div>
          <p className="text-white font-bold text-base sm:text-lg">{copy.authorName}</p>
          <p className="text-white/40 text-sm">{copy.authorTitle}</p>
          {copy.authorBio ? (
            <p className="text-white/45 text-sm mt-2 leading-relaxed">{copy.authorBio}</p>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
