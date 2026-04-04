import { Metadata } from 'next';
import Link from 'next/link';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import { getCreatorBio } from '@/app/onlyfanssearch/creatorBios';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getLocale } from '@/lib/i18n/server';
import { topCreatorsOfMeta } from '@/app/onlyfanssearch/ofMeta';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return topCreatorsOfMeta(locale);
}

export const revalidate = 60;

function formatLikes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}K`;
}

export default async function TopCreatorsPage() {
  await connectDB();

  const docs = await OnlyFansCreator.find({
    adminImported: true,
    deleted: { $ne: true },
  })
    .sort({ likesCount: -1 })
    .limit(80)
    .select('name username slug avatar likesCount price isFree telegramUrl bio')
    .lean() as any[];

  const creators = docs.map((d: any) => {
    const bioData = getCreatorBio(d.username);
    const snippet = (bioData?.bio || d.bio || '').trim();
    return {
      ...d,
      _id: d._id.toString(),
      hasTelegram: !!(d.telegramUrl || bioData?.telegram),
      snippet,
    };
  });

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <h1 className="text-3xl sm:text-4xl font-black mb-2">
          Top OnlyFans Creators{' '}
          <span className="text-[#00AFF0]">2026</span>
        </h1>
        <p className="text-white/40 mb-8 text-sm sm:text-base">
          {creators.length} largest creators ranked by total likes
        </p>

        <div className="space-y-4">
          {creators.map((c: any, i: number) => (
            <Link
              key={c._id}
              href={`/${c.slug}`}
              className="group block rounded-2xl border border-black/10 bg-white hover:bg-[#f8fbff] hover:border-[#00AFF0]/40 transition-all shadow-sm hover:shadow-md"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100">
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">
                          {(c.name || '?')[0]}
                        </div>
                      )}
                    </div>
                    <div className={`absolute -top-2 -left-2 min-w-7 h-7 px-1 rounded-lg flex items-center justify-center text-xs font-black border ${
                      i < 3
                        ? 'bg-amber-500 text-black border-amber-300'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {i + 1}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">
                        {c.name || c.username}
                      </h2>
                      <span className="text-sm text-[#00AFF0] font-semibold">@{c.username}</span>
                    </div>

                    <p className="text-sm sm:text-[15px] text-gray-600 line-clamp-2 sm:line-clamp-3">
                      {c.snippet || 'No bio available yet.'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2.5 sm:gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
                        {formatLikes(c.likesCount)} likes
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        c.isFree ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#00AFF0]/20 text-[#00AFF0]'
                      }`}>
                        {c.isFree ? 'FREE' : `$${c.price}`}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        c.hasTelegram ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {c.hasTelegram ? '✈ Telegram' : 'No Telegram'}
                      </span>
                      <span className="text-xs text-[#00AFF0] font-bold group-hover:underline">
                        Open profile
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
