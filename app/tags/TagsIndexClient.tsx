'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { TagIndexItem } from '@/lib/actions/tags';

const HEADING = '#331a26';
const TAG_TEXT = '#1a1a1a';
const COUNT_TEXT = '#888888';

export default function TagsIndexClient({ tags }: { tags: TagIndexItem[] }) {
  const letters = [...new Set(tags.map((t) => t.letter))].sort((a, b) => {
    if (a === '#') return -1;
    if (b === '#') return 1;
    return a.localeCompare(b);
  });

  const byLetter = (letter: string) => tags.filter((t) => t.letter === letter);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14">
        <h1
          className="mb-10 text-[2.75rem] font-bold leading-none tracking-tight sm:text-[3.25rem]"
          style={{ color: HEADING }}
        >
          TAGS
        </h1>

        <div className="columns-2 gap-x-10 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6">
          {letters.map((letter) => (
            <section key={letter} className="mb-8 break-inside-avoid">
              <h2
                className="mb-2 text-lg font-bold leading-tight sm:text-xl"
                style={{ color: HEADING }}
              >
                {letter}
              </h2>
              <ul className="space-y-0.5">
                {byLetter(letter).map((tag) => (
                  <li key={tag.slug}>
                    <Link
                      href={`/tags/${tag.slug}`}
                      className="text-[13px] leading-snug hover:underline sm:text-sm"
                      style={{ color: TAG_TEXT }}
                    >
                      {tag.label}
                      <span style={{ color: COUNT_TEXT }}> ({tag.total})</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
