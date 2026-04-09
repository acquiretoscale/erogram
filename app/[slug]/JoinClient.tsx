'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import BookmarkButton from '@/components/BookmarkButton';
import { getButtonConfig } from '@/lib/actions/publicData';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';
import VaultTeaserFeed from '@/app/groups/VaultTeaserFeed';
import VickyGroupsBubble from '@/app/groups/VickyGroupsBubble';
import { useTranslation, useLocalePath } from '@/lib/i18n';

interface Entity {
  _id: string;
  name: string;
  slug: string;
  category: string;
  country: string;
  telegramLink: string;
  description: string;
  image: string;
  views?: number;
  clickCount?: number;
  memberCount?: number;
  premiumOnly?: boolean;
  linkedCreatorSlug?: string;
  reviews?: Array<{
    _id: string;
    authorName: string;
    content: string;
    rating: number;
    createdAt: string;
  }>;
  createdBy?: {
    username?: string;
    showNicknameUnderGroups?: boolean;
  } | null;
}

interface ButtonConfig {
  button1: { text: string; link: string; color: string };
  button2: { text: string; link: string; color: string };
  button3: { text: string; link: string; color: string };
}

interface JoinCtaCampaign {
  _id: string;
  destinationUrl: string;
  description: string;
  buttonText: string;
}

interface VaultTeaserItem {
  _id: string;
  name: string;
  image: string;
  category: string;
  country: string;
  memberCount: number;
  vaultCategories?: string[];
}

interface JoinClientProps {
  entity: Entity;
  type: 'group' | 'bot';
  similarGroups?: Array<{
    _id: string;
    name: string;
    slug: string;
    category: string;
    country: string;
    description: string;
    image?: string;
  }>;
  initialIsMobile?: boolean;
  initialIsTelegram?: boolean;
  joinCtaCampaign?: JoinCtaCampaign | null;
  topBannerCampaigns?: Array<{ _id: string; creative: string; destinationUrl: string; slot: string }>;
  isDeleted?: boolean;
  vaultTeaser?: VaultTeaserItem[];
}

interface PopupAdvert {
  _id: string;
  name: string;
  url: string;
  image: string;
  buttonText: string;
  redirectTimer: number;
  button2Enabled?: boolean;
  button2Text?: string;
  button2Url?: string;
  button3Enabled?: boolean;
  button3Text?: string;
  button3Url?: string;
}

const DEFAULT_JOIN_CTA = {
  destinationUrl: 'https://lovescape.com/create-ai-sex-girlfriend/style?userId=5ebe4f139af9bcff39155f3e9f06fbce233415fd82fd4da2a9c51ea0921d4c0e&sourceId=Erogram&creativeId=6step_hent&p1=test',
  description: 'Build your own AI girlfriend 💖',
};

function VaultTeaserBlock({ items }: { items: VaultTeaserItem[] }) {
  const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : n > 0 ? String(n) : null;

  return (
    <Link href="/premium" target="_blank" className="block mb-12 group/vault cursor-pointer">
      <div className="text-center mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-3"
          style={{ background: 'rgba(201,151,58,0.08)', border: '1px solid rgba(201,151,58,0.2)', color: '#b8964e' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Private Vault
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Premium <span style={{ background: 'linear-gradient(135deg, #c9973a, #e8ba5a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Secret Vault</span>
        </h2>
        <p className="text-white/30 text-xs mt-1">Exclusive groups only visible to Premium members</p>
      </div>

      <div
        className="relative rounded-2xl overflow-hidden p-3 sm:p-4 transition-all group-hover/vault:scale-[1.01]"
        style={{ background: 'linear-gradient(160deg, #0f0d09 0%, #110e08 60%, #0d0b07 100%)', border: '1px solid #2a1f0e' }}
      >
        <div className="absolute top-0 right-0 w-56 h-56 blur-3xl opacity-[0.06] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, #c9973a 0%, transparent 60%)' }} />

        <div className="relative grid grid-cols-2 gap-1.5">
          {items.map(g => {
            const fmt = fmtNum(g.memberCount);
            const cats = g.vaultCategories && g.vaultCategories.length > 0 ? g.vaultCategories : [g.category];
            return (
              <div
                key={g._id}
                className="relative rounded-lg flex items-center gap-2 px-2 py-1.5 select-none"
                style={{ background: 'linear-gradient(135deg, #120f09 0%, #150f08 100%)', border: '1px solid #2a1f0e' }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(180deg, transparent, #c9973a44, transparent)' }} />
                <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden" style={{ border: '1px solid #2e2010' }}>
                  <img src={g.image || '/assets/placeholder-no-image.png'} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[10px] truncate leading-tight mb-0.5 select-none pointer-events-none" aria-hidden="true">
                    <span className="text-white">{g.name.slice(0, 4)}</span><span style={{ filter: 'blur(4px)', color: '#fff' }}>{g.name.slice(4) || '····'}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {cats.map((c: string, i: number) => (
                      <span key={c} className="text-[7px] font-black uppercase tracking-[0.06em] px-1 py-0.5 rounded shrink-0" style={{ background: i === 0 ? '#1a1408' : '#12100a', border: '1px solid #c9973a22', color: i === 0 ? '#c9973a' : '#7a6040' }}>{c}</span>
                    ))}
                    {g.country && <span className="text-[8px] font-semibold truncate" style={{ color: '#5a4830' }}>{g.country}</span>}
                    {fmt && <span className="text-[8px] font-semibold shrink-0" style={{ color: '#4a3820' }}>· {fmt}</span>}
                  </div>
                </div>
                <svg className="shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c9973a55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #0f0d09)' }} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all group-hover/vault:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #c9973a, #a67c2e)', color: '#0d0c0a' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Unlock the Full Vault
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
      <p className="mt-2 text-center text-[10px]" style={{ color: '#4a3820' }}>100+ exclusive groups · Updated regularly</p>
    </Link>
  );
}

export default function JoinClient({ entity, type, similarGroups = [], initialIsMobile = false, initialIsTelegram = false, joinCtaCampaign = null, topBannerCampaigns = [], isDeleted = false, vaultTeaser = [] }: JoinClientProps) {
  const [countdown, setCountdown] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [buttonConfig, setButtonConfig] = useState<ButtonConfig | null>(null);
  const [popupAdvert, setPopupAdvert] = useState<PopupAdvert | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [groupImage, setGroupImage] = useState(entity.image || PLACEHOLDER_IMAGE_URL);
  const [failedSimilarImages, setFailedSimilarImages] = useState<Record<string, boolean>>({});
  const [userInteracted, setUserInteracted] = useState(false);
  const [adsReady, setAdsReady] = useState(false);
  const clickTrackedRef = useRef(false);
  const { t } = useTranslation();
  const lp = useLocalePath();

  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  // Use server-provided device detection to avoid late client-only toggles (CLS).
  const isMobile = initialIsMobile;
  const isTelegram = initialIsTelegram;

  const isPremiumGated = entity.premiumOnly === true;
  const [realTelegramLink, setRealTelegramLink] = useState(entity.telegramLink || '');

  const encodedCountry = encodeURIComponent(entity.country || '');


  const fetchGroupImage = async () => {
    // Fetch the actual entity image if it's the placeholder
    if (entity._id && (entity.image === '/assets/image.jpg' || entity.image === PLACEHOLDER_IMAGE_URL || !entity.image)) {
      try {
        const apiPath = type === 'group' ? 'groups' : 'bots';
        const res = await axios.get(`/api/${apiPath}/${entity._id}/image`);
        if (res.data?.image && res.data.image && res.data.image !== PLACEHOLDER_IMAGE_URL) {
          setGroupImage(res.data.image);
        }
      } catch (err) {
        console.error('Failed to load entity image:', err);
      }
    }
  };

  const fetchButtonConfig = async () => {
    try {
      const data = await getButtonConfig();
      setButtonConfig(data);
    } catch (err) {
      console.error('Error fetching button config:', err);
    }
  };

  const trackClick = () => {
    try {
      if (clickTrackedRef.current) return;
      clickTrackedRef.current = true;

      const url = type === 'group' ? '/api/groups/track' : '/api/bots/track';
      const payload = type === 'group' ? { groupId: entity._id } : { botId: entity._id };

      // Use sendBeacon for reliable tracking even during redirects
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        // Fallback to axios, but ignore errors since tracking is not critical
        axios.post(url, payload).catch(() => { });
      }
    } catch {
      // Silently fail - tracking is not critical
    }
  };

  useEffect(() => {
    fetchButtonConfig();
    fetchGroupImage();

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      setIsLoggedIn(true);
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            if (data.premium || data.isAdmin) {
              setIsPremiumUser(true);
              if (isPremiumGated && !entity.telegramLink) {
                fetch('/api/vault/link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ groupId: entity._id }),
                })
                  .then(r => r.ok ? r.json() : null)
                  .then(d => { if (d?.telegramLink) setRealTelegramLink(d.telegramLink); })
                  .catch(() => {});
              }
            }
          }
          setAuthChecked(true);
        })
        .catch(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }

    // Wait 3 seconds before allowing ads to load
    const adTimer = setTimeout(() => {
      setAdsReady(true);
    }, 3000);

    return () => clearTimeout(adTimer);
  }, []);

  // Handle user interaction - only listen if button hasn't been clicked
  // Handle user interaction - only listen if button hasn't been clicked
  // REMOVED: Global interaction listener that was auto-starting the countdown
  /*
  useEffect(() => {
    if (userInteracted) return;

    const handleInteraction = (e: Event) => {
      // Don't trigger on button clicks - those are handled separately
      const target = e.target as HTMLElement;
      if (target?.closest('button') || target?.closest('a')) {
        return;
      }

      if (!userInteracted) {
        setUserInteracted(true);
      }
    };

    window.addEventListener('click', handleInteraction, { once: true, capture: true });
    window.addEventListener('touchstart', handleInteraction, { once: true, capture: true });
    window.addEventListener('keydown', handleInteraction, { once: true, capture: true });

    return () => {
      // `once` doesn't matter for removal; only `capture` must match.
      window.removeEventListener('click', handleInteraction, true);
      window.removeEventListener('touchstart', handleInteraction, true);
      window.removeEventListener('keydown', handleInteraction, true);
    };
  }, [userInteracted]);
  */

  // Fetch popup advert when user interacts
  useEffect(() => {
    if (userInteracted) {
      const fetchAndStart = async () => {
        try {
          const res = await axios.get('/api/popup-advert');
          if (res.data.popupAdvert) {
            let popupData = res.data.popupAdvert;

            if ((popupData.image === PLACEHOLDER_IMAGE_URL || popupData.image === '/assets/image.jpg') && popupData._id) {
              try {
                const imageRes = await axios.get(`/api/adverts/${popupData._id}/image`);
                if (imageRes.data?.image && imageRes.data.image !== PLACEHOLDER_IMAGE_URL) {
                  popupData = { ...popupData, image: imageRes.data.image };
                }
              } catch (imgErr) {
                console.error('Failed to fetch popup advert image:', imgErr);
              }
            }

            setPopupAdvert(popupData);
            setShowPopup(true);
          } else {
            // No popup advert, start countdown
            setCountdown(7);
            setCountdownStarted(true);
          }
        } catch (err) {
          console.error('Error fetching popup advert:', err);
          // On error, start countdown
          setCountdown(7);
          setCountdownStarted(true);
        }
      };
      fetchAndStart();
    }
  }, [userInteracted]);


  useEffect(() => {
    if (countdownStarted && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdownStarted && countdown === 0 && entity && realTelegramLink) {
      trackClick();
      setIsRedirecting(true);
      window.open(realTelegramLink, '_blank', 'noopener,noreferrer');
    }
  }, [countdown, countdownStarted, entity]);



  const handleSkipAdvert = () => {
    if (popupAdvert) {
      setCountdown(popupAdvert.redirectTimer);
      setCountdownStarted(true);
      setShowPopup(false);
    } else {
      // No popup, start countdown with default 7 seconds
      setCountdown(7);
      setCountdownStarted(true);
    }
  };

  const handleStartCountdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setUserInteracted(true);
    // If no popup advert, start countdown immediately
    if (!popupAdvert) {
      setCountdown(7);
      setCountdownStarted(true);
    }
  };

  const handleAdvertClick = (url: string) => {
    // Track click
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ advertId: popupAdvert?._id })], { type: 'application/json' });
        navigator.sendBeacon('/api/adverts/track', blob);
      } else {
        axios.post('/api/adverts/track', { advertId: popupAdvert?._id }).catch(() => { });
      }
    } catch {
      // Silently fail
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };


  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-[#b31b1b] selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <Navbar />
      {/* Top banner: same size as Groups/Bots, minimal spacing */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-2">
        <HeaderBanner campaigns={topBannerCampaigns} />
      </div>

      {/* Popup Advert Modal */}
      {showPopup && popupAdvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-8 border border-white/10 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>

            <div className="text-center relative z-10">
              <h3 className="text-xl font-bold mb-4 text-white">Sponsored Partner</h3>

              {/* Advert Image - Clickable */}
              <div
                onClick={() => handleAdvertClick(popupAdvert.url)}
                className="cursor-pointer mb-6 group relative"
              >
                <div className="w-full h-56 rounded-2xl overflow-hidden mx-auto border border-white/10 shadow-lg">
                  <Image
                    src={popupAdvert.image}
                    alt={popupAdvert.name}
                    width={400}
                    height={256}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
              </div>

              {/* Advert Button - Clickable */}
              <button
                onClick={() => handleAdvertClick(popupAdvert.url)}
                className="w-full mb-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-blue-900/20 transform hover:-translate-y-0.5"
              >
                {popupAdvert.buttonText} <span className="ml-2">🚀</span>
              </button>

              {/* Additional Buttons */}
              <div className="space-y-3 mb-6">
                {popupAdvert.button2Enabled && popupAdvert.button2Text && popupAdvert.button2Url && (
                  <button
                    onClick={() => handleAdvertClick(popupAdvert.button2Url!)}
                    className="w-full px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] border border-white/5 text-white font-semibold rounded-xl transition-all hover:border-white/20"
                  >
                    {popupAdvert.button2Text}
                  </button>
                )}
                {popupAdvert.button3Enabled && popupAdvert.button3Text && popupAdvert.button3Url && (
                  <button
                    onClick={() => handleAdvertClick(popupAdvert.button3Url!)}
                    className="w-full px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] border border-white/5 text-white font-semibold rounded-xl transition-all hover:border-white/20"
                  >
                    {popupAdvert.button3Text}
                  </button>
                )}
              </div>

              {/* Skip Button */}
              <button
                onClick={handleSkipAdvert}
                className="text-sm text-gray-500 hover:text-white transition-colors underline decoration-gray-700 hover:decoration-white underline-offset-4"
              >
                No thanks, continue to {type === 'group' ? 'group' : 'bot'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Hero Background with Blur */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0a0a]"></div>
        {entity.linkedCreatorSlug ? (
          <img
            src={groupImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-110"
            referrerPolicy="no-referrer"
            onError={() => setGroupImage(PLACEHOLDER_IMAGE_URL)}
          />
        ) : (
          <Image
            src={groupImage}
            alt={`${entity.name} background`}
            fill
            className="object-cover opacity-20 blur-3xl scale-110"
            priority
            onError={() => setGroupImage(PLACEHOLDER_IMAGE_URL)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/90 to-[#0a0a0a]"></div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="relative z-10 px-4 sm:px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center text-sm text-gray-400">
            <Link href={lp('/')} className="hover:text-white transition-colors flex items-center gap-1">
              <span>🏠</span> <span className="hidden sm:inline">{t('slug.home')}</span>
            </Link>
            <span className="mx-2 text-gray-600">/</span>
            <Link href={lp(type === 'group' ? '/groups' : '/bots')} className="hover:text-white transition-colors flex items-center gap-1">
              <span>{type === 'group' ? '👥' : '🤖'}</span> <span className="hidden sm:inline">{type === 'group' ? t('nav.groups') : t('nav.bots')}</span>
            </Link>
            <span className="mx-2 text-gray-600">/</span>
            <span className="text-white font-medium truncate max-w-[150px] sm:max-w-xs">{entity.name}</span>
          </nav>
        </div>
      </div>

      {/* Premium Gate — loading state */}
      {isPremiumGated && !authChecked && (
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
        </div>
      )}

      {/* Premium Gate — blocks content for non-premium visitors */}
      {isPremiumGated && authChecked && !isPremiumUser && (
        <div className="relative z-10 flex items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-lg w-full text-center">
            <div className="bg-[#151515] rounded-3xl p-10 border border-amber-500/20 shadow-2xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-3">{t('slug.premiumContent')}</h2>
              <p className="text-gray-400 mb-2">
                <span className="font-bold text-white">{entity.name}</span> {t('slug.partOfVault')}
              </p>
              <p className="text-gray-500 text-sm mb-8">
                {t('slug.unlockVault')}
              </p>
              {!isLoggedIn ? (
                <div className="space-y-3">
                  <a
                    href={lp('/login')}
                    className="block w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:scale-105 transition-all text-lg"
                  >
                    {t('slug.loginTelegram')}
                  </a>
                  <p className="text-gray-500 text-xs">{t('slug.alreadyPremium')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <a
                    href={lp('/premium')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-8 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all text-lg"
                  >
                    {t('slug.upgradePremium')}
                  </a>
                  <p className="text-gray-500 text-xs">{t('slug.unlimitedAccess')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area — hidden for gated premium content (also hidden while auth is loading for premium groups to prevent flash) */}
      <main className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 ${isPremiumGated && (!authChecked || !isPremiumUser) ? 'hidden' : ''}`}>
        {isDeleted && (
          <div className="mb-8 p-5 bg-red-900/30 border border-red-500/40 rounded-2xl flex items-center gap-4">
            <span className="text-3xl flex-shrink-0">🚫</span>
            <div>
              <h3 className="text-lg font-bold text-red-300">{t('slug.removed')}</h3>
              <p className="text-sm text-red-200/70 mt-1">{t('slug.removedDesc')}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Left Column: Image & Quick Stats */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#151515] rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group"
            >
              {/* Image Container */}
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#222] relative mb-6 shadow-inner border border-white/5">
                {entity.linkedCreatorSlug ? (
                  <img
                    src={groupImage}
                    alt={entity.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={() => setGroupImage(PLACEHOLDER_IMAGE_URL)}
                  />
                ) : (
                  <Image
                    src={groupImage}
                    alt={entity.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                    onError={() => setGroupImage(PLACEHOLDER_IMAGE_URL)}
                  />
                )}
                {/* Verified Badge Overlay */}
                <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                  <span>✓</span> {t('common.verified')}
                </div>
                {/* Premium Badge Overlay */}
                {isPremiumGated && (
                  <div className="absolute bottom-3 left-3 right-3 flex justify-center">
                    <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-orange-500 text-white text-xs font-black tracking-wider shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                      {t('slug.premiumExclusive')}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-center overflow-hidden">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">{t('slug.pageViews')}</div>
                  <div className="text-xs font-semibold text-white tabular-nums truncate">{(entity.views || 0).toLocaleString()}</div>
                </div>
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-center overflow-hidden">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                    {entity.memberCount && entity.memberCount > 0 ? t('common.members') : t('common.status')}
                  </div>
                  <div className={`text-xs font-semibold tabular-nums truncate ${entity.memberCount && entity.memberCount > 0 ? 'text-white' : 'text-green-400 flex items-center justify-center gap-2'}`}>
                    {entity.memberCount && entity.memberCount > 0 ? (
                      entity.memberCount.toLocaleString()
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        {t('common.active')}
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-center overflow-hidden">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">{t('common.category')}</div>
                  <div className="text-xs font-semibold text-white truncate">{entity.category}</div>
                </div>
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-center overflow-hidden">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">{t('common.country')}</div>
                  <div className="text-xs font-semibold text-white truncate">{entity.country}</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Content & Actions */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Header with Bookmark */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                  {entity.name}
                  {isPremiumGated && (
                    <span className="inline-flex items-center gap-1.5 ml-3 align-middle px-3 py-1 text-sm font-bold rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10 animate-pulse-subtle">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                      PREMIUM
                    </span>
                  )}
                </h1>
                <BookmarkButton itemId={entity._id} itemType={type} size="md" className="shrink-0 mt-2 w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/30 hover:bg-orange-500/25 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10" />
              </div>

              {/* Tags Row */}
              <div className="flex flex-wrap gap-3 mb-8">
                <Link href={lp(`/best-telegram-groups/${entity.category.toLowerCase()}`)} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                  #{entity.category}
                </Link>
                <Link href={lp(`/best-telegram-groups/country/${entity.country.toLowerCase()}`)} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                  #{entity.country}
                </Link>
                <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
                  {type === 'group' ? t('slug.telegramGroup') : t('slug.telegramBot')}
                </span>
              </div>

              {/* Description or Erogram Profile CTA */}
              {entity.linkedCreatorSlug ? (
                <div className="mb-10">
                  <a
                    href={`/${entity.linkedCreatorSlug}`}
                    className="group/cta block w-full bg-gradient-to-r from-[#00AFF0] via-blue-500 to-indigo-600 p-[2px] rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between gap-4 bg-[#0e1117] rounded-[14px] px-6 sm:px-8 py-5 group-hover/cta:bg-[#0e1117]/80 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00AFF0] to-indigo-600 flex items-center justify-center shrink-0">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </div>
                        <div>
                          <div className="text-lg sm:text-xl font-black text-white">
                            Show some love to {entity.name.replace(' OnlyFans', '')}
                          </div>
                          <div className="text-sm text-blue-300/70 font-medium">
                            Visit her full Erogram profile
                          </div>
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-white/60 group-hover/cta:text-white group-hover/cta:translate-x-1 transition-all shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </a>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none mb-10">
                  <p className="text-lg text-gray-300 leading-relaxed">
                    {entity.description}
                  </p>
                </div>
              )}

              {/* Primary Action Area — hidden for deleted groups */}
              {!isDeleted && (
              <div className="bg-[#151515] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-purple-600/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                <h2 className="text-2xl font-bold text-white relative z-10 mb-2">{t('slug.readyToJoin')}</h2>
                <p className="text-gray-400 mb-6 relative z-10">{t('slug.clickToAccess')}</p>

                {!userInteracted ? (
                  <button
                    onClick={handleStartCountdown}
                    className="relative w-full group overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-[2px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#111]"
                  >
                    <div className="relative w-full bg-[#111] rounded-[14px] px-8 py-5 transition-all group-hover:bg-transparent">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl">🚀</span>
                        <span className="text-xl font-bold text-white">{t('slug.joinChannelNow')}</span>
                      </div>
                    </div>
                  </button>
                ) : countdownStarted ? (
                  <div className="w-full bg-[#111] rounded-2xl border border-white/10 px-8 py-5 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="text-lg font-medium text-white">
                        {isRedirecting ? t('slug.openingTelegram') : t('slug.redirectingIn').replace('{seconds}', String(countdown))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {buttonConfig && entity ? (
                      <a
                        href={buttonConfig.button1.link || realTelegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={trackClick}
                        className="block w-full text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-5 rounded-2xl text-xl shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5"
                      >
                        {buttonConfig.button1.text}
                      </a>
                    ) : (
                      <a
                        href={realTelegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setIsRedirecting(true);
                          trackClick();
                        }}
                        className="block w-full text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-5 rounded-2xl text-xl shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5"
                      >
                        {t('slug.openInTelegram')}
                      </a>
                    )}
                    <p className="text-center text-sm text-gray-500 mt-2">
                      {t('slug.notRedirected')}
                    </p>
                  </div>
                )}

                <div className="mt-6 border-t border-white/5 pt-6 space-y-3">
                  <a
                    href={joinCtaCampaign?.destinationUrl ?? DEFAULT_JOIN_CTA.destinationUrl}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    onClick={() => joinCtaCampaign?._id && trackCampaignClick(joinCtaCampaign._id)}
                    className="block w-full text-center bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-purple-900/20 transition-all transform hover:-translate-y-0.5"
                  >
                    {(joinCtaCampaign?.description || joinCtaCampaign?.buttonText) || DEFAULT_JOIN_CTA.description}
                  </a>
                </div>

                {/* Premium Vault Teaser — same as in-feed version */}
                {vaultTeaser.length > 0 && (
                  <div className="mt-6">
                    <VaultTeaserFeed items={vaultTeaser} />
                  </div>
                )}

              </div>
              )}

              {/* Reviews Section */}
              {entity.reviews && entity.reviews.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>⭐</span> {t('slug.userReviews')}
                  </h3>
                  <div className="space-y-4">
                    {entity.reviews.map((review) => (
                      <div key={review._id} className="bg-[#151515] p-5 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white">{review.authorName}</span>
                          <div className="flex text-yellow-500 text-sm">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm">{review.content}</p>
                        <div className="text-xs text-gray-600 mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Linking / SEO Section */}
              <div className="border-t border-white/10 pt-10 mb-12">
                <h3 className="text-xl font-bold text-white mb-6">{t('slug.exploreMore')}</h3>
                <div className="flex flex-wrap gap-3">
                  {['OnlyFans', 'Anime', 'Leaked', 'Amateur', 'Asian'].map(cat => (
                    <Link
                      key={cat}
                      href={lp(`/best-telegram-groups/${cat.toLowerCase()}`)}
                      className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
                    >
                      {t('slug.bestCatGroups').replace('{category}', cat)}
                    </Link>
                  ))}
                  {['USA', 'UK', 'India', 'Germany', 'Brazil'].map(country => (
                    <Link
                      key={country}
                      href={lp(`/best-telegram-groups/country/${country.toLowerCase()}`)}
                      className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
                    >
                      {t('slug.bestCountryGroups').replace('{country}', country)}
                    </Link>
                  ))}
                </div>
              </div>

              {/* FAQ Section */}
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>❓</span> {t('slug.faqTitle')}
                  </h3>
                <div className="space-y-4">
                  <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                        <span className="font-bold text-white">{t('slug.faqVerifiedQ')}</span>
                        <span className="transition-transform group-open:rotate-180">▼</span>
                      </summary>
                      <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {t('slug.faqVerifiedA')}
                      </div>
                    </details>
                  </div>
                  <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                        <span className="font-bold text-white">{t('slug.faqJoinQ')}</span>
                        <span className="transition-transform group-open:rotate-180">▼</span>
                      </summary>
                      <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {t('slug.faqJoinA')}
                      </div>
                    </details>
                  </div>
                  <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                        <span className="font-bold text-white">{t('slug.faqFreeQ')}</span>
                        <span className="transition-transform group-open:rotate-180">▼</span>
                      </summary>
                      <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {t('slug.faqFreeA')}
                      </div>
                    </details>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        </div >

        {/* Similar Groups Section */}
        {
          type === 'group' && similarGroups.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mt-24"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-black text-white mb-2">{t('slug.similarCommunities')}</h2>
                  <p className="text-gray-400">{t('slug.similarDesc')}</p>
                </div>
                <Link href={lp('/groups')} className="hidden sm:inline-block px-6 py-2 rounded-full border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
                  {t('slug.viewAll')}
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarGroups.slice(0, 6).map((g) => (
                  <Link
                    key={g._id}
                    href={lp(`/${g.slug}`)}
                    className="group bg-[#151515] rounded-2xl p-5 border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#222] overflow-hidden border border-white/5 group-hover:scale-105 transition-transform flex-shrink-0 relative">
                        <img
                          src={failedSimilarImages[g._id] ? PLACEHOLDER_IMAGE_URL : (g.image || PLACEHOLDER_IMAGE_URL)}
                          alt={g.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={() => setFailedSimilarImages((prev) => ({ ...prev, [g._id]: true }))}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate group-hover:text-blue-400 transition-colors">{g.name}</h3>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400">{g.category}</span>
                          <span className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400">{g.country}</span>
                        </div>
                      </div>
                    </div>
                    {g.description && (
                      <p className="mt-4 text-sm text-gray-500 line-clamp-2 group-hover:text-gray-400 transition-colors">
                        {g.description}
                      </p>
                    )}
                  </Link>
                ))}
                {vaultTeaser.filter(g => g.image && g.memberCount >= 80000).slice(0, 3).map((g) => {
                  const fmtSubs = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : String(n);
                  return (
                  <Link
                    key={`vault-${g._id}`}
                    href="/premiumvault"
                    className="group rounded-2xl p-5 border border-amber-500/20 hover:border-amber-500/40 transition-all hover:-translate-y-1 hover:shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #1a1408, #151210)' }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ border: '2px solid rgba(201,151,58,0.3)' }}>
                        <Image src={g.image || PLACEHOLDER_IMAGE_URL} alt="" fill className="object-cover" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL; }} />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9973a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate">
                          <span className="text-white">{g.name.slice(0, 4)}</span><span style={{ filter: 'blur(5px)', color: '#fff', userSelect: 'none' }}>{g.name.slice(4) || '██████'}</span>
                        </h3>
                        <p className="text-[11px] font-black mt-1" style={{ color: '#c9973a' }}>{fmtSubs(g.memberCount)} <span className="text-[9px] font-bold" style={{ color: '#7a6040' }}>subscribers</span></p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {(g.vaultCategories?.length ? g.vaultCategories : [g.category]).filter(Boolean).slice(0, 2).map((c: string) => (
                            <span key={c} className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(201,151,58,0.1)', border: '1px solid rgba(201,151,58,0.2)', color: '#c9973a' }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] font-bold" style={{ color: '#c9973a' }}>⭐ Premium Only — Unlock Access</p>
                  </Link>
                  );
                })}
              </div>

              <div className="mt-8 text-center sm:hidden">
                <Link href={lp('/groups')} className="inline-block px-8 py-3 rounded-full border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
                  {t('slug.viewAllGroups')}
                </Link>
              </div>
            </motion.div>
          )
        }
      </main >
      <VickyGroupsBubble />
    </div >
  );
}
