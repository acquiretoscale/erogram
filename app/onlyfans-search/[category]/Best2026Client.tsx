'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Flame, Heart, Trophy } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { OF_CATEGORIES, ofCategoryUrl } from '../constants';

interface Creator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  bio: string;
  likesCount: number;
  price: number;
  isFree: boolean;
  url: string;
  clicks: number;
}

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

type RankedItem =
  | (Creator & { type: 'organic' })
  | (TrendingCreator & { type: 'trending'; isFree?: boolean; price?: number; slug?: string; clicks?: number });

interface Props {
  category: string;
  label: string;
  top10: Creator[];
  trending: TrendingCreator[];
  allCreators: Creator[];
  categoryUrl: string;
}

const RANK_STYLE: Record<number, string> = {
  1: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/50',
  2: 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800 shadow-gray-400/40',
  3: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/40',
};

export default function Best2026Client({ category, label, top10, trending, allCreators, categoryUrl }: Props) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const ranked = useMemo<RankedItem[]>(() => {
    const items: RankedItem[] = [];
    const usedUsernames = new Set<string>();

    for (const tc of trending) {
      if (items.length >= 10) break;
      items.push({ ...tc, type: 'trending' as const });
      usedUsernames.add(tc.username);
    }
    for (const c of top10) {
      if (items.length >= 10) break;
      if (usedUsernames.has(c.username)) continue;
      usedUsernames.add(c.username);
      items.push({ ...c, type: 'organic' as const });
    }
    return items;
  }, [top10, trending]);

  const trackClick = (slug: string) => {
    fetch('/api/onlyfans/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {});
  };

  const handleToggleSave = async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const alreadySaved = savedIds.has(creatorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(creatorId); else next.add(creatorId);
      return next;
    });
    await fetch('/api/onlyfans/save', {
      method: alreadySaved ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorId }),
    }).catch(() => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(creatorId); else next.delete(creatorId);
        return next;
      });
    });
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-20">
        {/* Hero */}
        <section className="bg-gradient-to-b from-amber-900/20 via-[#111111]/80 to-[#111111] pt-8 pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Link
              href={categoryUrl}
              className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-[#00AFF0] transition-colors mb-4"
            >
              <ArrowLeft size={13} />
              All {label} OnlyFans
            </Link>

            <div className="flex items-center justify-center gap-2 mb-3">
              <Trophy size={20} className="text-amber-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400/80">Ranked 2026</span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight"
            >
              Best {label}{' '}
              <span className="text-[#00AFF0]">OnlyFans</span>{' '}
              <span className="text-amber-400">in 2026</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="mt-3 text-sm sm:text-base text-white/50 max-w-xl mx-auto"
            >
              The definitive top 10 {label.toLowerCase()} OnlyFans ranking for 2026 — based on real clicks, trending signals and community popularity.
            </motion.p>

            {/* Category pills */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-4 flex flex-wrap justify-center gap-1"
            >
              {OF_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/onlyfans-search/${cat.slug}2026`}
                  className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-all ${
                    cat.slug === category
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-white/[0.05] border-white/[0.08] text-white/40 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300'
                  }`}
                >
                  Best {cat.name} 2026
                </Link>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Top 10 Ranking ── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          <div className="relative rounded-3xl border border-amber-500/25 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/15 via-[#111111] to-[#111111]" />
            <div className="relative p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                  <Trophy size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white leading-tight">Top 10 Best {label} OnlyFans 2026</h2>
                  <p className="text-[11px] text-amber-400/60 mt-0.5">Trending #1 · Ranked by clicks &amp; popularity</p>
                </div>
              </div>

              {ranked.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">No data yet — check back soon.</p>
              ) : (
                <div className="space-y-2.5">
                  {ranked.map((item, i) => {
                    const isTrending = item.type === 'trending';
                    const rank = i + 1;
                    const rankStyle = RANK_STYLE[rank] ?? 'bg-white/[0.08] text-white/60 border border-white/[0.12]';

                    return (
                      <motion.div
                        key={`ranked-${item._id}-${i}`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.35) }}
                      >
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (isTrending) {
                              fetch(`/api/onlyfans/trending/${item._id}/click`, { method: 'POST' }).catch(() => {});
                            } else {
                              trackClick(item.slug || '');
                            }
                          }}
                          className={`group flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl transition-all duration-200 hover:bg-white/[0.05] ${
                            isTrending ? 'ring-1 ring-orange-500/40 bg-orange-500/[0.04]' : ''
                          }`}
                        >
                          {/* Rank badge */}
                          <span className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-[12px] sm:text-[13px] font-black shadow-md ${rankStyle}`}>
                            {rank}
                          </span>

                          {/* Avatar */}
                          <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-gray-200 ${
                            isTrending ? 'ring-2 ring-orange-400/50' : rank <= 3 ? 'ring-2 ring-amber-400/40' : ''
                          }`}>
                            {item.avatar ? (
                              <img
                                src={item.avatar}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                loading={i < 5 ? 'eager' : 'lazy'}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
                                {item.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[13px] sm:text-sm text-white group-hover:text-[#00AFF0] transition-colors truncate">
                                {item.name}
                              </span>
                              {isTrending && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[8px] font-black uppercase tracking-wide">
                                  <Flame size={7} fill="currentColor" />
                                  Trending
                                </span>
                              )}
                              {!isTrending && item.isFree !== undefined && (
                                <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                  item.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'
                                }`}>
                                  {item.isFree ? 'Free' : `$${(item.price || 0).toFixed(0)}`}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#00AFF0]/70 mt-0.5">@{item.username}</p>
                            {item.bio && (
                              <p className="text-[11px] text-white/35 mt-0.5 line-clamp-1">{item.bio}</p>
                            )}
                          </div>

                          {/* CTA */}
                          <span className={`flex-shrink-0 hidden sm:block px-3 py-1.5 rounded-xl text-white text-[11px] font-bold transition-all ${
                            isTrending
                              ? 'bg-gradient-to-r from-orange-500 to-rose-500 group-hover:from-orange-600 group-hover:to-rose-600'
                              : 'bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] group-hover:from-[#009ADB] group-hover:to-[#00BFE8]'
                          }`}>
                            View
                          </span>
                        </a>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── More creators ── */}
        {allCreators.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base sm:text-lg font-black text-white/80">
                More {label} OnlyFans Creators
              </h2>
              <Link href={categoryUrl} className="text-xs text-[#00AFF0]/60 hover:text-[#00AFF0] transition-colors">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {allCreators.slice(0, 20).map((creator, i) => (
                <motion.div
                  key={creator._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                  className="relative"
                >
                  <a
                    href={creator.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick(creator.slug)}
                    className="group block rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-[3/4] bg-gray-100">
                      {creator.avatar ? (
                        <img
                          src={creator.avatar}
                          alt={`${creator.name} OnlyFans`}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                          {creator.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="px-2 pt-1.5 pb-2">
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold text-[11px] sm:text-[12px] text-gray-900 truncate leading-tight">
                          {creator.name}
                        </h3>
                        <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[7px] font-extrabold uppercase ${
                          creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'
                        }`}>
                          {creator.isFree ? 'Free' : `$${creator.price.toFixed(0)}`}
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-[#00AFF0] mt-0.5 truncate">@{creator.username}</p>
                    </div>
                  </a>
                  <button
                    onClick={() => handleToggleSave(creator._id)}
                    className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110"
                  >
                    <Heart
                      size={13}
                      className={savedIds.has(creator._id) ? 'text-rose-500' : 'text-white/70'}
                      fill={savedIds.has(creator._id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <h3 className="text-sm font-black text-white/50 mb-3">Best OnlyFans by Category 2026</h3>
          <div className="flex flex-wrap gap-1.5">
            {OF_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/onlyfans-search/${cat.slug}2026`}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[10px] text-white/40 hover:text-amber-300 hover:border-amber-500/30 transition-all"
              >
                Best {cat.name} 2026
              </Link>
            ))}
          </div>
          <p className="text-[10px] text-white/20 mt-6">
            &copy; {new Date().getFullYear()} Erogram — Best OnlyFans Rankings 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
