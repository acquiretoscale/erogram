'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Heart, Image as ImageIcon, Video, Users,
  ExternalLink, ChevronRight, DollarSign, Lock, Clock,
  Camera, Film, Globe, MapPin, Calendar, Mic, FileText,
  Radio, Zap, MessageCircle, Share2, Copy, Check, Mail, X, Star, TrendingUp, TrendingDown, Minus, Bookmark,
  Home, Pencil, Trash2, Save,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { trackCreatorClick } from '@/lib/actions/onlyfansTracking';
import type { CreatorProfile } from '@/lib/actions/ofCreatorProfile';
import { updateCreatorFields, deleteCreatorPhoto, deleteCreator, getCreatorReviews, submitCreatorReview } from '@/lib/actions/ofCreatorProfile';
import type { CreatorReviewData } from '@/lib/actions/ofCreatorProfile';
import { ofCategoryUrl, OF_CATEGORIES } from '@/app/onlyfanssearch/constants';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';
import { getCreatorBio } from '@/app/onlyfanssearch/creatorBios';

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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 sm:px-5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.09] min-w-[80px] sm:min-w-[100px]">
      <span className="text-[#00AFF0]">{icon}</span>
      <span className="text-white font-black text-base sm:text-lg leading-tight">{value}</span>
      <span className="text-gray-400 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}

function SocialButton({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow"
      className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${color}`}
    >
      {icon}
      <span>{label}</span>
      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function DetailRow({ label, value, color, href }: { label: string; value: string | React.ReactNode; color?: string; href?: string }) {
  return (
    <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-white/[0.03]">
      <span className="text-gray-500 text-xs w-28 flex-shrink-0">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="nofollow noopener noreferrer" className={`font-bold text-sm hover:underline ${color || 'text-white'}`}>{value}</a>
      ) : (
        <span className={`font-bold text-sm ${color || 'text-white'}`}>{value}</span>
      )}
    </div>
  );
}

function ShareDropdown({ name, username, slug }: { name: string; username: string; slug: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

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
    setTimeout(() => { setCopied(false); close(); }, 1500);
  };

  const shareItems: { key: string; label: string; href: string; icon: React.ReactNode; iconColor: string }[] = [
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
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
      iconColor: 'text-orange-400',
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Share this profile"
        className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl border transition-all duration-200 ${
          open
            ? 'bg-[#00AFF0]/20 border-[#00AFF0]/50 text-[#00AFF0]'
            : 'bg-white/[0.06] border-white/[0.12] text-gray-400 hover:text-white hover:border-white/25 hover:bg-white/[0.1]'
        }`}
      >
        <Share2 className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-white/[0.12] bg-[#0d1e2a]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t('ofSearch.shareVia')}</p>
          </div>
          <div className="py-1">
            {shareItems.map(({ key, label, href, icon, iconColor }) => (
              <a
                key={key}
                href={href}
                target={key === 'email' ? '_self' : '_blank'}
                rel="nofollow"
                onClick={close}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <span className={iconColor}>{icon}</span>
                {label}
              </a>
            ))}
          </div>
          <div className="border-t border-white/[0.08]">
            <button
              onClick={copyLink}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.08]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{t('ofSearch.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{t('ofSearch.copyLink')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RelatedCard({ creator, publicOnlyfansPath = false }: { creator: CreatorProfile; publicOnlyfansPath?: boolean }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const profileHref = publicOnlyfansPath ? lp(`/${creator.slug}`) : lp(`/onlyfans/${creator.username}`);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl overflow-hidden bg-[#0d1e2a] border border-[#00AFF0]/20 hover:border-[#00AFF0]/60 hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-[0_12px_32px_-8px_rgba(0,175,240,0.30)]"
    >
      <Link href={profileHref} prefetch={false} className="block">
        <div className="relative aspect-[3/4] bg-[#0a1520]">
          {creator.avatar ? (
            <img
              src={creator.avatar}
              alt={`${creator.name} OnlyFans profile`}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-[#00AFF0]/30 bg-gradient-to-br from-[#00AFF0]/10 to-transparent">
              {creator.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          {creator.isFree && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-black uppercase tracking-wide backdrop-blur-sm">
              FREE
            </span>
          )}
        </div>
        <div className="px-3 pt-2 pb-3">
          <p className="font-black text-sm text-white truncate group-hover:text-[#00AFF0] transition-colors">
            {creator.name}
          </p>
          <p className="text-[11px] text-[#00AFF0]/80 truncate">@{creator.username}</p>
          {creator.likesCount > 0 && (
            <p className="text-[10px] text-gray-500 mt-0.5">{formatCount(creator.likesCount)} {t('ofSearch.likes')}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  asian: 'Asian', blonde: 'Blonde', teen: 'Teen', milf: 'MILF',
  amateur: 'Amateur', redhead: 'Redhead', goth: 'Goth', petite: 'Petite',
  'big-ass': 'Big Ass', 'big-boobs': 'Big Boobs', brunette: 'Brunette',
  latina: 'Latina', ahegao: 'Ahegao', alt: 'Alt', cosplay: 'Cosplay',
  fitness: 'Fitness', tattoo: 'Tattoo', curvy: 'Curvy', ebony: 'Ebony',
  feet: 'Feet', lingerie: 'Lingerie', thick: 'Thick', twerk: 'Twerk',
  squirt: 'Squirt', streamer: 'Streamer', piercing: 'Piercing',
};

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

export default function CreatorProfileClient({
  creator,
  related,
  trendingOnErogram = [],
  publicAccess = false,
}: {
  creator: CreatorProfile;
  related: CreatorProfile[];
  trendingOnErogram?: TrendingCreatorItem[];
  publicAccess?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const lp = useLocalePath();
  const [headerError, setHeaderError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(publicAccess);

  useEffect(() => {
    if (publicAccess) return;
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token && !isDev) {
      window.location.href = creator.url;
      return;
    }
    setAuthChecked(true);
  }, [creator.url, publicAccess]);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEdit, setAdminEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'header' | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const panelAvatarRef = useRef<HTMLInputElement>(null);
  const panelHeaderRef = useRef<HTMLInputElement>(null);
  const [editFields, setEditFields] = useState({
    name: creator.name,
    bio: creator.bio || '',
    location: creator.location || '',
    website: creator.website || '',
    price: String(creator.price || 0),
    instagramUrl: creator.instagramUrl || '',
    twitterUrl: creator.twitterUrl || '',
    tiktokUrl: creator.tiktokUrl || '',
    telegramUrl: creator.telegramUrl || '',
  });

  useEffect(() => {
    setIsAdmin(typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true');
  }, []);

  const handleAdminSave = async () => {
    setSaving(true);
    await updateCreatorFields(creator.slug, {
      ...editFields,
      price: parseFloat(editFields.price) || 0,
    });
    setSaving(false);
    setAdminEdit(false);
    router.refresh();
  };

  const handleDeletePhoto = async (type: 'avatar' | 'header' | 'extra', idx?: number) => {
    if (!confirm('Delete this photo?')) return;
    await deleteCreatorPhoto(creator.slug, type, idx);
    router.refresh();
  };

  const handleReplacePhoto = async (type: 'avatar' | 'header', file: File) => {
    setUploading(type);
    try {
      // Convert to compressed WebP data URL (same pattern as /add/AddClient.tsx)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          // Cap at 800px max dimension for avatars, 1600px for headers
          const maxDim = type === 'header' ? 1600 : 800;
          const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Canvas toBlob failed'));
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(blob);
          }, 'image/webp', 0.85);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = URL.createObjectURL(file);
      });

      const updateFields: Record<string, string> = { [type]: dataUrl };
      if (type === 'avatar') {
        updateFields.avatarThumbC50 = dataUrl;
        updateFields.avatarThumbC144 = dataUrl;
      }
      await updateCreatorFields(creator.slug, updateFields);
      router.refresh();
    } catch (e: any) {
      alert(`Upload failed: ${e.message || 'Unknown error'}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteProfile = async () => {
    if (!confirm(`DELETE "${creator.name}" permanently? This cannot be undone.`)) return;
    if (!confirm('Are you absolutely sure?')) return;
    await deleteCreator(creator.slug);
    router.push('/onlyfanssearch');
  };

  const hasHeader = !!creator.header && !headerError;
  const hasAvatar = !!creator.avatar && !avatarError;
  const primaryCat = creator.categories[0] || '';
  const catHref = primaryCat ? ofCategoryUrl(primaryCat) : '/onlyfanssearch';

  const hasSocials = !!(creator.instagramUrl || creator.twitterUrl || creator.tiktokUrl || creator.fanslyUrl || creator.pornhubUrl);
  const totalMedia = creator.mediaCount || (creator.photosCount + creator.videosCount + creator.audiosCount);

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/onlyfans/save', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.savedIds) && data.savedIds.includes(creator._id)) setIsSaved(true);
      })
      .catch(() => {});
  }, [creator._id]);

  const handleToggleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const was = isSaved;
    setIsSaved(!was);
    try {
      await fetch('/api/onlyfans/save', {
        method: was ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: creator._id }),
      });
    } catch {
      setIsSaved(was);
    }
  };

  // ── Review state ──
  const [reviews, setReviews] = useState<CreatorReviewData[]>([]);
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 0, content: '', name: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [burstRating, setBurstRating] = useState(0);
  const [commentCTAVisible, setCommentCTAVisible] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getCreatorReviews(creator.slug).then((data) => {
      setReviews(data.reviews);
      setReviewAvg(data.avg);
      setReviewCount(data.count);
    }).catch(() => {});
  }, [creator.slug]);

  const handleSubmitReview = async () => {
    if (reviewSubmitting || reviewSubmitted) return;
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (reviewForm.rating < 1) return;
    setReviewSubmitting(true);
    try {
      const tkn = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '';
      await submitCreatorReview(creator.slug, reviewForm.rating, reviewForm.content, tkn);
      const data = await getCreatorReviews(creator.slug);
      setReviews(data.reviews);
      setReviewAvg(data.avg);
      setReviewCount(data.count);
      setReviewSubmitted(true);
    } catch { /* ignore */ }
    setReviewSubmitting(false);
  };

  const handleViewProfile = () => {
    trackCreatorClick(creator._id).catch(() => {});
    window.open(creator.url, '_blank', 'noopener,noreferrer');
  };

  const displayPrice = creator.isFree
    ? t('ofSearch.free')
    : creator.price > 0
    ? `$${creator.price.toFixed(2)}/mo`
    : t('ofSearch.unknown');

  const joinFormatted = creator.joinDate
    ? new Date(creator.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

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

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <ol className="flex items-center gap-1.5 text-xs text-gray-500">
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
      <div className="relative w-full h-[220px] sm:h-[300px] md:h-[360px] overflow-hidden bg-gradient-to-br from-[#001824] via-[#041e2e] to-[#0a1117]">
        {hasHeader ? (
          <img
            src={creator.header}
            alt={`${creator.name} OnlyFans banner`}
            className="absolute inset-0 w-full h-full object-cover opacity-70"
            referrerPolicy="no-referrer"
            onError={() => setHeaderError(true)}
          />
        ) : (
          <div className="absolute inset-0">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#00AFF0]/15 blur-[100px]" />
            <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-[#00D4FF]/10 blur-[80px]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1117] via-[#0a1117]/40 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* ── Top section: profile info LEFT + trending RIGHT ── */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT — profile info block */}
          <div className="flex-1 min-w-0">
            {/* Avatar + name */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 -mt-16 sm:-mt-20 mb-6">
              <div className="relative flex-shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden ring-4 ring-[#0a1117] bg-[#0d1e2a] shadow-2xl group/avatar">
                {hasAvatar ? (
                  <img
                    src={creator.avatar}
                    alt={`${creator.name} OnlyFans`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-black text-[#00AFF0]/40 bg-gradient-to-br from-[#00AFF0]/10 to-[#001824]">
                    {creator.name.charAt(0)}
                  </div>
                )}
                {isAdmin && (
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

              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight flex items-center gap-1.5">
                    {creator.name}
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                  </h1>
                  {creator.isFree ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wide">
                      FREE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00AFF0]/15 border border-[#00AFF0]/30 text-[#00AFF0] text-xs font-black">
                      <Lock className="w-3 h-3" />
                      {displayPrice}
                    </span>
                  )}
                </div>
                <p className="text-[#00AFF0] text-sm sm:text-base font-bold">@{creator.username}</p>

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

              {/* Bookmark + Share + Submit — desktop */}
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleToggleSave}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${
                    isSaved
                      ? 'bg-[#00AFF0] border-[#00AFF0] text-white shadow-lg shadow-[#00AFF0]/30'
                      : 'bg-white/[0.06] border-white/[0.10] text-white/50 hover:bg-[#00AFF0]/15 hover:border-[#00AFF0]/30 hover:text-[#00AFF0]'
                  }`}
                  title={isSaved ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
                >
                  <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
                <ShareDropdown name={creator.name} username={creator.username} slug={creator.slug} />
              </div>
            </div>

            {/* Stats Strip */}
            <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
              {creator.likesCount > 0 && (
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(0,175,240,0.15), rgba(0,175,240,0.07))', border: '1px solid rgba(0,175,240,0.30)', minWidth: '160px' }}>
                  <svg className="w-9 h-9 flex-shrink-0" viewBox="0 0 24 24" fill="#00AFF0">
                    <path d="M24 4.003h-4.015c-3.45 0-5.3.197-6.748 1.957a7.996 7.996 0 1 0 2.103 9.211c3.182-.231 5.39-2.134 6.085-5.173c0 0-2.399.585-4.43 0c4.018-.777 6.333-3.037 7.005-5.995M5.61 11.999A2.391 2.391 0 0 1 9.28 9.97a2.966 2.966 0 0 1 2.998-2.528h.008c-.92 1.778-1.407 3.352-1.998 5.263A2.392 2.392 0 0 1 5.61 12Zm2.386-7.996a7.996 7.996 0 1 0 7.996 7.996a7.996 7.996 0 0 0-7.996-7.996m0 10.394A2.399 2.399 0 1 1 10.395 12a2.396 2.396 0 0 1-2.399 2.398Z"/>
                  </svg>
                  <div className="flex flex-col">
                    <span className="font-black text-xl sm:text-2xl leading-tight" style={{ color: '#00AFF0' }}>{formatCount(creator.likesCount)}</span>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider" style={{ color: '#00AFF0', opacity: 0.65 }}>{t('ofSearch.ofLikes')}</span>
                  </div>
                </div>
              )}
              {totalMedia > 0 && (
                <StatCard icon={<ImageIcon className="w-4 h-4" />} label={t('ofSearch.totalMedia')} value={formatCount(totalMedia)} />
              )}
              <StatCard icon={<DollarSign className="w-4 h-4" />} label={t('ofSearch.price')} value={displayPrice} />
            </div>

            {/* Bookmark + Share + Submit — mobile only */}
            <div className="sm:hidden flex items-center justify-end gap-2 mb-6">
              <button
                onClick={handleToggleSave}
                className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${
                  isSaved
                    ? 'bg-[#00AFF0] border-[#00AFF0] text-white shadow-lg shadow-[#00AFF0]/30'
                    : 'bg-white/[0.06] border-white/[0.10] text-white/50 hover:bg-[#00AFF0]/15 hover:border-[#00AFF0]/30 hover:text-[#00AFF0]'
                }`}
                title={isSaved ? t('ofSearch.removeSaved') : t('ofSearch.saveCreator')}
              >
                <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
              <ShareDropdown name={creator.name} username={creator.username} slug={creator.slug} />
            </div>

            {/* Categories */}
            {creator.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {creator.categories.map((cat) => (
                  <Link
                    key={cat}
                    href={lp(ofCategoryUrl(cat))}
                    className="px-3 py-1.5 rounded-xl bg-[#00AFF0]/10 border border-[#00AFF0]/25 text-[#00AFF0] text-xs font-bold capitalize hover:bg-[#00AFF0]/20 hover:border-[#00AFF0]/50 transition-all"
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </Link>
                ))}
              </div>
            )}

            {/* ── Enhanced About Section ── */}
        {(() => {
          const bioData = getCreatorBio(creator.username);
          if (bioData) {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About {bioData.name}
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed">
                  <p>{bioData.bio}</p>
                </div>
              </div>
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
          if (username === 'gem101') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Gem101
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Gem101 has 1.2 million likes on her OnlyFans profile and charges $30 per month. She is one of the higher priced creators with a very large following.
                  </p>
                  <p>
                    Her nickname "The one ❤️" suggests she positions herself as a premium experience. She has built a massive audience despite the higher price point.
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
          if (username === 'gem101') {
            return (
              <div className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
                <h2 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00AFF0]" />
                  About Gem101
                </h2>
                <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                  <p>
                    Gem101 has 1.2 million likes on her OnlyFans profile and charges $30 per month. She is one of the higher priced creators with a very large following.
                  </p>
                  <p>
                    Her nickname "The one ❤️" suggests she positions herself as a premium experience. She has built a massive audience despite the higher price point.
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
            <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6">
              <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00AFF0]" />
                {t('ofSearch.aboutCreator') || 'About'}
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{creator.bio}</p>
            </div>
          ) : null;
        })()}

        {/* ── Social Links & Platforms ── */}
        {hasSocials && (
          <div className="mb-6">
            <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00AFF0]" />
              {t('ofSearch.socialMedia')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {creator.instagramUrl && (
                <SocialButton
                  href={creator.instagramUrl}
                  icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
                  label={creator.instagramUsername ? `@${creator.instagramUsername}` : 'Instagram'}
                  color="bg-gradient-to-r from-purple-500/15 to-pink-500/15 border-purple-500/30 text-pink-300 hover:border-pink-400/60 hover:shadow-lg hover:shadow-pink-500/20"
                />
              )}
              {creator.twitterUrl && (
                <SocialButton
                  href={creator.twitterUrl}
                  icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                  label="X (Twitter)"
                  color="bg-white/[0.06] border-white/20 text-white hover:border-white/40 hover:shadow-lg hover:shadow-white/10"
                />
              )}
              {creator.tiktokUrl && (
                <SocialButton
                  href={creator.tiktokUrl}
                  icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>}
                  label="TikTok"
                  color="bg-[#00f2ea]/10 border-[#00f2ea]/30 text-[#00f2ea] hover:border-[#00f2ea]/60 hover:shadow-lg hover:shadow-[#00f2ea]/20"
                />
              )}
              {creator.fanslyUrl && (
                <SocialButton
                  href={creator.fanslyUrl}
                  icon={<Zap className="w-4 h-4" />}
                  label="Fansly"
                  color="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/20"
                />
              )}
              {creator.pornhubUrl && (
                <SocialButton
                  href={creator.pornhubUrl}
                  icon={<Film className="w-4 h-4" />}
                  label="Pornhub"
                  color="bg-orange-500/10 border-orange-500/30 text-orange-300 hover:border-orange-400/60 hover:shadow-lg hover:shadow-orange-500/20"
                />
              )}
            </div>
          </div>
        )}

        {/* ── Profile Details + Photos ── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left — Profile Details */}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-black text-white mb-4">{t('ofSearch.profileDetails')}</h2>
              <div className="flex flex-col gap-2">
                <DetailRow label={t('ofSearch.username')} value={`@${creator.username}`} />
                <DetailRow label={t('ofSearch.totalLikes')} value={creator.likesCount > 0 ? formatExact(creator.likesCount) : 'N/A'} color={creator.likesCount > 0 ? undefined : 'text-gray-500'} />
                <DetailRow label={t('ofSearch.photos')} value={creator.photosCount > 0 ? formatExact(creator.photosCount) : 'N/A'} color={creator.photosCount > 0 ? undefined : 'text-gray-500'} />
                <DetailRow label={t('ofSearch.videos')} value={creator.videosCount > 0 ? formatExact(creator.videosCount) : 'N/A'} color={creator.videosCount > 0 ? undefined : 'text-gray-500'} />
                <DetailRow label={t('ofSearch.posts')} value={creator.postsCount > 0 ? formatExact(creator.postsCount) : 'N/A'} color={creator.postsCount > 0 ? undefined : 'text-gray-500'} />
                <DetailRow label={t('ofSearch.location')} value={creator.location || 'N/A'} color={creator.location ? undefined : 'text-gray-500'} />
                <DetailRow label={t('ofSearch.joinedOnlyfans')} value={joinFormatted || 'N/A'} color={joinFormatted ? undefined : 'text-gray-500'} />
                <DetailRow
                  label={t('ofSearch.telegram')}
                  value={(() => {
                    if (creator.telegramUrl) return creator.telegramUrl.replace(/https?:\/\/(t\.me\/)?/i, '@');
                    const bioData = getCreatorBio(creator.username);
                    if (bioData?.telegram) return bioData.telegram.replace(/https?:\/\/(t\.me\/)?/i, '@');
                    return 'N/A';
                  })()}
                  color={(creator.telegramUrl || !!getCreatorBio(creator.username)?.telegram) ? 'text-white' : 'text-gray-500'}
                  href={creator.telegramUrl || getCreatorBio(creator.username)?.telegram || undefined}
                />
                <DetailRow
                  label={t('ofSearch.website')}
                  value={creator.website ? creator.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'N/A'}
                  color={creator.website ? 'text-[#00AFF0]' : 'text-gray-500'}
                  href={creator.website ? (creator.website.startsWith('http') ? creator.website : `https://${creator.website}`) : undefined}
                />
              </div>
            </div>

            {/* Right — Photos + CTA */}
            <div className="w-full md:w-56 lg:w-64 flex-shrink-0 flex flex-col gap-3">
              {(() => {
                const allPhotos: { src: string; alt: string }[] = [];
                if (hasAvatar) allPhotos.push({ src: creator.avatar, alt: `${creator.name} OnlyFans profile photo` });
                if (hasHeader) allPhotos.push({ src: creator.header, alt: `${creator.name} OnlyFans banner photo` });
                if (creator.extraPhotos?.length) {
                  creator.extraPhotos.forEach((url, i) => {
                    if (url) allPhotos.push({ src: url, alt: `${creator.name} OnlyFans photo ${i + 3}` });
                  });
                }
                if (allPhotos.length === 0) return null;

                return (
                  <>
                    <h2 className="text-sm font-black text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#00AFF0]" />
                      {t('ofSearch.photos')}
                    </h2>
                    {allPhotos.length <= 2 ? (
                      <div className="flex flex-col gap-2">
                        {allPhotos.map((p, i) => (
                          <button key={i} onClick={() => setLightboxImg(p.src)} className="w-full rounded-xl overflow-hidden border border-white/10 hover:border-[#00AFF0]/50 transition-all hover:scale-[1.02] cursor-zoom-in">
                            <img src={p.src} alt={p.alt} className="w-full aspect-square object-cover" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button onClick={() => setLightboxImg(allPhotos[0].src)} className="w-full rounded-xl overflow-hidden border border-white/10 hover:border-[#00AFF0]/50 transition-all hover:scale-[1.02] cursor-zoom-in">
                          <img src={allPhotos[0].src} alt={allPhotos[0].alt} className="w-full aspect-[4/3] object-cover" />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          {allPhotos.slice(1).map((p, i) => (
                            <button key={i} onClick={() => setLightboxImg(p.src)} className="rounded-lg overflow-hidden border border-white/10 hover:border-[#00AFF0]/50 transition-all hover:scale-[1.03] cursor-zoom-in">
                              <img src={p.src} alt={p.alt} className="w-full aspect-square object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex justify-center mt-auto pt-2">
                  <button
                    onClick={handleViewProfile}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white font-black text-sm shadow-md shadow-[#00AFF0]/25 hover:shadow-lg hover:shadow-[#00AFF0]/40 hover:-translate-y-0.5 transition-all"
                  >
                    {t('ofSearch.visitCreatorOf').replace('{name}', creator.name.split(' ')[0])}
                    <ExternalLink className="w-4 h-4" />
                  </button>
              </div>

              {/* ── Compact inline flame rating — below OnlyFans CTA ── */}
              <div className="flex items-center justify-center gap-2 mt-3 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,80,0,0.08)', border: '1px solid rgba(255,100,0,0.18)' }}>
                <style>{`
                  @keyframes flameBurstInline {
                    0%   { transform: scale(1); }
                    25%  { transform: scale(2); filter: drop-shadow(0 0 10px rgba(255,120,0,1)) brightness(1.5); }
                    60%  { transform: scale(1.3); }
                    100% { transform: scale(1.15); filter: drop-shadow(0 0 5px rgba(255,100,0,0.8)); }
                  }
                  @keyframes sparkleInline {
                    0%   { opacity: 1; transform: translate(0,0) scale(1); }
                    100% { opacity: 0; transform: translate(var(--tx),var(--ty)) scale(0); }
                  }
                `}</style>
                {reviewCount > 0 && (
                  <span className="text-[10px] font-bold shrink-0 tabular-nums" style={{ color: 'rgba(255,160,80,0.75)' }}>
                    {reviewAvg}/5
                  </span>
                )}
                <div className="flex gap-1 items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className="relative">
                      {burstRating === s && [0,1,2,3,4,5,6,7].map((i) => (
                        <span key={i} className="pointer-events-none absolute text-[8px] select-none" style={{ top: '50%', left: '50%', '--tx': `${Math.cos((i/8)*2*Math.PI)*20}px`, '--ty': `${Math.sin((i/8)*2*Math.PI)*20}px`, animation: 'sparkleInline 0.45s ease-out forwards', animationDelay: `${i*18}ms` } as React.CSSProperties}>
                          {i%2===0?'✦':'🔥'}
                        </span>
                      ))}
                      <button
                        onClick={() => {
                          setReviewForm((f) => ({ ...f, rating: s }));
                          setBurstRating(s);
                          setTimeout(() => setBurstRating(0), 600);
                          if (!commentCTAVisible) setTimeout(() => { setCommentCTAVisible(true); setTimeout(() => commentRef.current?.focus(), 350); }, 500);
                        }}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-base select-none leading-none block"
                        style={{
                          filter: s <= (hoverRating || reviewForm.rating) ? 'drop-shadow(0 0 5px rgba(255,100,0,0.9)) brightness(1.1)' : 'grayscale(0.6) brightness(0.5)',
                          animation: burstRating === s ? 'flameBurstInline 0.4s ease-out forwards' : undefined,
                          transition: burstRating === s ? 'none' : 'all 0.12s ease',
                        }}
                      >🔥</button>
                    </div>
                  ))}
                </div>
                {(hoverRating || reviewForm.rating) > 0 ? (
                  <span className="text-[10px] font-black" style={{ color: '#ff8c00' }}>
                    {(hoverRating || reviewForm.rating) === 5 ? 'ON FIRE!' : (hoverRating || reviewForm.rating) === 4 ? 'Very Hot' : (hoverRating || reviewForm.rating) === 3 ? 'Hot' : (hoverRating || reviewForm.rating) === 2 ? 'Warm' : 'Meh'}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,160,80,0.5)' }}>Rate</span>
                )}
              </div>
            </div>
          </div>
        </div>
          </div>

        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-[#00AFF0]/20 to-transparent mb-8" />

        {/* ── Rate Creator — Flame Meter ── */}
        <section className="mb-8 rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #2d0f00 40%, #1a0a00 100%)', border: '1px solid rgba(251,100,20,0.35)' }}>
          {/* Header */}
          <div className="px-5 pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'linear-gradient(135deg, #ff6b00, #ff3d00)' }}>
              🔥
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                How hot is <span style={{ background: 'linear-gradient(90deg, #ff8c00, #ff3d00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{creator.name}</span>?
              </h2>
              {reviewCount > 0 && (
                <p className="text-[12px] font-semibold" style={{ color: 'rgba(255,160,80,0.75)' }}>
                  {reviewCount} {reviewCount === 1 ? 'person rated' : 'people rated'} · {reviewAvg}/5
                </p>
              )}
            </div>
          </div>

          {/* Community flame bar — shown when reviews exist */}
          {reviewCount > 0 && (
            <div className="px-5 pb-4">
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(reviewAvg / 5) * 100}%`,
                    background: reviewAvg >= 4.5
                      ? 'linear-gradient(90deg, #ff6b00, #ff3d00, #ffcc00)'
                      : reviewAvg >= 3
                      ? 'linear-gradient(90deg, #ff8c00, #ff5500)'
                      : 'linear-gradient(90deg, #cc4400, #ff6600)',
                    boxShadow: reviewAvg >= 4.5 ? '0 0 12px 2px rgba(255,100,0,0.6)' : 'none',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] font-bold" style={{ color: 'rgba(255,160,80,0.5)' }}>Lukewarm</span>
                <span className="text-[10px] font-bold" style={{ color: 'rgba(255,160,80,0.5)' }}>On Fire 🔥</span>
              </div>
            </div>
          )}

          {/* Existing comments — white cards so they pop */}
          {reviews.length > 0 && (
            <div className="px-5 pb-4 space-y-2">
              {reviews.map((r) => (
                <div key={r._id} className="rounded-xl px-4 py-3 bg-white shadow-sm flex gap-3">
                  <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-[#ff6b00] to-[#ff3d00] flex items-center justify-center text-white text-xs font-black">
                    {r.authorAvatar ? (
                      <img src={r.authorAvatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (r.authorName || 'A').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-gray-800">{r.authorName || 'Anonymous'}</span>
                      <div className="flex gap-0.5 ml-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className="text-[11px]">{i < r.rating ? '🔥' : '○'}</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400 ml-auto">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.content && <p className="text-sm text-gray-600 leading-relaxed">{r.content}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rating form */}
          <div className="px-5 pb-5">
            {!reviewSubmitted ? (
              <div className="rounded-xl p-4 space-y-4">

                {/* Flame selector */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <style>{`
                      @keyframes flameBurst {
                        0%   { transform: scale(1); }
                        20%  { transform: scale(1.8); filter: drop-shadow(0 0 14px rgba(255,120,0,1)) brightness(1.4); }
                        50%  { transform: scale(1.35); filter: drop-shadow(0 0 10px rgba(255,80,0,0.9)); }
                        100% { transform: scale(1.2); filter: drop-shadow(0 0 6px rgba(255,100,0,0.9)) brightness(1.15); }
                      }
                      @keyframes sparkle {
                        0%   { opacity: 1; transform: translate(0,0) scale(1); }
                        100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.2); }
                      }
                      @keyframes fadeSlideIn {
                        from { opacity: 0; transform: translateY(-6px); }
                        to   { opacity: 1; transform: translateY(0); }
                      }
                    `}</style>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div key={s} className="relative">
                        {burstRating === s && [0,1,2,3,4,5,6,7].map((i) => (
                          <span
                            key={i}
                            className="pointer-events-none absolute text-xs select-none"
                            style={{
                              top: '50%', left: '50%',
                              '--tx': `${Math.cos((i / 8) * 2 * Math.PI) * 28}px`,
                              '--ty': `${Math.sin((i / 8) * 2 * Math.PI) * 28}px`,
                              animation: 'sparkle 0.5s ease-out forwards',
                              animationDelay: `${i * 20}ms`,
                            } as React.CSSProperties}
                          >
                            {i % 2 === 0 ? '✦' : '🔥'}
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            setReviewForm((f) => ({ ...f, rating: s }));
                            setBurstRating(s);
                            setTimeout(() => setBurstRating(0), 600);
                            if (!commentCTAVisible) {
                              setTimeout(() => {
                                setCommentCTAVisible(true);
                                setTimeout(() => commentRef.current?.focus(), 350);
                              }, 500);
                            }
                          }}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="text-2xl sm:text-3xl select-none"
                          style={{
                            filter: s <= (hoverRating || reviewForm.rating)
                              ? 'drop-shadow(0 0 6px rgba(255,100,0,0.9)) brightness(1.15)'
                              : 'grayscale(0.7) brightness(0.5)',
                            transform: s <= (hoverRating || reviewForm.rating) ? 'scale(1.2)' : 'scale(1)',
                            animation: burstRating === s ? 'flameBurst 0.45s ease-out forwards' : undefined,
                            transition: burstRating === s ? 'none' : 'all 0.15s ease',
                          }}
                        >
                          🔥
                        </button>
                      </div>
                    ))}
                    {(hoverRating || reviewForm.rating) > 0 && (
                      <span className="ml-1 text-xs font-black" style={{ color: '#ff8c00' }}>
                        {(hoverRating || reviewForm.rating) === 5 ? 'ON FIRE!' : (hoverRating || reviewForm.rating) === 4 ? 'Very Hot 🌶️' : (hoverRating || reviewForm.rating) === 3 ? 'Hot' : (hoverRating || reviewForm.rating) === 2 ? 'Warm' : 'Lukewarm'}
                      </span>
                    )}
                  </div>

                  {/* Flame meter bar */}
                  {(hoverRating || reviewForm.rating) > 0 && (
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((hoverRating || reviewForm.rating) / 5) * 100}%`,
                          background: (hoverRating || reviewForm.rating) >= 5
                            ? 'linear-gradient(90deg, #ff6b00, #ff3d00, #ffcc00)'
                            : (hoverRating || reviewForm.rating) >= 3
                            ? 'linear-gradient(90deg, #ff8c00, #ff5500)'
                            : 'linear-gradient(90deg, #cc4400, #ff6600)',
                          boxShadow: (hoverRating || reviewForm.rating) >= 5 ? '0 0 10px 2px rgba(255,100,0,0.7)' : '0 0 6px rgba(255,100,0,0.4)',
                          transition: 'width 0.25s ease, box-shadow 0.25s ease',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Comment box — logged-in only, slides in after rating */}
                {commentCTAVisible && (
                  typeof window !== 'undefined' && !localStorage.getItem('token') ? (
                    <div
                      className="rounded-xl p-5 text-center space-y-3"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,120,40,0.25)', animation: 'fadeSlideIn 0.35s ease forwards' }}
                    >
                      <p className="text-sm font-bold text-white/80">
                        💬 Drop a message to <span className="text-white font-black">{creator.username}</span>
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(255,160,80,0.65)' }}>
                        Join Erogram to interact with top creators
                      </p>
                      <a
                        href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
                        className="block w-full py-3 rounded-xl text-white text-sm font-black tracking-wide shadow-lg transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 18px rgba(22,163,74,0.45)' }}
                      >
                        Login / Open free account
                      </a>
                    </div>
                  ) : (
                    <div style={{ animation: 'fadeSlideIn 0.35s ease forwards' }}>
                      <p className="text-xs font-bold mb-1.5" style={{ color: 'rgba(255,180,80,0.85)' }}>
                        💬 Drop a message to <span className="text-white">{creator.username}</span>
                      </p>
                      <textarea
                        ref={commentRef}
                        placeholder={`What do you like most about ${creator.username}?`}
                        value={reviewForm.content}
                        onChange={(e) => setReviewForm((f) => ({ ...f, content: e.target.value }))}
                        maxLength={500}
                        rows={3}
                        className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-orange-200/30 outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,120,40,0.35)' }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,140,40,0.8)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,120,40,0.35)')}
                      />
                    </div>
                  )
                )}

                <button
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting || reviewForm.rating < 1}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-black tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: reviewForm.rating >= 1
                      ? 'linear-gradient(90deg, #ff6b00, #ff3d00)'
                      : 'rgba(255,255,255,0.1)',
                    boxShadow: reviewForm.rating >= 1 ? '0 4px 16px rgba(255,80,0,0.45)' : 'none',
                  }}
                >
                  {reviewSubmitting ? 'Submitting…' : reviewForm.rating >= 1 ? `Rate ${creator.name} ${Array(reviewForm.rating).fill('🔥').join('')}` : 'Pick your heat level above'}
                </button>
              </div>
            ) : (
              <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,100,0,0.12)', border: '1px solid rgba(255,120,40,0.3)' }}>
                <p className="text-2xl mb-1">🔥🔥🔥</p>
                <p className="text-sm font-black text-white">Your rating is live!</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,160,80,0.7)' }}>Thanks for rating {creator.name}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Related Creators ── */}
        {related.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base sm:text-lg font-black text-white">
                Suggested <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#00AFF0]">Top OnlyFans</span> Creators
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-[#00AFF0]/20 to-transparent" />
              <Link
                href={lp('/Toponlyfanscreators')}
                className="text-[#00AFF0] text-xs font-bold hover:underline flex items-center gap-1"
              >
                {t('ofSearch.seeAll')} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {related.map((c) => (
                <RelatedCard key={c._id} creator={c} publicOnlyfansPath={publicAccess} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trending on Erogram ── */}
        {trendingOnErogram.length > 0 && (
          <section className="mb-10">
            <div className="relative overflow-hidden rounded-2xl border border-[#00AFF0]/20 bg-gradient-to-br from-[#061018] via-[#0a1c2e] to-[#0d2844] p-4 sm:p-6 shadow-[0_20px_50px_-12px_rgba(0,175,240,0.18),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="pointer-events-none absolute -top-28 -right-20 h-56 w-56 rounded-full bg-[#00AFF0]/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[#00D4FF]/12 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00AFF0] to-[#00D4FF] flex items-center justify-center shrink-0 shadow-lg shadow-[#00AFF0]/30">
                    <TrendingUp size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      Trending on <span className="text-[#00D4FF]">Erogram</span>
                    </h2>
                    <p className="text-[11px] text-white/50 font-semibold">Top {trendingOnErogram.length} · Last 7 days</p>
                  </div>
                  <Link href={lp('/Toponlyfanscreators')} className="text-[#00AFF0] text-xs font-bold hover:underline flex items-center gap-1 shrink-0">
                    {t('ofSearch.seeAll')} <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[0, 1, 2, 3].map((col) => {
                    const perCol = Math.ceil(trendingOnErogram.length / 4);
                    const chunk = trendingOnErogram.slice(col * perCol, col * perCol + perCol);
                    if (chunk.length === 0) return null;
                    return (
                      <div key={col} className="rounded-xl bg-white overflow-hidden shadow-md">
                        {chunk.map((tc, j) => (
                          <Link
                            key={tc._id}
                            href={lp(`/${tc.username}-onlyfans`)}
                            prefetch={false}
                            className={`w-full flex items-center hover:brightness-95 transition-all ${j < chunk.length - 1 ? 'border-b border-gray-100' : ''}`}
                          >
                            <div className="flex items-center gap-3 px-2 py-2.5 flex-1 min-w-0">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                {tc.avatar ? (
                                  <img src={tc.avatar} alt={tc.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">{tc.name.charAt(0)}</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-bold text-gray-900 truncate">{tc.name}</p>
                                <p className="text-[11px] text-gray-500 truncate">@{tc.username}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Explore more OnlyFans categories ── */}
        <section className="mb-8">
          <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#00AFF0]" />
            Explore more OnlyFans categories
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {OF_CATEGORIES.filter((cat) => ['asian', 'blonde', 'teen', 'milf', 'amateur', 'redhead', 'petite', 'big-ass', 'big-boobs'].includes(cat.slug)).map((cat) => (
              <Link
                key={cat.slug}
                href={lp(`/best-onlyfans-accounts/${cat.slug}`)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm font-bold hover:bg-[#00AFF0]/15 hover:border-[#00AFF0]/40 hover:text-[#00AFF0] transition-all"
              >
                {cat.name} OnlyFans
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Admin floating toolbar */}
      {isAdmin && !adminEdit && (
        <div className="fixed bottom-6 right-6 z-40 flex gap-2">
          <button onClick={() => setAdminEdit(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00AFF0] text-white font-bold text-sm shadow-lg shadow-[#00AFF0]/30 hover:bg-[#009dd9] transition-all">
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>
          <button onClick={handleDeleteProfile} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/30 hover:bg-red-700 transition-all">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}

      {/* Admin edit panel */}
      {isAdmin && adminEdit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-10">
          <div className="w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#0d1a24] p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black text-white">Edit Profile</h2>
              <button onClick={() => setAdminEdit(false)} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
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
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Extra Photos</div>
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
              </div>
            </div>

            {/* Editable fields */}
            {([
              ['name', 'Name'],
              ['bio', 'Bio'],
              ['location', 'Location'],
              ['price', 'Price'],
              ['website', 'Website'],
              ['instagramUrl', 'Instagram'],
              ['twitterUrl', 'X / Twitter'],
              ['tiktokUrl', 'TikTok'],
              ['telegramUrl', 'Telegram'],
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

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAdminSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00AFF0] text-white font-black text-sm hover:bg-[#009dd9] transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => setAdminEdit(false)} className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:text-white transition-all">
                Cancel
              </button>
            </div>

            <button onClick={handleDeleteProfile} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/10 border border-red-600/30 text-red-400 font-bold text-xs hover:bg-red-600/20 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Delete This Profile Permanently
            </button>
          </div>
        </div>
      )}

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
