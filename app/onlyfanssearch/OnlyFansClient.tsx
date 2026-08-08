'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Bookmark, Crown, Trash2, X, Heart, Clock, TrendingUp, Globe, Send, ImageIcon } from 'lucide-react';
import { OF_CATEGORY_MAP, OF_SEARCH_HUB_CATEGORY_SLUGS } from './constants';
import { bestOfBlogSlug, getTopBestOfByType, BEST_OF_PAGE_MAP, type BestOfPage } from '@/app/best-onlyfans-accounts/bestOfPages';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import { ofCreatorProfileUrl, ofOutboundUrl } from '@/lib/onlyfanssearch/creatorUrls';
import { trackCreatorClick, trackTrendingClick } from '@/lib/actions/onlyfansTracking';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { getTrendingCreators } from '@/lib/actions/publicData';
import { deleteCreatorBySlug } from '@/lib/actions/ofCreatorsBrowse';
import type { TopLikedCreatorPhoto } from '@/lib/actions/profileFeed';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';
import Footer from '@/components/Footer';
import ProfileOFPremiumSearch from '@/app/profile/ProfileOFPremiumSearch';
import { OF_SEARCH_TOKENS, ofSearchNavProps } from '@/app/onlyfanssearch/ofSearchTokens';
import OnlyFansEditorialSeo from './OnlyFansEditorialSeo';

const POPULAR_ONLYFANS_CATEGORIES = [
  { label: 'Asian', slug: 'asian' },
  { label: 'Blonde', slug: 'blonde' },
  { label: 'Teen', slug: 'teen' },
  { label: 'MILF', slug: 'milf' },
  { label: 'Amateur', slug: 'amateur' },
  { label: 'Redhead', slug: 'redhead' },
  { label: 'Goth', slug: 'goth' },
  { label: 'Petite', slug: 'petite' },
  { label: 'Big Ass', slug: 'big-ass' },
  { label: 'Big Boobs', slug: 'big-boobs' },
  { label: 'Brunette', slug: 'brunette' },
  { label: 'Latina', slug: 'latina' },
  { label: 'Ahegao', slug: 'ahegao' },
  { label: 'Alt', slug: 'alt' },
  { label: 'Cosplay', slug: 'cosplay' },
  { label: 'Streamer', slug: 'streamer' },
  { label: 'Fitness', slug: 'fitness' },
  { label: 'JOI', slug: 'joi' },
  { label: 'Lesbian', slug: 'lesbian' },
  { label: 'Tattoo', slug: 'tattoo' },
  { label: 'Curvy', slug: 'curvy' },
  { label: 'Ebony', slug: 'ebony' },
  { label: 'Feet', slug: 'feet' },
  { label: 'Lingerie', slug: 'lingerie' },
  { label: 'Thick', slug: 'thick' },
  { label: 'Twerk', slug: 'twerk' },
  { label: 'Squirt', slug: 'squirt' },
] as const;

interface Creator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  header?: string;
  extraPhotos?: string[];
  categories?: string[];
  subscriberCount?: number;
  likesCount: number;
  photosCount: number;
  videosCount: number;
  price: number;
  isFree: boolean;
  url: string;
  clicks: number;
  redirectToOF?: boolean;
  liveHourStart?: number;
  liveHourEnd?: number;
  instagramUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  telegramUrl?: string;
  fanslyUrl?: string;
  fanvueUrl?: string;
  redditUrl?: string;
  patreonUrl?: string;
  website?: string;
  linktreeUrl?: string;
  allmylinksUrl?: string;
  beaconsUrl?: string;
  erogramSaves?: number;
  isCommunityFeatured?: boolean;
}

type CommunitySocialBadge = {
  key: string;
  label: string;
  icon: ReactNode;
};

function OnlyFansLogoIcon() {
  return (
    <svg className="w-[24px] h-[24px]" viewBox="0 0 24 24" fill="#00AFF0" aria-hidden="true">
      <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
    </svg>
  );
}

function InstagramLogoIcon({ gradId }: { gradId: string }) {
  return (
    <svg className="w-[24px] h-[24px]" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="25%" stopColor="#fa7e1e" />
          <stop offset="50%" stopColor="#d62976" />
          <stop offset="75%" stopColor="#962fbf" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke={`url(#${gradId})`} strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.2" fill={`url(#${gradId})`} />
    </svg>
  );
}

function getCommunitySocialBadges(creator: Creator): CommunitySocialBadge[] {
  const badges: CommunitySocialBadge[] = [];
  const add = (key: string, label: string, icon: ReactNode, show: boolean) => {
    if (!show) return;
    badges.push({ key, label, icon });
  };

  add('onlyfans', 'OnlyFans', <OnlyFansLogoIcon />, !!creator.username);
  add('instagram', 'Instagram', <InstagramLogoIcon gradId={`ig-community-${creator._id}`} />, !!creator.instagramUrl?.trim());
  add('fansly', 'Fansly', (
    <img src="/assets/platforms/fansly-logo.webp" alt="" className="h-[24px] w-auto object-contain" loading="lazy" decoding="async" />
  ), !!creator.fanslyUrl?.trim());
  add('twitter', 'X', (
    <svg className="w-[24px] h-[24px] text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  ), !!creator.twitterUrl?.trim());
  add('tiktok', 'TikTok', (
    <svg className="w-[24px] h-[24px] text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  ), !!creator.tiktokUrl?.trim());
  add('telegram', 'Telegram', <Send size={24} className="text-white" strokeWidth={2.4} />, !!creator.telegramUrl?.trim());
  add('fanvue', 'Fanvue', (
    <img src="/assets/platforms/fanvue-logo.webp" alt="" className="h-[24px] w-auto object-contain" loading="lazy" decoding="async" />
  ), !!creator.fanvueUrl?.trim());
  add('reddit', 'Reddit', (
    <svg className="w-[24px] h-[24px] text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  ), !!creator.redditUrl?.trim());
  add('patreon', 'Patreon', (
    <img src="/assets/platforms/patreon-logo.webp" alt="" className="h-[24px] w-auto object-contain" loading="lazy" decoding="async" />
  ), !!creator.patreonUrl?.trim());
  add('linktree', 'Linktree', <Globe size={24} className="text-white" strokeWidth={2.4} />, !!creator.linktreeUrl?.trim());
  add('allmylinks', 'AllMyLinks', <Globe size={24} className="text-white" strokeWidth={2.4} />, !!creator.allmylinksUrl?.trim());
  add('beacons', 'Beacons', <Globe size={24} className="text-white" strokeWidth={2.4} />, !!creator.beaconsUrl?.trim());
  add('website', 'Website', <Globe size={24} className="text-white" strokeWidth={2.4} />, !!creator.website?.trim());

  return badges;
}

function openCommunityProfile(username: string, slug: string, onTrack: (slug: string) => void) {
  onTrack(slug);
  const path = ofCreatorProfileUrl(username);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    window.open(`/join-erogram?redirect=${encodeURIComponent(path)}`, '_blank', 'noopener,noreferrer');
    return;
  }
  window.open(path, '_blank', 'noopener,noreferrer');
}

function MostLikedPhotoCard({
  photo,
  onTrack,
}: {
  photo: TopLikedCreatorPhoto;
  onTrack: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => openCommunityProfile(photo.creatorUsername, photo.creatorSlug, onTrack)}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#eef4f8] shadow-md hover:border-[#00AFF0]/35 hover:shadow-lg transition-all text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00AFF0]"
      aria-label={photo.creatorName}
    >
      <div className="aspect-[3/4] overflow-hidden bg-gray-100">
        <img
          src={photo.url}
          alt=""
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
        <Heart size={11} fill="currentColor" aria-hidden="true" />
        <span>{photo.likeCount}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-2.5 py-2 bg-gradient-to-t from-black/75 via-black/45 to-transparent">
        <p className="text-[11px] sm:text-[12px] font-bold text-white truncate">{photo.creatorName}</p>
      </div>
    </button>
  );
}

function communityExtras(creator: Creator): string[] {
  const avatar = (creator.avatar || '').trim();
  const cover = (creator.header || '').trim();
  const seen = new Set<string>([avatar].filter(Boolean));
  const out: string[] = [];
  // Cover always first (left) when it exists and is not the avatar
  if (cover.startsWith('http') && !seen.has(cover)) {
    seen.add(cover);
    out.push(cover);
  }
  for (const url of creator.extraPhotos || []) {
    const u = (url || '').trim();
    if (!u.startsWith('http') || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= 4) break;
  }
  return out;
}

function CommunityProfileRow({
  creator,
  onTrack,
  isSaved = false,
  onToggleSave,
}: {
  creator: Creator;
  onTrack: (slug: string) => void;
  showErogramSaves?: boolean;
  isSaved?: boolean;
  onToggleSave?: (creatorId: string) => void;
}) {
  const socials = getCommunitySocialBadges(creator);
  const avatar = (creator.avatar || '').trim();
  const cover = (creator.header || '').trim() || avatar;
  const extras = communityExtras(creator);
  const saves = creator.erogramSaves ?? 0;
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
  }, []);

  const previewPhotos =
    extras.length > 0
      ? extras.slice(0, 4)
      : [...new Set([avatar, cover].filter((u) => u.startsWith('http')))].slice(0, 2);

  const goAuth = () => {
    const path = ofCreatorProfileUrl(creator.username);
    window.open(`/join-erogram?redirect=${encodeURIComponent(path)}`, '_blank', 'noopener,noreferrer');
  };

  const handleVisit = (e: React.MouseEvent) => {
    e.stopPropagation();
    openCommunityProfile(creator.username, creator.slug, onTrack);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!localStorage.getItem('token')) {
      goAuth();
      return;
    }
    onToggleSave?.(creator._id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openCommunityProfile(creator.username, creator.slug, onTrack)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCommunityProfile(creator.username, creator.slug, onTrack);
        }
      }}
      className={`group relative flex h-full w-full flex-col text-left overflow-hidden rounded-2xl border bg-[#0d1824] shadow-md hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00AFF0] ${
        creator.isCommunityFeatured
          ? 'border-white/20 shadow-[0_10px_28px_-14px_rgba(0,0,0,0.65)] hover:border-white/30'
          : 'border-white/10 hover:border-[#00AFF0]/45 hover:shadow-[0_12px_32px_-12px_rgba(0,175,240,0.45)]'
      }`}
      aria-label={`@${creator.username}`}
    >
      {/* Full-bleed cover — same effect as the horizontal visit cards */}
      <div className="absolute inset-0" aria-hidden="true">
        {cover.startsWith('http') ? (
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0a1c2e] via-[#12324a] to-[#00AFF0]/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/75 to-black/88" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />
      </div>

      <div className="relative flex flex-1 flex-col gap-2.5 p-3 sm:p-3.5">
        {/* Avatar — centered, IG ring */}
        <div className="flex justify-center pt-1 shrink-0">
          <div
            className="rounded-full p-[2.5px] bg-gradient-to-tr from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5] shadow-lg"
            aria-hidden="true"
          >
            <div className="rounded-full p-[2px] bg-[#0d1824]">
              <div className="w-[14rem] h-[14rem] sm:w-[15.25rem] sm:h-[15.25rem] rounded-full overflow-hidden bg-[#1a2a3a] ring-1 ring-white/10">
                {avatar.startsWith('http') ? (
                  <img
                    src={avatar}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-black text-[#00AFF0]/70">
                    {(creator.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Handle + featured pill (below avatar — never covers photo) */}
        <div className="flex flex-col items-center gap-1 shrink-0 px-1">
          <p className="text-center text-[17px] sm:text-[18px] font-black text-white truncate leading-tight drop-shadow-sm w-full">
            @{creator.username}
          </p>
          {creator.isCommunityFeatured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#d4af37]/30 bg-black/35 text-[#e8dcc0]/90 text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Crown size={9} className="text-[#d4af37]/75 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              Featured
            </span>
          )}
        </div>

        {/* Socials — fixed height so all cards match */}
        <div className="flex items-center justify-center gap-1.5 h-8 shrink-0 pointer-events-none" aria-hidden="true">
          {socials.slice(0, 4).map((social) => (
            <span
              key={social.key}
              title={social.label}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/45 border border-white/15 backdrop-blur-sm [&_svg]:w-6 [&_svg]:h-6 [&_img]:h-6"
            >
              {social.icon}
            </span>
          ))}
        </div>

        {/* Preview photos — fixed 2x2 slot (same height as 4-picture cards) */}
        <div className="grid grid-cols-2 grid-rows-2 gap-1.5 w-[64%] mx-auto h-[10.5rem] sm:h-[11.5rem] shrink-0" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, idx) => {
            const src = previewPhotos[idx];
            const blurLocked = !loggedIn && previewPhotos.length > 2 && idx >= 2;
            if (!src) {
              return <div key={`empty-${idx}`} className="min-h-0 rounded-lg" />;
            }
            return (
              <div
                key={`${src}-${idx}`}
                className="relative min-h-0 rounded-lg overflow-hidden border border-white/25 shadow-md ring-1 ring-black/20 bg-black/30"
              >
                <img
                  src={src}
                  alt=""
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${blurLocked ? 'blur-md scale-110' : ''}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                {blurLocked && <div className="absolute inset-0 bg-black/25" />}
              </div>
            );
          })}
        </div>

        {/* Visit + Bookmarks */}
        <div className="mt-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            title="click to visit erogram profile"
            onClick={handleVisit}
            className={`${CREATOR_VIEW_PROFILE_BTN} !w-auto flex-1`}
          >
            Visit Profile
          </button>
          <button
            type="button"
            title="click to bookmark creator"
            onClick={handleBookmark}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl bg-[#0084BD] text-white text-[12px] sm:text-sm font-black shadow-lg border border-[#0084BD] hover:bg-[#0070A3] transition-colors"
          >
            <Bookmark size={14} className="shrink-0" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            <span className="tabular-nums">{saves.toLocaleString()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BookmarkedProfilesSection({
  title,
  ariaLabel,
  creators,
  onTrack,
  columns = 1,
}: {
  title: string;
  ariaLabel: string;
  creators: Creator[];
  onTrack: (slug: string) => void;
  columns?: 1 | 4;
}) {
  if (creators.length === 0) return null;

  if (columns === 4) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pt-6 sm:pb-10" aria-label={ariaLabel}>
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <Bookmark size={18} className="text-[#00AFF0]" fill="currentColor" />
          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">{title}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: BOOKMARKED_BLOCKS }, (_, blockIdx) =>
            creators.slice(
              blockIdx * BOOKMARKED_PER_BLOCK,
              blockIdx * BOOKMARKED_PER_BLOCK + BOOKMARKED_PER_BLOCK,
            ),
          )
            .filter((block) => block.length > 0)
            .map((block, blockIdx) => (
              <div key={blockIdx} className="rounded-xl bg-[#eef4f8] border border-white/10 p-1.5 sm:p-2 shadow-md flex flex-col gap-1.5 sm:gap-2">
                {block.map((creator) => (
                  <CommunityProfileRow
                    key={creator._id}
                    creator={creator}
                    onTrack={onTrack}
                    showErogramSaves
                  />
                ))}
              </div>
            ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pt-6 sm:pb-10" aria-label={ariaLabel}>
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <Bookmark size={18} className="text-[#00AFF0]" fill="currentColor" />
        <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-xl bg-[#eef4f8] border border-white/10 p-1.5 sm:p-2 shadow-md flex flex-col gap-1.5 sm:gap-2">
          {creators.map((creator) => (
            <CommunityProfileRow
              key={creator._id}
              creator={creator}
              onTrack={onTrack}
              showErogramSaves
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const BOOKMARKED_BLOCKS = 4;
const BOOKMARKED_PER_BLOCK = 5;
const PROFILES_PER_BLOCK = 40;

interface TrendingCreatorItem {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  rank: number;
  points: number;
  pointsDelta: number;
  rankChange: number;
}

interface Props {
  initialCreators: Creator[];
  totalCreators: number;
  initialQuery?: string;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string; bannerDevice?: 'all' | 'mobile' | 'desktop' }>;
  trendingOnErogram?: TrendingCreatorItem[];
  communityCreators?: Creator[];
  topBookmarkedRecent?: Creator[];
  topLikedCreators?: Creator[];
  topLikedPhotos?: TopLikedCreatorPhoto[];
  paidFeatured?: any[];
  visitorCountryCode?: string;
}

function mergeFeaturedLists(paid: any[], rail: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const c of [...paid, ...rail]) {
    const u = (c.username || '').toLowerCase();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(c);
  }
  return out;
}

function featuredCoverSrc(tc: { album?: string[]; avatar?: string }) {
  const album = tc.album?.find((url) => typeof url === 'string' && url.startsWith('http'));
  return album || tc.avatar || '';
}

function pickFeaturedBlock(list: any[]) {
  return [...list].sort(() => Math.random() - 0.5).slice(0, 4);
}

function isCreatorLiveNow(start: number, end: number): boolean {
  if (start < 0 || end < 0) return false;
  const gmtHour = new Date().getUTCHours();
  if (start <= end) return gmtHour >= start && gmtHour < end;
  return gmtHour >= start || gmtHour < end;
}

function FeaturedLiveBadge({ liveHourStart, liveHourEnd }: { liveHourStart?: number; liveHourEnd?: number }) {
  if (!isCreatorLiveNow(liveHourStart ?? -1, liveHourEnd ?? -1)) return null;
  return (
    <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[10px] font-black text-white uppercase tracking-wider">Live</span>
    </div>
  );
}

const CREATOR_VIEW_PROFILE_BTN =
  'w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-xl bg-[#0084BD] text-white text-[12px] sm:text-sm font-black text-center shadow-lg border border-[#0084BD] group-hover:bg-[#0070A3] transition-colors no-underline';

const FEATURED_CTA =
  'w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-[13px] sm:text-sm font-bold text-center shadow-sm group-hover:shadow-md group-hover:from-[#009ADB] group-hover:to-[#00BFE8] transition-all';

function formatCount(n: number) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}K`;
}

function BestAccountsLinksSection() {
  const lp = useLocalePath();

  const categories = useMemo(
    () =>
      OF_SEARCH_HUB_CATEGORY_SLUGS.map((slug) => OF_CATEGORY_MAP.get(slug))
        .filter((c): c is NonNullable<ReturnType<typeof OF_CATEGORY_MAP.get>> => !!c && BEST_OF_PAGE_MAP.has(c.slug)),
    [],
  );

  const columns = useMemo(() => {
    const perCol = 5;
    return [
      { key: 'look', title: '10 Best OnlyFans · Look & body', items: categories.slice(0, perCol) },
      { key: 'style', title: '10 Best OnlyFans · Style & vibe', items: categories.slice(perCol, perCol * 2) },
      { key: 'niche', title: '10 Best OnlyFans · Niches & kinks', items: categories.slice(perCol * 2, perCol * 3) },
    ];
  }, [categories]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2" aria-label="Best OnlyFans accounts by category">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3 px-0.5">
        <h2 className="text-base sm:text-lg font-black text-white">Best OnlyFans Accounts by Category</h2>
        <Link
          href={lp('/best-onlyfans-accounts')}
          className="text-[11px] sm:text-xs font-bold text-[#00AFF0] hover:text-[#009AD6] transition-colors"
        >
          View all categories →
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {columns.map((col) => (
          <nav
            key={col.key}
            aria-label={col.title}
            className="rounded-xl border border-white/10 bg-white px-3 py-4 sm:px-4"
          >
            <h3 className="text-sm sm:text-[15px] font-bold text-[#2B1B28] mb-2.5 leading-snug">{col.title}</h3>
            <ul className="list-none m-0 p-0">
              {col.items.map((cat) => {
                const href = lp(`/best-onlyfans-accounts/${cat.slug}`);
                const linkText = `10 Best ${cat.name} OnlyFans Accounts`;
                return (
                  <li key={cat.slug} className="border-b border-[rgba(43,27,40,0.08)] last:border-b-0">
                    <Link
                      href={href}
                      className="block py-2 text-[11px] sm:text-[12px] font-semibold leading-snug text-[#2B1B28] no-underline hover:text-[#00AFF0] transition-colors"
                    >
                      {linkText}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>
    </section>
  );
}

function Top10RankingsSection() {
  const lp = useLocalePath();
  const niches = useMemo(() => getTopBestOfByType('niche'), []);
  const regions = useMemo(() => getTopBestOfByType('country'), []);
  const states = useMemo(() => getTopBestOfByType('state'), []);

  const groups: { key: string; title: string; items: BestOfPage[] }[] = [
    { key: 'niche', title: 'TOP 10 ranking by niches', items: niches },
    { key: 'region', title: 'Top 10 ranking by Region', items: regions },
    { key: 'state', title: 'Top 10 ranking by States in the United States', items: states },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2" aria-label="Top 10 OnlyFans model rankings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {groups.map((group) => (
          <nav
            key={group.key}
            aria-label={group.title}
            className="rounded-xl border border-[rgba(43,27,40,0.1)] bg-[#F7F4EC] px-3 py-4 sm:px-4"
          >
            <h2 className="text-sm sm:text-[15px] font-bold text-[#2B1B28] mb-2.5 leading-snug">{group.title}</h2>
            <ul className="list-none m-0 p-0">
              {group.items.map((page) => {
                const href = lp(`/onlyfanssearch/${bestOfBlogSlug(page.slug)}`);
                const linkText = `Top 10 ${page.label} OnlyFans Models`;
                return (
                  <li key={page.slug} className="border-b border-[rgba(43,27,40,0.08)] last:border-b-0">
                    <Link
                      href={href}
                      className="block py-2 text-[11px] sm:text-[12px] font-semibold leading-snug text-[#2B1B28] no-underline hover:text-[#00AFF0] transition-colors"
                    >
                      {linkText}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>
    </section>
  );
}

function CreatorCard({
  creator,
  onClickTrack,
  isAdmin,
  onDelete,
  isSaved,
  onToggleSave,
}: {
  creator: Creator;
  onClickTrack: (slug: string) => void;
  isAdmin: boolean;
  onDelete?: (slug: string) => void;
  isSaved?: boolean;
  onToggleSave?: (creatorId: string) => void;
}) {
  const { t } = useTranslation();
  const [deleted, setDeleted] = useState(false);
  const [showHeader, setShowHeader] = useState(false);
  const hasHeader = !!creator.header;

  const handleViewProfileClick = () => {
    onClickTrack(creator.slug);
  };

  if (deleted) return null;

  const currentImg = showHeader && hasHeader ? creator.header : creator.avatar;

  return (
    <div className="relative h-full">
      {isAdmin && (
        <div className="absolute top-2 left-2 z-20 flex gap-1.5">
          <span className="h-7 px-2 flex items-center rounded-full bg-black/60 text-white text-[11px] font-bold backdrop-blur-sm tabular-nums" title="Total clicks">
            {creator.clicks ?? 0}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!confirm(`Delete @${creator.username}?`)) return;
              onDelete?.(creator.slug);
              setDeleted(true);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-sm transition-all"
            title="Delete creator"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
      <div className="group h-full flex flex-col rounded-2xl bg-white overflow-hidden shadow-md hover:shadow-xl transition-shadow">
        <div className="flex-1 flex flex-col">
          <div className="relative aspect-[3/4] bg-gray-100">
            {currentImg ? (
              <img
                src={currentImg}
                alt={`${creator.name} OnlyFans`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                {creator.name.charAt(0)}
              </div>
            )}
            {hasHeader && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHeader(!showHeader); }}
                className="absolute bottom-2 left-2 z-10 flex gap-1"
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${!showHeader ? 'bg-white scale-110' : 'bg-white/40'}`} />
                <span className={`w-1.5 h-1.5 rounded-full transition-all ${showHeader ? 'bg-white scale-110' : 'bg-white/40'}`} />
              </button>
            )}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave?.(creator._id); }}
              className={`absolute top-2 right-2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                isSaved
                  ? 'bg-[#00AFF0] text-white shadow-lg'
                  : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white'
              }`}
              title={isSaved ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
            >
              <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="px-2.5 pt-2 sm:px-4 sm:pt-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">
                {creator.name}
              </h3>
              <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide ${
                creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#0084BD] text-white'
              }`}>
                {creator.isFree ? t('ofSearch.free') : `$${(creator.price ?? 0).toFixed(0)}`}
              </span>
            </div>
            <p className="text-[11px] sm:text-[13px] text-[#00AFF0] mt-0.5">@{creator.username}</p>
            {(creator.likesCount > 0 || (creator.subscriberCount ?? 0) > 0) && (
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-gray-400">
                {(creator.subscriberCount ?? 0) > 0 && <span>{formatCount(creator.subscriberCount!)} {t('ofSearch.subscribers')}</span>}
                {creator.likesCount > 0 && <span>{(creator.subscriberCount ?? 0) > 0 ? '·' : ''} {formatCount(creator.likesCount)} {t('ofSearch.likes')}</span>}
              </div>
            )}
            {creator.categories && creator.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {creator.categories.slice(0, 3).map((cat) => (
                  <span key={cat} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] sm:text-[10px] font-semibold rounded capitalize">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
          <a
            href={ofOutboundUrl(creator.username, creator.url)}
            target="_blank"
            rel="nofollow noopener noreferrer"
            onClick={handleViewProfileClick}
            className={CREATOR_VIEW_PROFILE_BTN}
          >
            {t('ofSearch.viewProfile')}
          </a>
        </div>
      </div>
    </div>
  );
}

function CreatorPostModal({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const { t } = useTranslation();
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (!redirecting || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [redirecting, countdown]);

  useEffect(() => {
    if (redirecting && countdown === 0) {
      window.open(ofOutboundUrl(creator.username, creator.url), '_blank', 'noopener,noreferrer');
      setRedirecting(false);
    }
  }, [redirecting, countdown, creator.username]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-xs rounded-3xl bg-white overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[3/4] bg-gray-100">
          {creator.avatar ? (
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
              {creator.name.charAt(0)}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10">
            <h3 className="font-black text-white text-lg leading-tight truncate">{creator.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[#00AFF0] text-sm">@{creator.username}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'}`}>
                {creator.isFree ? t('ofSearch.free') : `$${(creator.price ?? 0).toFixed(0)}`}
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <button
            onClick={(e) => { e.preventDefault(); if (!redirecting) { setRedirecting(true); setCountdown(2); } }}
            disabled={redirecting}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-sm font-bold text-center hover:from-[#009ADB] hover:to-[#00BFE8] transition-all shadow-md"
          >
            {redirecting ? (
              <>
                <span className="inline-flex items-center gap-1 shrink-0" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                      style={{ animationDelay: `${i * 120}ms`, animationDuration: '0.65s' }}
                    />
                  ))}
                </span>
                {t('ofSearch.redirectingIn').replace('{n}', String(countdown))}
              </>
            ) : t('ofSearch.viewOnOnlyfans')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnlyFansClient({ initialCreators, totalCreators, initialQuery = '', topBannerCampaigns = [], trendingOnErogram = [], communityCreators = [], topBookmarkedRecent = [], topLikedCreators = [], topLikedPhotos = [], paidFeatured = [], visitorCountryCode = '' }: Props) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const [creators, setCreators] = useState<Creator[]>(initialCreators);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [searchActive, setSearchActive] = useState(Boolean(initialQuery.trim()));

  const [isAdmin, setIsAdmin] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [allFeatured, setAllFeatured] = useState<any[]>([]);
  // Which stable album image each featured card is currently showing → for split-test click attribution.
  const shownVariantRef = useRef<Record<string, number>>({});
  const paidFeaturedRef = useRef(paidFeatured);
  const featuredLockedRef = useRef(false);
  const [blockFeatured, setBlockFeatured] = useState<any[]>([]);
  const ofSearchPlacement = (idx: number) => (idx >= 0 ? `of-search-featured:v${idx}` : 'of-search-featured');
  const clickFeaturedCreator = useCallback((tc: any) => {
    const variant = tc.albumIdx?.[0] ?? 0;
    shownVariantRef.current[tc._id] = variant;
    if (tc.isPaidCampaign && tc.campaignId) trackCampaignClick(tc.campaignId, ofSearchPlacement(variant));
    else trackTrendingClick(tc._id, variant);
    // Promoted / featured: keep tracking link untouched.
    const dest = (tc.url || tc.destinationUrl || '').trim() || `https://onlyfans.com/${tc.username}`;
    window.open(dest, '_blank', 'noopener,noreferrer');
  }, []);
  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');

    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/onlyfans/save', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.savedIds)) setSavedIds(new Set(data.savedIds));
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (featuredLockedRef.current) return;

    const lockFeatured = (merged: any[]) => {
      if (featuredLockedRef.current || merged.length === 0) return;
      featuredLockedRef.current = true;
      setAllFeatured(merged);
      setBlockFeatured(pickFeaturedBlock(merged));
    };

    getTrendingCreators()
      .then((data) => {
        const merged = Array.isArray(data)
          ? mergeFeaturedLists(paidFeaturedRef.current, data)
          : [...paidFeaturedRef.current];
        lockFeatured(merged);
      })
      .catch(() => {
        lockFeatured([...paidFeaturedRef.current]);
      });
  }, []);

  const handleToggleSave = useCallback(async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.open(`/join-erogram?redirect=${encodeURIComponent('/onlyfanssearch')}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const alreadySaved = savedIds.has(creatorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });

    try {
      await fetch('/api/onlyfans/save', {
        method: alreadySaved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(creatorId);
        else next.delete(creatorId);
        return next;
      });
    }
  }, [savedIds]);

  const trackClick = (slug: string) => {
    trackCreatorClick(slug);
  };

  const communityBlocks = useMemo(() => {
    const blocks: { id: string; label?: string; creators: Creator[]; showErogramSaves?: boolean }[] = [];

    const recentlyJoined = communityCreators.slice(0, PROFILES_PER_BLOCK);
    if (recentlyJoined.length > 0) {
      blocks.push({
        id: 'recently-joined',
        creators: recentlyJoined,
      });
    }

    return blocks;
  }, [communityCreators]);

  const handleDelete = async (slug: string) => {
    const token = localStorage.getItem('token');
    if (!token) { alert('Not logged in'); return; }
    try {
      await deleteCreatorBySlug(token, slug);
      const filterOut = (list: Creator[]) => list.filter((c) => c.slug !== slug);
      setCreators(filterOut);
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-24 sm:pt-28">
        {topBannerCampaigns.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
            <HeaderBanner campaigns={topBannerCampaigns} />
          </div>
        )}
        <section className="bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-6 pb-8 sm:pt-8 sm:pb-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/40 mb-4">
              <Link href={lp('/')} className="hover:text-[#00AFF0] transition-colors">
                {t('bestOnlyfans.breadcrumbHome')}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-white/70">{t('bestOnlyfans.breadcrumbOfSearch')}</span>
            </nav>
            <div className="text-center mb-6 sm:mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight"
              >
                {t('ofSearch.heroTitle')}{' '}
                <span className="text-[#00AFF0]">{t('ofSearch.heroTitleAccent')}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="mt-1.5 text-xs sm:text-sm text-white/50 max-w-md mx-auto"
              >
                {t('ofSearch.heroDesc')}
              </motion.p>
            </div>
            <ProfileOFPremiumSearch
              tokens={OF_SEARCH_TOKENS}
              isPremium={false}
              freeAccess
              hideHeading
              layout="hero"
              minimalFilters
              initialQuery={initialQuery}
              onActiveChange={setSearchActive}
              savedCreatorIds={savedIds}
              onToggleSave={handleToggleSave}
              loginRedirect={lp('/onlyfanssearch')}
              initialVisitorCountry={visitorCountryCode}
              paidFeatured={paidFeatured}
              {...ofSearchNavProps(lp)}
            />
            {!searchActive && (
              <div className="max-w-3xl mx-auto mt-6 sm:mt-8 text-center">
                <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  Popular <span className="text-[#00AFF0]">Categories</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-white/40 mt-1 leading-snug">
                  Explore the most popular OnlyFans categories. Find creators that match your interests across diverse content types.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {POPULAR_ONLYFANS_CATEGORIES.map((cat) => (
                    <a
                      key={cat.slug}
                      href={lp(`/onlyfanssearch/${cat.slug}`)}
                      className="inline-flex items-center rounded-lg bg-[#00AFF0] px-3 py-1.5 text-[11px] sm:text-xs font-bold text-white transition-colors hover:bg-[#009AD6]"
                    >
                      {cat.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {!searchActive && (
          <>
            {/* Featured creators */}
            {blockFeatured.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8 sm:pt-10 sm:pb-10">
                <div className="relative overflow-hidden rounded-2xl border border-[#00AFF0]/20 bg-gradient-to-br from-[#061018] via-[#0a1c2e] to-[#0d2844] shadow-[0_20px_50px_-12px_rgba(0,175,240,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-4 sm:p-6">
                  <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-[#00AFF0]/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#00D4FF]/12 blur-3xl" />
                  <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Crown size={14} className="text-[#00AFF0]" fill="currentColor" />
                      <h2 className="text-sm sm:text-base font-black text-white">
                        Featured <span className="text-[#00AFF0]">OnlyFans Creators</span>
                      </h2>
                    </div>
                    <a href="/submit" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-white/[0.08] border border-white/[0.10] text-white/70 text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-[#00AFF0]/15 hover:border-[#00AFF0]/30 hover:text-[#00AFF0] transition-colors">Submit Your Creator</a>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                    {blockFeatured.map((tc) => {
                      const cover = featuredCoverSrc(tc);
                      return (
                      <button key={`feat-${tc._id}`} type="button" onClick={() => clickFeaturedCreator(tc)} className="group w-full text-left rounded-2xl overflow-hidden bg-white ring-[2px] ring-[#00AFF0]/30 hover:ring-[#00AFF0] shadow-[0_8px_28px_-8px_rgba(0,175,240,0.25)] hover:shadow-[0_12px_36px_-6px_rgba(0,175,240,0.35)] hover:-translate-y-1 transition-all duration-300 cursor-pointer focus:outline-none">
                        <div className="relative aspect-[3/4] bg-[#f0f8ff]">
                          {cover ? (
                            <img
                              src={cover}
                              alt={`${tc.name} OnlyFans`}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#00AFF0] bg-[#f0f8ff]">{tc.name.charAt(0)}</div>
                          )}
                          <FeaturedLiveBadge liveHourStart={tc.liveHourStart} liveHourEnd={tc.liveHourEnd} />
                        </div>
                        <div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
                          <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 truncate leading-tight">{tc.name}</h3>
                          <p className="text-[11px] sm:text-[13px] text-[#00AFF0] font-semibold mt-0.5">@{tc.username}</p>
                          {(tc.likesCount > 0) && (
                            <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">{formatCount(tc.likesCount)} {t('ofSearch.likes')}</p>
                          )}
                          {tc.categories && tc.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tc.categories.slice(0, 2).map((cat: string) => (
                                <span key={cat} className="px-1.5 py-0.5 bg-[#00AFF0]/10 text-[#00AFF0] text-[8px] sm:text-[9px] font-bold rounded-md capitalize border border-[#00AFF0]/20">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3"><div className={FEATURED_CTA}>{t('ofSearch.viewProfile')}</div></div>
                      </button>
                      );
                    })}
                  </div>
                  </div>
                </div>
              </section>
            )}

            {communityBlocks.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-8 sm:pb-10" aria-label="Creator Spotlight">
                <div className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.12)]">
                  <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[#00AFF0]/[0.06] blur-3xl" aria-hidden="true" />
                  <div className="relative flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-6 sm:gap-8 p-5 sm:p-7 lg:p-8 border-b border-black/[0.06]">
                    <div className="min-w-0 flex-1 max-w-3xl">
                      <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.28em] text-[#00AFF0] mb-3 sm:mb-4">
                        Creator Spotlight
                      </p>
                      <h2 className="text-[1.65rem] sm:text-3xl lg:text-[2.125rem] font-black text-gray-900 leading-[1.12] tracking-tight mb-3 sm:mb-4">
                        Your next favorite creator just joined Erogram
                      </h2>
                      <p className="text-[14px] sm:text-base text-gray-600 leading-relaxed max-w-2xl">
                        The community keeps growing. Explore the latest creators to join EROGRAM, with galleries, videos, and links all in one place. Create a free account to like, save, comment, and support your favorite creators.
                      </p>
                    </div>
                    <div className="shrink-0 lg:w-[min(100%,22rem)] flex flex-col justify-center rounded-2xl border border-[#00AFF0]/15 bg-[#eef8fd] p-4 sm:p-5">
                      <p className="text-[15px] sm:text-base font-black text-gray-900 mb-1.5">Are you a creator?</p>
                      <p className="text-[12px] sm:text-[13px] text-gray-600 leading-relaxed mb-4 sm:mb-5">
                        Claim your free profile and join the discovery feed. Create your profile and start getting seen.
                      </p>
                      <a
                        href="/submit"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-[#00AFF0] via-[#00C4FF] to-[#009AD6] text-white text-[13px] sm:text-sm font-black tracking-tight shadow-[0_10px_28px_-6px_rgba(0,175,240,0.65),inset_0_1px_0_0_rgba(255,255,255,0.25)] ring-1 ring-[#00AFF0]/50 hover:from-[#00C4FF] hover:to-[#00AFF0] hover:shadow-[0_14px_32px_-4px_rgba(0,175,240,0.75)] transition-all duration-200"
                      >
                        Create free profile
                      </a>
                    </div>
                  </div>
                {communityBlocks.map((block) => (
                  <div key={block.id} className="w-full p-2 sm:p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {block.creators.map((creator) => (
                          <CommunityProfileRow
                            key={creator._id}
                            creator={creator}
                            onTrack={trackClick}
                            showErogramSaves={block.showErogramSaves}
                            isSaved={savedIds.has(creator._id)}
                            onToggleSave={handleToggleSave}
                          />
                        ))}
                      </div>
                  </div>
                ))}
                </div>
              </section>
            )}

            <BestAccountsLinksSection />

            <Top10RankingsSection />

            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
              <OnlyFansEditorialSeo />
            </section>
          </>
        )}
      </main>

      <Footer />

      {/* Creator post modal */}
      {selectedCreator && (
        <CreatorPostModal creator={selectedCreator} onClose={() => setSelectedCreator(null)} />
      )}
    </div>
  );
}
