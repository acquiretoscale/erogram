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
    return (
      <div
        className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1408, #151210)', border: '2px solid rgba(201,151,58,0.35)' }}
      >
        <div
          className="absolute top-0 left-0 px-6 py-2 rounded-br-3xl font-black text-xl z-10"
          style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#1a1000' }}
        >
          #{rank}
        </div>
        <div className="absolute top-0 right-0 m-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider z-10"
          style={{ background: 'rgba(201,151,58,0.15)', border: '1px solid rgba(201,151,58,0.35)', color: '#c9973a' }}>
          Premium
        </div>

        <div className="flex flex-col md:flex-row gap-8 mt-4">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl" style={{ border: '2px solid rgba(201,151,58,0.3)' }}>
              <FallbackImage src={imageSrc(group.image)} alt="" className="object-cover" />
            </div>
          </div>
          <div className="flex-grow flex flex-col justify-center">
            <h2 className="text-3xl font-bold mb-4">
              <span className="text-white">{group.name.slice(0, 4)}</span>
              <span style={{ filter: 'blur(5px)', color: '#fff', userSelect: 'none' }}>{group.name.slice(4) || '····'}</span>
            </h2>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: 'rgba(201,151,58,0.1)', border: '1px solid rgba(201,151,58,0.25)', color: '#c9973a' }}>
                {subs} subscribers
              </span>
              {pageCategory && (
                <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  📂 {pageCategory}
                </span>
              )}
              {(!pageCategory || group.category !== pageCategory) && (
                <span className="px-3 py-1 rounded-full text-sm font-medium text-gray-400" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
                className="block w-full md:w-auto text-center font-black py-4 px-8 rounded-xl text-sm uppercase tracking-wide"
                style={{ background: 'linear-gradient(135deg, #b8860b 0%, #ffd700 40%, #fff8b0 55%, #ffd700 70%, #b8860b 100%)', color: '#3a2a00', boxShadow: '0 6px 20px -6px rgba(255,215,0,0.45)' }}
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
