'use client';

import { motion } from 'framer-motion';

interface TrendingCreator {
  _id: string;
  name: string;
  username: string;
  avatar: string;
  url: string;
  bio: string;
  categories: string[];
  position: number;
}

function TrendingCard({ creator, index }: { creator: TrendingCreator; index: number }) {
  const handleClick = () => {
    fetch(`/api/onlyfans/trending/${creator._id}/click`, { method: 'POST' }).catch(() => {});
    window.open(creator.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 * index, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleClick}
      className="group relative w-full text-left rounded-2xl bg-white overflow-hidden shadow-[0_12px_40px_-8px_rgba(0,0,0,0.35)] ring-2 ring-[#00AFF0]/35 hover:ring-[#00AFF0] hover:shadow-[0_20px_50px_-10px_rgba(0,175,240,0.45)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00AFF0]/60"
    >
      <div className="relative aspect-[3/4] bg-gray-100">
        {creator.avatar ? (
          <img
            src={creator.avatar}
            alt={`${creator.name} OnlyFans`}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl font-black text-[#00AFF0]/40 bg-gradient-to-br from-[#00AFF0]/15 to-[#00AFF0]/5">
            {creator.name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
      </div>

      <div className="px-2.5 pt-2.5 pb-3 sm:px-4 sm:pt-3.5 sm:pb-4">
        <h3 className="font-black text-[13px] sm:text-base text-gray-900 truncate leading-tight group-hover:text-[#009ADB] transition-colors">
          {creator.name}
        </h3>
        <p className="text-[11px] sm:text-sm text-[#00AFF0] mt-0.5 font-bold">@{creator.username}</p>
        {creator.bio && (
          <p className="mt-1 sm:mt-1.5 text-[11px] sm:text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{creator.bio}</p>
        )}
        {creator.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
            {creator.categories.slice(0, 2).map(cat => (
              <span key={cat} className="px-1.5 py-0.5 bg-[#00AFF0]/10 text-[#00AFF0] text-[9px] sm:text-[10px] font-bold rounded-lg capitalize border border-[#00AFF0]/20">
                {cat}
              </span>
            ))}
          </div>
        )}
        <div className="w-full mt-2 sm:mt-3 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] via-[#00B8F0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-black text-center shadow-md shadow-[#00AFF0]/30 group-hover:shadow-lg group-hover:shadow-[#00AFF0]/45 group-hover:from-[#0099d9] group-hover:to-[#00c4f0] transition-all duration-300">
          View profile
        </div>
      </div>
    </motion.button>
  );
}

export default function TrendingCreatorsBlock({ creators }: { creators: TrendingCreator[] }) {
  if (creators.length === 0) return null;

  return (
    <section className="relative max-w-7xl mx-auto px-3 sm:px-6 pb-10 sm:pb-14">
      <div className="relative rounded-2xl sm:rounded-[1.75rem] overflow-hidden border border-[#00AFF0]/40 bg-gradient-to-br from-[#00AFF0]/20 via-[#062a3d]/90 to-[#0a1620] p-0.5 sm:p-1 shadow-[0_0_80px_-20px_rgba(0,175,240,0.50)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#00AFF0]/20 blur-[100px]" />
          <div className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-[#00D4FF]/15 blur-[90px]" />
        </div>

        <div className="relative rounded-[1.25rem] sm:rounded-[1.5rem] bg-[#0d1419]/95 backdrop-blur-sm border border-white/[0.07] px-3 py-5 sm:px-8 sm:py-9">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-7">
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
              Trending <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#00AFF0]">creators</span>
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-[#00AFF0]/20 to-transparent" />
          </div>

          <div className={`grid gap-2.5 sm:gap-4 lg:gap-5 ${creators.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {creators.map((creator, i) => (
              <TrendingCard key={creator._id} creator={creator} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
