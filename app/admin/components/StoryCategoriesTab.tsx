'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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
  verified?: boolean;
  r2Folder?: string;
}

interface StorySlide {
  _id?: string;
  categorySlug: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  ctaText: string;
  ctaUrl: string;
  duration: number;
  expiresAt: string | null;
  enabled: boolean;
  clientName: string;
  sortOrder: number;
  createdAt?: string;
  views?: number;
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

const inputClass = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition';

function ProfileImageUpload({
  currentUrl,
  label,
  onUploaded,
  onClear,
  readToken,
}: {
  currentUrl: string;
  label: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
  readToken: () => string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post('/api/upload', form, {
        headers: { Authorization: `Bearer ${readToken()}` },
      });
      if (res.data?.url) onUploaded(res.data.url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Preview circle */}
      <div
        className={`relative w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-white/15 text-2xl font-bold">
            {(label || '?')[0]}
          </span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="relative cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          {uploading ? 'Uploading...' : 'Upload Photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
        {currentUrl && (
          <button
            onClick={onClear}
            className="text-[10px] text-red-400/60 hover:text-red-400 transition text-left"
          >
            Remove photo
          </button>
        )}
        <p className="text-[10px] text-white/20">Drop image or click to upload</p>
      </div>
    </div>
  );
}

export default function StoryCategoriesTab() {
  const [categories, setCategories] = useState<StoryCategoryConfig[]>([]);
  const [slides, setSlides] = useState<StorySlide[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string>('erogram');
  const [slideForm, setSlideForm] = useState<Partial<StorySlide>>({});
  const [showSlideForm, setShowSlideForm] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function readToken(): string {
    try { return localStorage.getItem('token') ?? ''; } catch { return ''; }
  }

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = readToken();
      const [configRes, slidesRes, groupsRes] = await Promise.all([
        axios.get('/api/admin/site-config', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/story-content', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/story-groups', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { groups: [] } })),
      ]);
      const gs = configRes.data?.generalSettings || {};
      const saved: StoryCategoryConfig[] = Array.isArray(gs.storyCategories) ? gs.storyCategories : [];
      const usedSlugs = new Set<string>();
      const merged = DEFAULT_CATEGORIES.map(def => {
        usedSlugs.add(def.slug);
        const s = saved.find((c: any) => c.slug === def.slug);
        return s ? { ...def, ...s, filterType: def.filterType } : def;
      });
      for (const cat of saved) {
        if (cat?.slug && !usedSlugs.has(cat.slug)) {
          merged.push(cat);
        }
      }
      setCategories(merged);
      setSlides(slidesRes.data || []);
      setStoryGroups(groupsRes.data?.groups || []);
    } catch (err) {
      console.error('Failed to load story config:', err);
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveCategories = async (cats?: StoryCategoryConfig[]) => {
    const toSave = cats ?? categories;
    try {
      setIsSaving(true);
      setSaveMessage(null);
      const token = readToken();
      if (!token) {
        setSaveMessage({ type: 'error', text: 'Not logged in — please refresh the page and log in again' });
        return;
      }
      const res = await axios.put('/api/admin/site-config', {
        generalSettings: { storyCategories: toSave },
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 200) {
        setCategories(toSave);
        setSaveMessage({ type: 'success', text: 'Saved!' });
      }
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      console.error('Save failed:', err);
      const status = err?.response?.status;
      if (status === 401) {
        setSaveMessage({ type: 'error', text: 'Session expired — please refresh and log in again' });
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Save failed';
        setSaveMessage({ type: 'error', text: msg });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateCategory = (slug: string, field: string, value: string | boolean | number) => {
    const updated = categories.map(c => c.slug === slug ? { ...c, [field]: value } : c);
    setCategories(updated);
  };

  const addProfile = () => {
    const num = categories.filter(c => c.filterType === 'random-girl').length + 1;
    const slug = `random-girl-${Date.now()}`;
    const newCat: StoryCategoryConfig = {
      slug,
      label: `Girl ${num + 1}`,
      enabled: true,
      profileImage: '',
      filterType: 'random-girl',
      filterValue: '',
      sortOrder: categories.length,
      maxItems: 3,
      r2Folder: 'tgempire/instabaddies',
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    setActiveSlug(slug);
  };

  const isDefaultSlug = (slug: string) => DEFAULT_CATEGORIES.some(d => d.slug === slug);

  const removeProfile = (slug: string) => {
    if (isDefaultSlug(slug)) { alert('Cannot remove default profiles.'); return; }
    if (!confirm('Remove this profile? This cannot be undone.')) return;
    const updated = categories.filter(c => c.slug !== slug);
    setCategories(updated);
    if (activeSlug === slug) setActiveSlug(categories[0]?.slug || 'erogram');
    saveCategories(updated);
  };

  const activeCat = categories.find(c => c.slug === activeSlug);
  const activeSlides = slides.filter(s => s.categorySlug === activeSlug);

  const saveSlide = async () => {
    try {
      const token = readToken();
      if (slideForm._id) {
        await axios.put(`/api/admin/story-content/${slideForm._id}`, slideForm, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/admin/story-content', { ...slideForm, categorySlug: activeSlug }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowSlideForm(false);
      setSlideForm({});
      loadData();
    } catch (err) {
      console.error('Save slide failed:', err);
    }
  };

  const deleteSlide = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    try {
      const token = readToken();
      await axios.delete(`/api/admin/story-content/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const hideGroupFromStories = async (groupId: string) => {
    if (!confirm('Hide this group from stories? It sets hideFromStories=true on the group.')) return;
    try {
      const token = readToken();
      await axios.post('/api/admin/story-groups/hide', { groupId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStoryGroups(prev => prev.filter(g => g._id !== groupId));
    } catch (err) {
      console.error('Hide from stories failed:', err);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-white/50">Loading stories config...</div>;
  }

  const typeLabels: Record<string, string> = {
    erogram: 'Newest groups + announcements',
    'random-girl': 'Random R2 media (girl story)',
    advert: 'Ad spot (client rotation)',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Stories Management</h2>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {saveMessage.text}
            </span>
          )}
          <button
            onClick={() => saveCategories()}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <p className="text-white/40 text-sm">
        Story circles: EROGRAM, AI GF, and as many girl profiles as you want. Edit settings per profile and manage content below.
      </p>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 items-center">
        {categories.map(cat => (
          <button
            key={cat.slug}
            onClick={() => setActiveSlug(cat.slug)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeSlug === cat.slug
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat.label || cat.slug}
            {cat.verified && <span className="ml-1 text-blue-400">✓</span>}
          </button>
        ))}
        <button
          onClick={addProfile}
          className="px-3 py-2 rounded-lg bg-green-600/20 text-green-400 text-sm font-medium hover:bg-green-600/30 transition whitespace-nowrap"
        >
          + Add Profile
        </button>
      </div>

      {/* Active category settings */}
      {activeCat && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{activeCat.label}</h3>
            <span className="px-2 py-1 rounded bg-white/10 text-white/50 text-xs">{typeLabels[activeCat.filterType]}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Display Label</label>
              <input
                value={activeCat.label}
                onChange={e => updateCategory(activeCat.slug, 'label', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Profile Photo</label>
              <ProfileImageUpload
                currentUrl={activeCat.profileImage}
                label={activeCat.label}
                onUploaded={(url) => {
                  const updated = categories.map(c => c.slug === activeCat.slug ? { ...c, profileImage: url } : c);
                  updateCategory(activeCat.slug, 'profileImage', url);
                  saveCategories(updated);
                }}
                onClear={() => {
                  const updated = categories.map(c => c.slug === activeCat.slug ? { ...c, profileImage: '' } : c);
                  updateCategory(activeCat.slug, 'profileImage', '');
                  saveCategories(updated);
                }}
                readToken={readToken}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">R2 Folder</label>
              <input
                value={activeCat.r2Folder || ''}
                onChange={e => updateCategory(activeCat.slug, 'r2Folder', e.target.value)}
                placeholder="e.g. tgempire/instabaddies"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Max Items</label>
              <input
                type="number"
                value={activeCat.maxItems ?? 3}
                onChange={e => updateCategory(activeCat.slug, 'maxItems', parseInt(e.target.value) || 3)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">CTA Text</label>
              <input
                value={activeCat.ctaText || ''}
                onChange={e => updateCategory(activeCat.slug, 'ctaText', e.target.value)}
                placeholder="e.g. Try AI Girlfriend"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">CTA URL</label>
              <input
                value={activeCat.ctaUrl || ''}
                onChange={e => updateCategory(activeCat.slug, 'ctaUrl', e.target.value)}
                placeholder="/bots or https://..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={activeCat.enabled}
                  onChange={e => updateCategory(activeCat.slug, 'enabled', e.target.checked)}
                  className="rounded"
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={activeCat.verified || false}
                  onChange={e => updateCategory(activeCat.slug, 'verified', e.target.checked)}
                  className="rounded"
                />
                Verified badge
              </label>
            </div>
            {!isDefaultSlug(activeCat.slug) && (
              <button
                onClick={() => removeProfile(activeCat.slug)}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition"
              >
                Remove Profile
              </button>
            )}
          </div>
        </div>
      )}

      {/* Random girl: just show R2 folder info, no slides needed */}
      {activeCat?.filterType === 'random-girl' && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
          <h3 className="text-base font-semibold text-white">Content Source</h3>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">{activeCat.r2Folder || 'tgempire/instabaddies'}</p>
              <p className="text-white/30 text-xs mt-0.5">
                Videos and images are picked randomly from this R2 folder each page load. Display name uses the label above (e.g. Vicky, Carla).
              </p>
            </div>
          </div>
          <p className="text-white/20 text-[10px]">To change content, upload files directly to the R2 folder above. No slides to manage here.</p>
        </div>
      )}

      {/* EROGRAM and AI GF: slide management */}
      {activeCat?.filterType !== 'random-girl' && (
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            Content Slides — {activeCat?.label}
          </h3>
          <button
            onClick={() => {
              setSlideForm({
                mediaType: 'video',
                mediaUrl: '',
                ctaText: '',
                ctaUrl: '',
                duration: activeCat?.filterType === 'advert' ? 0 : 24,
                enabled: true,
                clientName: '',
                sortOrder: activeSlides.length,
              });
              setShowSlideForm(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition"
          >
            + Add Slide
          </button>
        </div>

        {activeCat?.filterType === 'erogram' && (
          <>
          <p className="text-white/30 text-xs">
            EROGRAM auto-fetches newest groups from DB. Add slides here for announcements (set duration up to 168h = 7 days).
          </p>

          {/* Current group stories from DB */}
          {storyGroups.length > 0 && (
            <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4 space-y-2">
              <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                Current Group Stories ({storyGroups.length})
              </h4>
              <div className="space-y-1.5">
                {storyGroups.map(g => (
                  <div key={g._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      <img src={g.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png'; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white/80 text-sm font-medium truncate">{g.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400">{g.category}</span>
                        {g.premiumOnly && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400">VAULT</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-white/30 mt-0.5">
                        <span>{new Date(g.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="flex items-center gap-1 text-blue-400/60">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                          {(g.storyViews ?? 0).toLocaleString()} story views
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => hideGroupFromStories(g._id)}
                      className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition shrink-0"
                      title="Hide from stories"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}
        {activeCat?.filterType === 'advert' && (
          <p className="text-white/30 text-xs">
            AI GF ad spot: add up to 4 client slides. Each slide rotates. Duration = 0 means no expiry (ongoing).
          </p>
        )}

        {activeSlides.length === 0 ? (
          <div className="text-center py-8 text-white/20 text-sm">No content slides yet</div>
        ) : (
          <div className="space-y-2">
            {activeSlides.map(s => (
              <div key={s._id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  {s.mediaType === 'video' ? (
                    <video src={s.mediaUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={s.mediaUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white/80 text-sm font-medium truncate">{s.mediaUrl.split('/').pop()}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${s.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {s.enabled ? 'Active' : 'Off'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/30 mt-0.5">
                    <span>{s.mediaType}</span>
                    <span>{s.duration === 0 ? 'No expiry' : `${s.duration}h`}</span>
                    {s.clientName && <span>Client: {s.clientName}</span>}
                    {s.ctaText && <span>CTA: {s.ctaText}</span>}
                    <span className="flex items-center gap-1 text-blue-400/60">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                      {(s.views ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setSlideForm(s); setShowSlideForm(true); }}
                    className="px-2 py-1 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => s._id && deleteSlide(s._id)}
                    className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Slide form modal */}
      {showSlideForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSlideForm(false)}>
          <div className="bg-[#1a1a1e] rounded-xl border border-white/10 p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">{slideForm._id ? 'Edit Slide' : 'Add Slide'}</h3>

            <div>
              <label className="block text-xs text-white/50 mb-1">Media URL (R2 public URL)</label>
              <input
                value={slideForm.mediaUrl || ''}
                onChange={e => setSlideForm(f => ({ ...f, mediaUrl: e.target.value }))}
                placeholder="https://pub-xxx.r2.dev/stories/AI-GF/video.mp4"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Media Type</label>
                <select
                  value={slideForm.mediaType || 'video'}
                  onChange={e => setSlideForm(f => ({ ...f, mediaType: e.target.value as 'image' | 'video' }))}
                  className={inputClass}
                >
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Duration (hours, 0 = no expiry)</label>
                <input
                  type="number"
                  value={slideForm.duration ?? 24}
                  onChange={e => setSlideForm(f => ({ ...f, duration: parseInt(e.target.value) || 0 }))}
                  min={0}
                  max={168}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">CTA Text</label>
                <input
                  value={slideForm.ctaText || ''}
                  onChange={e => setSlideForm(f => ({ ...f, ctaText: e.target.value }))}
                  placeholder="e.g. Visit Site"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">CTA URL</label>
                <input
                  value={slideForm.ctaUrl || ''}
                  onChange={e => setSlideForm(f => ({ ...f, ctaUrl: e.target.value }))}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            </div>

            {activeCat?.filterType === 'advert' && (
              <div>
                <label className="block text-xs text-white/50 mb-1">Client Name</label>
                <input
                  value={slideForm.clientName || ''}
                  onChange={e => setSlideForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="e.g. DreamGF"
                  className={inputClass}
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={slideForm.enabled ?? true}
                  onChange={e => setSlideForm(f => ({ ...f, enabled: e.target.checked }))}
                  className="rounded"
                />
                Enabled
              </label>
              <div>
                <label className="block text-xs text-white/50 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={slideForm.sortOrder ?? 0}
                  onChange={e => setSlideForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className={inputClass + ' w-20'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowSlideForm(false); setSlideForm({}); }}
                className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveSlide}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
              >
                {slideForm._id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help info */}
      <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-4 space-y-2">
        <h4 className="text-sm font-bold text-blue-400">How Stories Work</h4>
        <ul className="text-xs text-white/40 space-y-1">
          <li><strong className="text-white/60">EROGRAM</strong> — Auto-shows newest groups (24h). Add announcement slides with custom duration (up to 7 days).</li>
          <li><strong className="text-white/60">Random Girl</strong> — Picks random name + random media from R2 folder each page load. Optional CTA.</li>
          <li><strong className="text-white/60">AI GF</strong> — Ad spot: add up to 4 client slides with CTA. No time limit. Rotation.</li>
          <li><strong className="text-white/60">Video specs</strong> — MP4 H.264, 720x1280, under 1MB. Use <code className="text-blue-300/60">ffmpeg -i in.mp4 -vf &quot;scale=720:1280&quot; -c:v libx264 -crf 30 -an -movflags +faststart -t 10 out.mp4</code></li>
        </ul>
      </div>
    </div>
  );
}
