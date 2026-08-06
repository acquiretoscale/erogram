'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Heart, Image as ImageIcon, Video, Users,
  ExternalLink, ChevronRight, DollarSign, Clock,
  Camera, Film, MapPin, Calendar, Mic, FileText,
  Radio, Zap, Copy, Check, Mail, X, Bookmark,
  Home, Pencil, Trash2, Save, Upload, UserPlus, TrendingUp, Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { trackCreatorClick } from '@/lib/actions/onlyfansTracking';
import type { CreatorProfile } from '@/lib/actions/ofCreatorProfile';
import { updateCreatorFields, deleteCreatorPhoto, deleteCreator, getCreatorReviews, submitCreatorReview, canManageCreatorProfile, getMyCreatorProfile } from '@/lib/actions/ofCreatorProfile';
import { submitCreatorProfileClaim, getProfileClaimStatus, type ProfileClaimStatus } from '@/lib/actions/creatorProfileClaim';
import FlameReviewSection, { type FlameReviewItem, MiniFlameRating } from '@/components/FlameReviewSection';
import { uploadCreatorFeedPhoto, uploadCreatorFeedVideo, uploadCreatorProfilePhoto, removeCreatorFeedVideo } from '@/lib/actions/creatorMediaUpload';
import { MAX_CREATOR_PHOTO_BYTES, MAX_CREATOR_VIDEO_BYTES, MAX_CREATOR_PHOTO_MB, MAX_CREATOR_VIDEO_MB, humanUploadTooLarge, humanUploadError } from '@/lib/creatorMediaLimits';
import type { CreatorReviewData } from '@/lib/actions/ofCreatorProfile';
import { ofCategoryUrl, OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';
import { getCreatorProfileCategories } from '@/lib/tags/creatorProfileTags';
import { bestOfBlogSlug } from '@/app/best-onlyfans-accounts/bestOfPages';
import { getCreatorBio } from '@/app/onlyfanssearch/creatorBios';
import CreatorMediaFeed from '@/app/onlyfanssearch/CreatorMediaFeed';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import ProfileOFPremiumSearch from '@/app/profile/ProfileOFPremiumSearch';
import { OF_SEARCH_TOKENS, ofSearchNavProps } from '@/app/onlyfanssearch/ofSearchTokens';

function formatCount(n: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}K`;
}

function formatExact(n: number) {
  if (n >= 1_000) return n.toLocaleString();
  return `${n}K`;
}

function OnlyFansIcon({ className = 'w-9 h-9', fill = '#00AFF0' }: { className?: string; fill?: string }) {
  return (
    <svg className={`flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill={fill} aria-hidden="true">
      <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z" />
    </svg>
  );
}

function VerifiedBadge({ className = 'w-5 h-5 sm:w-6 sm:h-6' }: { className?: string }) {
  return (
    <span
      className="relative inline-flex cursor-help group/verified"
      title="This is a verified creator by EROgram team."
    >
      <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-label="Verified">
        <circle cx="12" cy="12" r="12" fill="#00AFF0" />
        <path
          d="M7.2 12.3l2.9 2.9 6.7-6.9"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-[#00AFF0]/25 bg-[#0c1e35] px-2.5 py-1.5 text-[10px] font-semibold leading-snug text-white/90 opacity-0 shadow-lg transition-opacity duration-150 group-hover/verified:opacity-100"
      >
        This is a verified creator by EROgram team.
      </span>
    </span>
  );
}

function VisitOnlyFansCTA({ username, onClick, className = '' }: { username: string; onClick: () => void; className?: string }) {
  return (
    <a
      href={`/go/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 sm:px-5 py-4 sm:py-5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,175,240,0.45)] no-underline ${className}`}
      style={{
        background: 'linear-gradient(135deg, #00AFF0, #0090cc)',
        border: '1px solid #00AFF0',
        boxShadow: '0 4px 18px rgba(0,175,240,0.35)',
      }}
    >
      <OnlyFansIcon className="w-10 h-10 sm:w-11 sm:h-11 group-hover:scale-105 transition-transform" fill="#ffffff" />
      <div className="flex flex-col min-w-0">
        <span className="font-black text-base sm:text-lg leading-tight text-white whitespace-nowrap">
          Visit OnlyFans
        </span>
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/80">
          @{username}
        </span>
      </div>
      <ExternalLink className="w-4 h-4 flex-shrink-0 text-white/70 group-hover:text-white transition-colors" />
    </a>
  );
}

function BioWithCtaShell({ creatorName, username, onClick, children }: { creatorName: string; username: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-6 sm:mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] py-5 sm:py-6 lg:py-8 pl-3 sm:pl-4 pr-5 sm:pr-8 lg:pr-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-10 lg:gap-14">
        <div className="flex-1 min-w-0 max-w-2xl">{children}</div>
        <div className="flex flex-col items-center justify-center shrink-0 md:ml-auto md:px-6 lg:px-10 py-2 gap-2">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 text-center">
            {creatorName} main platform
          </p>
          <VisitOnlyFansCTA
            username={username}
            onClick={onClick}
            className="w-full md:w-auto min-w-[210px] max-w-[260px]"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 sm:px-5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.09] min-w-[80px] sm:min-w-[100px]">
      <span className="text-[#00AFF0]">{icon}</span>
      <span className="text-white font-black text-base sm:text-lg leading-tight">{value}</span>
      <span className="text-gray-400 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

function normalizePlatformUrl(raw: string, network: 'fanvue' | 'fansly'): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, '').replace(/\/+$/, '');
  if (network === 'fanvue') return `https://www.fanvue.com/${handle}`;
  return `https://fansly.com/${handle}/posts`;
}

function platformLinkDisplay(url: string | undefined, fallback: string): string {
  if (!url) return 'N/A';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const segment = u.pathname.replace(/^\//, '').replace(/\/$/, '').split('/')[0];
    if (segment) return `@${segment.replace(/^@/, '')}`;
    return fallback;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '') || fallback;
  }
}

function resolveOtherPlatformLink(creator: {
  linktreeUrl?: string;
  allmylinksUrl?: string;
  beaconsUrl?: string;
  website?: string;
}) {
  const raw = [creator.linktreeUrl, creator.allmylinksUrl, creator.beaconsUrl, creator.website]
    .map((v) => String(v || '').trim())
    .find(Boolean);
  if (!raw) return { href: undefined as string | undefined, value: 'N/A' };
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const value = href.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return { href, value };
}

const PROFILE_DARK_PANEL = 'rounded-xl bg-[#0d1e2a] border border-[#00AFF0]/20';

function DetailRow({ label, value, color, href, icon, tone = 'light' }: { label: string; value: string | React.ReactNode; color?: string; href?: string; icon?: React.ReactNode; tone?: 'light' | 'dark' }) {
  const rowBg = tone === 'dark' ? 'bg-white/[0.06]' : 'bg-white/[0.03]';
  const labelColor = tone === 'dark' ? 'text-gray-500' : 'text-gray-500';
  const defaultColor = tone === 'dark' ? 'text-white' : 'text-white';
  const valueColor = color || defaultColor;
  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${rowBg}`}>
      {icon ? (
        <div className="flex-shrink-0">{icon}</div>
      ) : (
        <span className={`${labelColor} text-xs w-28 flex-shrink-0`}>{label}</span>
      )}
      {href ? (
        <a href={href} target="_blank" rel="nofollow noopener noreferrer" className={`font-bold text-sm hover:underline ${valueColor}`}>{value}</a>
      ) : icon ? null : (
        <span className={`font-bold text-sm ${valueColor}`}>{value}</span>
      )}
    </div>
  );
}

function PremiumSocialIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #3a3a42 0%, #222228 45%, #141418 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-black/20 pointer-events-none" />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function PlatformBrandIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="relative flex items-center justify-center w-20 h-10 rounded-xl flex-shrink-0 overflow-hidden"
      style={{
        background: '#141820',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 14px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <img src={src} alt={alt} className="h-6 w-auto max-w-[104px] object-contain" loading="lazy" decoding="async" />
    </div>
  );
}

function SquareBrandIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="relative flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #3a3a42 0%, #222228 45%, #141418 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <img src={src} alt={alt} width={32} height={32} className="w-8 h-8 object-contain" loading="lazy" decoding="async" />
    </div>
  );
}

function FanvueSocialIcon() {
  return <PlatformBrandIcon src="/assets/platforms/fanvue-logo.webp" alt="Fanvue" />;
}

function FanslySocialIcon() {
  return <PlatformBrandIcon src="/assets/platforms/fansly-logo.webp" alt="Fansly" />;
}

const REDDIT_ICON_PATH =
  'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z';

function RedditSocialIcon() {
  return (
    <div className="relative flex items-center justify-center w-10 h-10 rounded-[14px] flex-shrink-0 border border-[#ff8a65]/35 bg-gradient-to-b from-[#ff5722] to-[#d93a00] shadow-[0_4px_16px_rgba(255,69,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]">
      <svg className="h-[19px] w-[19px] text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={REDDIT_ICON_PATH} />
      </svg>
    </div>
  );
}

function PatreonSocialIcon() {
  return <SquareBrandIcon src="/assets/platforms/patreon-logo.webp" alt="Patreon" />;
}

function InstagramSocialIcon() {
  return (
    <PremiumSocialIcon>
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="ig-premium" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#feda75" />
            <stop offset="25%" stopColor="#fa7e1e" />
            <stop offset="50%" stopColor="#d62976" />
            <stop offset="75%" stopColor="#962fbf" />
            <stop offset="100%" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="url(#ig-premium)" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="url(#ig-premium)" strokeWidth="1.8" />
        <circle cx="17.4" cy="6.6" r="1.2" fill="url(#ig-premium)" />
      </svg>
    </PremiumSocialIcon>
  );
}

function XSocialIcon() {
  return (
    <PremiumSocialIcon>
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 4l16 16M20 4L4 20" stroke="#f3f4f6" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </PremiumSocialIcon>
  );
}

function TelegramSocialIcon() {
  return (
    <PremiumSocialIcon>
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20.5 4.5 4.8 11.2c-.9.4-.9 1.6.1 1.9l4 1.2 1.5 4.8c.3.9 1.5 1 2 .2l2.2-3.2 4.1 3c.8.6 1.9.1 2.1-.9L22 6.3c.2-1.1-.8-2-2.5-1.8z" fill="#38bdf8" />
        <path d="m10.4 14.1 6.8-5.5" stroke="#0c4a6e" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </PremiumSocialIcon>
  );
}

function WebsiteSocialIcon() {
  return (
    <PremiumSocialIcon>
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="#67e8f9" strokeWidth="1.6" />
        <ellipse cx="12" cy="12" rx="3.5" ry="8.5" stroke="#67e8f9" strokeWidth="1.4" />
        <path d="M4.5 9h15M4.5 15h15" stroke="#67e8f9" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </PremiumSocialIcon>
  );
}

function ShareButtons({ name, username, slug, compact = false }: { name: string; username: string; slug: string; compact?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState('');

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const url = pageUrl || `https://eogram.com/${slug}`;
  const text = `Check out ${name} (@${username}) on OnlyFans`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareItems: { key: string; label: string; href: string; icon: React.ReactNode; iconColor: string; buttonClass?: string }[] = [
    {
      key: 'x',
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      iconColor: 'text-white',
    },
    {
      key: 'reddit',
      label: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      icon: (
        <svg className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={REDDIT_ICON_PATH} />
        </svg>
      ),
      iconColor: 'text-white',
      buttonClass: compact
        ? 'border-[#ff8a65]/35 bg-gradient-to-b from-[#ff5722] to-[#d93a00] shadow-[0_2px_10px_rgba(255,69,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-[#ffb199]/45 hover:shadow-[0_6px_18px_rgba(255,69,0,0.38),inset_0_1px_0_rgba(255,255,255,0.22)]'
        : 'border-[#ff8a65]/35 bg-gradient-to-b from-[#ff5722] to-[#d93a00] shadow-[0_4px_16px_rgba(255,69,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-[#ffb199]/45 hover:shadow-[0_10px_28px_rgba(255,69,0,0.38),inset_0_1px_0_rgba(255,255,255,0.22)]',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      ),
      iconColor: 'text-green-400',
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      iconColor: 'text-[#229ED9]',
    },
    {
      key: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(`${name} OnlyFans Profile`)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
      icon: <Mail className="w-4 h-4" />,
      iconColor: 'text-[#00AFF0]',
    },
  ];

  const btnClass = compact
    ? 'flex items-center justify-center w-9 h-9 rounded-xl border border-white/15 bg-white/[0.08] transition-all hover:bg-white/[0.14] hover:border-white/25 shrink-0'
    : 'flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-white/15 bg-white/[0.08] transition-all hover:bg-white/[0.14] hover:border-white/25 shrink-0';

  return (
    <div className={compact
      ? 'inline-flex items-center gap-1.5 flex-nowrap [&_svg]:w-3.5 [&_svg]:h-3.5'
      : `${PROFILE_DARK_PANEL} flex items-center gap-2 flex-nowrap overflow-x-auto max-w-full px-2 py-2 sm:px-3 sm:py-2.5`
    }>
      {shareItems.map(({ key, label, href, icon, iconColor, buttonClass }) => (
        <a
          key={key}
          href={href}
          target={key === 'email' ? '_self' : '_blank'}
          rel="nofollow noopener noreferrer"
          title={label}
          aria-label={label}
          className={`${btnClass} ${buttonClass || `${iconColor} hover:opacity-80`}`}
        >
          {icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        title={copied ? t('ofSearch.copied') : t('ofSearch.copyLink')}
        aria-label={copied ? t('ofSearch.copied') : t('ofSearch.copyLink')}
        className={`${btnClass} ${copied ? 'text-emerald-400 border-emerald-400/40' : 'text-white/70 hover:text-white'}`}
      >
        {copied ? <Check className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : <Copy className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      </button>
    </div>
  );
}

function PreviewMosaic({ avatars }: { avatars: string[] }) {
  const pics = avatars.slice(0, 4);
  return (
    <div className="grid grid-cols-2 gap-px w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-[rgba(43,27,40,0.1)]" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, idx) => {
        const src = pics[idx];
        return (
          <div key={idx} className="relative aspect-square bg-[rgba(43,27,40,0.05)]">
            {src ? (
              <img
                src={src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CreatorProfileTop10Section({
  pages,
  previewAvatars,
}: {
  pages: { slug: string; label: string; type: string }[];
  previewAvatars: Record<string, string[]>;
}) {
  const lp = useLocalePath();

  const groups = useMemo(() => {
    const niche = pages.filter((p) => p.type === 'niche');
    const country = pages.filter((p) => p.type === 'country');
    const state = pages.filter((p) => p.type === 'state');
    return [
      { key: 'niche', title: 'TOP 10 ranking by niches', items: niche },
      { key: 'region', title: 'Top 10 ranking by Region', items: country },
      { key: 'state', title: 'Top 10 ranking by States in the United States', items: state },
    ].filter((g) => g.items.length > 0);
  }, [pages]);

  if (!pages.length) return null;

  const gridCols =
    groups.length >= 3 ? 'lg:grid-cols-3' : groups.length === 2 ? 'lg:grid-cols-2' : '';

  return (
    <section className="mb-8" aria-label="Top 10 OnlyFans model rankings">
      <div className={`grid grid-cols-1 gap-4 lg:gap-5 ${gridCols}`}>
        {groups.map((group) => (
          <nav
            key={group.key}
            aria-label={group.title}
            className="rounded-xl border border-[rgba(43,27,40,0.1)] bg-[#F7F4EC] px-3 py-4 sm:px-4"
          >
            <h2 className="text-sm sm:text-[15px] font-bold text-[#2B1B28] mb-2.5 leading-snug">{group.title}</h2>
            <ul className="list-none m-0 p-0">
              {group.items.map((page) => (
                <li key={page.slug} className="border-b border-[rgba(43,27,40,0.08)] last:border-b-0">
                  <Link
                    href={lp(`/onlyfanssearch/${bestOfBlogSlug(page.slug)}`)}
                    className="flex items-start gap-2.5 py-2 text-[#2B1B28] no-underline"
                  >
                    <PreviewMosaic avatars={previewAvatars[page.slug] || []} />
                    <span className="text-[11px] sm:text-[12px] font-semibold leading-snug pt-0.5">
                      Top 10 {page.label} OnlyFans Models
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </section>
  );
}

function CreatorPromoSquare() {
  const [redirect, setRedirect] = useState('/onlyfanssearch');
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const [liveNow, setLiveNow] = useState<number | null>(null);

  useEffect(() => {
    setRedirect(window.location.pathname || '/onlyfanssearch');
    const loadStats = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.totalViews === 'number') setTotalViews(d.totalViews);
          if (typeof d.activeVisitors === 'number') setLiveNow(d.activeVisitors);
        })
        .catch(() => {});
    };
    loadStats();
    const id = setInterval(loadStats, 300_000);
    return () => clearInterval(id);
  }, []);

  const joinHref = `/join-erogram?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border-2 border-[#00AFF0]/35 bg-gradient-to-br from-[#0b2540] via-[#0a1e35] to-[#061525] shadow-[0_10px_36px_rgba(0,175,240,0.18)]">
      <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-[#00AFF0]/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[#00D4FF]/10 blur-2xl" />

      <div className="relative flex h-full flex-col p-3.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-[#00AFF0]" strokeWidth={2.5} />
          <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#00AFF0]/90">
            For OnlyFans creators
          </span>
        </div>

        <h3 className="text-[15px] font-black leading-tight text-white mb-1.5">
          Get discovered.
          <br />
          <span className="text-[#00AFF0]">Get more subs.</span>
        </h3>

        <p className="text-[10px] leading-snug text-white/55 mb-2.5">
          Create your free Erogram profile. Fans search here every day for creators to subscribe to.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-2.5 rounded-lg border border-white/10 bg-black/20 p-2">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wide text-white/45 leading-tight">Erogram total page views</p>
            <p className="text-sm font-black tabular-nums text-white mt-0.5">
              {totalViews != null ? totalViews.toLocaleString('en-US') : '—'}
            </p>
          </div>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wide text-white/45 leading-tight">Browsing right now</p>
            <p className="text-sm font-black tabular-nums text-[#00AFF0] mt-0.5 flex items-center gap-1">
              {liveNow != null && (
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
              )}
              {liveNow != null ? liveNow.toLocaleString('en-US') : '—'}
            </p>
          </div>
        </div>

        <ul className="space-y-1 mb-3">
          {[
            'Free profile & listing',
            'Turn Erogram traffic into subs',
          ].map((line) => (
            <li key={line} className="flex items-start gap-1.5 text-[10px] font-semibold text-white/75">
              <TrendingUp className="w-3 h-3 shrink-0 text-[#00AFF0] mt-0.5" strokeWidth={2.5} />
              {line}
            </li>
          ))}
        </ul>

        <a
          href={joinHref}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-[#0a0a0a] bg-[#FFE566] px-2 py-2 text-[11px] font-black uppercase tracking-wide text-[#0a0a0a] shadow-[3px_3px_0_0_#0a0a0a] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0a0a0a] active:translate-y-0 active:shadow-[1px_1px_0_0_#0a0a0a]"
        >
          <UserPlus className="w-3.5 h-3.5" strokeWidth={2.75} />
          Create your fanpage
        </a>
      </div>
    </div>
  );
}

function RelatedSidebarCard({ creator, publicOnlyfansPath = false, compact = false, card = false }: { creator: CreatorProfile; publicOnlyfansPath?: boolean; compact?: boolean; card?: boolean }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const profileHref = lp(ofCreatorProfileUrl(creator.username));

  if (card) {
    return (
      <Link
        href={profileHref}
        prefetch={false}
        className="group block rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-[#00AFF0]/35 hover:bg-[#00AFF0]/10 transition-all overflow-hidden"
      >
        <div className="aspect-[3/4] w-full overflow-hidden bg-[#0d1e2a]">
          {creator.avatar ? (
            <img
              src={creator.avatar}
              alt={`${creator.name} OnlyFans profile`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-[#00AFF0]/40">
              {creator.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-xs font-black text-white truncate group-hover:text-[#00AFF0] transition-colors">{creator.name}</p>
          <p className="text-[10px] text-[#00AFF0]/80 truncate">@{creator.username}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={profileHref}
      prefetch={false}
      className={`group flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] hover:border-[#00AFF0]/35 hover:bg-[#00AFF0]/10 transition-all ${
        compact ? 'gap-2 p-1.5' : 'gap-3 p-2.5 rounded-xl'
      }`}
    >
      <div className={`rounded-lg overflow-hidden shrink-0 bg-[#0d1e2a] ring-1 ring-white/10 ${compact ? 'w-10 h-10' : 'w-14 h-14 rounded-xl'}`}>
        {creator.avatar ? (
          <img
            src={creator.avatar}
            alt={`${creator.name} OnlyFans profile`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-black text-[#00AFF0]/40">
            {creator.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-bold text-white truncate group-hover:text-[#00AFF0] transition-colors ${compact ? 'text-xs' : 'text-sm font-black'}`}>{creator.name}</p>
        <p className={`text-[#00AFF0]/80 truncate ${compact ? 'text-[10px]' : 'text-[11px]'}`}>@{creator.username}</p>
        {!compact && creator.likesCount > 0 && (
          <p className="text-[10px] text-gray-500 mt-0.5">{formatCount(creator.likesCount)} {t('ofSearch.likes')}</p>
        )}
      </div>
      {!compact && <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#00AFF0] shrink-0 transition-colors" />}
    </Link>
  );
}

function ProfileRightRail({
  creatorName,
  username,
  slug,
  nicheLabel,
  items,
  publicOnlyfansPath,
  variant,
  savedCreatorIds,
  onToggleSave,
  loginRedirect,
}: {
  creatorName: string;
  username: string;
  slug: string;
  nicheLabel: string;
  items: CreatorProfile[];
  publicOnlyfansPath: boolean;
  variant: 'sidebar' | 'mobile';
  savedCreatorIds: Set<string>;
  onToggleSave: (creatorId: string) => void;
  loginRedirect: string;
}) {
  const lp = useLocalePath();
  const firstName = creatorName.split(' ')[0] || creatorName;

  return (
    <div className="space-y-3">
      <CreatorPromoSquare />

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">
        <ProfileOFPremiumSearch
          tokens={OF_SEARCH_TOKENS}
          isPremium={false}
          freeAccess
          hideHeading
          layout="hero"
          minimalFilters
          compactBlock
          hideResults
          searchHubHref={lp('/onlyfanssearch')}
          loginRedirect={loginRedirect}
          savedCreatorIds={savedCreatorIds}
          onToggleSave={onToggleSave}
          {...ofSearchNavProps(lp)}
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3">
      {items.length > 0 && (
        <div className="pt-2 border-t border-white/[0.06]">
          <p className="text-sm sm:text-base font-black text-white leading-snug mb-2">
            If you like {firstName}, you might also like{' '}
            <span className="text-[#00AFF0]">{nicheLabel || 'Popular on Erogram'}</span>
          </p>
          <div className={variant === 'mobile' ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2.5'}>
            {items.map((c) => (
              <RelatedSidebarCard key={c._id} creator={c} publicOnlyfansPath={publicOnlyfansPath} card />
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function CreatorProfileClient({
  creator,
  related,
  rankingPages = [],
  topRankingPreviewAvatars = {},
  publicAccess = false,
}: {
  creator: CreatorProfile;
  related: CreatorProfile[];
  rankingPages?: { slug: string; label: string; type: string }[];
  topRankingPreviewAvatars?: Record<string, string[]>;
  publicAccess?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const lp = useLocalePath();
  const profileCategories = getCreatorProfileCategories(
    creator.categories,
    creator.location,
    creator.bio,
    rankingPages,
    creator,
  );
  const topRankingPages = rankingPages.slice(0, 8);
  const sidebarRelated = related.slice(0, 4);
  const nicheLabel = creator.categories[0]
    ? (OF_CATEGORIES.find((c) => c.slug === creator.categories[0])?.name || creator.categories[0].replace(/-/g, ' '))
    : '';
  const [headerError, setHeaderError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(publicAccess);

  useEffect(() => {
    if (publicAccess) return;
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token && !isDev) {
      window.location.href = `/go/${creator.username}`;
      return;
    }
    setAuthChecked(true);
  }, [creator.url, publicAccess]);

  // Admin / owner edit state
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageProfile, setCanManageProfile] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'header' | null>(null);
  const [bulkUpload, setBulkUpload] = useState<{ current: number; total: number } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const panelAvatarRef = useRef<HTMLInputElement>(null);
  const panelHeaderRef = useRef<HTMLInputElement>(null);
  const panelBulkRef = useRef<HTMLInputElement>(null);
  const [editFields, setEditFields] = useState({
    name: creator.name,
    bio: creator.bio || '',
    location: creator.location || '',
    website: creator.website || '',
    price: String(creator.price || 0),
    fanvueUrl: creator.fanvueUrl || '',
    fanslyUrl: creator.fanslyUrl || '',
    instagramUrl: creator.instagramUrl || '',
    twitterUrl: creator.twitterUrl || '',
    tiktokUrl: creator.tiktokUrl || '',
    telegramUrl: creator.telegramUrl || '',
    patreonUrl: creator.patreonUrl || '',
    redditUrl: creator.redditUrl || '',
    linktreeUrl: creator.linktreeUrl || '',
    allmylinksUrl: creator.allmylinksUrl || '',
    beaconsUrl: creator.beaconsUrl || '',
  });
  const [publicPage, setPublicPage] = useState(creator.publicPage ?? false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ProfileClaimStatus>('none');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimForm, setClaimForm] = useState({
    fullName: '',
    email: '',
    contact: '',
    accountType: 'individual' as 'individual' | 'agency',
    reason: '',
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setIsAdmin(!!d.isAdmin); })
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
    if (!token) return;
    canManageCreatorProfile(token, creator.slug).then(setCanManageProfile).catch(() => setCanManageProfile(false));
    getProfileClaimStatus(token, creator.slug).then((r) => setClaimStatus(r.status)).catch(() => setClaimStatus('none'));
  }, [creator.slug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('claim') === '1' && !canManageProfile) setClaimOpen(true);
  }, [canManageProfile]);

  useEffect(() => {
    if (!canManageProfile && !isAdmin) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') === '1') setProfileEdit(true);
  }, [canManageProfile, isAdmin]);

  const handleEditProfileClick = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/join-erogram?redirect=${encodeURIComponent(`/onlyfanssearch/${creator.slug}?claim=1`)}`;
      return;
    }
    const myProfile = await getMyCreatorProfile(token);
    if (myProfile && myProfile.slug !== creator.slug) {
      alert(`You already manage @${myProfile.username}. One creator profile per account.`);
      window.location.href = `/onlyfanssearch/${myProfile.slug}?edit=1`;
      return;
    }
    if (await canManageCreatorProfile(token, creator.slug)) {
      setProfileEdit(true);
      return;
    }
    const claim = await getProfileClaimStatus(token, creator.slug);
    setClaimStatus(claim.status);
    if (claim.status === 'pending') {
      alert('Your claim is pending admin approval.');
      return;
    }
    setClaimOpen(true);
  };

  const handleClaimSubmit = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/join-erogram?redirect=${encodeURIComponent(`/onlyfanssearch/${creator.slug}?claim=1`)}`;
      return;
    }
    setClaimSubmitting(true);
    try {
      const res = await submitCreatorProfileClaim(token, creator.slug, claimForm);
      if ('error' in res) {
        alert(res.error);
        return;
      }
      setClaimStatus('pending');
      setClaimOpen(false);
      alert('Claim submitted. You will be able to edit after admin approval.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  const handleAdminSave = async () => {
    const token = localStorage.getItem('token') || '';
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...editFields,
      price: parseFloat(editFields.price) || 0,
    };
    if (isAdmin) payload.publicPage = publicPage;
    await updateCreatorFields(creator.slug, payload, token);
    setSaving(false);
    setProfileEdit(false);
    router.refresh();
  };

  const handleDeletePhoto = async (type: 'avatar' | 'header' | 'extra', idx?: number) => {
    if (!confirm('Delete this photo?')) return;
    const token = localStorage.getItem('token') || '';
    await deleteCreatorPhoto(creator.slug, type, idx, token);
    router.refresh();
  };

  const handleDeleteVideo = async (url: string) => {
    if (!confirm('Delete this video?')) return;
    const token = localStorage.getItem('token') || '';
    const res = await removeCreatorFeedVideo(token, creator.slug, url);
    if ('error' in res) alert(res.error);
    router.refresh();
  };

  const handleBulkAlbumUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    const token = localStorage.getItem('token') || '';

    setBulkUpload({ current: 0, total: files.length });
    const errors: string[] = [];
    let ok = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBulkUpload({ current: i + 1, total: files.length });
      const isVideo = file.type.startsWith('video/');
      const maxBytes = isVideo ? MAX_CREATOR_VIDEO_BYTES : MAX_CREATOR_PHOTO_BYTES;
      if (file.size > maxBytes) {
        errors.push(humanUploadTooLarge(file.name, isVideo));
        continue;
      }
      try {
        const res = isVideo
          ? await uploadCreatorFeedVideo(token, creator.slug, file)
          : await uploadCreatorFeedPhoto(token, creator.slug, file);
        if ('error' in res) errors.push(humanUploadError(res.error, file.name));
        else ok++;
      } catch (e: any) {
        errors.push(humanUploadError(e?.message || 'Upload failed', file.name));
      }
    }

    setBulkUpload(null);
    if (errors.length) {
      alert(`Uploaded ${ok}/${files.length}.\n\n${errors.join('\n')}`);
    } else if (ok > 0) {
      alert(`Uploaded ${ok} file${ok === 1 ? '' : 's'} successfully.`);
    }
    router.refresh();
  };

  const handleReplacePhoto = async (type: 'avatar' | 'header', file: File) => {
    setUploading(type);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await uploadCreatorProfilePhoto(token, creator.slug, type, file);
      if ('error' in res) alert(res.error);
      else router.refresh();
    } catch (e: any) {
      alert(`Upload failed: ${e.message || 'Unknown error'}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteProfile = async () => {
    if (!confirm(`DELETE "${creator.name}" permanently? This cannot be undone.`)) return;
    if (!confirm('Are you absolutely sure?')) return;
    await deleteCreator(creator.slug, localStorage.getItem('token') || '');
    router.push('/onlyfanssearch');
  };

  const canEditProfile = isAdmin || canManageProfile;

  const hasHeader = !!creator.header && !headerError;
  const hasAvatar = !!creator.avatar && !avatarError;
  const primaryCat = creator.categories[0] || '';
  const catHref = primaryCat ? ofCategoryUrl(primaryCat) : '/onlyfanssearch';
  const fanvueHref = creator.fanvueUrl?.trim() ? normalizePlatformUrl(creator.fanvueUrl.trim(), 'fanvue') : undefined;
  const fanslyHref = creator.fanslyUrl?.trim() ? normalizePlatformUrl(creator.fanslyUrl.trim(), 'fansly') : undefined;
  const otherPlatformLink = resolveOtherPlatformLink(creator);
  const totalMedia = creator.mediaCount || (creator.photosCount + creator.videosCount + creator.audiosCount);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/onlyfans/save', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.savedIds)) {
          setSavedIds(new Set(data.savedIds));
          setIsSaved(data.savedIds.includes(creator._id));
        }
      })
      .catch(() => {});
  }, [creator._id]);

  const handleToggleSaveById = async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const alreadySaved = savedIds.has(creatorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });
    if (creatorId === creator._id) setIsSaved(!alreadySaved);

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
      if (creatorId === creator._id) setIsSaved(alreadySaved);
    }
  };

  const handleToggleSave = () => handleToggleSaveById(creator._id);

  const [flameReviews, setFlameReviews] = useState<CreatorReviewData[]>([]);
  const [flameKey, setFlameKey] = useState(0);

  useEffect(() => {
    getCreatorReviews(creator.slug).then((data) => setFlameReviews(data.reviews)).catch(() => {});
  }, [creator.slug]);

  const refreshFlameReviews = async () => {
    const data = await getCreatorReviews(creator.slug);
    setFlameReviews(data.reviews);
    setFlameKey((k) => k + 1);
  };

  const flameReviewItems: FlameReviewItem[] = flameReviews.map((r) => ({
    authorName: r.authorName,
    authorAvatar: r.authorAvatar,
    rating: r.rating,
    text: r.content,
    createdAt: r.createdAt
      ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
  }));

  const reviewCount = flameReviewItems.length;
  const reviewAvg = reviewCount > 0
    ? Math.round((flameReviewItems.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  const handleQuickRate = async (rating: number) => {
    const token = localStorage.getItem('token') || '';
    await submitCreatorReview(creator.slug, rating, '', token);
    await refreshFlameReviews();
  };

  const handleViewProfileClick = () => {
    trackCreatorClick(creator._id).catch(() => {});
  };

  const displayPrice = creator.isFree
    ? t('ofSearch.free')
    : creator.price > 0
    ? `$${creator.price.toFixed(2)}/mo`
    : t('ofSearch.unknown');

  const joinFormatted = creator.joinDate
    ? new Date(creator.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const telegramHref = creator.telegramUrl || getCreatorBio(creator.username)?.telegram;
  const creatorPlatformLinks = [
    {
      label: 'Fanvue',
      icon: <FanvueSocialIcon />,
      value: fanvueHref ? platformLinkDisplay(fanvueHref, 'Fanvue') : '',
      href: fanvueHref,
    },
    {
      label: 'Fansly',
      icon: <FanslySocialIcon />,
      value: fanslyHref ? platformLinkDisplay(fanslyHref, 'Fansly') : '',
      href: fanslyHref,
    },
    {
      label: 'Instagram',
      icon: <InstagramSocialIcon />,
      value: creator.instagramUrl
        ? (creator.instagramUsername
          ? `@${creator.instagramUsername}`
          : creator.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\/?/i, '@').replace(/\/$/, ''))
        : '',
      href: creator.instagramUrl || undefined,
    },
    {
      label: 'X',
      icon: <XSocialIcon />,
      value: creator.twitterUrl
        ? creator.twitterUrl.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/?/i, '@').replace(/\/$/, '')
        : '',
      href: creator.twitterUrl || undefined,
    },
    {
      label: t('ofSearch.telegram'),
      icon: <TelegramSocialIcon />,
      value: telegramHref ? telegramHref.replace(/https?:\/\/(t\.me\/)?/i, '@') : '',
      href: telegramHref || undefined,
    },
    {
      label: 'Patreon',
      icon: <PatreonSocialIcon />,
      value: creator.patreonUrl ? platformLinkDisplay(creator.patreonUrl, 'Patreon') : '',
      href: creator.patreonUrl || undefined,
    },
    {
      label: 'Reddit',
      icon: <RedditSocialIcon />,
      value: creator.redditUrl ? platformLinkDisplay(creator.redditUrl, 'Reddit') : '',
      href: creator.redditUrl || undefined,
    },
    {
      label: t('ofSearch.website'),
      icon: <WebsiteSocialIcon />,
      value: otherPlatformLink.href ? otherPlatformLink.value : '',
      href: otherPlatformLink.href,
      color: otherPlatformLink.href ? 'text-[#00AFF0]' : undefined,
    },
  ];

  const lastSeenFormatted = creator.lastSeen
    ? (() => {
        try {
          const d = new Date(creator.lastSeen);
          if (isNaN(d.getTime())) return creator.lastSeen;
          const diff = Date.now() - d.getTime();
          if (diff < 3600000) return t('ofSearch.activeNow');
          if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch { return creator.lastSeen; }
      })()
    : '';

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a1117] flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-[#00AFF0]/30 border-t-[#00AFF0] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1117]">
      <Navbar />

      <div className="pt-[82px]">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2">
        <ol className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
          <li>
            <Link href={lp('/')} className="flex items-center gap-1 hover:text-white transition-colors">
              <Home className="w-3 h-3" />
              <span>{t('ofSearch.home')}</span>
            </Link>
          </li>
          <li><ChevronRight className="w-3 h-3" /></li>
          <li>
            <Link href={lp('/onlyfanssearch')} className="hover:text-[#00AFF0] transition-colors">
              {t('ofSearch.onlyfansSearch')}
            </Link>
          </li>
          <li><ChevronRight className="w-3 h-3" /></li>
          <li className="text-white font-bold truncate max-w-[200px]">{creator.name}</li>
        </ol>
      </nav>

      {/* Hero / Banner */}
      <div className="relative w-full h-[220px] sm:h-[300px] md:h-[360px] overflow-hidden bg-[#041e2e]">
        {hasHeader ? (
          <img
            src={creator.header}
            alt={`${creator.name} OnlyFans banner`}
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setHeaderError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#001824] via-[#041e2e] to-[#0a2840]">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#00AFF0]/15 blur-[100px]" />
            <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-[#00D4FF]/10 blur-[80px]" />
          </div>
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #0a1117 0%, rgba(10,17,23,0.92) 12%, transparent 48%)' }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-5 items-start">

          {/* RIGHT sidebar — desktop */}
          <aside className="hidden lg:block lg:col-start-2 lg:row-start-1 sticky top-[90px] self-start">
            <ProfileRightRail
              creatorName={creator.name}
              username={creator.username}
              slug={creator.slug}
              nicheLabel={nicheLabel}
              items={sidebarRelated}
              publicOnlyfansPath={publicAccess}
              variant="sidebar"
              savedCreatorIds={savedIds}
              onToggleSave={handleToggleSaveById}
              loginRedirect={lp(ofCreatorProfileUrl(creator.username))}
            />
          </aside>

          {/* MAIN column */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            {/* Avatar + name */}
            <div className="flex items-start gap-4 sm:gap-6 -mt-28 sm:-mt-36 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 flex-1 min-w-0">
              <div className="flex flex-col items-stretch flex-shrink-0 w-56 sm:w-72">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden ring-4 ring-[#0a1117] bg-[#0d1e2a] shadow-2xl group/avatar">
                {hasAvatar ? (
                  <img
                    src={creator.avatar}
                    alt={`${creator.name} OnlyFans`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl sm:text-8xl font-black text-[#00AFF0]/40 bg-gradient-to-br from-[#00AFF0]/10 to-[#001824]">
                    {creator.name.charAt(0)}
                  </div>
                )}
                {canEditProfile && (
                  <>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReplacePhoto('avatar', f); e.target.value = ''; }} />
                    {uploading === 'avatar' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10"><svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
                    ) : (
                      <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer">
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-stretch gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <MiniFlameRating
                    creatorName={creator.name}
                    reviewCount={reviewCount}
                    reviewAvg={reviewAvg}
                    loginHref={`/join-erogram?redirect=/onlyfanssearch/${creator.slug}`}
                    onRate={handleQuickRate}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className="mt-2 flex items-center justify-center w-11 sm:w-12 shrink-0 rounded-xl self-stretch transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,175,240,0.45)]"
                  style={{
                    background: 'linear-gradient(135deg, #00AFF0, #0090cc)',
                    border: '1px solid #00AFF0',
                    boxShadow: '0 4px 14px rgba(0,175,240,0.35)',
                  }}
                  title={isSaved ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
                  aria-label={isSaved ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
                >
                  <Bookmark size={20} className="text-white" fill={isSaved ? 'currentColor' : 'none'} />
                </button>
              </div>
              </div>

              <div className="flex-1 pb-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight flex items-center gap-1.5 min-w-0">
                    {creator.name}
                    <VerifiedBadge />
                  </h1>
                </div>
                <p className="text-[#00AFF0] text-sm sm:text-base font-bold">@{creator.username}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEditProfileClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/15 text-white text-xs font-bold hover:bg-[#00AFF0]/15 hover:border-[#00AFF0]/40 hover:text-[#00AFF0] transition-all shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {claimStatus === 'pending' ? 'Claim pending approval' : 'Edit my profile'}
                  </button>
                  <ShareButtons name={creator.name} username={creator.username} slug={creator.slug} compact />
                </div>

                {/* Location + Last seen row */}
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  {creator.location && (
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <MapPin className="w-3 h-3 text-[#00AFF0]/70" />
                      {creator.location}
                    </span>
                  )}
                  {joinFormatted && (
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <Calendar className="w-3 h-3 text-[#00AFF0]/70" />
                      {t('ofSearch.joined').replace('{date}', joinFormatted)}
                    </span>
                  )}
                </div>

              </div>
              </div>
            </div>

            {/* Browse categories — /onlyfanssearch/{slug} creator lists */}
            {profileCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profileCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={lp(`/onlyfanssearch/${cat.slug}`)}
                    className="px-3 py-1.5 rounded-xl bg-[#00AFF0]/10 border border-[#00AFF0]/25 text-[#00AFF0] text-xs font-bold capitalize hover:bg-[#00AFF0]/20 hover:border-[#00AFF0]/50 transition-all"
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Stats + fair use note */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 mb-4">
              <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
              {creator.likesCount > 0 && (
                <div
                  className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,175,240,0.15), rgba(0,175,240,0.07))',
                    border: '1px solid rgba(0,175,240,0.30)',
                    minWidth: '160px',
                  }}
                >
                  <OnlyFansIcon />
                  <div className="flex flex-col">
                    <span className="font-black text-xl sm:text-2xl leading-tight" style={{ color: '#00AFF0' }}>
                      {formatCount(creator.likesCount)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: '#00AFF0', opacity: 0.65 }}>
                      {t('ofSearch.ofLikes')}
                    </span>
                  </div>
                </div>
              )}
              {totalMedia > 0 && (
                <StatCard icon={<ImageIcon className="w-4 h-4" />} label={t('ofSearch.totalMedia')} value={formatCount(totalMedia)} />
              )}
              <StatCard icon={<DollarSign className="w-4 h-4" />} label={t('ofSearch.price')} value={displayPrice} />
              </div>
              <div className="text-[10px] leading-snug text-white/35 sm:max-w-xs sm:pt-3">
                <p className="font-semibold text-white/45 mb-1">© Copyright</p>
                <p>
                  Thumbnail and cover of the model&apos;s public OnlyFans.com profile shown under fair use for identification and commentary. We review and link to their official OnlyFans account. We do not host, stream, or distribute any copyrighted content.
                </p>
              </div>
            </div>

            {/* ── Enhanced About Section ── */}
        {(() => {
          const bioSection = (() => {
          const bioData = getCreatorBio(creator.username);
          if (bioData) {
            return (
              <>
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About {bioData.name}
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed">
                  <p>{bioData.bio}</p>
                </div>
              </>
            );
          }
          const username = creator.username?.toLowerCase();
          if (username === 'DISABLED_amouranth') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Amouranth
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Kaitlyn Siragusa, known online as <strong>Amouranth</strong>, is a 31-year-old content creator from Texas. 
                    She originally built her audience on Twitch streaming cosplay, ASMR, and hot tub content before shifting her main focus to OnlyFans.
                  </p>
                  <p>
                    She has a large following on <strong>X (@Amouranth)</strong> with approximately 3.77 million followers. 
                    Reports suggest she has earned between $20 million and $30 million from OnlyFans, with some months reportedly exceeding $1.5 million in revenue.
                  </p>
                  <p>
                    Community discussions on Reddit often highlight her high content output, professional production quality, and distinctive pink and black branding. 
                    She also maintains a Telegram channel at <strong>t.me/Amouranth_Kaitlyn</strong>.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'sharonwinner') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Sharonwinner
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Sharonwinner is one of the more established creators on OnlyFans, having joined the platform back in May 2020. She charges $25 per month and has steadily built up a following with around 175K likes over the years.
                  </p>
                  <p>
                    In the community, she's often mentioned for her consistency and reliability — someone who has been putting out content for years without disappearing. Many appreciate that she's not just chasing trends but maintains a steady output of photos and videos.
                  </p>
                  <p>
                    She also runs a Telegram channel at <strong>t.me/sharonwinneronlyfan</strong> where she shares updates and extra content with her subscribers. Her approach seems to be focused on long-term fans rather than quick viral moments.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'milkimind') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Milkimind
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Milkimind has become quite popular in a relatively short time, currently sitting at an impressive 755K likes on her OnlyFans profile. What stands out is her very accessible $4 monthly subscription, which has clearly helped her grow her audience rapidly.
                  </p>
                  <p>
                    From what fans say on Reddit and other communities, people enjoy her playful and engaging personality. She stands out from creators who take themselves too seriously — her content seems to have a lighter, more fun vibe.
                  </p>
                  <p>
                    She also maintains an active Telegram channel at <strong>t.me/milkimind</strong> where she posts behind-the-scenes content, updates, and even cute voice messages. This multi-platform approach seems to be working well for her.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'thequeenrosi') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Thequeenrosi
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Thequeenrosi is a rising creator who has recently broken into the top 100 rankings. While her like count (around 38K) is lower than some of the bigger names, she's gaining attention for the quality of her content.
                  </p>
                  <p>
                    She seems to focus on delivering a more premium experience rather than posting as much content as possible. This approach appears to be working for her as she continues to climb the rankings.
                  </p>
                  <p>
                    Like many creators in the top lists, she maintains a presence across multiple platforms to stay connected with her audience.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'leslyeanuket') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Leslyeanuket
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Leslyeanuket has 27K likes on her OnlyFans profile and charges $50 per month. She is one of the higher priced creators in the current top rankings.
                  </p>
                  <p>
                    She is active on several social media platforms including Instagram and TikTok. She also has a Telegram channel where she connects with her fans.
                  </p>
                  <p>
                    Her pricing suggests she focuses on providing a more exclusive experience for her subscribers.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'mishiavilaof') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Mishiavilaof
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Mishiavilaof has 36K likes on her OnlyFans profile and charges $7 per month. This more affordable pricing has helped her build a decent sized following.
                  </p>
                  <p>
                    She maintains an active presence across multiple social platforms. Her content seems to appeal to fans looking for good value from their subscription.
                  </p>
                  <p>
                    She uses Telegram and other platforms to keep her audience engaged and provide regular updates.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'sugeyabrego') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Sugeyabrego
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Sugeyabrego is a very popular creator with 157K likes on her OnlyFans profile. She charges $8 per month and has built a large following.
                  </p>
                  <p>
                    She is known for her consistent content and has been active for a while. Many fans appreciate her regular uploads and engagement with her audience.
                  </p>
                  <p>
                    She maintains multiple social media accounts to stay connected with her fans across different platforms including Telegram.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'magsmx') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Magsmx
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Magsmx has 79K likes on her OnlyFans profile and charges $18 per month. She has established herself as one of the more popular creators in the current rankings.
                  </p>
                  <p>
                    She is known for her content quality and maintains a good balance between price and value for her subscribers.
                  </p>
                  <p>
                    Like many top creators, she uses several platforms including Telegram to engage with her audience.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'letho_k' || username === 'letho-k') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Letho_k
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Letho_k has 13K likes on her OnlyFans profile and charges $8 per month. She is one of the newer creators in the current top 100.
                  </p>
                  <p>
                    She is still building her audience but has made it into the rankings. She maintains a presence across multiple platforms.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'ashtonfieldss' || username === 'ashton') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Ashtonfieldss
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Ashtonfieldss is a very popular creator with 269K likes on her OnlyFans profile. She offers free subscription which has helped her grow a massive audience.
                  </p>
                  <p>
                    Having such a large following with a free account shows how strong her content and personality are. She is one of the bigger names in the current top rankings.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'bhadbhabie') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Bhad Bhabie
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Bhad Bhabie (Danielle Bregoli) is a well-known celebrity creator with 1.9 million likes on her OnlyFans profile. She charges $24 per month.
                  </p>
                  <p>
                    She became famous from her "Cash me outside" viral moment on Dr. Phil and has successfully turned that internet fame into a lucrative OnlyFans career.
                  </p>
                  <p>
                    As a celebrity creator, she brings mainstream attention to the platform and has one of the largest audiences among all creators.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'milamondell') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Milamondell
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Milamondell is one of the biggest creators on this list with 3.1 million likes on her OnlyFans profile. She offers free subscription which has helped her grow an enormous audience.
                  </p>
                  <p>
                    Her nickname "PRETTIEST PUSSY ONLINE" shows her branding approach. Having over 3 million likes with a free account demonstrates how popular her content is.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'jocibaker') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Jocibaker
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Jocibaker has 667K likes on her OnlyFans profile and charges $5 per month. She has built a very large following with her content.
                  </p>
                  <p>
                    She is one of the more popular creators in the current rankings and maintains an active presence across multiple platforms.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'letho_k' || username === 'letho-k') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Letho_k
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Letho_k has 13K likes on her OnlyFans profile and charges $8 per month. She is one of the newer or less established creators in the current top 100.
                  </p>
                  <p>
                    She is still building her audience but has made it into the top rankings. She uses multiple platforms to connect with her fans.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'ashtonfieldss' || username === 'ashton') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Ashtonfieldss
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Ashtonfieldss is a very popular creator with 269K likes on her OnlyFans profile. She offers free subscription which has helped her grow a massive audience.
                  </p>
                  <p>
                    Having such a large following with a free account shows how strong her content and personality are. She is one of the bigger names in the current top rankings.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'bhadbhabie') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Bhad Bhabie
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Bhad Bhabie (Danielle Bregoli) is a well-known celebrity creator with 1.9 million likes on her OnlyFans profile. She charges $24 per month.
                  </p>
                  <p>
                    She became famous from her "Cash me outside" viral moment on Dr. Phil and has successfully turned that internet fame into a lucrative OnlyFans career.
                  </p>
                  <p>
                    As a celebrity creator, she brings mainstream attention to the platform and has one of the largest audiences among all creators.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'milamondell') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Milamondell
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Milamondell is one of the biggest creators on this list with 3.1 million likes on her OnlyFans profile. She offers free subscription which has helped her grow an enormous audience.
                  </p>
                  <p>
                    Her nickname "PRETTIEST PUSSY ONLINE" shows her branding approach. Having over 3 million likes with a free account demonstrates how popular her content is.
                  </p>
                </div>
              </div>
            );
          }
          if (username === 'jocibaker') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Jocibaker
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Jocibaker has 667K likes on her OnlyFans profile and charges $5 per month. She has built a very large following with her content.
                  </p>
                  <p>
                    She is one of the more popular creators in the current rankings and maintains an active presence across multiple platforms.
                  </p>
                </div>
              </div>
            );
          }
          return creator.bio ? (
            <>
              <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00AFF0]" />
                {t('ofSearch.aboutCreator') || 'About'}
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{creator.bio}</p>
            </>
          ) : null;
          })();
          if (!bioSection) return null;
          return (
            <BioWithCtaShell
              creatorName={creator.name}
              username={creator.username}
              onClick={handleViewProfileClick}
            >
              {bioSection}
            </BioWithCtaShell>
          );
        })()}

        {/* ── Profile Details ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6 mb-6">
          <h2 className="text-sm font-black text-white mb-4">{creator.name}&apos;s ONLYFANS Profile details</h2>
          <div className="flex flex-col gap-2">
                <DetailRow label={t('ofSearch.photos')} value={creator.photosCount > 0 ? formatExact(creator.photosCount) : 'N/A'} color={creator.photosCount > 0 ? undefined : 'text-gray-500'} />
                <DetailRow label={t('ofSearch.videos')} value={creator.videosCount > 0 ? formatExact(creator.videosCount) : 'N/A'} color={creator.videosCount > 0 ? undefined : 'text-gray-500'} />
                <DetailRow label={t('ofSearch.location')} value={creator.location || 'N/A'} color={creator.location ? undefined : 'text-gray-500'} />
                <DetailRow label={t('ofSearch.joinedOnlyfans')} value={joinFormatted || 'N/A'} color={joinFormatted ? undefined : 'text-gray-500'} />

                <div className={`mt-4 ${PROFILE_DARK_PANEL} p-4 sm:p-5`}>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white mb-4">
                    Other Creator&apos;s platforms
                  </h3>
                  <div className="flex flex-col gap-2">
                {creatorPlatformLinks.map((row) => (
                <DetailRow
                  key={row.label}
                  tone="dark"
                  label={row.label}
                  icon={row.icon}
                  value={row.value}
                  color={row.color || (row.href ? 'text-white' : undefined)}
                  href={row.href}
                />
                ))}
                  </div>
                </div>
          </div>
        </div>

        {(canEditProfile || hasAvatar || hasHeader || (creator.extraPhotos?.length || 0) > 0 || (creator.extraVideos?.length || 0) > 0) && (
          <CreatorMediaFeed
            slug={creator.slug}
            creatorId={creator._id}
            creatorName={creator.name}
            avatar={hasAvatar ? creator.avatar : undefined}
            header={hasHeader ? creator.header : undefined}
            extraPhotos={creator.extraPhotos || []}
            extraVideos={creator.extraVideos || []}
            isAdmin={canEditProfile}
            onLightbox={setLightboxImg}
            onUpdated={() => router.refresh()}
          />
        )}

        {/* Share + suggestions — mobile (after main content, before reviews) */}
        <div className="lg:hidden mb-6">
          <ProfileRightRail
            creatorName={creator.name}
            username={creator.username}
            slug={creator.slug}
            nicheLabel={nicheLabel}
            items={sidebarRelated}
            publicOnlyfansPath={publicAccess}
            variant="mobile"
            savedCreatorIds={savedIds}
            onToggleSave={handleToggleSaveById}
            loginRedirect={lp(ofCreatorProfileUrl(creator.username))}
          />
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[#00AFF0]/20 to-transparent mb-8" />

        <div id="creator-reviews" className="scroll-mt-24">
        <FlameReviewSection
          key={flameKey}
          entityName={creator.name}
          promptLabel={creator.username}
          reviews={flameReviewItems}
          loginHref={`/join-erogram?redirect=/onlyfanssearch/${creator.slug}`}
          onSubmit={async (rating, text) => {
            const token = localStorage.getItem('token') || '';
            await submitCreatorReview(creator.slug, rating, text, token);
            return 'Your rating is live!';
          }}
          onSubmitted={refreshFlameReviews}
          requireText={false}
          successTitle="Your rating is live!"
          successSubtitle={`Thanks for rating ${creator.name}`}
        />
        </div>

        {topRankingPages.length > 0 && (
          <CreatorProfileTop10Section
            pages={topRankingPages}
            previewAvatars={topRankingPreviewAvatars}
          />
        )}

          </div>
        </div>
      </div>

      {/* Admin floating toolbar */}
      {isAdmin && !profileEdit && (
        <div className="fixed bottom-6 right-6 z-40 flex gap-2">
          <button onClick={() => setProfileEdit(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00AFF0] text-white font-bold text-sm shadow-lg shadow-[#00AFF0]/30 hover:bg-[#009dd9] transition-all">
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>
          <button onClick={handleDeleteProfile} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}

      {/* Admin edit panel */}
      {claimOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-10">
          <div className="w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#0d1a24] p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-white">CLAIM YOUR PROFILE</h2>
              <button type="button" onClick={() => setClaimOpen(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-400">
              Profile: <span className="text-[#00AFF0] font-bold">@{creator.username}</span>
            </p>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Full name</label>
              <input
                type="text"
                value={claimForm.fullName}
                onChange={(e) => setClaimForm((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00AFF0]/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Email</label>
              <input
                type="email"
                value={claimForm.email}
                onChange={(e) => setClaimForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00AFF0]/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Telegram or WhatsApp</label>
              <input
                type="text"
                value={claimForm.contact}
                onChange={(e) => setClaimForm((p) => ({ ...p, contact: e.target.value }))}
                placeholder="@username or phone"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00AFF0]/50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Individual or agency</label>
              <div className="flex gap-3">
                {(['individual', 'agency'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setClaimForm((p) => ({ ...p, accountType: type }))}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold capitalize border transition-all ${claimForm.accountType === type ? 'bg-[#00AFF0]/20 border-[#00AFF0] text-[#00AFF0]' : 'bg-white/[0.04] border-white/10 text-gray-400'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Why do you want to claim this profile?</label>
              <textarea
                value={claimForm.reason}
                onChange={(e) => setClaimForm((p) => ({ ...p, reason: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00AFF0]/50 resize-y"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClaimSubmit}
                disabled={claimSubmitting}
                className="flex-1 py-3 rounded-xl bg-[#00AFF0] text-white font-black text-sm hover:bg-[#009dd9] transition-all disabled:opacity-50"
              >
                {claimSubmitting ? 'Submitting…' : 'Submit claim'}
              </button>
              <button type="button" onClick={() => setClaimOpen(false)} className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:text-white transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {canEditProfile && profileEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-10">
          <div className="w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#0d1a24] p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-white">{isAdmin ? 'Edit Profile' : 'Edit my profile'}</h2>
              <button onClick={() => setProfileEdit(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Photos — upload + delete */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Photos</label>
              <input ref={panelAvatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReplacePhoto('avatar', f); e.target.value = ''; }} />
              <input ref={panelHeaderRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReplacePhoto('header', f); e.target.value = ''; }} />
              <div className="space-y-3">
                {/* Avatar row */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 shrink-0">
                    {creator.avatar ? (
                      <img src={creator.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-500 text-xl font-black">{creator.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white mb-1">Profile Picture</div>
                    <div className="text-[10px] text-[#666] truncate">{creator.avatar ? 'Current photo loaded' : 'No avatar set'}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => panelAvatarRef.current?.click()}
                      disabled={uploading === 'avatar'}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00AFF0] text-white text-xs font-bold hover:bg-[#009dd9] transition-all disabled:opacity-50"
                    >
                      {uploading === 'avatar' ? (
                        <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Uploading…</>
                      ) : (
                        <><Camera className="w-3.5 h-3.5" /> {creator.avatar ? 'Replace' : 'Upload'}</>
                      )}
                    </button>
                    {creator.avatar && (
                      <button onClick={() => handleDeletePhoto('avatar')} className="px-2 py-2 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600/30 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Header row */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 shrink-0">
                    {creator.header ? (
                      <img src={creator.header} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-500 text-[9px] font-bold">No header</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white mb-1">Header / Banner</div>
                    <div className="text-[10px] text-[#666] truncate">{creator.header ? 'Current banner loaded' : 'No header set'}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => panelHeaderRef.current?.click()}
                      disabled={uploading === 'header'}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#00AFF0] text-white text-xs font-bold hover:bg-[#009dd9] transition-all disabled:opacity-50"
                    >
                      {uploading === 'header' ? (
                        <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Uploading…</>
                      ) : (
                        <><Camera className="w-3.5 h-3.5" /> {creator.header ? 'Replace' : 'Upload'}</>
                      )}
                    </button>
                    {creator.header && (
                      <button onClick={() => handleDeletePhoto('header')} className="px-2 py-2 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600/30 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Extra photos */}
                {(creator.extraPhotos || []).length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Album Photos ({(creator.extraPhotos || []).length})</div>
                    <div className="flex flex-wrap gap-2">
                      {(creator.extraPhotos || []).map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => handleDeletePhoto('extra', i)} className="absolute top-1 right-1 p-0.5 rounded bg-red-600 text-white"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Extra videos */}
                {(creator.extraVideos || []).length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Album Videos ({(creator.extraVideos || []).length})</div>
                    <div className="flex flex-wrap gap-2">
                      {(creator.extraVideos || []).map((url, i) => (
                        <div key={i} className="relative w-24 h-16 rounded-lg overflow-hidden border border-white/10 bg-black">
                          <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                          <button onClick={() => handleDeleteVideo(url)} className="absolute top-1 right-1 p-0.5 rounded bg-red-600 text-white"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Add more album photos */}
                <div className="p-3 rounded-xl bg-white/[0.04] border border-dashed border-white/15">
                  <input
                    ref={panelBulkRef}
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files?.length) handleBulkAlbumUpload(files);
                      e.target.value = '';
                    }}
                  />
                  <div className="text-xs font-bold text-white mb-1">Add photos</div>
                  <p className="text-[10px] text-gray-500 mb-3">
                    Upload as many photos as you want. Max {MAX_CREATOR_PHOTO_MB} MB each. Videos max {MAX_CREATOR_VIDEO_MB} MB.
                  </p>
                  <button
                    type="button"
                    onClick={() => panelBulkRef.current?.click()}
                    disabled={bulkUpload !== null}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00AFF0] text-white text-xs font-bold hover:bg-[#009dd9] transition-all disabled:opacity-50 w-full justify-center"
                  >
                    {bulkUpload ? (
                      <>Uploading {bulkUpload.current}/{bulkUpload.total}…</>
                    ) : (
                      <><Upload className="w-3.5 h-3.5" /> Choose photos</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {isAdmin && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => setPublicPage(v => !v)}
                className={`relative w-11 h-6 rounded-full shrink-0 transition-all ${publicPage ? 'bg-[#00AFF0]' : 'bg-white/15'}`}
                aria-pressed={publicPage}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${publicPage ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white mb-0.5">Public page - no login required</div>
                <div className="text-[10px] text-[#666]">
                  {publicPage
                    ? 'Anyone can view this profile without signing in.'
                    : 'Visitors without an account are redirected to the join page.'}
                </div>
              </div>
            </div>
            )}

            {/* Editable fields */}
            {([
              ['name', 'Name'],
              ['bio', 'Bio'],
              ['location', 'Location'],
              ['price', 'Price'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{label}</label>
                {key === 'bio' ? (
                  <textarea
                    value={editFields[key]}
                    onChange={(e) => setEditFields(prev => ({ ...prev, [key]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00AFF0]/50 resize-y"
                  />
                ) : (
                  <input
                    type="text"
                    value={editFields[key]}
                    onChange={(e) => setEditFields(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00AFF0]/50"
                  />
                )}
              </div>
            ))}

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Platforms</label>
              <div className="space-y-3">
                {([
                  ['fanvueUrl', 'Fanvue'],
                  ['fanslyUrl', 'Fansly'],
                  ['instagramUrl', 'Instagram'],
                  ['twitterUrl', 'X / Twitter'],
                  ['telegramUrl', 'Telegram'],
                  ['patreonUrl', 'Patreon'],
                  ['redditUrl', 'Reddit'],
                  ['website', 'Website'],
                  ['linktreeUrl', 'Linktree'],
                  ['allmylinksUrl', 'AllMyLinks'],
                  ['beaconsUrl', 'Beacons'],
                  ['tiktokUrl', 'TikTok'],
                ] as const).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{label}</label>
                    <input
                      type="text"
                      value={editFields[key]}
                      onChange={(e) => setEditFields(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder="https://"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00AFF0]/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAdminSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00AFF0] text-white font-black text-sm hover:bg-[#009dd9] transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setProfileEdit(false)} className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:text-white transition-all">
                Cancel
              </button>
            </div>

            {isAdmin && (
            <button onClick={handleDeleteProfile} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/10 border border-red-600/30 text-red-400 font-bold text-xs hover:bg-red-600/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Delete This Profile Permanently
            </button>
            )}
          </div>
        </div>
      )}

      </div>

      <Footer />

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImg}
            alt={`${creator.name} OnlyFans`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
