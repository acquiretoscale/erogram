import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import connectDB from '@/lib/db/mongodb';
import { Group } from '@/lib/models';

// ISR for public pagination pages
export const revalidate = 300;

const BASE_URL = 'https://erogram.pro';
const PER_PAGE = 12;

type PageParams = { page: string };
type PageProps = { params: Promise<PageParams> };

function parsePageParam(pageParam: string): number {
  // Strictly accept positive integers only ("1", "2", ...). Reject "02", "1.5", "1a", etc.
  if (!/^[1-9]\d*$/.test(pageParam)) return NaN;
  return Number(pageParam);
}

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) {
    // For invalid params, Next will hit `notFound()` in the page component.
    return {};
  }

  const title = page === 1
    ? 'Discover NSFW Telegram Groups'
    : `Discover NSFW Telegram Groups – Page ${page}`;

  const description = page === 1
    ? 'Browse and discover NSFW Telegram groups. Find communities by category, country, and interests.'
    : `Browse more NSFW Telegram groups (page ${page}). Find communities by category, country, and interests.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/groups/page/${page}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

async function getPaginatedGroups(page: number) {
  await connectDB();

  const skip = (page - 1) * PER_PAGE;

  const [total, groups] = await Promise.all([
    Group.countDocuments({ status: 'approved' }),
    Group.find({ status: 'approved' })
      .select('-image') // avoid huge base64 strings
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(PER_PAGE)
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  return {
    total,
    totalPages,
    groups: groups.map((g: any) => ({
      _id: g._id.toString(),
      name: String(g.name || '').slice(0, 150),
      slug: String(g.slug || '').slice(0, 100),
      category: String(g.category || '').slice(0, 50),
      country: String(g.country || '').slice(0, 50),
      description: String(g.description || '').slice(0, 160),
      pinned: Boolean(g.pinned),
    })),
  };
}

export default async function GroupsPaginatedPage(
  { params }: PageProps
) {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) notFound();

  const { total, totalPages, groups } = await getPaginatedGroups(page);

  // Note: we intentionally do NOT 404 for pages beyond the last page.
  // The requirement only asks to validate page >= 1. Rendering an empty
  // page keeps the route crawlable/indexable even on smaller datasets.

  const prevHref = page - 1 <= 1 ? '/groups' : `/groups/page/${page - 1}`;
  const nextHref = `/groups/page/${page + 1}`;

  return (
    <main className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black">Groups – Page {page}</h1>
          <p className="text-[#999] mt-2">Browse approved groups. {total > 0 ? `Page ${page} of ${totalPages}.` : 'No groups found.'}</p>
        </header>

        <nav aria-label="Groups pagination" className="flex flex-wrap items-center gap-3 mb-8">
          <Link
            href="/groups"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            Back to /groups
          </Link>

          {page > 1 && (
            <Link
              href={prevHref}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
              rel="prev"
            >
              ← Previous
            </Link>
          )}

          {page < totalPages && (
            <Link
              href={nextHref}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
              rel="next"
            >
              Next →
            </Link>
          )}
        </nav>

        <section aria-label="Groups list" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <article key={g._id} className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold leading-snug">
                  <Link href={`/${g.slug}`} className="hover:underline">
                    {g.name}
                  </Link>
                </h2>
                {g.pinned && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-200">Pinned</span>
                )}
              </div>
              <p className="text-sm text-[#999] mt-2">
                {g.category} • {g.country}
              </p>
              {g.description && (
                <p className="text-sm text-gray-300 mt-3 line-clamp-3">{g.description}</p>
              )}
              <div className="mt-4">
                <Link
                  href={`/${g.slug}`}
                  className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-bold"
                >
                  Open
                </Link>
              </div>
            </article>
          ))}

          {groups.length === 0 && (
            <div className="col-span-full text-center py-16 text-[#999]">No groups found for this page.</div>
          )}
        </section>

        <nav aria-label="Groups pagination (bottom)" className="flex flex-wrap items-center justify-center gap-3 mt-10">
          {page > 1 && (
            <Link href={prevHref} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10" rel="prev">
              ← Previous
            </Link>
          )}
          <Link href="/groups" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10">
            /groups
          </Link>
          {page < totalPages && (
            <Link href={nextHref} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10" rel="next">
              Next →
            </Link>
          )}
        </nav>
      </div>
    </main>
  );
}
