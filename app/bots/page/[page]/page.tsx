import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import connectDB from '@/lib/db/mongodb';
import { Bot } from '@/lib/models';

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
  if (!Number.isFinite(page) || page < 1) return {};

  const title = page === 1
    ? 'Discover NSFW Telegram Bots'
    : `Discover NSFW Telegram Bots – Page ${page}`;

  const description = page === 1
    ? 'Browse and discover NSFW Telegram bots. Find AI companions, chat bots, and adult entertainment bots.'
    : `Browse more NSFW Telegram bots (page ${page}). Find AI companions, chat bots, and adult entertainment bots.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/bots/page/${page}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

async function getPaginatedBots(page: number) {
  await connectDB();
  const skip = (page - 1) * PER_PAGE;

  const [total, bots] = await Promise.all([
    Bot.countDocuments({ status: 'approved' }),
    Bot.find({ status: 'approved' })
      .select('-image')
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(PER_PAGE)
      .lean(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return {
    total,
    totalPages,
    bots: bots.map((b: any) => ({
      _id: b._id.toString(),
      name: String(b.name || '').slice(0, 150),
      slug: String(b.slug || '').slice(0, 100),
      category: String(b.category || '').slice(0, 50),
      country: String(b.country || '').slice(0, 50),
      description: String(b.description || '').slice(0, 160),
      pinned: Boolean(b.pinned),
    })),
  };
}

export default async function BotsPaginatedPage(
  { params }: PageProps
) {
  const { page: pageParam } = await params;
  const page = parsePageParam(pageParam);
  if (!Number.isFinite(page) || page < 1) notFound();

  const { total, totalPages, bots } = await getPaginatedBots(page);

  // Note: we intentionally do NOT 404 for pages beyond the last page.
  // The requirement only asks to validate page >= 1. Rendering an empty
  // page keeps the route crawlable/indexable even on smaller datasets.

  const prevHref = page - 1 <= 1 ? '/bots' : `/bots/page/${page - 1}`;
  const nextHref = `/bots/page/${page + 1}`;

  return (
    <main className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black">Bots – Page {page}</h1>
          <p className="text-[#999] mt-2">Browse approved bots. {total > 0 ? `Page ${page} of ${totalPages}.` : 'No bots found.'}</p>
        </header>

        <nav aria-label="Bots pagination" className="flex flex-wrap items-center gap-3 mb-8">
          <Link
            href="/bots"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            Back to /bots
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

        <section aria-label="Bots list" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bots.map((b) => (
            <article key={b._id} className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold leading-snug">
                  <Link href={`/${b.slug}`} className="hover:underline">
                    {b.name}
                  </Link>
                </h2>
                {b.pinned && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-200">Pinned</span>
                )}
              </div>
              <p className="text-sm text-[#999] mt-2">
                {b.category} • {b.country}
              </p>
              {b.description && (
                <p className="text-sm text-gray-300 mt-3 line-clamp-3">{b.description}</p>
              )}
              <div className="mt-4">
                <Link
                  href={`/${b.slug}`}
                  className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-bold"
                >
                  Open
                </Link>
              </div>
            </article>
          ))}

          {bots.length === 0 && (
            <div className="col-span-full text-center py-16 text-[#999]">No bots found for this page.</div>
          )}
        </section>

        <nav aria-label="Bots pagination (bottom)" className="flex flex-wrap items-center justify-center gap-3 mt-10">
          {page > 1 && (
            <Link href={prevHref} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10" rel="prev">
              ← Previous
            </Link>
          )}
          <Link href="/bots" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10">
            /bots
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
