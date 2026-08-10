import Link from 'next/link';
import FallbackImage from '@/components/FallbackImage';
import type { Top10RankEntry } from '@/lib/bestTelegramGroups/top10List';

const PLACEHOLDER = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';

function imageSrc(image: string) {
  return image && image.startsWith('https://') ? image : PLACEHOLDER;
}

type Props = {
  entry: Top10RankEntry;
  joinLabel: string;
  viewsLabel: string;
  localePath: (path: string) => string;
  pageCategory?: string;
};

export default function BestGroupRankCard({ entry, joinLabel, viewsLabel, localePath, pageCategory }: Props) {
  const { group, isPremium, rank } = entry;
  if (isPremium) {
    const subs = (group.memberCount || 0).toLocaleString();
    // Short blur span only (cheaper paint). Rest of the name stays hidden.
    const clearName = group.name.slice(0, 4);
    const blurName = group.name.slice(4, 7) || '···';
    return (
      <div
        className="rounded-3xl p-6 md:p-8 relative overflow-hidden bg-[#1a1408] border-2 border-[rgba(201,151,58,0.35)]"
      >
        <div
          className="absolute top-0 left-0 px-6 py-2 rounded-br-3xl font-black text-xl z-10 bg-[#c9973a] text-[#1a1000]"
        >
          #{rank}
        </div>
        <div className="absolute top-0 right-0 m-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider z-10 bg-[rgba(201,151,58,0.15)] border border-[rgba(201,151,58,0.35)] text-[#c9973a]">
          Premium
        </div>

        <div className="flex flex-col md:flex-row gap-8 mt-4">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[rgba(201,151,58,0.3)]">
              <FallbackImage
                src={imageSrc(group.image)}
                alt=""
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                loading="lazy"
              />
            </div>
          </div>
          <div className="flex-grow flex flex-col justify-center">
            <h2 className="text-3xl font-bold mb-4">
              <span className="text-white">{clearName}</span>
              <span
                className="inline-block text-white select-none"
                style={{ filter: 'blur(4px)' }}
                aria-hidden="true"
              >
                {blurName}
              </span>
            </h2>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-[rgba(201,151,58,0.1)] border border-[rgba(201,151,58,0.25)] text-[#c9973a]">
                {subs} subscribers
              </span>
              {pageCategory && (
                <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-400 bg-white/5 border border-white/10">
                  📂 {pageCategory}
                </span>
              )}
              {(!pageCategory || group.category !== pageCategory) && (
                <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-400 bg-white/5 border border-white/10">
                  📂 {group.category}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed line-clamp-3">
              Unlock this group and thousands more in the Erogram Premium vault.
            </p>
            <div className="mt-auto">
              <a
                href="/premium"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full md:w-auto text-center font-black py-4 px-8 rounded-xl text-sm uppercase tracking-wide bg-[#c9973a] text-[#1a1000]"
              >
                Access Premium
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden">
      <div className="absolute top-0 left-0 bg-[#b31b1b] text-white px-6 py-2 rounded-br-3xl font-black text-xl z-10">
        #{rank}
      </div>
      <div className="flex flex-col md:flex-row gap-8 mt-4">
        <div className="w-full md:w-1/3 flex-shrink-0">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-800 shadow-2xl">
            <FallbackImage src={imageSrc(group.image)} alt={group.name} className="object-cover hover:scale-110 transition-transform duration-500" />
          </div>
        </div>
        <div className="flex-grow flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-4 hover:text-[#b31b1b] transition-colors">
            <Link href={localePath(`/${group.slug}`)}>{group.name}</Link>
          </h2>
          <div className="flex flex-wrap gap-3 mb-6">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
              👁️ {group.views.toLocaleString()} {viewsLabel}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
              🌍 {group.country}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
              📂 {group.category}
            </span>
          </div>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">{group.description}</p>
          <div className="mt-auto">
            <a
              href={localePath(`/${group.slug}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full md:w-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-900/20"
            >
              {joinLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
