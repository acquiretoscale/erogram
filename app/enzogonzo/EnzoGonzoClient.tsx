'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Lock, Bookmark, Share2,
  MoreHorizontal, Video, X, DollarSign, Image as ImageIcon,
  Plus, ArrowLeft, Eye, Send, Loader2, Bell, Home, Search,
  User, Camera, CheckCircle2, Pencil, TrendingUp,
  Globe, SlidersHorizontal, Shield, LogIn,
  BarChart3, ChevronDown, Star,
} from 'lucide-react';
import axios from 'axios';
import { deleteMediaUrls } from '@/lib/actions/deleteMedia';
import { listMyR2Media, listR2Batches } from '@/lib/actions/listMyMedia';
import { dbLoadPosts, dbSavePosts, dbLoadCreator, dbSaveCreator, dbLoadTaggedPosts } from '@/lib/actions/onlygramDb';

/* ─── Types ─────────────────────────────────────────────────── */
type TaggedCreator = { username: string; name: string };

type MediaItem = { type: 'photo' | 'video'; url: string; thumb?: string };

type FakeComment = { user: string; text: string; ago: string };

type Post = {
  id: string;
  type: 'photo' | 'video';
  thumbnail: string;
  videoUrl?: string;
  media?: MediaItem[];
  caption: string;
  likes: number;
  comments: number;
  views: number;
  locked: boolean;
  price: number;
  postedAt: string;
  postedAtIso?: string;
  pinned?: boolean;
  tagged?: TaggedCreator[];
  commentList?: FakeComment[];
};

type Creator = {
  name: string;
  username: string;
  avatar: string;
  cover: string;
  bio: string;
  verified: boolean;
  location: string;
  joinedDate: string;
  subscriptionPrice: number | 'free';
  totalFans: number;
  totalLikes: number;
  totalPosts: number;
  totalMedia: number;
};

/* ─── Profiles ───────────────────────────────────────────────── */
const PROFILES: Record<string, { creator: Creator; posts: Post[] }> = {
  enzogonzo: {
    creator: {
      name: 'Enzo Gonzo',
      username: 'enzogonzo',
      avatar: 'https://i.pravatar.cc/300?img=68',
      cover: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1400&q=85',
      bio: 'Content creator, filmmaker & digital entrepreneur. Exclusive BTS, premium drops every week. DMs open for collabs! 🎬',
      verified: true,
      location: 'Los Angeles, CA',
      joinedDate: 'March 2024',
      subscriptionPrice: 14.99,
      totalFans: 12_847,
      totalLikes: 348_210,
      totalPosts: 247,
      totalMedia: 512,
    },
    posts: [
      { id: '1', type: 'video', pinned: true, thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80', caption: '🎬 Full BTS of my LA shoot — 28 minutes of exclusive footage. Only here.', likes: 4218, comments: 512, views: 38210, locked: true, price: 12.99, postedAt: '2h ago' },
      { id: '2', type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&q=80', caption: 'Golden hour ✨ New series dropping this week', likes: 8910, comments: 1023, views: 72400, locked: false, price: 0, postedAt: '6h ago' },
      { id: '3', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=900&q=80', caption: 'Director\'s cut — full cinematic reel 🎞️', likes: 2744, comments: 387, views: 19840, locked: true, price: 19.99, postedAt: '1d ago' },
      { id: '4', type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=900&q=80', caption: 'Studio session 🎙️ Behind the mic', likes: 5632, comments: 721, views: 44100, locked: false, price: 0, postedAt: '2d ago' },
      { id: '5', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900&q=80', caption: '🔒 45-min exclusive masterclass — production secrets', likes: 1120, comments: 203, views: 9830, locked: true, price: 24.99, postedAt: '3d ago' },
    ],
  },
  vickykovaks: {
    creator: {
      name: 'Vicky Kovaks',
      username: 'vickykovaks',
      avatar: 'https://i.pravatar.cc/300?img=47',
      cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1400&q=85',
      bio: 'Model & content creator 💋 Exclusive shoots, BTS, and customs. Book me for collabs ✨',
      verified: true,
      location: 'Miami, FL',
      joinedDate: 'January 2025',
      subscriptionPrice: 9.99,
      totalFans: 8_420,
      totalLikes: 215_300,
      totalPosts: 186,
      totalMedia: 340,
    },
    posts: [
      { id: 'v1', type: 'photo', pinned: true, thumbnail: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900&q=80', caption: '✨ New set just dropped — link in bio', likes: 6340, comments: 842, views: 51200, locked: false, price: 0, postedAt: '3h ago' },
      { id: 'v2', type: 'video', thumbnail: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80', caption: '🔒 Full Miami beach shoot — 18 min exclusive', likes: 3120, comments: 418, views: 28400, locked: true, price: 14.99, postedAt: '1d ago' },
      { id: 'v3', type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=80', caption: 'Golden hour vibes 🌅', likes: 7890, comments: 654, views: 62100, locked: false, price: 0, postedAt: '2d ago' },
      { id: 'v4', type: 'photo', thumbnail: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=900&q=80', caption: 'Studio day with the team 📸', likes: 4210, comments: 321, views: 33800, locked: false, price: 0, postedAt: '4d ago' },
    ],
  },
};

const ALL_CREATORS = Object.values(PROFILES).map(p => ({
  username: p.creator.username,
  name: p.creator.name,
  avatar: p.creator.avatar,
}));

const STATS = {
  currentBalance: 91.09,
  pendingBalance: 804.71,
  topPercent: 6.6,
  net: 2317.05,
  gross: 2896.48,
  growth: 66.1,
  period: 'Mar 06, 2026 — Apr 05, 2026',
};
const DAILY_NET  = [45,52,38,61,72,55,48,90,65,42,78,110,95,130,280,340,390,420,310,195,85,72,65,58,48,42,38,45,52,48];
const DAILY_GROSS = [56,65,48,76,90,69,60,113,81,53,98,138,119,163,350,425,488,525,388,244,106,90,81,73,60,53,48,56,65,60];
const CHART_LABELS = ['Mar 10','Mar 17','Mar 24','Mar 31','Apr 05'];
const COUNTRIES = [
  { flag: '🇺🇸', name: 'United States', amount: 1043, pct: 45 },
  { flag: '🇩🇪', name: 'Germany',       amount: 348,  pct: 15 },
  { flag: '🇫🇷', name: 'France',        amount: 278,  pct: 12 },
  { flag: '🇦🇺', name: 'Australia',     amount: 232,  pct: 10 },
  { flag: '🇨🇦', name: 'Canada',        amount: 208,  pct: 9  },
  { flag: '🇹🇷', name: 'Turkey',        amount: 208,  pct: 9  },
];

/* ─── Fake engagement pool ─────────────────────────────────── */
const COMMENTS_POOL = [
  'Damn that Brazilian ass is insane',
  "She's taking it so good",
  'Brazilian goddess getting fucked right',
  'I need this in my life right now',
  'That bounce is illegal in 12 countries',
  "He's lucky as hell",
  'Brazilian pussy looks so wet',
  'More of this pleaseeee',
  "She's a whole snack and the meal",
  'That face when she cums… damn',
  'Brazilian curves hitting different',
  "He's destroying her and I'm here for it",
  'Need a Brazilian girl like this ASAP',
  'The way she rides is criminal',
  'This is why I love Latinas',
  'Ass clapping louder than my speakers',
  "She's so fucking pretty when she moans",
  'Brazilian beauty getting railed',
  'Save some for the rest of us bro',
  'That deep stroke had me pausing the video',
  'Her body is insane, holy shit',
  'Brazilian girls just hit different',
  "The way she's gripping him…",
  "I'd never leave the house again",
  "She's dripping everywhere",
  'Perfect Brazilian fuck doll',
  "He's living every guy's dream",
  'That arch in her back is crazy',
  'Brazilian ass + perfect pussy = 10/10',
  "I'm addicted already",
  'She moans so pretty',
  'Need this video on repeat',
  'Brazilian girls know how to take it',
  'The jiggle is sending me',
  "He's going so deep she's seeing stars",
  'This is peak content right here',
  'Brazilian beauty getting destroyed',
  "That cream… I'm done",
  "She's too hot for OnlyFans",
  'The way she looks back at him',
  'Brazilian body goals',
  "He's lucky she chose him for this",
  'This pussy is working overtime',
  'Save me a spot on that bed',
  'Brazilian girls are built different',
  'The moans are straight fire',
  'That ass is clapping for the whole timeline',
  "She's enjoying every inch",
  'Brazilian goddess energy all over',
  'I just nutted, thanks for the content',
];

const FAKE_USERS = [
  'jake_real92', 'bigdaddy_tx', 'nocap_chris', 'devonxxx', 'thatguy_mike',
  'horny_pablo', 'realOG_dave', 'king_marcus', 'latino_heat99', 'brazilFan420',
  'simp_nation', 'big_tony305', 'juan_pr', 'freaky_fred', 'down_bad_dan',
  'chill_bruh', 'nofap_failed', 'sub4life_', 'midnight_lurk', 'anon_viewer',
  'thirsty_tom', 'raw_dawg77', 'vibes_only', 'lurk_master', 'onlyfans_addict',
];

const TIME_AGOS = ['1m ago', '2m ago', '3m ago', '5m ago', '8m ago', '12m ago', '18m ago', '25m ago', '32m ago', '45m ago', '1h ago', '2h ago', '3h ago', '5h ago'];

function generateEngagement(): { likes: number; comments: number; views: number; commentList: FakeComment[] } {
  const likes = Math.floor(Math.random() * (200 - 98 + 1)) + 98;
  const count = Math.floor(Math.random() * 10) + 1;
  const views = likes + Math.floor(Math.random() * 400) + 50;
  const shuffled = [...COMMENTS_POOL].sort(() => Math.random() - 0.5);
  const usersShuffled = [...FAKE_USERS].sort(() => Math.random() - 0.5);
  const timesShuffled = [...TIME_AGOS].sort(() => Math.random() - 0.5);
  const commentList: FakeComment[] = [];
  for (let i = 0; i < count; i++) {
    commentList.push({
      user: usersShuffled[i % usersShuffled.length],
      text: shuffled[i],
      ago: timesShuffled[i % timesShuffled.length],
    });
  }
  return { likes, comments: count, views, commentList };
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
function money(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0 });
}
function moneyDec(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function buildSvgPath(data: number[], maxVal: number, w: number, h: number, pad = 10) {
  const step = w / (data.length - 1);
  return data.map((v, i) => {
    const x = i * step;
    const y = h - pad - (v / maxVal) * (h - 2 * pad);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

/* ═══════════════════════════════════════════════════════════════ */
/* AUTH GATE                                                      */
/* ═══════════════════════════════════════════════════════════════ */
function AuthGate() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const isEmail = identifier.includes('@');
      const res = await axios.post('/api/auth/login', {
        email: isEmail ? identifier : undefined,
        username: !isEmail ? identifier : undefined,
        password,
      });
      if (!res.data.isAdmin || res.data.username !== 'eros') {
        setError('Access denied.');
        setLoading(false);
        return;
      }
      document.cookie = `admin_token=${res.data.token}; path=/; SameSite=Strict; Secure; max-age=86400`;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('isAdmin', 'true');
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Restricted Access</h1>
          <p className="text-white/40 text-sm mt-2">This content is protected. Admin credentials required.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 bg-[#111] border border-white/[0.06] rounded-2xl p-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">{error}</div>
          )}
          <input
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="Admin email or username"
            className="w-full p-3.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder:text-white/20 text-sm outline-none focus:border-red-500/50"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-3.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder:text-white/20 text-sm outline-none focus:border-red-500/50"
            required
          />
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? 'Verifying…' : 'Authenticate'}
          </button>
        </form>
        <p className="text-center text-white/15 text-xs mt-6">Onlygram Beta · All access is logged</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* MAIN PAGE                                                      */
/* ═══════════════════════════════════════════════════════════════ */
export default function EnzoGonzoClient({ requireAuth, slug = 'enzogonzo' }: { requireAuth: boolean; slug?: string }) {
  if (requireAuth) return <AuthGate />;
  return <CreatorPage slug={slug} />;
}

/* load/save now go through MongoDB server actions — no more localStorage */

function formatDateDisplay(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sortByDate(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const da = a.postedAtIso || '0';
    const db = b.postedAtIso || '0';
    return db.localeCompare(da);
  });
}

/* Tagged posts now resolved via DB — posts tagged with a creator show on their profile */

function CreatorPage({ slug }: { slug: string }) {
  const profile = PROFILES[slug] ?? PROFILES.enzogonzo;
  const [creator, setCreator] = useState<Creator>({ ...profile.creator, avatar: '', cover: '' });
  const [posts, setPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [editDraft, setEditDraft] = useState<Creator>(profile.creator);
  const [editMode, setEditMode] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'stats'>('feed');
  const [navTab, setNavTab] = useState<'home' | 'bell' | 'plus' | 'msg' | 'profile'>('home');
  const [mounted, setMounted] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    if (logoTapCount.current >= 3) {
      setAdminMode(a => !a);
      logoTapCount.current = 0;
      return;
    }
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0; }, 600);
  };

  /* Merge own posts + posts from others that tagged this creator, sorted by date */
  const ownPostIds = new Set(posts.map(p => p.id));
  const allPosts = sortByDate([...posts, ...taggedPosts.filter(p => !ownPostIds.has(p.id))]);

  /* upload */
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadLocked, setUploadLocked] = useState(false);
  const [uploadPrice, setUploadPrice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadTags, setUploadTags] = useState<TaggedCreator[]>([]);
  const [uploadThumbs, setUploadThumbs] = useState<Record<number, string>>({});

  /* R2 vault picker */
  type R2Batch = { media: Array<{ type: 'video' | 'photo'; url: string }>; date: string };
  const [showR2Picker, setShowR2Picker] = useState(false);
  const [r2Batches, setR2Batches] = useState<R2Batch[]>([]);
  const [r2Loading, setR2Loading] = useState(false);

  const openR2Picker = async () => {
    setShowR2Picker(true);
    if (r2Batches.length > 0) return;
    setR2Loading(true);
    const batches = await listR2Batches();
    setR2Batches(batches);
    setR2Loading(false);
  };

  const addBatchAsPost = (batch: R2Batch) => {
    const firstVideo = batch.media.find(m => m.type === 'video');
    const firstPhoto = batch.media.find(m => m.type === 'photo');
    const d = new Date(batch.date);
    const eng = generateEngagement();
    const newPost: Post = {
      id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
      type: firstVideo ? 'video' : 'photo',
      thumbnail: firstPhoto?.url || '',
      videoUrl: firstVideo?.url,
      media: batch.media.length > 1 ? batch.media : undefined,
      caption: '',
      likes: eng.likes, comments: eng.comments, views: eng.views,
      commentList: eng.commentList,
      locked: false, price: 0,
      postedAt: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      postedAtIso: d.toISOString().split('T')[0],
    };
    setPosts(prev => sortByDate([newPost, ...prev]));
  };

  const addAllBatches = () => {
    const newPosts: Post[] = r2Batches.map((batch, i) => {
      const firstVideo = batch.media.find(m => m.type === 'video');
      const firstPhoto = batch.media.find(m => m.type === 'photo');
      const d = new Date(batch.date);
      const eng = generateEngagement();
      return {
        id: Date.now().toString() + '_' + i,
        type: (firstVideo ? 'video' : 'photo') as 'video' | 'photo',
        thumbnail: firstPhoto?.url || '',
        videoUrl: firstVideo?.url,
        media: batch.media.length > 1 ? batch.media : undefined,
        caption: '',
        likes: eng.likes, comments: eng.comments, views: eng.views,
        commentList: eng.commentList,
        locked: false, price: 0,
        postedAt: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        postedAtIso: d.toISOString().split('T')[0],
      };
    });
    setPosts(prev => sortByDate([...newPosts, ...prev]));
    setShowR2Picker(false);
  };
  const videoPreviewRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const captureThumb = (idx: number) => {
    const video = videoPreviewRefs.current[idx];
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setUploadThumbs(prev => ({ ...prev, [idx]: dataUrl }));
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const [loadedPosts, loadedCreator, tagged] = await Promise.all([
        dbLoadPosts(slug),
        dbLoadCreator(slug),
        dbLoadTaggedPosts(slug),
      ]);
      if (loadedPosts.length > 0) {
        const populated = loadedPosts.map((p: Post) => {
          if (p.commentList && p.commentList.length > 0) return p;
          const eng = generateEngagement();
          return { ...p, likes: p.likes || eng.likes, comments: eng.comments, views: p.views || eng.views, commentList: eng.commentList };
        });
        setPosts(sortByDate(populated));
      } else setPosts([]);
      if (loadedCreator) { setCreator(loadedCreator); setEditDraft(loadedCreator); }
      setTaggedPosts(tagged);
      setMounted(true);
    })();
  }, [slug]);

  useEffect(() => {
    if (!mounted) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { dbSavePosts(slug, posts); }, 800);
  }, [posts, mounted, slug]);

  useEffect(() => {
    if (!mounted) return;
    dbSaveCreator(slug, creator);
  }, [creator, mounted, slug]);

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setUploadFiles(prev => [...prev, ...arr]);
    setUploadPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))]);
    setUploadError('');
    e.target.value = '';
  };

  const removeUploadFile = (idx: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== idx));
    setUploadPreviews(prev => prev.filter((_, i) => i !== idx));
    setUploadThumbs(prev => {
      const n: Record<number, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const ki = parseInt(k);
        if (ki < idx) n[ki] = v;
        else if (ki > idx) n[ki - 1] = v;
      }
      return n;
    });
  };

  const handlePost = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadPct(5);
    setUploadError('');

    const mediaItems: MediaItem[] = [];
    const total = uploadFiles.length;

    for (let i = 0; i < total; i++) {
      const file = uploadFiles[i];
      const isVideo = file.type.startsWith('video/');
      try {
        const fd = new FormData();
        fd.append('file', file);
        const endpoint = isVideo ? '/api/upload/video' : '/api/upload';
        const res = await axios.post(endpoint, fd);
        const url = res.data.url;
        let thumb: string | undefined;
        if (isVideo && uploadThumbs[i]) {
          try {
            const blob = await (await fetch(uploadThumbs[i])).blob();
            const tfd = new FormData();
            tfd.append('file', new File([blob], 'thumb.jpg', { type: 'image/jpeg' }));
            const tres = await axios.post('/api/upload', tfd);
            thumb = tres.data.url;
          } catch {}
        }
        setUploadPct(Math.round(((i + 1) / total) * 95));
        mediaItems.push({ type: isVideo ? 'video' : 'photo', url, thumb });
      } catch (err: any) {
        setUploading(false);
        setUploadPct(0);
        setUploadError(`File ${i + 1} failed: ${err.response?.data?.message || err.message || 'Upload failed.'}`);
        return;
      }
    }

    setUploadPct(100);
    const firstVideo = mediaItems.find(m => m.type === 'video');
    const firstPhoto = mediaItems.find(m => m.type === 'photo');

    const nowIso = new Date().toISOString().split('T')[0];
    const eng = generateEngagement();
    const newPost: Post = {
      id: Date.now().toString(),
      type: firstVideo ? 'video' : 'photo',
      thumbnail: firstPhoto?.url || '',
      videoUrl: firstVideo?.url,
      media: mediaItems.length > 1 ? mediaItems : undefined,
      caption: uploadCaption || 'New post ✨',
      likes: eng.likes, comments: eng.comments, views: eng.views,
      commentList: eng.commentList,
      locked: uploadLocked,
      price: uploadLocked ? parseFloat(uploadPrice) || 4.99 : 0,
      postedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      postedAtIso: nowIso,
      tagged: uploadTags.length > 0 ? uploadTags : undefined,
    };
    setPosts(prev => sortByDate([newPost, ...prev]));
    

    setTimeout(() => {
      setShowUpload(false);
      setUploadFiles([]); setUploadPreviews([]);
      setUploadCaption(''); setUploadLocked(false); setUploadPrice('');
      setUploading(false); setUploadPct(0); setUploadError('');
      setUploadTags([]); setUploadThumbs({});
    }, 600);
  };

  const saveEdit = () => { setCreator(editDraft); setEditMode(false); };

  const handleLogout = () => {
    document.cookie = 'admin_token=; path=/; max-age=0';
    window.location.reload();
  };

  const BIO_LIMIT = 80;
  const bioShort = creator.bio.length > BIO_LIMIT;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#080d12] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#00AFF0]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d12] flex flex-col items-center">

      {/* ─── Onlygram Top Bar ────────────────────────────────────── */}
      <div className="w-full bg-[#0a0a0a] border-b border-white/[0.06] px-4 py-2.5 flex items-center justify-between z-50 sticky top-0">
        <button onClick={handleLogoTap} className="flex items-center gap-2 select-none">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00AFF0, #0096d6)' }}>
            <span className="text-white font-black text-sm">O</span>
          </div>
          <span className="text-white font-bold text-[15px] tracking-tight">Onlygram</span>
        </button>
        <div className="flex items-center gap-3">
          <button className="text-white/30 hover:text-white transition-colors"><Plus size={22} strokeWidth={1.8} /></button>
          <button className="text-white/30 hover:text-white transition-colors"><Heart size={21} strokeWidth={1.8} /></button>
          <button className="text-white/30 hover:text-white transition-colors"><Send size={20} strokeWidth={1.8} /></button>
        </div>
      </div>

      {/* ─── Admin controls (triple-tap logo to toggle) ──────── */}
      <AnimatePresence>
        {adminMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-white/[0.06] overflow-hidden z-40 sticky top-[49px]">
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {ALL_CREATORS.map(c => (
                  <a key={c.username} href={`/${c.username}`}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${
                      c.username === slug
                        ? 'bg-[#00AFF0]/15 text-[#00AFF0] border border-[#00AFF0]/30'
                        : 'text-white/25 hover:text-white/50 border border-transparent'
                    }`}>
                    {c.name.split(' ')[0]}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setShowUpload(true); setEditMode(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-white/40 hover:text-white transition-all flex items-center gap-1">
                  <Plus size={12} /> Upload
                </button>
                <button onClick={() => { setEditMode(e => !e); setShowUpload(false); if (!editMode) setEditDraft(creator); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${editMode ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white'}`}>
                  <Pencil size={12} /> {editMode ? 'Editing…' : 'Edit'}
                </button>
                <button onClick={handleLogout}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-red-400/60 hover:text-red-400 transition-all">
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Profile Page (white card) ─────────────────────────── */}
      <div className="w-full max-w-[600px] bg-[#0a1117] min-h-screen flex flex-col shadow-lg">

        {/* ── Sticky Profile Header ─────────────────────────────── */}
        <header className="sticky top-[45px] z-30 bg-[#0a1117]/95 backdrop-blur-sm border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[15px] text-white truncate">{creator.name}</span>
              {creator.verified && <CheckCircle2 size={15} className="text-[#00AFF0] shrink-0" fill="currentColor" stroke="#0a1117" />}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/30 mt-0.5">
              <span className="flex items-center gap-1"><ImageIcon size={10} /> {fmt(posts.length)}</span>
              <span className="flex items-center gap-1"><Heart size={10} /> {fmt(posts.reduce((s, p) => s + p.likes, 0))}</span>
              <span className="flex items-center gap-1"><User size={10} /> {fmt(creator.totalFans)}</span>
            </div>
          </div>
          <button className="p-1.5 text-white/30 hover:text-white transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </header>

        {/* ── Cover Banner ──────────────────────────────────────── */}
        <div className="relative">
          <div className="w-full h-36 sm:h-40 overflow-hidden bg-[#0d1419] relative">
            <img src={editMode ? editDraft.cover : creator.cover} alt="Cover" className="w-full h-full object-cover" />
            {/* Soft blue-tinted gradients — top and bottom fades */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1525]/70 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a1525]/50 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[#00AFF0]/[0.04]" />
            {editMode && (
              <button onClick={() => coverRef.current?.click()}
                className="absolute inset-0 bg-black/40 hover:bg-black/55 flex items-center justify-center transition-colors cursor-pointer z-10">
                <div className="text-white text-center"><Camera size={18} className="mx-auto mb-0.5" /><span className="text-xs font-medium">Change cover</span></div>
              </button>
            )}
          </div>
          <input ref={coverRef} type="file" accept="image/*"
            onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              setEditDraft(d => ({ ...d, cover: URL.createObjectURL(f) }));
              try {
                const fd = new FormData();
                fd.append('file', f);
                const res = await axios.post('/api/upload', fd);
                if (res.data.url) setEditDraft(d => ({ ...d, cover: res.data.url }));
              } catch {}
            }}
            className="hidden" />
        </div>

        {/* ── Avatar row + action buttons ─────────────────────── */}
        <div className="relative px-4 py-2 flex items-center">
          {/* Avatar */}
          <div className="relative shrink-0 -mt-8 z-10">
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-[#0a1117] overflow-hidden bg-[#0d1419] shadow-lg">
              <img src={editMode ? editDraft.avatar : creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a1117]" />
            {editMode && (
              <button onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Camera size={14} className="text-white" />
              </button>
            )}
          </div>
          <input ref={avatarRef} type="file" accept="image/*"
            onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              setEditDraft(d => ({ ...d, avatar: URL.createObjectURL(f) }));
              try {
                const fd = new FormData();
                fd.append('file', f);
                const res = await axios.post('/api/upload', fd);
                if (res.data.url) setEditDraft(d => ({ ...d, avatar: res.data.url }));
              } catch {}
            }}
            className="hidden" />

          {/* Action buttons — pushed to right */}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {[
              { icon: DollarSign, label: 'Tip' },
              { icon: MessageCircle, label: 'Message' },
              { icon: Bookmark, label: 'Bookmark' },
              { icon: Share2, label: 'Share' },
            ].map(({ icon: Icon, label }) => (
              <button key={label} title={label}
                className="w-9 h-9 rounded-full border border-white/[0.10] flex items-center justify-center text-white/40 hover:border-[#00AFF0]/40 hover:text-[#00AFF0] transition-all">
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Name / Info ───────────────────────────────────────── */}
        <div className="px-4 pt-0 pb-3 border-b border-white/[0.06]">
          {editMode ? (
            <div className="space-y-2">
              <input value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                className="font-bold text-base text-white bg-transparent w-full border-b border-white/10 outline-none pb-1" />
              <textarea value={editDraft.bio} onChange={e => setEditDraft(d => ({ ...d, bio: e.target.value }))}
                rows={3} className="w-full text-sm text-white/60 bg-[#0d1419] border border-white/[0.08] rounded-xl p-2 outline-none resize-none focus:border-[#00AFF0]/50" />
              <div className="flex gap-3">
                <input value={editDraft.location} onChange={e => setEditDraft(d => ({ ...d, location: e.target.value }))}
                  placeholder="Location" className="flex-1 text-xs border-b border-white/10 outline-none pb-1 text-white/40 bg-transparent" />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/30">$</span>
                  <input type="number" value={editDraft.subscriptionPrice} onChange={e => setEditDraft(d => ({ ...d, subscriptionPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-20 text-xs border-b border-white/10 outline-none pb-1 text-white/40 bg-transparent" />
                  <span className="text-xs text-white/30">/mo</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setEditMode(false); setEditDraft(creator); }}
                  className="flex-1 py-2 rounded-full border border-white/10 text-sm text-white/40 font-semibold">Cancel</button>
                <button onClick={saveEdit}
                  className="flex-1 py-2 rounded-full bg-[#00AFF0] text-white text-sm font-bold">Save</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-[17px] text-white">{creator.name}</h1>
                {creator.verified && <CheckCircle2 size={17} className="text-[#00AFF0]" fill="currentColor" stroke="#0a1117" />}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-white/30">
                <span>@{creator.username}</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Available now
                </span>
              </div>
              <div className="mt-2 text-sm text-white/50 leading-relaxed">
                {bioShort && !bioExpanded
                  ? <>{creator.bio.slice(0, BIO_LIMIT)}&hellip; <button onClick={() => setBioExpanded(true)} className="text-[#00AFF0] font-medium">More info</button></>
                  : <>{creator.bio} {bioShort && <button onClick={() => setBioExpanded(false)} className="text-[#00AFF0] font-medium">Less</button>}</>
                }
              </div>
            </>
          )}
        </div>

        {/* ── Feed / Stats Toggle ──────────────────────────────── */}
        <div className="flex border-b border-white/[0.06]">
          <button onClick={() => setActiveTab('feed')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-1.5 ${activeTab === 'feed' ? 'border-[#00AFF0] text-[#00AFF0]' : 'border-transparent text-white/30 hover:text-white/50'}`}>
            <Home size={14} /> Feed
          </button>
          <button onClick={() => setActiveTab('stats')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-1.5 ${activeTab === 'stats' ? 'border-[#00AFF0] text-[#00AFF0]' : 'border-transparent text-white/30 hover:text-white/50'}`}>
            <BarChart3 size={14} /> Stats
          </button>
        </div>

        {activeTab === 'feed' ? (
          <>
            {/* ── Recent + Filters ─────────────────────────────── */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06] bg-[#0a1117]/95 backdrop-blur-sm sticky top-[106px] z-20">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.18em]">Recent</span>
              <div className="flex items-center gap-4 text-white/30">
                <button className="hover:text-[#00AFF0] transition-colors"><Search size={17} /></button>
                <button className="hover:text-[#00AFF0] transition-colors"><SlidersHorizontal size={17} /></button>
              </div>
            </div>

            {/* ── Upload CTA (admin only) ─────────────────────── */}
            {adminMode && (
              <button onClick={() => setShowUpload(true)}
                className="mx-4 mt-4 py-3 rounded-2xl border-2 border-dashed border-[#00AFF0]/20 hover:border-[#00AFF0]/50 text-[#00AFF0]/40 hover:text-[#00AFF0] transition-all text-sm font-medium flex items-center justify-center gap-2 bg-[#00AFF0]/[0.03]">
                <Plus size={16} /> Add New Content
              </button>
            )}

            {/* ── Locked posts grid (Vicky) ──────────────────── */}
            {slug === 'vickykovaks' && (() => {
              const MOCK_LOCKED = [
                { thumb: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=60', isVid: false, count: 1 },
                { thumb: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=60', isVid: true,  count: 1 },
                { thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=60', isVid: false, count: 4 },
                { thumb: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=60', isVid: false, count: 1 },
                { thumb: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=60', isVid: true,  count: 2 },
                { thumb: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=60', isVid: false, count: 1 },
                { thumb: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=60', isVid: true,  count: 3 },
                { thumb: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=60', isVid: false, count: 1 },
                { thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=60', isVid: false, count: 6 },
                { thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=60', isVid: true,  count: 1 },
                { thumb: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=60', isVid: false, count: 2 },
                { thumb: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&q=60', isVid: true,  count: 1 },
              ];
              const realPosts = posts.slice(0, 9).map(p => ({
                thumb: p.media?.[0]?.thumb || p.media?.[0]?.url || p.thumbnail || '',
                isVid: p.type === 'video' || p.media?.[0]?.type === 'video',
                count: p.media?.length || 1,
                real: true,
              }));
              const grid = [...realPosts, ...MOCK_LOCKED].slice(0, 12);
              const totalCount = posts.length + 186;
              return (
                <div className="mt-2">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.18em]">{totalCount} Posts</span>
                    <div className="flex items-center gap-1.5 text-white/20 text-[11px]">
                      <Lock size={11} /> Private
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-0.5">
                    {grid.map((item, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden bg-[#0d1419]">
                        <img src={item.thumb} alt="" className="w-full h-full object-cover blur-xl brightness-[0.25] scale-110" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                            <Lock size={13} className="text-white/40" />
                          </div>
                        </div>
                        {item.isVid && (
                          <div className="absolute top-1.5 left-1.5">
                            <Video size={10} className="text-white/25" />
                          </div>
                        )}
                        {item.count > 1 && (
                          <div className="absolute top-1.5 right-1.5 text-white/25 text-[9px] font-bold bg-black/40 rounded px-1">
                            {item.count}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-center py-6 px-6 gap-3 border-t border-white/[0.06] mt-0.5">
                    <p className="text-white/40 text-[13px] text-center">
                      Subscribe to unlock all {totalCount} posts
                    </p>
                    <button className="px-10 py-2.5 rounded-full text-white text-sm font-bold"
                      style={{ background: 'linear-gradient(90deg, #00AFF0, #0096d6)' }}>
                      Subscribe · {typeof creator.subscriptionPrice === 'number' ? `$${creator.subscriptionPrice}/mo` : 'Free'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Tagged with @enzogonzo ───────────────────────── */}
            {slug === 'vickykovaks' && taggedPosts.length > 0 && (
              <div className="px-4 pt-4 pb-1 border-t border-white/[0.06]">
                <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <User size={11} className="text-[#00AFF0]" /> Tagged with @enzogonzo
                </p>
              </div>
            )}

            {/* ── Feed ─────────────────────────────────────────── */}
            <div className="px-0 pb-28 divide-y divide-white/[0.04]">
              {(slug === 'vickykovaks'
                ? taggedPosts.filter(p => !ownPostIds.has(p.id))
                : allPosts
              ).map(post => {
                const isOwn = ownPostIds.has(post.id);
                return (
                  <PostCard key={post.id} post={post} creator={creator} readonly={!isOwn}
                    onDelete={id => {
                      const p = posts.find(x => x.id === id);
                      if (p) {
                        const urls: string[] = [];
                        if (p.media?.length) p.media.forEach(m => { urls.push(m.url); if (m.thumb) urls.push(m.thumb); });
                        else { if (p.videoUrl) urls.push(p.videoUrl); if (p.thumbnail) urls.push(p.thumbnail); }
                        if (urls.length > 0) deleteMediaUrls(urls);
                      }
                      setPosts(prev => prev.filter(x => x.id !== id));
                    }}
                    onToggleLock={id => setPosts(p => p.map(x => x.id === id ? { ...x, locked: !x.locked } : x))}
                    onEdit={(id, patch) => {
                      setPosts(prev => sortByDate(prev.map(x => x.id === id ? { ...x, ...patch } : x)));
                    }}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="pb-28">
            <StatisticsPanel />
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ─────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0a1117]/95 backdrop-blur-md border-t border-white/[0.06] flex items-center justify-around px-4 py-2.5 z-30">
        {([
          { id: 'home'    as const, icon: Home,          label: 'Home',          special: false },
          { id: 'bell'    as const, icon: Bell,          label: 'Notifications', special: false },
          { id: 'plus'    as const, icon: Plus,          label: 'New',           special: true  },
          { id: 'msg'     as const, icon: MessageCircle, label: 'Messages',      special: false },
          { id: 'profile' as const, icon: User,          label: 'Profile',       special: false },
        ]).map(item => (
          <button key={item.id} onClick={() => setNavTab(item.id)} title={item.label}
            className={`flex flex-col items-center gap-0.5 transition-all ${
              item.special ? 'w-12 h-12 rounded-full flex items-center justify-center' : 'px-4 py-1'
            }`}
            style={item.special ? { background: 'linear-gradient(135deg, #00AFF0, #0096d6)' } : {}}>
            <item.icon
              size={item.special ? 22 : 24}
              className={item.special ? 'text-white' : navTab === item.id ? 'text-[#00AFF0]' : 'text-white/30'}
              strokeWidth={navTab === item.id && !item.special ? 2.2 : 1.8}
            />
          </button>
        ))}
      </nav>

      {/* ═══ UPLOAD MODAL ════════════════════════════════════════ */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => !uploading && setShowUpload(false)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[600px] bg-[#0d1419] rounded-t-3xl overflow-hidden shadow-2xl border-t border-x border-white/[0.08]">

              <div className="flex justify-center py-3"><div className="w-10 h-1 rounded-full bg-white/10" /></div>

              <div className="flex items-center justify-between px-5 pb-4 border-b border-white/[0.06]">
                <h3 className="text-base font-bold text-white">New Post</h3>
                <button onClick={() => !uploading && setShowUpload(false)}
                  className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.05] transition-colors"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-4">
                {uploadFiles.length === 0 ? (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full h-44 rounded-2xl border-2 border-dashed border-[#00AFF0]/20 hover:border-[#00AFF0]/50 flex flex-col items-center justify-center gap-3 text-[#00AFF0]/40 hover:text-[#00AFF0] transition-all bg-[#00AFF0]/[0.03]">
                    <div className="flex gap-4"><ImageIcon size={26} /><Video size={26} /></div>
                    <span className="text-sm font-medium">Select photos or videos</span>
                    <span className="text-xs text-white/20">JPG, PNG, MP4, WebM · no size limit</span>
                  </button>
                ) : (
                  <div>
                    <div className={`grid gap-2 ${uploadFiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {uploadFiles.map((f, i) => {
                        const isVid = f.type.startsWith('video/');
                        const hasThumb = !!uploadThumbs[i];
                        return (
                          <div key={i} className="rounded-xl overflow-hidden bg-[#0a1117]">
                            <div className="relative aspect-video">
                              {isVid ? (
                                hasThumb ? (
                                  <img src={uploadThumbs[i]} alt="Thumbnail" className="w-full h-full object-cover" />
                                ) : (
                                  <video
                                    ref={el => { videoPreviewRefs.current[i] = el; }}
                                    src={uploadPreviews[i]}
                                    className="w-full h-full object-cover"
                                    preload="auto"
                                    muted
                                  />
                                )
                              ) : (
                                <img src={uploadPreviews[i]} alt="" className="w-full h-full object-cover" />
                              )}
                              {!uploading && (
                                <button onClick={() => removeUploadFile(i)}
                                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"><X size={11} /></button>
                              )}
                              {isVid && !hasThumb && (
                                <div className="absolute bottom-1.5 left-1.5 bg-black/60 rounded-full px-2 py-0.5 text-[9px] text-white font-semibold flex items-center gap-1">
                                  <Video size={9} /> Video
                                </div>
                              )}
                              {isVid && hasThumb && (
                                <div className="absolute bottom-1.5 left-1.5 bg-emerald-500/80 rounded-full px-2 py-0.5 text-[9px] text-white font-semibold flex items-center gap-1">
                                  <Camera size={9} /> Cover set
                                </div>
                              )}
                            </div>
                            {isVid && !uploading && !hasThumb && (
                              <div className="px-2 py-1.5 flex items-center gap-2 bg-[#0a1117] border-t border-white/[0.04]">
                                <input type="range" min={0} max={100} defaultValue={0}
                                  className="flex-1 h-1 accent-[#00AFF0] cursor-pointer"
                                  onChange={e => {
                                    const v = videoPreviewRefs.current[i];
                                    if (v && v.duration) v.currentTime = (parseFloat(e.target.value) / 100) * v.duration;
                                  }} />
                                <button onClick={() => captureThumb(i)}
                                  className="shrink-0 text-[9px] font-bold text-[#00AFF0] hover:text-white bg-[#00AFF0]/10 hover:bg-[#00AFF0]/20 px-2 py-1 rounded-md transition-all flex items-center gap-1">
                                  <Camera size={9} /> Set cover
                                </button>
                              </div>
                            )}
                            {isVid && hasThumb && !uploading && (
                              <div className="px-2 py-1.5 bg-[#0a1117] border-t border-white/[0.04]">
                                <button onClick={() => setUploadThumbs(prev => { const n = { ...prev }; delete n[i]; return n; })}
                                  className="text-[9px] font-medium text-white/30 hover:text-white/60 transition-colors">
                                  Re-pick cover
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {!uploading && (
                      <button onClick={() => fileRef.current?.click()}
                        className="mt-2 w-full py-2 rounded-xl border border-dashed border-white/[0.08] text-white/30 hover:text-[#00AFF0] hover:border-[#00AFF0]/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-all">
                        <Plus size={12} /> Add more
                      </button>
                    )}
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleUploadFile} className="hidden" />

                <textarea value={uploadCaption} onChange={e => setUploadCaption(e.target.value)}
                  placeholder="Write a caption..." rows={2}
                  className="w-full border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/70 bg-[#0a1117] placeholder:text-white/20 resize-none outline-none focus:border-[#00AFF0]/40" />

                <div className="flex items-center gap-3 bg-[#0a1117] rounded-xl px-4 py-3 border border-white/[0.08]">
                  <button onClick={() => setUploadLocked(l => !l)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${uploadLocked ? 'bg-[#00AFF0]' : 'bg-white/10'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${uploadLocked ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white/70 flex items-center gap-1.5">
                      <Lock size={13} className={uploadLocked ? 'text-[#00AFF0]' : 'text-white/20'} /> Lock with price (PPV)
                    </p>
                    <p className="text-xs text-white/30">Fans pay extra to unlock</p>
                  </div>
                  {uploadLocked && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-white/30 text-sm">$</span>
                      <input type="number" step="0.01" min="0.99" value={uploadPrice}
                        onChange={e => setUploadPrice(e.target.value)} placeholder="9.99"
                        className="w-20 border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/70 bg-transparent text-center outline-none focus:border-[#00AFF0]/40" />
                    </div>
                  )}
                </div>

                {/* Tag Creators */}
                {(() => {
                  const taggable = ALL_CREATORS.filter(c => c.username !== slug && !uploadTags.some(t => t.username === c.username));
                  return (
                    <div className="bg-[#0a1117] rounded-xl px-4 py-3 border border-white/[0.08]">
                      <p className="text-sm font-semibold text-white/70 flex items-center gap-1.5 mb-2">
                        <User size={13} className="text-[#00AFF0]" /> Tag creators
                      </p>
                      {uploadTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {uploadTags.map(t => (
                            <span key={t.username}
                              className="inline-flex items-center gap-1 bg-[#00AFF0]/10 text-[#00AFF0] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#00AFF0]/20">
                              @{t.username}
                              <button onClick={() => setUploadTags(tags => tags.filter(x => x.username !== t.username))}
                                className="hover:text-white transition-colors"><X size={11} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                      {taggable.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {taggable.map(c => (
                            <button key={c.username}
                              onClick={() => setUploadTags(tags => [...tags, { username: c.username, name: c.name }])}
                              className="inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 text-xs font-medium px-2.5 py-1.5 rounded-full border border-white/[0.06] transition-all">
                              <Plus size={10} /> @{c.username}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {uploadError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">{uploadError}</div>
                )}

                {uploading && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-[#00AFF0]" style={{ width: `${uploadPct}%` }} />
                    </div>
                    <p className="text-xs text-white/30 text-center">
                      {uploadPct < 100
                        ? `Uploading ${uploadFiles.length > 1 ? `${uploadFiles.length} files` : ''} to R2… ${Math.round(uploadPct)}%`
                        : 'Done ✓'}
                    </p>
                  </div>
                )}

                <button onClick={handlePost} disabled={uploadFiles.length === 0 || uploading}
                  className="w-full h-[52px] rounded-full font-bold text-[15px] text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                  style={{ background: 'linear-gradient(90deg, #00AFF0, #0096d6)' }}>
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Send size={15} /> Post</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ R2 VAULT PICKER ═════════════════════════════════════ */}
      <AnimatePresence>
        {showR2Picker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="text-white font-bold text-sm">R2 Vault — onlygram/</h3>
              <div className="flex gap-2">
                {r2Batches.length > 0 && (
                  <button onClick={addAllBatches}
                    className="text-xs font-bold text-white bg-[#00AFF0] rounded-lg px-3 py-1">
                    Add all {r2Batches.length} batches
                  </button>
                )}
                <button onClick={() => setShowR2Picker(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-3 pb-4">
              {r2Loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#00AFF0]" /></div>
              ) : r2Batches.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-10">No files in onlygram/ vault yet. Upload content first.</p>
              ) : (
                r2Batches.map((batch, bi) => {
                  const vids = batch.media.filter(m => m.type === 'video').length;
                  const imgs = batch.media.filter(m => m.type === 'photo').length;
                  const d = new Date(batch.date);
                  return (
                    <div key={bi} className="mb-3 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-white/40">
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {vids} vid{vids !== 1 ? 's' : ''}, {imgs} img{imgs !== 1 ? 's' : ''}
                        </span>
                        <button onClick={() => addBatchAsPost(batch)}
                          className="text-[11px] font-bold text-[#00AFF0] bg-[#00AFF0]/10 rounded-lg px-2.5 py-1 hover:bg-[#00AFF0]/20">
                          + Add as post
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {batch.media.map((m, mi) => (
                          <div key={mi} className="aspect-square rounded-lg overflow-hidden bg-black/40 relative">
                            {m.type === 'video' ? (
                              <>
                                <video src={m.url} className="w-full h-full object-cover" preload="metadata" muted />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-white ml-0.5" />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <img src={m.url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══ STATISTICS PANEL ═════════════════════════════════════════ */
const MONTHLY_EVOLUTION = [
  { label: 'This month', amount: 2317.05, period: 'Mar 06 — Apr 05' },
  { label: 'Previous month', amount: 1430.00, period: 'Feb 04 — Mar 05' },
  { label: '2 months ago', amount: 839.00, period: 'Jan 05 — Feb 03' },
];

function HoverMoney({ value, label, size = 'lg' }: { value: number; label: string; size?: 'lg' | 'sm' }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-default relative group"
    >
      <motion.p
        animate={{ scale: hovered ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`font-bold ${size === 'lg' ? 'text-2xl' : 'text-lg'} text-white`}
      >
        {moneyDec(value)}
      </motion.p>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute left-0 top-full mt-1 bg-[#00AFF0] text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg"
          >
            {label}: {moneyDec(value)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatisticsPanel() {
  const [periodTab, setPeriodTab] = useState<string>('all');
  const maxVal = Math.max(...DAILY_GROSS);
  const CW = 400;
  const CH = 140;

  const netPath = buildSvgPath(DAILY_NET, maxVal, CW, CH);
  const grossPath = buildSvgPath(DAILY_GROSS, maxVal, CW, CH);
  const grossArea = `${grossPath} L${CW},${CH} L0,${CH} Z`;
  const netArea = `${netPath} L${CW},${CH} L0,${CH} Z`;

  const evoMax = Math.max(...MONTHLY_EVOLUTION.map(m => m.amount));

  return (
    <div className="w-full bg-[#0a1117]">
      {/* Main Tabs */}
      <div className="flex border-b border-white/[0.08] overflow-x-auto no-scrollbar">
        {['STATEMENTS', 'OVERVIEW', 'ENGAGEMENT', 'REACH'].map((t, i) => (
          <button key={t}
            className={`px-5 py-3 text-xs font-bold tracking-wide whitespace-nowrap border-b-2 transition-all ${
              i === 0 ? 'border-[#00AFF0] text-[#00AFF0]' : 'border-transparent text-white/30 hover:text-white/60'
            }`}>{t}</button>
        ))}
      </div>

      {/* Sub-pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {['Earnings', 'Payout Requests', 'Chargebacks', 'Referrals'].map((p, i) => (
          <button key={p}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              i === 0 ? 'bg-[#00AFF0]/15 text-[#00AFF0] border border-[#00AFF0]/30' : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
            }`}>{p}</button>
        ))}
      </div>

      {/* Top % badge */}
      <div className="mx-4 mt-1 mb-4 flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-amber-400/5 border border-amber-500/20 rounded-xl px-4 py-3">
        <Star size={16} className="text-amber-400 shrink-0" fill="currentColor" />
        <span className="text-xs font-bold text-amber-300/90 uppercase tracking-wide">
          You are in the top {STATS.topPercent}% of all creators!
        </span>
      </div>

      {/* Balances */}
      <div className="mx-4 grid grid-cols-2 gap-px bg-white/[0.06] rounded-xl overflow-hidden border border-white/[0.08]">
        <div className="bg-[#0d1419] p-4">
          <HoverMoney value={STATS.currentBalance} label="Current balance" />
          <p className="text-xs text-white/30 mt-1">Current balance</p>
        </div>
        <div className="bg-[#0d1419] p-4">
          <HoverMoney value={STATS.pendingBalance} label="Pending balance" />
          <p className="text-xs text-white/30 mt-1 flex items-center gap-1">Pending balance <span className="w-3.5 h-3.5 rounded-full border border-white/20 inline-flex items-center justify-center text-[8px] text-white/30">i</span></p>
        </div>
      </div>

      {/* Manual Payouts */}
      <div className="mx-4 mt-4 border border-white/[0.08] rounded-xl bg-[#0d1419]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Manual payouts</p>
            <p className="text-xs text-white/30 mt-0.5">Minimum withdrawal amount is $20</p>
          </div>
          <ChevronDown size={18} className="text-white/30" />
        </div>
      </div>

      {/* Withdrawal button */}
      <div className="px-4 mt-4">
        <button className="w-full py-3.5 rounded-full border-2 border-[#00AFF0] text-[#00AFF0] font-bold text-sm uppercase tracking-wide hover:bg-[#00AFF0]/10 transition-colors">
          Request Withdrawal
        </button>
      </div>

      <div className="h-px bg-white/[0.06] mx-4 my-5" />

      {/* Last 30 Days */}
      <div className="px-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-white">Last 30 days</p>
            <ChevronDown size={16} className="text-white/30" />
          </div>
          <p className="text-xs text-white/30 mt-0.5">{STATS.period}</p>
        </div>
      </div>

      {/* Period filter pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {['All', 'Subscriptions', 'Tips', 'Posts', 'Messages'].map(p => {
          const key = p.toLowerCase();
          return (
            <button key={p} onClick={() => setPeriodTab(key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                periodTab === key
                  ? 'bg-[#00AFF0]/15 text-[#00AFF0] border border-[#00AFF0]/30'
                  : 'bg-white/[0.05] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]'
              }`}>{p}</button>
          );
        })}
      </div>

      {/* Total */}
      <div className="px-4 mb-3 flex items-baseline flex-wrap gap-x-2 gap-y-1">
        <span className="text-xl font-bold text-white">{moneyDec(STATS.net)}</span>
        <span className="text-sm text-white/30">({moneyDec(STATS.gross)} Gross)</span>
        <span className="text-sm text-emerald-400 font-semibold inline-flex items-center gap-0.5">
          <TrendingUp size={13} /> {STATS.growth}%
        </span>
      </div>

      {/* Chart */}
      <div className="px-4 mb-2">
        <div className="relative bg-[#0d1419] rounded-xl border border-white/[0.06] p-3">
          <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" preserveAspectRatio="none" style={{ height: 160 }}>
            {[600, 400, 200].map(v => {
              const y = CH - 10 - (v / maxVal) * (CH - 20);
              return <line key={v} x1={0} y1={y} x2={CW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.8} />;
            })}
            <defs>
              <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00AFF0" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#00AFF0" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00AFF0" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00AFF0" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={grossArea} fill="url(#grossFill)" />
            <path d={grossPath} fill="none" stroke="rgba(0,175,240,0.3)" strokeWidth={1.5} />
            <path d={netArea} fill="url(#netFill)" />
            <path d={netPath} fill="none" stroke="#00AFF0" strokeWidth={2} />
          </svg>
          <div className="absolute top-3 right-3 flex flex-col gap-0 text-[9px] text-white/20 font-medium">
            {[600, 400, 200].map(v => (
              <span key={v} style={{ marginTop: v === 600 ? 0 : 'auto' }}>${v}</span>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            {CHART_LABELS.map(l => (
              <span key={l} className="text-[9px] text-white/20">{l}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-white/[0.06] mx-4 my-4" />

      {/* Monthly Evolution */}
      <div className="px-4 mb-5">
        <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <TrendingUp size={12} className="text-[#00AFF0]" /> Monthly Evolution
        </p>
        <div className="space-y-2.5">
          {MONTHLY_EVOLUTION.map((m, i) => {
            const prevAmount = MONTHLY_EVOLUTION[i + 1]?.amount;
            const growthPct = prevAmount ? (((m.amount - prevAmount) / prevAmount) * 100).toFixed(0) : null;
            return (
              <div key={m.label} className="bg-[#0d1419] rounded-xl border border-white/[0.06] p-3 group hover:border-[#00AFF0]/30 transition-all cursor-default">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[11px] text-white/40">{m.label}</p>
                    <p className="text-[10px] text-white/20">{m.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-white group-hover:text-[#00AFF0] transition-colors">{moneyDec(m.amount)}</p>
                    {growthPct && (
                      <p className={`text-[10px] font-semibold ${Number(growthPct) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {Number(growthPct) >= 0 ? '+' : ''}{growthPct}% vs prev
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(m.amount / evoMax) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: i === 0 ? 'linear-gradient(90deg, #00AFF0, #00D4FF)' : i === 1 ? 'rgba(0,175,240,0.4)' : 'rgba(0,175,240,0.2)' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-white/[0.06] mx-4 my-4" />

      {/* Revenue by Country */}
      <div className="px-4 pb-6">
        <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Globe size={12} className="text-[#00AFF0]" /> Revenue by Country
        </p>
        <div className="space-y-2.5">
          {COUNTRIES.map((c, i) => (
            <div key={c.name} className="flex items-center gap-3 group bg-[#0d1419] rounded-xl border border-white/[0.06] p-3 hover:border-[#00AFF0]/20 transition-all cursor-default">
              <span className="text-lg w-7 text-center">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[12px] text-white/60 font-medium">{c.name}</span>
                  <span className="text-[12px] font-bold text-white group-hover:text-[#00AFF0] transition-colors">{money(c.amount)}</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }}
                    transition={{ duration: 0.7, delay: i * 0.07 }}
                    className="h-full rounded-full"
                    style={{ background: ['#00AFF0','#00D4FF','#3b82f6','#8b5cf6','#10b981','#f59e0b'][i] }} />
                </div>
                <p className="text-[10px] text-white/15 mt-1">{c.pct}% of revenue</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ POST CARD ════════════════════════════════════════════════ */
function PostCard({
  post, creator, onDelete, onToggleLock, onEdit, readonly = false,
}: {
  post: Post;
  creator: Creator;
  readonly?: boolean;
  onDelete: (id: string) => void;
  onToggleLock: (id: string) => void;
  onEdit: (id: string, patch: Partial<Post>) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editPrice, setEditPrice] = useState(post.price);
  const [editDateIso, setEditDateIso] = useState(post.postedAtIso || new Date().toISOString().split('T')[0]);
  const [editTags, setEditTags] = useState<TaggedCreator[]>(post.tagged || []);
  const [editMedia, setEditMedia] = useState<MediaItem[]>([]);
  const [removedUrls, setRemovedUrls] = useState<string[]>([]);
  const [addingFiles, setAddingFiles] = useState(false);
  const [thumbPicking, setThumbPicking] = useState<number | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const thumbVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaList: MediaItem[] = editing
    ? editMedia
    : post.media && post.media.length > 0
      ? post.media
      : post.videoUrl
        ? [{ type: 'video', url: post.videoUrl }]
        : post.thumbnail
          ? [{ type: 'photo', url: post.thumbnail }]
          : [];
  const isMulti = mediaList.length > 1;

  const startEdit = () => {
    const ml = post.media && post.media.length > 0
      ? [...post.media]
      : post.videoUrl
        ? [{ type: 'video' as const, url: post.videoUrl }]
        : post.thumbnail
          ? [{ type: 'photo' as const, url: post.thumbnail }]
          : [];
    setEditMedia(ml);
    setEditCaption(post.caption);
    setEditPrice(post.price);
    setEditDateIso(post.postedAtIso || new Date().toISOString().split('T')[0]);
    setEditTags(post.tagged || []);
    setRemovedUrls([]);
    setThumbPicking(null);
    setEditing(true);
    setShowMenu(false);
  };

  const removeEditMedia = (idx: number) => {
    const item = editMedia[idx];
    setRemovedUrls(prev => [...prev, item.url, ...(item.thumb ? [item.thumb] : [])]);
    setEditMedia(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAddingFiles(true);
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      try {
        const fd = new FormData();
        fd.append('file', file);
        const endpoint = isVideo ? '/api/upload/video' : '/api/upload';
        const res = await axios.post(endpoint, fd);
        setEditMedia(prev => [...prev, { type: isVideo ? 'video' : 'photo', url: res.data.url }]);
      } catch {}
    }
    setAddingFiles(false);
    e.target.value = '';
  };

  const [thumbUploading, setThumbUploading] = useState(false);

  const captureEditThumb = async (idx: number) => {
    const video = thumbVideoRefs.current[idx];
    if (!video || video.videoWidth === 0) return;
    setThumbUploading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append('file', new File([blob], 'thumb.jpg', { type: 'image/jpeg' }));
      const res = await axios.post('/api/upload', fd);
      setEditMedia(prev => prev.map((m, i) => i === idx ? { ...m, thumb: res.data.url } : m));
      setThumbPicking(null);
    } catch {} finally {
      setThumbUploading(false);
    }
  };

  const saveEdit = () => {
    if (removedUrls.length > 0) deleteMediaUrls(removedUrls);
    const firstVideo = editMedia.find(m => m.type === 'video');
    const firstPhoto = editMedia.find(m => m.type === 'photo');
    onEdit(post.id, {
      caption: editCaption,
      price: editPrice,
      postedAt: formatDateDisplay(editDateIso),
      postedAtIso: editDateIso,
      tagged: editTags.length > 0 ? editTags : undefined,
      type: firstVideo ? 'video' : 'photo',
      thumbnail: firstPhoto?.url || firstVideo?.thumb || '',
      videoUrl: firstVideo?.url || '',
      media: editMedia.length > 0 ? editMedia : undefined,
    });
    setEditing(false);
    setThumbPicking(null);
  };

  return (
    <article className={`pt-4 ${editing ? 'bg-[#0a1117] ring-1 ring-[#00AFF0]/20' : 'bg-[#0a1117]'}`}>
      {/* Editing banner */}
      {editing && (
        <div className="mx-4 mb-3 flex items-center gap-2 bg-[#00AFF0]/10 border border-[#00AFF0]/20 rounded-xl px-3 py-2">
          <Pencil size={12} className="text-[#00AFF0]" />
          <span className="text-xs font-semibold text-[#00AFF0]">Editing post</span>
          <div className="flex-1" />
          <button onClick={saveEdit}
            className="text-xs font-bold text-white bg-[#00AFF0] rounded-lg px-3 py-1">Save</button>
          <button onClick={() => { setEditing(false); setThumbPicking(null); }}
            className="text-xs font-semibold text-white/40 hover:text-white/60">Cancel</button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-3">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.08] shrink-0">
          <img src={creator.avatar} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-bold text-white">{creator.name}</span>
            <CheckCircle2 size={13} className="text-[#00AFF0] shrink-0" fill="currentColor" stroke="#0a1117" />
            {post.pinned && (
              <span className="ml-1 text-[9px] font-bold text-[#00AFF0] uppercase tracking-wider bg-[#00AFF0]/10 px-1.5 py-0.5 rounded">Pinned</span>
            )}
          </div>
          <p className="text-[11px] text-white/30">@{creator.username} · {post.postedAt}</p>
        </div>
        <div className="relative shrink-0">
          {readonly && (
            <span className="text-[9px] font-bold text-[#00AFF0]/60 bg-[#00AFF0]/10 rounded-full px-2 py-0.5">tagged</span>
          )}
          {!readonly && <button onClick={() => setShowMenu(m => !m)} className="p-1.5 text-white/30 hover:text-white rounded-lg transition-colors">
            <MoreHorizontal size={17} />
          </button>}
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}
                className="absolute right-0 top-8 bg-[#0d1419] border border-white/[0.08] rounded-2xl shadow-2xl z-10 overflow-hidden min-w-[150px]">
                <button onClick={startEdit}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-white/60 hover:bg-white/[0.04] w-full text-left">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => { onToggleLock(post.id); setShowMenu(false); }}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-white/60 hover:bg-white/[0.04] w-full text-left">
                  {post.locked ? <><Bookmark size={14} /> Unlock</> : <><Lock size={14} /> Lock (PPV)</>}
                </button>
                <div className="h-px bg-white/[0.06]" />
                <button onClick={() => { onDelete(post.id); setShowMenu(false); }}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 w-full text-left">
                  <X size={14} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Caption + Price + Tags */}
      <div className="px-4 mb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[14px] text-white/80 resize-none outline-none focus:border-[#00AFF0]/40"
              rows={2} placeholder="Caption…" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <DollarSign size={14} className="text-green-400/60" />
                <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value) || 0)}
                  min={0} step={0.01}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[13px] text-green-400 outline-none focus:border-green-400/40"
                  placeholder="Price" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/30">Date</span>
                <input type="date" value={editDateIso} onChange={e => setEditDateIso(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[13px] text-white/60 outline-none focus:border-[#00AFF0]/40 [color-scheme:dark]" />
              </div>
            </div>
            {/* Tag editors */}
            {(() => {
              const taggable = ALL_CREATORS.filter(c => c.username !== (post.tagged?.[0]?.username ?? '') && !editTags.some(t => t.username === c.username));
              return (
                <div>
                  <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-1.5">Tag creators</p>
                  {editTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {editTags.map(t => (
                        <span key={t.username}
                          className="inline-flex items-center gap-1 bg-[#00AFF0]/10 text-[#00AFF0] text-xs font-semibold px-2 py-0.5 rounded-full border border-[#00AFF0]/20">
                          @{t.username}
                          <button onClick={() => setEditTags(tags => tags.filter(x => x.username !== t.username))}
                            className="hover:text-white"><X size={9} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  {taggable.map(c => (
                    <button key={c.username}
                      onClick={() => setEditTags(tags => [...tags, { username: c.username, name: c.name }])}
                      className="inline-flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 text-xs px-2 py-1 rounded-full border border-white/[0.06] transition-all mr-1.5 mb-1">
                      <Plus size={9} /> @{c.username}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] text-white/60 leading-relaxed flex-1">{post.caption}</p>
            {post.price > 0 && (
              <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-bold text-green-400 bg-green-400/10 rounded-full px-2 py-0.5">
                <DollarSign size={10} />{post.price.toFixed(2)}
              </span>
            )}
          </div>
        )}
        {post.tagged && post.tagged.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {post.tagged.map(t => (
              <a key={t.username} href={`/${t.username}`}
                className="text-[12px] font-semibold text-[#00AFF0] hover:text-[#00D4FF] transition-colors">
                @{t.username}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit media panel ── */}
      {editing && (
        <div className="px-4 mb-3">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Media ({editMedia.length})</span>
              <div className="flex gap-2">
                <input type="file" ref={editFileRef} onChange={handleAddFiles} multiple accept="image/*,video/*" className="hidden" />
                <button onClick={() => editFileRef.current?.click()} disabled={addingFiles}
                  className="text-xs text-[#00AFF0] hover:text-[#00D4FF] font-semibold disabled:opacity-50">
                  {addingFiles ? 'Uploading…' : '+ Add media'}
                </button>
              </div>
            </div>
            {editMedia.length === 0 && (
              <p className="text-white/20 text-xs text-center py-4">No media — add some above</p>
            )}

            {/* Thumb picker full-width when active */}
            {thumbPicking !== null && editMedia[thumbPicking]?.type === 'video' && (
              <div className="mb-3 bg-black/60 rounded-xl overflow-hidden border border-[#00AFF0]/30">
                <video
                  ref={el => { thumbVideoRefs.current[thumbPicking] = el; }}
                  src={editMedia[thumbPicking].url}
                  className="w-full" style={{ maxHeight: 240 }}
                  preload="auto" muted playsInline crossOrigin="anonymous"
                />
                <div className="px-3 py-2">
                  <p className="text-[10px] text-white/40 mb-1">Drag to pick the frame for the cover</p>
                  <input type="range" min={0} max={1000} defaultValue={0}
                    onChange={e => {
                      const v = thumbVideoRefs.current[thumbPicking];
                      if (v && v.duration) v.currentTime = (Number(e.target.value) / 1000) * v.duration;
                    }}
                    className="w-full h-2 accent-[#00AFF0] cursor-pointer" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => captureEditThumb(thumbPicking)} disabled={thumbUploading}
                      className="flex-1 py-1.5 text-xs font-bold bg-[#00AFF0] text-white rounded-lg disabled:opacity-50">
                      {thumbUploading ? 'Saving…' : 'Set as cover'}
                    </button>
                    <button onClick={() => setThumbPicking(null)}
                      className="flex-1 py-1.5 text-xs font-semibold bg-white/10 text-white/60 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {editMedia.map((m, i) => (
                <div key={`${m.url}-${i}`} className="relative rounded-xl overflow-hidden bg-black/40 aspect-square">
                  {m.type === 'video' ? (
                    <>
                      {m.thumb
                        ? <img src={m.thumb} alt="" className="w-full h-full object-cover" />
                        : <video src={m.url} className="w-full h-full object-cover" preload="metadata" muted />
                      }
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-white ml-0.5" />
                        </div>
                      </div>
                      {m.thumb && (
                        <span className="absolute top-1 left-1 text-[7px] font-bold bg-green-500/80 text-white rounded px-1 py-0.5">Cover set</span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setThumbPicking(i); }}
                        className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/80 text-[#00AFF0] rounded px-1.5 py-1 z-10">
                        {m.thumb ? 'Re-pick' : 'Set cover'}
                      </button>
                    </>
                  ) : (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removeEditMedia(i); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center z-10">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={saveEdit}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(90deg, #00AFF0, #0096d6)' }}>
                Save Changes
              </button>
              <button onClick={() => { setEditing(false); setThumbPicking(null); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white/40 bg-white/5 hover:bg-white/10 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media (hidden in edit mode — edit panel shows media above) */}
      {editing ? null : mediaList.length === 0 ? (
        <div className="w-full h-[280px] bg-gradient-to-br from-[#0d1419] to-[#0a1117] flex items-center justify-center">
          <Video size={48} className="text-white/10" />
        </div>
      ) : !isMulti ? (
        /* ── Single media ── */
        <div className="relative bg-black/40 overflow-hidden cursor-pointer" style={{ minHeight: 200 }}
          onClick={() => !post.locked && setExpandedIdx(0)}>
          {mediaList[0].type === 'video' ? (
            <video ref={videoRef} src={mediaList[0].url}
              className={`w-full ${post.locked ? 'blur-2xl scale-110 brightness-50 pointer-events-none' : ''}`}
              style={{ maxHeight: 500 }} playsInline controls={!post.locked} preload="auto"
              onClick={e => e.stopPropagation()} />
          ) : (
            <img src={mediaList[0].url} alt=""
              className={`w-full object-contain ${post.locked ? 'blur-2xl scale-110 brightness-50' : ''}`}
              style={{ maxHeight: 600 }} />
          )}
          {mediaList[0].type === 'video' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-white text-[11px] font-semibold pointer-events-none">
              <Video size={11} /> Video
            </div>
          )}
          {post.locked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Lock size={24} className="text-white" />
              </div>
              <p className="text-white/70 text-sm font-medium text-center px-4">
                Unlock for <span className="font-bold text-white">${post.price.toFixed(2)}</span>
              </p>
              <button className="px-8 py-2.5 rounded-full text-white text-sm font-bold shadow-lg"
                style={{ background: 'linear-gradient(90deg, #00AFF0, #0096d6)' }}>
                Unlock Now
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Mosaic grid for multi-media ── */
        <div className="relative">
          <div className={`grid gap-0.5 ${
            mediaList.length === 2 ? 'grid-cols-2' :
            mediaList.length === 3 ? 'grid-cols-2' :
            'grid-cols-2'
          }`} style={{ maxHeight: 400, overflow: 'hidden' }}>
            {mediaList.slice(0, 4).map((m, i) => {
              const isFirst3 = mediaList.length === 3 && i === 0;
              return (
                <div key={i}
                  className={`relative overflow-hidden cursor-pointer bg-black/40 ${
                    isFirst3 ? 'row-span-2' : ''
                  } ${post.locked ? '' : 'hover:brightness-90 transition-all'}`}
                  style={{ aspectRatio: isFirst3 ? '1/2' : mediaList.length === 2 ? '1/1' : '1/1' }}
                  onClick={() => !post.locked && setExpandedIdx(i)}>
                  {m.type === 'video' ? (
                    <>
                      {m.thumb
                        ? <img src={m.thumb} alt="" className={`w-full h-full object-cover ${post.locked ? 'blur-xl brightness-50' : ''}`} />
                        : <video src={m.url} className={`w-full h-full object-cover ${post.locked ? 'blur-xl brightness-50' : ''}`} preload="metadata" muted />
                      }
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[12px] border-l-white ml-1" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={m.url} alt="" className={`w-full h-full object-cover ${post.locked ? 'blur-xl brightness-50' : ''}`} />
                  )}
                  {i === 3 && mediaList.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">+{mediaList.length - 4}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-white text-[10px] font-semibold pointer-events-none">
            {mediaList.length} items
          </div>
          {post.locked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Lock size={24} className="text-white" />
              </div>
              <p className="text-white/70 text-sm font-medium text-center px-4">
                Unlock for <span className="font-bold text-white">${post.price.toFixed(2)}</span>
              </p>
              <button className="px-8 py-2.5 rounded-full text-white text-sm font-bold shadow-lg"
                style={{ background: 'linear-gradient(90deg, #00AFF0, #0096d6)' }}>
                Unlock Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Fullscreen Lightbox ── */}
      <AnimatePresence>
        {expandedIdx !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex flex-col"
            onClick={() => setExpandedIdx(null)}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
              {isMulti && (
                <span className="text-white/50 text-xs font-semibold">{expandedIdx + 1} / {mediaList.length}</span>
              )}
              <div className="flex-1" />
              <button onClick={() => setExpandedIdx(null)} className="p-2 text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 flex items-center justify-center relative min-h-0" onClick={e => e.stopPropagation()}>
              {mediaList[expandedIdx].type === 'video' ? (
                <video key={mediaList[expandedIdx].url} src={mediaList[expandedIdx].url}
                  className="max-w-full max-h-full" controls autoPlay playsInline />
              ) : (
                <img src={mediaList[expandedIdx].url} alt=""
                  className="max-w-full max-h-full object-contain" />
              )}
              {/* Prev / Next */}
              {isMulti && expandedIdx > 0 && (
                <button onClick={() => setExpandedIdx(i => (i ?? 1) - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                  <ArrowLeft size={18} />
                </button>
              )}
              {isMulti && expandedIdx < mediaList.length - 1 && (
                <button onClick={() => setExpandedIdx(i => (i ?? 0) + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors rotate-180">
                  <ArrowLeft size={18} />
                </button>
              )}
            </div>
            {/* Thumbnail strip */}
            {isMulti && (
              <div className="flex justify-center gap-2 px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
                {mediaList.map((m, i) => (
                  <button key={i} onClick={() => setExpandedIdx(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      i === expandedIdx ? 'border-[#00AFF0] opacity-100' : 'border-transparent opacity-40 hover:opacity-70'
                    }`}>
                    {m.type === 'video'
                      ? (m.thumb
                        ? <img src={m.thumb} alt="" className="w-full h-full object-cover" />
                        : <video src={m.url} className="w-full h-full object-cover" muted preload="metadata" />)
                      : <img src={m.url} alt="" className="w-full h-full object-cover" />
                    }
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Engagement */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-5">
          <button onClick={() => setLiked(l => !l)}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors ${liked ? 'text-rose-500' : 'text-white/30 hover:text-rose-400'}`}>
            <Heart size={20} fill={liked ? 'currentColor' : 'none'} strokeWidth={liked ? 0 : 1.8} />
            {fmt(post.likes + (liked ? 1 : 0))}
          </button>
          <button onClick={() => setShowComments(s => !s)}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors ${showComments ? 'text-[#00AFF0]' : 'text-white/30 hover:text-[#00AFF0]'}`}>
            <MessageCircle size={20} strokeWidth={1.8} />
            {fmt(post.comments)}
          </button>
          <span className="flex items-center gap-1.5 text-[13px] text-white/20">
            <Eye size={18} strokeWidth={1.6} />
            {fmt(post.views)}
          </span>
        </div>
        <button onClick={() => setSaved(s => !s)}
          className={`transition-colors ${saved ? 'text-[#00AFF0]' : 'text-white/20 hover:text-white/40'}`}>
          <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} strokeWidth={saved ? 0 : 1.8} />
        </button>
      </div>

      {/* Comments */}
      {post.commentList && post.commentList.length > 0 && (
        <div className="px-4 pb-3">
          {!showComments ? (
            <button onClick={() => setShowComments(true)}
              className="text-[12px] text-white/30 hover:text-white/50 transition-colors">
              View all {post.commentList.length} comments
            </button>
          ) : (
            <div className="space-y-2.5">
              {post.commentList.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={11} className="text-white/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-bold text-white/60">{c.user}</span>
                      <span className="text-[10px] text-white/15">{c.ago}</span>
                    </div>
                    <p className="text-[12px] text-white/40 leading-relaxed">{c.text}</p>
                  </div>
                  <button className="shrink-0 mt-1 text-white/10 hover:text-rose-400 transition-colors">
                    <Heart size={11} />
                  </button>
                </div>
              ))}
              <button onClick={() => setShowComments(false)}
                className="text-[11px] text-white/20 hover:text-white/40 transition-colors">
                Hide comments
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
