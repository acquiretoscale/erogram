import Link from 'next/link';
import connectDB from '@/lib/db/mongodb';
import {
  Group,
  Bot,
  OnlyFansCreator,
  AINsfwToolStats,
  AINsfwSubmission,
} from '@/lib/models';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ofCreatorProfileUrl } from '@/lib/ofsearch/creatorUrls';

type TopPick = {
  id: string;
  name: string;
  image: string;
  subtitle: string;
  href: string;
};

async function getTopAinsfw(): Promise<TopPick[]> {
  try {
    await connectDB();
    const { AI_NSFW_TOOLS } = await import('@/app/ainsfw/data');
    const toolBySlug = new Map(AI_NSFW_TOOLS.map((t) => [t.slug, t]));

    const [stats, subs] = await Promise.all([
      AINsfwToolStats.find({})
        .sort({ clickCount: -1 })
        .limit(12)
        .select('slug clickCount imageOverride')
        .lean(),
      AINsfwSubmission.find({ status: 'approved', unlisted: { $ne: true } })
        .sort({ clickCount: -1 })
        .limit(12)
        .select('slug name category image clickCount')
        .lean(),
    ]);

    const rows: (TopPick & { clicks: number })[] = [];

    for (const s of stats as any[]) {
      const tool = toolBySlug.get(s.slug);
      if (!tool) continue;
      rows.push({
        id: s.slug,
        name: tool.name,
        image: s.imageOverride || tool.image,
        subtitle: tool.category,
        href: `/ainsfw/${s.slug}`,
        clicks: s.clickCount || 0,
      });
    }

    for (const s of subs as any[]) {
      rows.push({
        id: s.slug,
        name: s.name || '',
        image: s.image || '',
        subtitle: s.category || '',
        href: `/ainsfw/${s.slug}`,
        clicks: s.clickCount || 0,
      });
    }

    const best = new Map<string, TopPick & { clicks: number }>();
    for (const row of rows) {
      const prev = best.get(row.id);
      if (!prev || row.clicks > prev.clicks) best.set(row.id, row);
    }

    return [...best.values()]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 4)
      .map(({ clicks: _clicks, ...item }) => item);
  } catch {
    return [];
  }
}

async function getTopBots(): Promise<TopPick[]> {
  try {
    await connectDB();
    const bots = await Bot.find({
      status: 'approved',
      isAdvertisement: { $ne: true },
    })
      .sort({ clickCount: -1 })
      .limit(4)
      .select('name slug image category clickCount')
      .lean();

    return (bots as any[]).map((b) => ({
      id: b._id.toString(),
      name: b.name || '',
      image: b.image || '',
      subtitle: b.category || '',
      href: `/${b.slug}`,
    }));
  } catch {
    return [];
  }
}

async function getTopCreators(): Promise<TopPick[]> {
  try {
    await connectDB();
    const creators = await OnlyFansCreator.find({
      deleted: { $ne: true },
      avatar: { $ne: '' },
    })
      .sort({ clicks: -1 })
      .limit(4)
      .select('name username slug avatar price isFree clicks')
      .lean();

    return (creators as any[]).map((c) => ({
      id: c._id.toString(),
      name: c.name || '',
      image: c.avatar || '',
      subtitle: `@${c.username || ''}`,
      href: ofCreatorProfileUrl(c.username || c.slug),
    }));
  } catch {
    return [];
  }
}

async function getTopGroups(): Promise<TopPick[]> {
  try {
    await connectDB();
    const groups = await Group.find({
      status: 'approved',
      isAdvertisement: { $ne: true },
    })
      .sort({ clickCount: -1 })
      .limit(4)
      .select('name slug image category clickCount')
      .lean();

    return (groups as any[]).map((g) => ({
      id: g._id.toString(),
      name: g.name || '',
      image: g.image || '',
      subtitle: g.category || '',
      href: `/${g.slug}`,
    }));
  } catch {
    return [];
  }
}

function TopPickSection({
  title,
  emoji,
  viewAllHref,
  items,
  accent,
}: {
  title: string;
  emoji: string;
  viewAllHref: string;
  items: TopPick[];
  accent: string;
}) {
  if (!items.length) return null;

  return (
    <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06]"
        style={{ background: `linear-gradient(90deg, ${accent}12 0%, transparent 100%)` }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs shrink-0">{emoji}</span>
          <h2 className="text-[11px] font-black uppercase tracking-wide text-white/85 truncate">{title}</h2>
        </div>
        <Link
          href={viewAllHref}
          className="text-[10px] font-bold text-[#00AFF0] hover:text-white transition shrink-0"
        >
          All →
        </Link>
      </div>
      <div className="p-1.5 space-y-0.5">
        {items.map((item, idx) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.05] transition-colors"
          >
            <span
              className="w-4 text-[10px] font-black tabular-nums shrink-0"
              style={{ color: `${accent}99` }}
            >
              {idx + 1}
            </span>
            <div className="w-8 h-8 rounded-md overflow-hidden bg-[#0d1e2a] ring-1 ring-white/10 shrink-0">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-[#00AFF0]/40">
                  {item.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate group-hover:text-[#00AFF0] transition-colors leading-tight">
                {item.name}
              </p>
              {item.subtitle && (
                <p className="text-[9px] text-white/35 truncate capitalize leading-tight">{item.subtitle}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function NotFoundPage() {
  const [ainsfw, bots, creators, groups] = await Promise.all([
    getTopAinsfw(),
    getTopBots(),
    getTopCreators(),
    getTopGroups(),
  ]);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-[#f5f5f5] flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-24 pb-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-2">
            404
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Page Not Found</h2>
          <p className="text-base sm:text-lg text-gray-300 max-w-lg mx-auto leading-relaxed">
            This page doesn&apos;t exist, but there&apos;s plenty to explore.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          <TopPickSection title="Top 4 AINSFW" emoji="✨" viewAllHref="/ainsfw" items={ainsfw} accent="#a855f7" />
          <TopPickSection title="Top 4 Telegram bots" emoji="🤖" viewAllHref="/bots" items={bots} accent="#3b82f6" />
          <TopPickSection title="Top 4 OnlyFans creators" emoji="🔥" viewAllHref="/ofsearch" items={creators} accent="#00AFF0" />
          <TopPickSection title="Top 4 Telegram groups" emoji="💬" viewAllHref="/groups" items={groups} accent="#22c55e" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
