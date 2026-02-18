'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import { trackClick as trackCampaignClick } from '@/lib/actions/campaigns';

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

export default function JoinClient({ entity, type, similarGroups = [], initialIsMobile = false, initialIsTelegram = false, joinCtaCampaign = null, topBannerCampaigns = [] }: JoinClientProps) {
  const [countdown, setCountdown] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [buttonConfig, setButtonConfig] = useState<ButtonConfig | null>(null);
  const [popupAdvert, setPopupAdvert] = useState<PopupAdvert | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [groupImage, setGroupImage] = useState(entity.image || '/assets/image.jpg');
  const [failedSimilarImages, setFailedSimilarImages] = useState<Record<string, boolean>>({});
  const [userInteracted, setUserInteracted] = useState(false);
  const [adsReady, setAdsReady] = useState(false);
  const clickTrackedRef = useRef(false);

  // Use server-provided device detection to avoid late client-only toggles (CLS).
  const isMobile = initialIsMobile;
  const isTelegram = initialIsTelegram;


  const encodedCountry = encodeURIComponent(entity.country || '');


  const fetchGroupImage = async () => {
    // Fetch the actual entity image if it's the placeholder
    if (entity._id && (entity.image === '/assets/image.jpg' || !entity.image)) {
      try {
        const apiPath = type === 'group' ? 'groups' : 'bots';
        const res = await axios.get(`/api/${apiPath}/${entity._id}/image`);
        if (res.data?.image && res.data.image !== '/assets/image.jpg') {
          setGroupImage(res.data.image);
        }
      } catch (err) {
        console.error('Failed to load entity image:', err);
      }
    }
  };

  const fetchButtonConfig = async () => {
    try {
      const res = await axios.get('/api/button-config');
      setButtonConfig(res.data);
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

            if (popupData.image === '/assets/image.jpg' && popupData._id) {
              try {
                const imageRes = await axios.get(`/api/adverts/${popupData._id}/image`);
                if (imageRes.data?.image && imageRes.data.image !== '/assets/image.jpg') {
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
    } else if (countdownStarted && countdown === 0 && entity) {
      trackClick();
      setIsRedirecting(true);
      window.location.href = entity.telegramLink;
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
        <Image
          src={groupImage}
          alt=""
          fill
          className="object-cover opacity-20 blur-3xl scale-110"
          priority
          onError={() => setGroupImage('/assets/image.jpg')}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/90 to-[#0a0a0a]"></div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="relative z-10 px-4 sm:px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
              <span>🏠</span> <span className="hidden sm:inline">Home</span>
            </Link>
            <span className="mx-2 text-gray-600">/</span>
            <Link href={type === 'group' ? '/groups' : '/bots'} className="hover:text-white transition-colors flex items-center gap-1">
              <span>{type === 'group' ? '👥' : '🤖'}</span> <span className="hidden sm:inline">{type === 'group' ? 'Groups' : 'Bots'}</span>
            </Link>
            <span className="mx-2 text-gray-600">/</span>
            <span className="text-white font-medium truncate max-w-[150px] sm:max-w-xs">{entity.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
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
                <Image
                  src={groupImage}
                  alt={entity.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                  onError={() => setGroupImage('/assets/image.jpg')}
                />
                {/* Verified Badge Overlay */}
                <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                  <span>✓</span> Verified
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Category</div>
                  <div className="font-semibold text-white truncate">{entity.category}</div>
                </div>
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Country</div>
                  <div className="font-semibold text-white truncate">{entity.country}</div>
                </div>
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                    {entity.memberCount && entity.memberCount > 0 ? 'Members' : 'Status'}
                  </div>
                  <div className={`font-semibold truncate ${entity.memberCount && entity.memberCount > 0 ? 'text-white' : 'text-green-400 flex items-center justify-center gap-2'}`}>
                    {entity.memberCount && entity.memberCount > 0 ? (
                      entity.memberCount.toLocaleString()
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Active
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Views</div>
                  <div className="font-semibold text-white truncate">{(entity.views || 0).toLocaleString()}</div>
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
              {/* Header */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
                {entity.name}
              </h1>

              {/* Tags Row */}
              <div className="flex flex-wrap gap-3 mb-8">
                <Link href={`/best-telegram-groups/${entity.category.toLowerCase()}`} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                  #{entity.category}
                </Link>
                <Link href={`/best-telegram-groups/country/${entity.country.toLowerCase()}`} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                  #{entity.country}
                </Link>
                <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300">
                  Telegram {type === 'group' ? 'Group' : 'Bot'}
                </span>
              </div>

              {/* Description */}
              <div className="prose prose-invert max-w-none mb-10">
                <p className="text-lg text-gray-300 leading-relaxed">
                  {entity.description}
                </p>
              </div>

              {/* Primary Action Area */}
              <div className="bg-[#151515] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-xl mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-purple-600/10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Ready to join?</h2>
                <p className="text-gray-400 mb-6 relative z-10">Click the button below to access this community on Telegram.</p>

                {!userInteracted ? (
                  <button
                    onClick={handleStartCountdown}
                    className="relative w-full group overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-[2px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#111]"
                  >
                    <div className="relative w-full bg-[#111] rounded-[14px] px-8 py-5 transition-all group-hover:bg-transparent">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl">🚀</span>
                        <span className="text-xl font-bold text-white">Join Channel Now</span>
                      </div>
                    </div>
                  </button>
                ) : countdownStarted ? (
                  <div className="w-full bg-[#111] rounded-2xl border border-white/10 px-8 py-5 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <div className="text-lg font-medium text-white">
                        {isRedirecting ? 'Opening Telegram...' : `Redirecting in ${countdown}s...`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {buttonConfig && entity ? (
                      <a
                        href={buttonConfig.button1.link || entity.telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={trackClick}
                        className="block w-full text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-5 rounded-2xl text-xl shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5"
                      >
                        {buttonConfig.button1.text}
                      </a>
                    ) : (
                      <a
                        href={entity.telegramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setIsRedirecting(true);
                          trackClick();
                        }}
                        className="block w-full text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-5 rounded-2xl text-xl shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5"
                      >
                        Open in Telegram
                      </a>
                    )}
                    <p className="text-center text-sm text-gray-500 mt-2">
                      If you are not redirected automatically, click the button above.
                    </p>
                  </div>
                )}

                <div className="mt-6 border-t border-white/5 pt-6">
                  <a
                    href={joinCtaCampaign?.destinationUrl ?? DEFAULT_JOIN_CTA.destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => joinCtaCampaign?._id && trackCampaignClick(joinCtaCampaign._id)}
                    className="block w-full text-center bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-purple-900/20 transition-all transform hover:-translate-y-0.5"
                  >
                    {(joinCtaCampaign?.description || joinCtaCampaign?.buttonText) || DEFAULT_JOIN_CTA.description}
                  </a>
                </div>
              </div>

              {/* Official Group Button */}
              <div className="mb-12 text-center">
                <a
                  href="https://t.me/erogrampro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
                >
                  <span className="text-2xl">👑</span>
                  <span>Join Official VIP Channel</span>
                </a>
                <p className="text-gray-500 text-sm mt-2">Get exclusive updates, premium content, and VIP offers.</p>
              </div>

              {/* Reviews Section */}
              {entity.reviews && entity.reviews.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>⭐</span> User Reviews
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
                <h3 className="text-xl font-bold text-white mb-6">Explore More Categories</h3>
                <div className="flex flex-wrap gap-3">
                  {['OnlyFans', 'Hentai', 'Leaked', 'Amateur', 'Asian'].map(cat => (
                    <Link
                      key={cat}
                      href={`/best-telegram-groups/${cat.toLowerCase()}`}
                      className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
                    >
                      Best {cat} Groups
                    </Link>
                  ))}
                  {['USA', 'UK', 'India', 'Germany', 'Brazil'].map(country => (
                    <Link
                      key={country}
                      href={`/best-telegram-groups/country/${country.toLowerCase()}`}
                      className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
                    >
                      Best {country} Groups
                    </Link>
                  ))}
                </div>
              </div>

              {/* FAQ Section */}
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <span>❓</span> Frequently Asked Questions
                </h3>
                <div className="space-y-4">
                  <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                        <span className="font-bold text-white">Is this group verified?</span>
                        <span className="transition-transform group-open:rotate-180">▼</span>
                      </summary>
                      <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        Yes, absolutely. All groups listed on Erogram are manually verified by our staff to ensure they are active, safe, and match their description. We prioritize quality and user safety above all else.
                      </div>
                    </details>
                  </div>
                  <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                        <span className="font-bold text-white">How do I join this group?</span>
                        <span className="transition-transform group-open:rotate-180">▼</span>
                      </summary>
                      <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        Simply click the "Join Channel Now" button above. You may need to wait a few seconds for the secure link to generate. Once ready, you'll be redirected to Telegram to join the community.
                      </div>
                    </details>
                  </div>
                  <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                        <span className="font-bold text-white">Is it free to join?</span>
                        <span className="transition-transform group-open:rotate-180">▼</span>
                      </summary>
                      <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        Most groups on our platform are free to join. Some premium communities may require a subscription, but this is clearly stated within the group itself.
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
                  <h2 className="text-3xl font-black text-white mb-2">Similar Communities</h2>
                  <p className="text-gray-400">More groups you might be interested in</p>
                </div>
                <Link href="/groups" className="hidden sm:inline-block px-6 py-2 rounded-full border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarGroups.slice(0, 6).map((g) => (
                  <Link
                    key={g._id}
                    href={`/${g.slug}`}
                    className="group bg-[#151515] rounded-2xl p-5 border border-white/5 hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#222] overflow-hidden border border-white/5 group-hover:scale-105 transition-transform flex-shrink-0 relative">
                        <Image
                          src={failedSimilarImages[g._id] ? '/assets/image.jpg' : (g.image || '/assets/image.jpg')}
                          alt={g.name}
                          fill
                          className="object-cover"
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
              </div>

              <div className="mt-8 text-center sm:hidden">
                <Link href="/groups" className="inline-block px-8 py-3 rounded-full border border-white/10 text-white hover:bg-white/5 transition-colors font-medium">
                  View All Groups
                </Link>
              </div>
            </motion.div>
          )
        }
      </main >
    </div >
  );
}
