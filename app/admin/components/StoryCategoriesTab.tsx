'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getSiteConfig, updateSiteConfig } from '@/lib/actions/adminConfig';
import { syncR2Stories } from '@/lib/actions/stories';

interface StoryCategoryConfig {
  slug: string;
  label: string;
  enabled: boolean;
  profileImage: string;
  filterType: 'erogram' | 'random-girl' | 'advert';
  filterValue: string;
  sortOrder: number;
  maxItems?: number;
  ctaText?: string;
  ctaUrl?: string;
  ctaPosition?: 'top' | 'middle' | 'bottom';
  ctaColor?: string;
  verified?: boolean;
  r2Folder?: string;
}

interface PremiumGroupEntry {
  name: string;
  slug: string;
  image: string;
  memberCount: number;
  category: string;
}

interface StorySlide {
  _id?: string;
  categorySlug: string;
  mediaType: 'image' | 'video' | 'premium-grid';
  mediaUrl: string;
  ctaText: string;
  ctaUrl: string;
  caption: string;
  duration: number;
  expiresAt: string | null;
  enabled: boolean;
  clientName: string;
  sortOrder: number;
  ctaPosition: 'top' | 'middle' | 'bottom';
  ctaColor: string;
  createdAt?: string;
  views?: number;
  likes?: number;
  clicks?: number;
  premiumGroups?: PremiumGroupEntry[];
}

interface StoryGroupItem {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  createdAt: string;
  storyViews: number;
  premiumOnly?: boolean;
}

const DEFAULT_CATEGORIES: StoryCategoryConfig[] = [
  { slug: 'erogram', label: 'EROGRAM', enabled: true, profileImage: '', filterType: 'erogram', filterValue: '', sortOrder: 0, maxItems: 6, verified: true, r2Folder: 'stories/AI-GF' },
  { slug: 'random-girl-1', label: 'Vicky', enabled: true, profileImage: '', filterType: 'random-girl', filterValue: '', sortOrder: 1, maxItems: 3, r2Folder: 'tgempire/instabaddies' },
  { slug: 'ai-gf', label: 'AI GF', enabled: true, profileImage: '', filterType: 'advert', filterValue: '', sortOrder: 2, maxItems: 4, ctaText: 'Try AI Girlfriend', ctaUrl: '/bots', r2Folder: 'stories/AI-GF' },
  { slug: 'random-girl-2', label: 'Carla', enabled: true, profileImage: '', filterType: 'random-girl', filterValue: '', sortOrder: 3, maxItems: 3, r2Folder: 'tgempire/instabaddies' },
];

const INPUT = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition';

export default function StoryCategoriesTab() {
  const [categories, setCategories] = useState<StoryCategoryConfig[]>([]);
  const [slides, setSlides] = useState<StorySlide[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isGeneratingPremium, setIsGeneratingPremium] = useState(false);
  const [storiesVisible, setStoriesVisible] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function token(): string {
    try { return localStorage.getItem('token') ?? ''; } catch { return ''; }
  }
  function authH() { return { headers: { Authorization: `Bearer ${token()}` } }; }

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const t = token();
      const [configData, slidesRes, groupsRes] = await Promise.all([
        getSiteConfig(t),
        axios.get('/api/admin/story-content', authH()),
        axios.get('/api/admin/story-groups', authH()).catch(() => ({ data: { groups: [] } })),
      ]);
      const gs = configData?.generalSettings || {};
      const saved: StoryCategoryConfig[] = Array.isArray(gs.storyCategories) ? gs.storyCategories : [];
      setCategories(saved.length > 0 ? saved : DEFAULT_CATEGORIES);
      setStoriesVisible(gs.showStories !== false);
      setSlides(slidesRes.data || []);
      setStoryGroups(groupsRes.data?.groups || []);
    } catch (err) {
      console.error('Load failed:', err);
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveCats = async (cats?: StoryCategoryConfig[]) => {
    const toSave = cats ?? categories;
    try {
      setIsSaving(true); setSaveMsg(null);
      const t = token();
      if (!t) { setSaveMsg({ ok: false, text: 'Not logged in' }); return; }
      await updateSiteConfig(t, { generalSettings: { storyCategories: toSave } });
      setCategories(toSave);
      setSaveMsg({ ok: true, text: 'Saved!' });
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (err: any) {
      setSaveMsg({ ok: false, text: err?.message === 'Unauthorized' ? 'Session expired' : (err?.message || 'Save failed') });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStoriesVisibility = async () => {
    const newVal = !storiesVisible;
    setStoriesVisible(newVal);
    try {
      await updateSiteConfig(token(), { generalSettings: { showStories: newVal } });
      setSaveMsg({ ok: true, text: newVal ? 'Stories visible' : 'Stories hidden' });
      setTimeout(() => setSaveMsg(null), 2500);
    } catch {
      setStoriesVisible(!newVal);
      setSaveMsg({ ok: false, text: 'Failed to update' });
    }
  };

  const updateCat = (slug: string, field: string, value: string | boolean | number, save = false) => {
    const updated = categories.map(c => c.slug === slug ? { ...c, [field]: value } : c);
    setCategories(updated);
    if (save) saveCats(updated);
  };

  const saveCurrent = () => saveCats();

  const moveCat = (slug: string, dir: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    const idx = sorted.findIndex(c => c.slug === slug);
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= sorted.length) return;
    const tmp = sorted[idx].sortOrder;
    sorted[idx] = { ...sorted[idx], sortOrder: sorted[swap].sortOrder };
    sorted[swap] = { ...sorted[swap], sortOrder: tmp };
    setCategories(sorted);
    saveCats(sorted);
  };

  const createProfile = (type: 'advert' | 'random-girl') => {
    const slug = `${type === 'advert' ? 'ad' : 'girl'}-${Date.now()}`;
    const newCat: StoryCategoryConfig = {
      slug, label: type === 'advert' ? 'New Ad' : 'New Profile', enabled: true, profileImage: '',
      filterType: type, filterValue: '', sortOrder: categories.length,
      maxItems: type === 'advert' ? 10 : 3,
      r2Folder: type === 'random-girl' ? 'tgempire/instabaddies' : '',
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCats(updated);
    setShowCreateDialog(false);
    setActiveSlug(slug);
  };

  const deleteProfile = (slug: string) => {
    if (!confirm('Delete this profile and all its data?')) return;
    const updated = categories.filter(c => c.slug !== slug);
    setCategories(updated);
    setActiveSlug(null);
    saveCats(updated);
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!activeSlug) return;
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (fileArr.length === 0) return;
    setUploadingCount(fileArr.length);
    const existing = slides.filter(s => s.categorySlug === activeSlug).length;
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      const isVideo = file.type.startsWith('video/');
      const form = new FormData(); form.append('file', file);
      try {
        const res = await axios.post(isVideo ? '/api/upload/video' : '/api/upload', form, authH());
        if (res.data?.url) {
          await axios.post('/api/admin/story-content', {
            categorySlug: activeSlug, mediaType: isVideo ? 'video' : 'image',
            mediaUrl: res.data.url, ctaText: '', ctaUrl: '', caption: '',
            duration: 0, enabled: true, clientName: '', sortOrder: existing + i,
          }, authH());
        }
      } catch (err) { console.error('Upload failed:', file.name, err); }
      setUploadingCount(fileArr.length - i - 1);
    }
    setUploadingCount(0);
    loadData();
  };

  const updateSlide = async (id: string, updates: Partial<StorySlide>) => {
    try {
      await axios.put(`/api/admin/story-content/${id}`, updates, authH());
      setSlides(prev => prev.map(s => s._id === id ? { ...s, ...updates } : s));
    } catch (err) { console.error('Update failed:', err); }
  };

  const deleteSlide = async (id: string) => {
    if (!confirm('Delete this story?')) return;
    try {
      await axios.delete(`/api/admin/story-content/${id}`, authH());
      setSlides(prev => prev.filter(s => s._id !== id));
    } catch (err) { console.error('Delete failed:', err); }
  };

  const moveSlide = async (slide: StorySlide, dir: 'up' | 'down') => {
    const sorted = activeSlidesSorted;
    const idx = sorted.findIndex(s => s._id === slide._id);
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= sorted.length) return;
    try {
      await Promise.all([
        axios.put(`/api/admin/story-content/${sorted[idx]._id}`, { sortOrder: sorted[swap].sortOrder }, authH()),
        axios.put(`/api/admin/story-content/${sorted[swap]._id}`, { sortOrder: sorted[idx].sortOrder }, authH()),
      ]);
      loadData();
    } catch (err) { console.error('Reorder failed:', err); }
  };

  const hideGroup = async (groupId: string) => {
    if (!confirm('Hide from stories?')) return;
    try {
      await axios.post('/api/admin/story-groups/hide', { groupId }, authH());
      setStoryGroups(prev => prev.filter(g => g._id !== groupId));
    } catch (err) { console.error('Hide failed:', err); }
  };

  const generatePremiumStories = async () => {
    try {
      setIsGeneratingPremium(true);
      setSaveMsg(null);
      const res = await axios.get('/api/admin/generate-premium-stories', authH());
      const d = res.data;
      setSaveMsg({ ok: true, text: `Created ${d.slidesCreated ?? 0} slide(s) from ${d.groupsUsed ?? 0} groups` });
      setTimeout(() => setSaveMsg(null), 5000);
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Generation failed';
      setSaveMsg({ ok: false, text: msg });
    } finally {
      setIsGeneratingPremium(false);
    }
  };

  const activeCat = activeSlug ? categories.find(c => c.slug === activeSlug) : null;
  const activeSlidesSorted = slides.filter(s => s.categorySlug === activeSlug).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const getProfileStats = (slug: string) => {
    const catSlides = slides.filter(s => s.categorySlug === slug);
    return {
      stories: catSlides.length,
      views: catSlides.reduce((sum, s) => sum + (s.views ?? 0), 0),
      likes: catSlides.reduce((sum, s) => sum + (s.likes ?? 0), 0),
      clicks: catSlides.reduce((sum, s) => sum + (s.clicks ?? 0), 0),
    };
  };

  if (isLoading) return <div className="text-center py-12 text-white/50">Loading...</div>;

  // ══════════════════════════════════════
  //  VIEW 1: PROFILE LISTING (no active)
  // ══════════════════════════════════════
  if (!activeCat) {
    const sorted = [...categories].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Stories</h2>
            <p className="text-white/40 text-sm mt-1">Select a profile to manage, or create a new one.</p>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && <span className={`text-xs ${saveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{saveMsg.text}</span>}
            <button
              onClick={toggleStoriesVisibility}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${storiesVisible ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
            >
              {storiesVisible ? '● LIVE' : '● OFF'}
            </button>
            <button onClick={() => saveCats()} disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition">
              {isSaving ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </div>

        {/* Profile grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((cat, i) => {
            const stats = getProfileStats(cat.slug);
            const typeLabel = cat.filterType === 'advert' ? 'AD' : cat.filterType === 'erogram' ? 'EROGRAM' : 'NORMAL';
            const typeColor = cat.filterType === 'advert' ? 'bg-orange-500/20 text-orange-400' : cat.filterType === 'erogram' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400';
            return (
              <div key={cat.slug}
                className="rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-pointer group relative"
                onClick={() => setActiveSlug(cat.slug)}>
                {/* Reorder arrows */}
                <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition z-10" onClick={e => e.stopPropagation()}>
                  <button onClick={() => moveCat(cat.slug, 'up')} disabled={i === 0}
                    className="p-1 rounded bg-white/10 text-white/50 hover:bg-white/20 disabled:opacity-20 transition">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15,18 9,12 15,6" /></svg>
                  </button>
                  <button onClick={() => moveCat(cat.slug, 'down')} disabled={i === sorted.length - 1}
                    className="p-1 rounded bg-white/10 text-white/50 hover:bg-white/20 disabled:opacity-20 transition">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9,6 15,12 9,18" /></svg>
                  </button>
                </div>

                <div className="p-4 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0">
                    {cat.profileImage ? (
                      <img src={cat.profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-white/15 text-xl font-bold">{(cat.label || '?')[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold text-sm truncate">{cat.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${typeColor}`}>{typeLabel}</span>
                      {!cat.enabled && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/20 text-red-400">PAUSED</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/30">
                      <span className="text-white/20 font-mono">#{i + 1}</span>
                      {stats.stories > 0 && (
                        <>
                          <span>{stats.stories} stories</span>
                          <span className="flex items-center gap-1">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400/50"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                            {stats.views.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="text-red-400/50"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            {stats.likes.toLocaleString()}
                          </span>
                          {stats.clicks > 0 && (
                            <span className="flex items-center gap-1">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="text-green-400/50"><path d="M13.5 2c-5.629 0-10.212 4.436-10.475 10h-3.025l4.537 5.917 4.463-5.917h-2.975c.26-3.902 3.508-7 7.475-7 4.136 0 7.5 3.364 7.5 7.5s-3.364 7.5-7.5 7.5c-2.381 0-4.502-1.119-5.876-2.854l-1.847 2.449c1.919 2.088 4.664 3.405 7.723 3.405 5.798 0 10.5-4.702 10.5-10.5s-4.702-10.5-10.5-10.5z"/></svg>
                              {stats.clicks.toLocaleString()} clicks
                            </span>
                          )}
                        </>
                      )}
                      {cat.filterType === 'random-girl' && <span>R2: {cat.r2Folder || '—'}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Create new card */}
          <button onClick={() => setShowCreateDialog(true)}
            className="rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.03] transition-all p-4 flex items-center justify-center gap-3 min-h-[82px]">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <span className="text-green-400/70 text-sm font-medium">Create Profile</span>
          </button>
        </div>

        {/* Create dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateDialog(false)}>
            <div className="bg-[#1a1a1e] rounded-xl border border-white/10 p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white">Create Story Profile</h3>
              <p className="text-white/40 text-sm">Choose the type of profile:</p>
              <div className="space-y-2">
                <button onClick={() => createProfile('advert')}
                  className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-orange-500/40 hover:bg-orange-500/5 transition text-left group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm block">Ad Profile</span>
                      <span className="text-white/30 text-xs">Upload photos & videos, add CTAs, track views. For paid campaigns.</span>
                    </div>
                  </div>
                </button>
                <button onClick={() => createProfile('random-girl')}
                  className="w-full p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/5 transition text-left group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm block">Normal Profile</span>
                      <span className="text-white/30 text-xs">Shares random photos/videos from an R2 folder. Optional CTA.</span>
                    </div>
                  </div>
                </button>
              </div>
              <button onClick={() => setShowCreateDialog(false)} className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════
  //  VIEW 2: PROFILE DETAIL (active)
  // ══════════════════════════════════════
  const stats = getProfileStats(activeCat.slug);

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => { setActiveSlug(null); setEditingSlideId(null); }}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white truncate">{activeCat.label}</h2>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
              activeCat.filterType === 'advert' ? 'bg-orange-500/20 text-orange-400' : activeCat.filterType === 'erogram' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
            }`}>{activeCat.filterType === 'advert' ? 'AD' : activeCat.filterType === 'erogram' ? 'EROGRAM' : 'NORMAL'}</span>
          </div>
          {stats.stories > 0 && (
            <span className="text-[11px] text-white/30">
              {stats.stories} stories &middot; {stats.views.toLocaleString()} views &middot; {stats.likes.toLocaleString()} likes{stats.clicks > 0 ? ` · ${stats.clicks.toLocaleString()} CTA clicks` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveMsg && <span className={`text-xs ${saveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{saveMsg.text}</span>}
          <button onClick={() => saveCats()} disabled={isSaving}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50 transition">
            {isSaving ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Settings card ── */}
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="relative w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10 cursor-pointer shrink-0 group">
              {activeCat.profileImage ? <img src={activeCat.profileImage} alt="" className="w-full h-full object-cover" /> : (
                <span className="w-full h-full flex items-center justify-center text-white/20 text-lg font-bold">{(activeCat.label || '?')[0]}</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4zM20 4h-3.17L15 2H9L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/></svg>
              </div>
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async e => {
                const f = e.target.files?.[0]; if (!f) return;
                const form = new FormData(); form.append('file', f);
                try {
                  const res = await axios.post('/api/upload', form, authH());
                  if (res.data?.url) { const u = categories.map(c => c.slug === activeCat.slug ? { ...c, profileImage: res.data.url } : c); setCategories(u); saveCats(u); }
                } catch { /* */ }
                e.target.value = '';
              }} />
            </label>
            <div>
              <input value={activeCat.label} onChange={e => updateCat(activeCat.slug, 'label', e.target.value)} onBlur={saveCurrent}
                className="bg-transparent text-white font-bold text-base outline-none border-b border-transparent focus:border-white/20 transition w-44" />
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-1 text-[11px] text-white/40 cursor-pointer">
                  <input type="checkbox" checked={activeCat.verified || false} onChange={e => updateCat(activeCat.slug, 'verified', e.target.checked, true)} className="rounded w-3 h-3" />
                  Verified
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              const u = categories.map(c => c.slug === activeCat.slug ? { ...c, enabled: !c.enabled } : c);
              setCategories(u); saveCats(u);
            }} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeCat.enabled ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}>
              {activeCat.enabled ? 'LIVE' : 'PAUSED'}
            </button>
            <button onClick={() => deleteProfile(activeCat.slug)} className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition">Delete</button>
          </div>
        </div>

        {/* R2 folder + max items for non-advert */}
        {activeCat.filterType !== 'advert' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-white/40 mb-1">R2 Folder</label>
              <input value={activeCat.r2Folder || ''} onChange={e => updateCat(activeCat.slug, 'r2Folder', e.target.value)} onBlur={saveCurrent} placeholder="e.g. tgempire/instabaddies" className={INPUT} />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1">Max Items</label>
              <input type="number" value={activeCat.maxItems ?? 3} onChange={e => updateCat(activeCat.slug, 'maxItems', parseInt(e.target.value) || 3)} onBlur={saveCurrent} className={INPUT} />
            </div>
          </div>
        )}

        {/* CTA for random-girl and erogram profiles */}
        {(activeCat.filterType === 'random-girl' || activeCat.filterType === 'erogram') && (
          <div className="space-y-3">
            <label className="block text-[10px] text-white/40 uppercase tracking-wider font-bold">CTA on all R2 stories from this profile</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/40 mb-1">CTA Text</label>
                <input value={activeCat.ctaText || ''} onChange={e => updateCat(activeCat.slug, 'ctaText', e.target.value)} onBlur={saveCurrent} placeholder="e.g. Join Now" className={INPUT} />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">CTA URL</label>
                <input value={activeCat.ctaUrl || ''} onChange={e => updateCat(activeCat.slug, 'ctaUrl', e.target.value)} onBlur={saveCurrent} placeholder="https://..." className={INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Position</label>
                <div className="flex gap-1.5">
                  {(['top', 'middle', 'bottom'] as const).map(p => (
                    <button key={p} onClick={() => { updateCat(activeCat.slug, 'ctaPosition', p, true); }}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition capitalize ${(activeCat.ctaPosition || 'bottom') === p ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'blue', bg: 'linear-gradient(135deg, #2AABEE, #229ED9)' },
                    { id: 'pink', bg: 'linear-gradient(135deg, #f953c6, #b91d73)' },
                    { id: 'gold', bg: 'linear-gradient(135deg, #c9973a, #e8ba5a)' },
                    { id: 'green', bg: 'linear-gradient(135deg, #00b09b, #96c93d)' },
                    { id: 'red', bg: 'linear-gradient(135deg, #ff416c, #ff4b2b)' },
                    { id: 'purple', bg: 'linear-gradient(135deg, #7c3aed, #4f46e5)' },
                    { id: 'orange', bg: 'linear-gradient(135deg, #f97316, #ea580c)' },
                    { id: 'black', bg: 'linear-gradient(135deg, #2d2d2d, #0a0a0a)' },
                  ].map(c => (
                    <button key={c.id} onClick={() => updateCat(activeCat.slug, 'ctaColor', c.id, true)}
                      className={`w-6 h-6 rounded-md transition-all ${(activeCat.ctaColor || 'blue') === c.id ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1a1a1e] scale-110' : 'hover:scale-105'}`}
                      style={{ background: c.bg }} title={c.id} />
                  ))}
                </div>
              </div>
            </div>
            {activeCat.r2Folder && <p className="text-white/20 text-[10px]">Applied to R2 stories from <strong className="text-white/40">{activeCat.r2Folder}</strong></p>}
          </div>
        )}
      </div>

      {/* ── EROGRAM: premium stories generator ── */}
      {activeCat.filterType === 'erogram' && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-0.5">Premium Stories</h4>
              <p className="text-[11px] text-white/30">Auto-drops 2 story slides every 24h showing the latest 8 premium channels (4 per slide), with half-blurred names and an &quot;Unlock Premium&quot; CTA.</p>
            </div>
            <button
              onClick={generatePremiumStories}
              disabled={isGeneratingPremium}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              {isGeneratingPremium ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M13.5 2c-5.629 0-10.212 4.436-10.475 10h-3.025l4.537 5.917 4.463-5.917h-2.975c.26-3.902 3.508-7 7.475-7 4.136 0 7.5 3.364 7.5 7.5s-3.364 7.5-7.5 7.5c-2.381 0-4.502-1.119-5.876-2.854l-1.847 2.449c1.919 2.088 4.664 3.405 7.723 3.405 5.798 0 10.5-4.702 10.5-10.5s-4.702-10.5-10.5-10.5z"/>
                  </svg>
                  Generate Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── EROGRAM: premium-grid slide editor ── */}
      {activeCat.filterType === 'erogram' && (
        <PremiumGridEditor
          slides={slides.filter(s => s.categorySlug === 'erogram' && s.mediaType === 'premium-grid')}
          onUpdate={(id, updates) => id && updateSlide(id, updates)}
          onDelete={(id) => id && deleteSlide(id)}
          onReload={loadData}
        />
      )}

      {/* ── EROGRAM: group stories ── */}
      {activeCat.filterType === 'erogram' && storyGroups.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Group Stories ({storyGroups.length})</h4>
          <div className="space-y-1.5">
            {storyGroups.map(g => (
              <div key={g._id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  <img src={g.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white/70 text-xs font-medium truncate block">{g.name}</span>
                  <span className="text-[10px] text-white/25">{(g.storyViews ?? 0).toLocaleString()} views</span>
                </div>
                <button onClick={() => hideGroup(g._id)} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] hover:bg-red-500/30 transition">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          SYNC R2 + UPLOAD + MEDIA CARDS
         ══════════════════════════════ */}
      <div className="space-y-4">
        {/* Sync R2 button — for profiles with an R2 folder */}
        {activeCat.r2Folder && (
          <SyncR2Button
            categorySlug={activeCat.slug}
            r2Folder={activeCat.r2Folder}
            token={token()}
            onSynced={loadData}
          />
        )}

        {/* Upload zone */}
        <div className={`rounded-xl border-2 border-dashed transition-all p-6 text-center cursor-pointer ${
          dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
        }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple
            className="hidden" onChange={e => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }} />
          {uploadingCount > 0 ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-blue-400 text-sm font-medium">Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span className="text-white/50 text-sm">Drop images & videos here, or click to browse</span>
            </div>
          )}
        </div>

        {/* Media cards — all slides for this profile */}
        {activeSlidesSorted.length === 0 ? (
          <p className="text-center text-white/20 text-sm py-4">
            {activeCat.r2Folder
              ? 'No stories yet. Click "Sync from R2" above to import from your folder.'
              : 'No stories yet. Upload media above.'}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Stories ({activeSlidesSorted.length})</h4>
            </div>
            {activeSlidesSorted.map((slide, i) => (
              <StoryCard key={slide._id} slide={slide} index={i} total={activeSlidesSorted.length}
                isEditing={editingSlideId === slide._id}
                onToggleEdit={() => setEditingSlideId(editingSlideId === slide._id ? null : (slide._id ?? null))}
                onUpdate={u => slide._id && updateSlide(slide._id, u)}
                onDelete={() => slide._id && deleteSlide(slide._id)}
                onMove={d => moveSlide(slide, d)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Story card with inline editing ──
function StoryCard({ slide, index, total, isEditing, onToggleEdit, onUpdate, onDelete, onMove }: {
  slide: StorySlide; index: number; total: number; isEditing: boolean;
  onToggleEdit: () => void; onUpdate: (u: Partial<StorySlide>) => void; onDelete: () => void; onMove: (d: 'up' | 'down') => void;
}) {
  const [cta, setCta] = useState({ text: slide.ctaText || '', url: slide.ctaUrl || '' });
  const [caption, setCaption] = useState(slide.caption || '');
  const [client, setClient] = useState(slide.clientName || '');
  const [ctaPos, setCtaPos] = useState<'top' | 'middle' | 'bottom'>(slide.ctaPosition || 'bottom');
  const [ctaColor, setCtaColor] = useState(slide.ctaColor || 'blue');
  const [overlay, setOverlay] = useState<'none' | 'cta' | 'caption'>(
    slide.ctaText ? 'cta' : slide.caption ? 'caption' : 'none'
  );

  const CTA_COLOR_OPTIONS = [
    { id: 'blue', label: 'Blue', bg: 'linear-gradient(135deg, #2AABEE, #229ED9)' },
    { id: 'pink', label: 'Pink', bg: 'linear-gradient(135deg, #f953c6, #b91d73)' },
    { id: 'gold', label: 'Gold', bg: 'linear-gradient(135deg, #c9973a, #e8ba5a)' },
    { id: 'green', label: 'Green', bg: 'linear-gradient(135deg, #00b09b, #96c93d)' },
    { id: 'red', label: 'Red', bg: 'linear-gradient(135deg, #ff416c, #ff4b2b)' },
    { id: 'purple', label: 'Purple', bg: 'linear-gradient(135deg, #7c3aed, #4f46e5)' },
    { id: 'orange', label: 'Orange', bg: 'linear-gradient(135deg, #f97316, #ea580c)' },
    { id: 'black', label: 'Black', bg: 'linear-gradient(135deg, #2d2d2d, #0a0a0a)' },
  ];

  const pickOverlay = (t: 'none' | 'cta' | 'caption') => {
    setOverlay(t);
    if (t === 'none') { setCta({ text: '', url: '' }); setCaption(''); onUpdate({ ctaText: '', ctaUrl: '', caption: '' }); }
    else if (t === 'cta') { setCaption(''); onUpdate({ caption: '' }); }
    else { setCta({ text: '', url: '' }); onUpdate({ ctaText: '', ctaUrl: '' }); }
  };

  return (
    <div className={`rounded-xl border transition-all ${isEditing ? 'border-blue-500/30 bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03]'}`}>
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={() => onMove('up')} disabled={index === 0} className="p-0.5 text-white/20 hover:text-white disabled:opacity-10 transition">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18,15 12,9 6,15"/></svg>
          </button>
          <span className="text-[9px] text-white/15 text-center font-mono">{index + 1}</span>
          <button onClick={() => onMove('down')} disabled={index === total - 1} className="p-0.5 text-white/20 hover:text-white disabled:opacity-10 transition">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6,9 12,15 18,9"/></svg>
          </button>
        </div>
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0 relative">
          {slide.mediaType === 'video' ? (
            <><video src={slide.mediaUrl} className="w-full h-full object-cover" muted preload="metadata" /><div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded px-1"><svg width="7" height="7" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></>
          ) : <img src={slide.mediaUrl} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${slide.mediaType === 'video' ? 'bg-purple-500/15 text-purple-400' : 'bg-blue-500/15 text-blue-400'}`}>{slide.mediaType}</span>
            {slide.ctaText && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-green-500/15 text-green-400">CTA</span>}
            {slide.caption && !slide.ctaText && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-yellow-500/15 text-yellow-400">Caption</span>}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-white/25">
            <span>{(slide.views ?? 0).toLocaleString()} views</span>
            <span>{(slide.likes ?? 0).toLocaleString()} likes</span>
            {(slide.clicks ?? 0) > 0 && <span className="text-green-400/50">{(slide.clicks ?? 0).toLocaleString()} clicks</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggleEdit} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${isEditing ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
            {isEditing ? 'Done' : 'Edit'}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-red-400/40 hover:bg-red-500/20 hover:text-red-400 transition">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
      {isEditing && (
        <div className="border-t border-white/[0.05] p-4 space-y-3">
          <div>
            <label className="block text-[10px] text-white/30 mb-2 uppercase tracking-wider font-bold">Overlay</label>
            <div className="flex gap-2">
              {(['none', 'cta', 'caption'] as const).map(t => (
                <button key={t} onClick={() => pickOverlay(t)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${overlay === t ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                  {t === 'none' ? 'Nothing' : t === 'cta' ? 'CTA Button' : 'Caption'}
                </button>
              ))}
            </div>
          </div>
          {overlay === 'cta' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-white/30 mb-1">Button Text</label><input value={cta.text} onChange={e => setCta(p => ({...p, text: e.target.value}))} onBlur={() => onUpdate({ ctaText: cta.text, ctaUrl: cta.url })} placeholder="Visit Site" className={INPUT}/></div>
                <div><label className="block text-[10px] text-white/30 mb-1">Button URL</label><input value={cta.url} onChange={e => setCta(p => ({...p, url: e.target.value}))} onBlur={() => onUpdate({ ctaText: cta.text, ctaUrl: cta.url })} placeholder="https://..." className={INPUT}/></div>
              </div>
              <div>
                <label className="block text-[10px] text-white/30 mb-2 uppercase tracking-wider font-bold">Position</label>
                <div className="flex gap-2">
                  {(['top', 'middle', 'bottom'] as const).map(p => (
                    <button key={p} onClick={() => { setCtaPos(p); onUpdate({ ctaPosition: p }); }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition capitalize ${ctaPos === p ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/30 mb-2 uppercase tracking-wider font-bold">Button Color</label>
                <div className="flex flex-wrap gap-2">
                  {CTA_COLOR_OPTIONS.map(c => (
                    <button key={c.id} onClick={() => { setCtaColor(c.id); onUpdate({ ctaColor: c.id }); }}
                      className={`group relative w-8 h-8 rounded-lg transition-all ${ctaColor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1e] scale-110' : 'hover:scale-105'}`}
                      style={{ background: c.bg }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {overlay === 'caption' && (
            <div><label className="block text-[10px] text-white/30 mb-1">Caption</label><textarea value={caption} onChange={e => setCaption(e.target.value)} onBlur={() => onUpdate({ caption })} placeholder="Instagram-style caption text..." rows={2} className={INPUT + ' resize-none'}/></div>
          )}
          {overlay === 'cta' && (
            <div><label className="block text-[10px] text-white/30 mb-1">Caption (shown above CTA)</label><textarea value={caption} onChange={e => setCaption(e.target.value)} onBlur={() => onUpdate({ caption })} placeholder="Optional text above the button..." rows={1} className={INPUT + ' resize-none'}/></div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex-1"><label className="block text-[10px] text-white/30 mb-1">Client Name</label><input value={client} onChange={e => setClient(e.target.value)} onBlur={() => onUpdate({ clientName: client })} placeholder="Optional" className={INPUT}/></div>
            <label className="flex items-center gap-2 text-[11px] text-white/40 cursor-pointer pt-4"><input type="checkbox" checked={slide.enabled} onChange={e => onUpdate({ enabled: e.target.checked })} className="rounded w-3 h-3"/>Enabled</label>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Premium Grid Slide Editor ──
function PremiumGridEditor({
  slides,
  onUpdate,
  onDelete,
  onReload,
}: {
  slides: StorySlide[];
  onUpdate: (id: string | undefined, updates: Partial<StorySlide>) => void;
  onDelete: (id: string | undefined) => void;
  onReload: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PremiumGroupEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function token(): string {
    try { return localStorage.getItem('token') ?? ''; } catch { return ''; }
  }

  const searchGroups = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`/api/vault?search=${encodeURIComponent(q)}&limit=12&premiumOnly=true`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const groups = (res.data?.groups || []).map((g: any) => ({
          name: g.name || '',
          slug: g.slug || '',
          image: g.image || '',
          memberCount: g.memberCount || 0,
          category: g.category || '',
        }));
        setSearchResults(groups);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const replaceGroup = async (slide: StorySlide, idx: number, newGroup: PremiumGroupEntry) => {
    const updated = [...(slide.premiumGroups || [])];
    updated[idx] = newGroup;
    try {
      await axios.put(`/api/admin/story-content/${slide._id}`, { premiumGroups: updated }, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      onReload();
    } catch (err) {
      console.error('Replace group failed:', err);
    }
    setReplacingIdx(null);
    setEditingSlideId(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeGroup = async (slide: StorySlide, idx: number) => {
    const updated = (slide.premiumGroups || []).filter((_, i) => i !== idx);
    try {
      await axios.put(`/api/admin/story-content/${slide._id}`, { premiumGroups: updated }, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      onReload();
    } catch (err) {
      console.error('Remove group failed:', err);
    }
  };

  const addGroup = async (slide: StorySlide, newGroup: PremiumGroupEntry) => {
    if ((slide.premiumGroups || []).length >= 4) return;
    const updated = [...(slide.premiumGroups || []), newGroup];
    try {
      await axios.put(`/api/admin/story-content/${slide._id}`, { premiumGroups: updated }, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      onReload();
    } catch (err) {
      console.error('Add group failed:', err);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateCaption = async (slide: StorySlide, caption: string) => {
    try {
      await axios.put(`/api/admin/story-content/${slide._id}`, { caption }, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      onReload();
    } catch (err) {
      console.error('Update caption failed:', err);
    }
  };

  const fmtNum = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(n>=10_000?0:1)+'K' : String(n);

  if (slides.length === 0) {
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Premium Story Slides</h4>
        <p className="text-white/30 text-sm">No premium-grid slides yet. Click &quot;Generate Now&quot; above to create them from your favourited vault groups.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Premium Story Slides ({slides.length})</h4>
        <p className="text-[10px] text-white/25">Click any group to replace it, or use + to add</p>
      </div>

      {slides.map(slide => {
        const groups = slide.premiumGroups || [];
        const isEditing = editingSlideId === slide._id;

        return (
          <div key={slide._id} className={`rounded-xl border p-3 space-y-3 transition-all ${isEditing ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            {/* Slide header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-purple-500/20 text-purple-400">GRID</span>
                <input
                  className="bg-transparent text-white/80 text-sm font-semibold outline-none border-b border-transparent focus:border-white/20 transition flex-1 min-w-0"
                  defaultValue={slide.caption || ''}
                  onBlur={e => { if (e.target.value !== slide.caption) updateCaption(slide, e.target.value); }}
                  placeholder="Slide caption..."
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-white/20">{(slide.views ?? 0).toLocaleString()} views</span>
                <button
                  onClick={() => setEditingSlideId(isEditing ? null : (slide._id ?? null))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${isEditing ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  {isEditing ? 'Done' : 'Edit Groups'}
                </button>
                <button onClick={() => onDelete(slide._id)} className="p-1 rounded-lg text-red-400/40 hover:bg-red-500/20 hover:text-red-400 transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>

            {/* Group grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {groups.map((g, idx) => (
                <div
                  key={`${g.slug}-${idx}`}
                  onClick={() => {
                    if (isEditing) { setReplacingIdx(idx); setSearchQuery(''); setSearchResults([]); }
                  }}
                  className={`rounded-lg overflow-hidden border transition-all ${
                    isEditing
                      ? replacingIdx === idx
                        ? 'border-purple-500 ring-1 ring-purple-500/50'
                        : 'border-white/10 cursor-pointer hover:border-purple-500/40'
                      : 'border-white/[0.06]'
                  }`}
                >
                  <div className="relative aspect-square bg-white/5">
                    {g.image ? (
                      <img src={g.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-2xl">?</div>
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
                    {isEditing && (
                      <button
                        onClick={e => { e.stopPropagation(); removeGroup(slide, idx); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition"
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-1.5">
                      <p className="text-[9px] font-bold text-white truncate leading-tight">{g.name}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-orange-400">{fmtNum(g.memberCount)}</span>
                        <span className="text-[7px] text-white/40">· {g.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add slot if < 4 groups */}
              {isEditing && groups.length < 4 && (
                <div
                  onClick={() => { setReplacingIdx(null); setSearchQuery(''); setSearchResults([]); }}
                  className="rounded-lg border-2 border-dashed border-white/10 hover:border-purple-500/30 aspect-square flex items-center justify-center cursor-pointer transition-all"
                >
                  <div className="text-center">
                    <svg className="mx-auto mb-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span className="text-[9px] text-purple-400/60 font-medium">Add Group</span>
                  </div>
                </div>
              )}
            </div>

            {/* Search to replace/add */}
            {isEditing && (
              <div className="space-y-2">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input
                    value={searchQuery}
                    onChange={e => searchGroups(e.target.value)}
                    placeholder="Search vault groups to add/replace..."
                    className={INPUT + ' pl-8'}
                    autoFocus
                  />
                  {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />}
                </div>

                {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {searchResults.map(g => (
                      <div
                        key={g.slug}
                        onClick={() => {
                          if (replacingIdx !== null) {
                            replaceGroup(slide, replacingIdx, g);
                          } else {
                            addGroup(slide, g);
                          }
                        }}
                        className="rounded-lg overflow-hidden border border-white/10 hover:border-green-500/40 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <div className="relative aspect-square bg-white/5">
                          {g.image ? (
                            <img src={g.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10">?</div>
                          )}
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
                          <div className="absolute top-1 right-1">
                            <div className="w-4 h-4 rounded-full bg-green-500/80 flex items-center justify-center">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-1.5">
                            <p className="text-[9px] font-bold text-white truncate">{g.name}</p>
                            <span className="text-[8px] text-orange-400 font-bold">{fmtNum(g.memberCount)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {replacingIdx !== null && (
                  <p className="text-[10px] text-purple-400">
                    Replacing slot {replacingIdx + 1} — search and click a group above to swap it in
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sync R2 Folder button ──
function SyncR2Button({ categorySlug, r2Folder, token, onSynced }: {
  categorySlug: string; r2Folder: string; token: string; onSynced: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ created: number; existing: number; total: number } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await syncR2Stories(token, categorySlug, r2Folder);
      setResult(res);
      onSynced();
      setTimeout(() => setResult(null), 5000);
    } catch (err: any) {
      setResult({ created: -1, existing: 0, total: 0 });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-0.5">R2 Folder</h4>
          <p className="text-[11px] text-white/30">
            Import files from <strong className="text-white/50">{r2Folder}</strong> as individual story slides you can edit.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {result && (
            <span className={`text-xs ${result.created >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {result.created >= 0
                ? `${result.created} new, ${result.existing} existing`
                : 'Sync failed'}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition active:scale-[0.97] bg-blue-600 hover:bg-blue-700"
          >
            {syncing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M13.5 2c-5.629 0-10.212 4.436-10.475 10h-3.025l4.537 5.917 4.463-5.917h-2.975c.26-3.902 3.508-7 7.475-7 4.136 0 7.5 3.364 7.5 7.5s-3.364 7.5-7.5 7.5c-2.381 0-4.502-1.119-5.876-2.854l-1.847 2.449c1.919 2.088 4.664 3.405 7.723 3.405 5.798 0 10.5-4.702 10.5-10.5s-4.702-10.5-10.5-10.5z"/>
                </svg>
                Sync from R2
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
