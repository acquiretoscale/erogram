'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { TagCreatorResult, TagGroupResult, TagTop10Block } from '@/lib/actions/tags';
import type { TagRankingPage } from '@/lib/tags/rankings';
import TagOfSection from './TagOfSection';
import { categorySlug } from '@/app/groups/constants';

const HEADING = '#331a26';
const COUNT_TEXT = '#888888';

function GroupCard({ group }: { group: TagGroupResult }) {
  const img =
    group.image?.startsWith('http') ? group.image : group.image || '/assets/image.jpg';
  return (
    <Link
      href={`/${group.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-lg border border-[#ececec] bg-white p-3 transition-shadow hover:shadow-md"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#f5f5f5]">
        <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#1a1a1a] group-hover:underline">{group.name}</p>
        {group.memberCount > 0 && (
          <p className="text-xs text-[#888]">{group.memberCount.toLocaleString()} members</p>
        )}
        {group.description && (
          <p className="mt-1 line-clamp-2 text-xs text-[#666]">{group.description}</p>
        )}
      </div>
    </Link>
  );
}

export default function TagDetailClient({
  label,
  groupCount,
  creatorCount,
  total,
  groups,
  rankingPages,
  top10,
  categoryBrowseHref,
  creators,
}: {
  label: string;
  slug: string;
  groupCount: number;
  creatorCount: number;
  total: number;
  groups: TagGroupResult[];
  rankingPages: (TagRankingPage & { previewAvatars: string[] })[];
  top10: TagTop10Block | null;
  categoryBrowseHref: string | null;
  creators: TagCreatorResult[];
}) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8 sm:py-14">
        <Link
          href="/tags"
          className="mb-6 inline-block text-sm hover:underline"
          style={{ color: COUNT_TEXT }}
        >
          ← All tags
        </Link>

        <h1
          className="text-[2.25rem] font-bold leading-tight sm:text-[2.75rem]"
          style={{ color: HEADING }}
        >
          {label}
        </h1>
        <p className="mt-2 text-sm" style={{ color: COUNT_TEXT }}>
          {total.toLocaleString()} results
          {groupCount > 0 && creatorCount > 0
            ? ` · ${groupCount} groups · ${creatorCount} creators`
            : ''}
        </p>

        {groups.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold" style={{ color: HEADING }}>
              Telegram Groups
              <span className="ml-2 text-base font-normal" style={{ color: COUNT_TEXT }}>
                ({groupCount})
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <GroupCard key={g._id} group={g} />
              ))}
            </div>
            {groupCount > groups.length && (
              <Link
                href={`/best-telegram-groups/${categorySlug(label)}`}
                className="mt-4 inline-block text-sm font-medium hover:underline"
                style={{ color: HEADING }}
              >
                Browse all {label} groups →
              </Link>
            )}
          </section>
        )}

        <TagOfSection
          label={label}
          rankingPages={rankingPages}
          top10={top10}
          categoryBrowseHref={categoryBrowseHref}
          creators={creators}
          creatorCount={creatorCount}
        />
      </main>
      <Footer />
    </div>
  );
}
