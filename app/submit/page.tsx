'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Star, Send, Search, Users, Heart, Image, Film, FileText, MapPin, DollarSign, Calendar, Globe, ShieldCheck, Layers, Zap, Crown } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { submitCreator, searchCreatorByUsername, fetchCreatorFromApify, createFeaturedCreatorInvoice } from '@/lib/actions/submitCreator';
import type { CreatorLookupResult } from '@/lib/actions/submitCreator';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';

const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#00AFF0]/50 focus:ring-1 focus:ring-[#00AFF0]/30 transition-all';

const CATEGORY_OPTIONS = [
  'Asian','Blonde','Teen','MILF','Amateur','Redhead','Goth','Petite',
  'Big Ass','Big Boobs','Brunette','Latina','Ahegao','Alt','Cosplay',
  'Fitness','Tattoo','Curvy','Ebony','Feet','Lingerie','Thick','Streamer','Piercing',
];

const MAX_PHOTOS = 8;

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/[0.04]">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] text-gray-500 leading-none">{label}</div>
        <div className="text-xs font-black text-white truncate">{value}</div>
      </div>
    </div>
  );
}

function formatJoinDate(raw: string): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return raw;
  }
}

export default function SubmitCreatorPage() {
  const { t } = useTranslation();
  const lp = useLocalePath();

  const [name, setName] = useState('');
  const [onlyfansUrl, setOnlyfansUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [location, setLocation] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [customCat, setCustomCat] = useState('');
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [fetchedImages, setFetchedImages] = useState<{ url: string; label: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingFeatured, setSubmittingFeatured] = useState(false);
  const [result, setResult] = useState<{ success: boolean; slug?: string; id?: string; error?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [suggestions, setSuggestions] = useState<CreatorLookupResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [populated, setPopulated] = useState(false);
  const [fetchedProfile, setFetchedProfile] = useState<CreatorLookupResult | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const IMPORT_STEPS = [
    { label: t('submitCreator.connectingOf'), pct: 10 },
    { label: t('submitCreator.importingProfile'), pct: 25 },
    { label: t('submitCreator.importingPhotos'), pct: 45 },
    { label: t('submitCreator.addingPricing'), pct: 65 },
    { label: t('submitCreator.detectingCats'), pct: 80 },
    { label: t('submitCreator.finalizing'), pct: 92 },
  ];

  const populateFromResult = useCallback((r: CreatorLookupResult) => {
    setName(r.name);
    setOnlyfansUrl(`https://onlyfans.com/${r.username}`);
    setWebsite(r.website || '');
    setDescription(r.bio || '');
    setInstagram(r.instagramUrl || '');
    setTwitter(r.twitterUrl || '');
    setTelegram(r.telegramUrl || '');
    setTiktok(r.tiktokUrl || '');
    setLocation(r.location || '');
    setPrice(r.isFree ? 'Free' : r.price > 0 ? String(r.price) : '');
    if (r.categories?.length) setCategories(r.categories);

    const imgs: { url: string; label: string }[] = [];
    if (r.avatar) imgs.push({ url: r.avatar, label: 'Profile' });
    if (r.header) imgs.push({ url: r.header, label: 'Banner' });
    setFetchedImages(imgs);

    setFetchedProfile(r);
    setPopulated(true);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    setPopulated(false);
    setFetchedProfile(null);

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCreatorByUsername(val.trim());
        setSuggestions(results);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleImportFromOnlyFans = async () => {
    const usernameFromUrl = onlyfansUrl.match(/onlyfans\.com\/([a-zA-Z0-9._-]+)/)?.[1];
    const query = usernameFromUrl || name.trim().toLowerCase().replace(/\s+/g, '');
    if (!query) return;

    setImporting(true);
    setImportProgress(0);
    setImportStep(IMPORT_STEPS[0].label);

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx++;
      if (stepIdx < IMPORT_STEPS.length) {
        setImportStep(IMPORT_STEPS[stepIdx].label);
        setImportProgress(IMPORT_STEPS[stepIdx].pct);
      }
    }, 7000);

    try {
      const result = await fetchCreatorFromApify(query);
      clearInterval(stepInterval);
      if (result) {
        setImportStep(t('submitCreator.importComplete'));
        setImportProgress(100);
        populateFromResult(result);
        setTimeout(() => setImporting(false), 800);
      } else {
        setImportStep(t('submitCreator.noProfileFound'));
        setImportProgress(0);
        setTimeout(() => setImporting(false), 2000);
      }
    } catch {
      clearInterval(stepInterval);
      setImportStep(t('submitCreator.importFailed'));
      setImportProgress(0);
      setTimeout(() => setImporting(false), 2000);
    }
  };

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const newPhotos = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remaining)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeFetchedImage = (idx: number) => {
    setFetchedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const addCustomCategory = () => {
    const val = customCat.trim().toLowerCase().replace(/\s+/g, '-');
    if (val && !categories.includes(val)) {
      setCategories((prev) => [...prev, val]);
    }
    setCustomCat('');
  };

  const knownCatSlugs = CATEGORY_OPTIONS.map((c) => c.toLowerCase().replace(/\s+/g, '-'));
  const extraCategories = categories.filter((c) => !knownCatSlugs.includes(c));

  const uploadPhoto = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  };

  const totalImages = fetchedImages.length + photos.length;
  const hasImages = totalImages > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !onlyfansUrl.trim() || !description.trim() || !hasImages) return;

    setSubmitting(true);
    setResult(null);

    try {
      setUploading(true);
      const uploadedUrls = await Promise.all(photos.map((p) => uploadPhoto(p.file)));
      setUploading(false);

      const allPhotoUrls = [
        ...fetchedImages.map((fi) => fi.url),
        ...uploadedUrls,
      ];

      const res = await submitCreator({
        name: name.trim(),
        onlyfansUrl: onlyfansUrl.trim(),
        website: website.trim(),
        description: description.trim(),
        photoUrls: allPhotoUrls,
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        telegram: telegram.trim(),
        tiktok: tiktok.trim(),
        location: location.trim(),
        categories,
        price: price.trim(),
        ...(fetchedProfile ? {
          subscriberCount: fetchedProfile.subscriberCount,
          likesCount: fetchedProfile.likesCount,
          photosCount: fetchedProfile.photosCount,
          videosCount: fetchedProfile.videosCount,
          postsCount: fetchedProfile.postsCount,
        } : {}),
      });
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Something went wrong.' });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleSubmitFeatured = async () => {
    if (!isValid || submitting || submittingFeatured) return;

    setSubmittingFeatured(true);
    setResult(null);

    try {
      setUploading(true);
      const uploadedUrls = await Promise.all(photos.map((p) => uploadPhoto(p.file)));
      setUploading(false);

      const allPhotoUrls = [
        ...fetchedImages.map((fi) => fi.url),
        ...uploadedUrls,
      ];

      const res = await submitCreator({
        name: name.trim(),
        onlyfansUrl: onlyfansUrl.trim(),
        website: website.trim(),
        description: description.trim(),
        photoUrls: allPhotoUrls,
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        telegram: telegram.trim(),
        tiktok: tiktok.trim(),
        location: location.trim(),
        categories,
        price: price.trim(),
        ...(fetchedProfile ? {
          subscriberCount: fetchedProfile.subscriberCount,
          likesCount: fetchedProfile.likesCount,
          photosCount: fetchedProfile.photosCount,
          videosCount: fetchedProfile.videosCount,
          postsCount: fetchedProfile.postsCount,
        } : {}),
      });

      if (!res.success || !res.id) {
        setResult({ success: false, error: res.error || 'Failed to create profile.' });
        return;
      }

      const invoiceRes = await createFeaturedCreatorInvoice(res.id);
      if (invoiceRes.error || !invoiceRes.url) {
        setResult({ success: true, slug: res.slug, id: res.id, error: invoiceRes.error });
        return;
      }

      window.location.href = invoiceRes.url;
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Something went wrong.' });
    } finally {
      setSubmittingFeatured(false);
      setUploading(false);
    }
  };

  const isValid = name.trim() && onlyfansUrl.trim() && description.trim().length >= 20 && hasImages && categories.length > 0;

  return (
    <div className="min-h-screen bg-[#0a1117]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00AFF0]/10 border border-[#00AFF0]/25 text-[#00AFF0] text-xs font-bold mb-4">
            <Star className="w-3.5 h-3.5" />
            {t('submitCreator.badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
            {t('submitCreator.title')}
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            {t('submitCreator.subtitle')}
          </p>
        </div>

        {result?.success ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-black text-white mb-2">{t('submitCreator.successTitle')}</h2>
              <p className="text-gray-300 text-sm mb-6">
                {t('submitCreator.successDesc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={lp(`/${result.slug}`)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white font-black text-sm shadow-md hover:shadow-lg transition-all"
                >
                  {t('submitCreator.viewProfile')}
                </Link>
                <Link
                  href={lp('/onlyfanssearch')}
                  className="px-6 py-3 rounded-xl border border-[#00AFF0]/25 text-[#00AFF0] font-bold text-sm hover:bg-[#00AFF0]/10 transition-all"
                >
                  {t('submitCreator.backToSearch')}
                </Link>
              </div>
            </div>

            {result.id && (
              <button
                type="button"
                onClick={async () => {
                  setSubmittingFeatured(true);
                  try {
                    const invoiceRes = await createFeaturedCreatorInvoice(result.id!);
                    if (invoiceRes.url) {
                      window.location.href = invoiceRes.url;
                    } else {
                      setResult((prev) => prev ? { ...prev, error: invoiceRes.error } : prev);
                    }
                  } finally {
                    setSubmittingFeatured(false);
                  }
                }}
                disabled={submittingFeatured}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 rounded-2xl transition-all disabled:opacity-60 active:translate-y-[2px]"
                style={{
                  background: 'linear-gradient(160deg, #1a0a00 0%, #3d1800 30%, #6b2f00 60%, #FF6A00 100%)',
                  border: '3px solid #FF6A00',
                  boxShadow: '5px 5px 0px #FF6A00',
                }}
              >
                {submittingFeatured ? (
                  <div className="w-full flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span className="text-[15px] font-black uppercase tracking-widest text-white">{t('submitCreator.creatingPayment')}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6A00]/30 flex items-center justify-center shrink-0">
                        <Crown className="w-5 h-5 text-[#FFB800]" />
                      </div>
                      <div className="text-left leading-tight">
                        <span className="block text-[1.1rem] font-black uppercase tracking-wider text-white">{t('submitCreator.getFeatured')}</span>
                        <span className="block text-xs font-bold text-orange-300/80 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {t('submitCreator.getFeaturedDesc')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 leading-tight">
                      <span className="block text-2xl font-black text-white">$97</span>
                    </div>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {result?.error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {result.error}
              </div>
            )}

            {/* Required fields */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('submitCreator.required')}</h2>

              <div className="relative">
                <label className="block text-sm font-bold text-white mb-1">{t('submitCreator.nameLabel')} <span className="text-red-400">*</span></label>
                <p className="text-[11px] text-gray-500 mb-2">{t('submitCreator.nameHint')}</p>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={t('submitCreator.namePlaceholder')}
                    className={inputClass}
                    disabled={importing}
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-[#00AFF0] animate-spin" />
                    </div>
                  )}
                </div>

                {/* Autocomplete — found in DB */}
                {showSuggestions && suggestions.length > 0 && !importing && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl bg-[#0d1a24] border border-white/10 shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.username}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); populateFromResult(s); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors text-left"
                      >
                        {s.avatar && (
                          <img src={s.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{s.name}</div>
                          <div className="text-xs text-gray-500 truncate">@{s.username}</div>
                        </div>
                        <span className="ml-auto text-[10px] font-bold text-emerald-400/70 uppercase shrink-0">{t('submitCreator.inDatabase')}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Not in DB — offer to import from OnlyFans */}
                {showSuggestions && suggestions.length === 0 && !searching && name.trim().length >= 2 && !populated && !importing && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl bg-[#0d1a24] border border-white/10 shadow-xl overflow-hidden">
                    <div className="px-4 py-3 text-xs text-gray-400">
                      {t('submitCreator.notInDb')}
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setShowSuggestions(false); handleImportFromOnlyFans(); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-[#00AFF0] hover:bg-[#00AFF0]/[0.06] transition-colors border-t border-white/[0.06]"
                    >
                      <Search className="w-4 h-4" /> {t('submitCreator.importFrom').replace('{name}', name.trim())}
                    </button>
                  </div>
                )}

                {/* Import progress bar */}
                {importing && (
                  <div className="mt-3 rounded-xl bg-[#0d1a24] border border-[#00AFF0]/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-[#00AFF0] animate-spin shrink-0" />
                      <span className="text-sm font-bold text-white">{t('submitCreator.importingFrom')}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] transition-all duration-700 ease-out"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    {/* Animated step label */}
                    <p className="text-xs text-[#00AFF0] font-semibold animate-pulse">{importStep}</p>
                  </div>
                )}

                {/* Success badge */}
                {populated && !importing && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('submitCreator.profileImported')}
                  </div>
                )}
              </div>

              {/* Fetched profile stats — only visible after import/select, NOT on manual fill */}
              {populated && fetchedProfile && (
                <div className="rounded-xl border border-[#00AFF0]/15 bg-[#00AFF0]/[0.04] p-4 space-y-3">
                  <h3 className="text-xs font-black text-[#00AFF0] uppercase tracking-wider">{t('submitCreator.importedData')}</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    <StatCell icon={<Users className="w-3.5 h-3.5 text-[#00AFF0]" />} label={t('submitCreator.username')} value={`@${fetchedProfile.username}`} />
                    {fetchedProfile.likesCount > 0 && <StatCell icon={<Heart className="w-3.5 h-3.5 text-pink-400" />} label={t('submitCreator.totalLikes')} value={fetchedProfile.likesCount.toLocaleString()} />}
                    {fetchedProfile.mediaCount > 0 && <StatCell icon={<Layers className="w-3.5 h-3.5 text-teal-400" />} label={t('submitCreator.totalMedia')} value={fetchedProfile.mediaCount.toLocaleString()} />}
                    {fetchedProfile.photosCount > 0 && <StatCell icon={<Image className="w-3.5 h-3.5 text-emerald-400" />} label={t('submitCreator.photos')} value={fetchedProfile.photosCount.toLocaleString()} />}
                    {fetchedProfile.videosCount > 0 && <StatCell icon={<Film className="w-3.5 h-3.5 text-purple-400" />} label={t('submitCreator.videos')} value={fetchedProfile.videosCount.toLocaleString()} />}
                    {fetchedProfile.postsCount > 0 && <StatCell icon={<FileText className="w-3.5 h-3.5 text-sky-400" />} label={t('submitCreator.posts')} value={fetchedProfile.postsCount.toLocaleString()} />}
                    <StatCell icon={<DollarSign className="w-3.5 h-3.5 text-yellow-400" />} label={t('submitCreator.price')} value={fetchedProfile.isFree ? t('submitCreator.free') : `$${fetchedProfile.price}/mo`} />
                    {fetchedProfile.location && <StatCell icon={<MapPin className="w-3.5 h-3.5 text-orange-400" />} label={t('submitCreator.location')} value={fetchedProfile.location} />}
                    {fetchedProfile.joinDate && <StatCell icon={<Calendar className="w-3.5 h-3.5 text-indigo-400" />} label={t('submitCreator.joinedOnlyfans')} value={formatJoinDate(fetchedProfile.joinDate)} />}
                    {fetchedProfile.website && <StatCell icon={<Globe className="w-3.5 h-3.5 text-cyan-400" />} label={t('submitCreator.website')} value={fetchedProfile.website.replace(/https?:\/\//, '').slice(0, 25)} />}
                    {fetchedProfile.isVerified && <StatCell icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />} label={t('submitCreator.verified')} value={t('submitCreator.yes')} />}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-white mb-2">{t('submitCreator.onlyfansUrl')} <span className="text-red-400">*</span></label>
                <input type="url" value={onlyfansUrl} onChange={(e) => setOnlyfansUrl(e.target.value)} placeholder="https://onlyfans.com/username" className={inputClass} />
              </div>

              {/* Photos section */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  {t('submitCreator.photosLabel')} <span className="text-red-400">*</span>
                  <span className="text-gray-500 font-normal ml-2">{t('submitCreator.upToPhotos').replace('{max}', String(MAX_PHOTOS))}</span>
                </label>

                <div className="flex flex-wrap gap-3 mb-3">
                  {/* Fetched images from DB / Apify (avatar + header) */}
                  {fetchedImages.map((fi, i) => (
                    <div key={`fetched-${i}`} className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-[#00AFF0]/30 group">
                      <img src={fi.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFetchedImage(i)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-gray-300 font-bold">
                        {fi.label}
                      </span>
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#00AFF0]/80 text-[9px] text-white font-black uppercase">
                        Auto
                      </span>
                    </div>
                  ))}

                  {/* User-uploaded photos */}
                  {photos.map((p, i) => (
                    <div key={`upload-${i}`} className="relative w-28 h-28 rounded-xl overflow-hidden border border-white/10 group">
                      <img src={p.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-gray-300 font-bold">
                        Photo {fetchedImages.length + i + 1}
                      </span>
                    </div>
                  ))}

                  {/* Upload button */}
                  {totalImages < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-28 h-28 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-[#00AFF0]/40 hover:text-[#00AFF0] transition-all"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-bold">{t('submitCreator.addPhoto')}</span>
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotos(e.target.files)} />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2">{t('submitCreator.descLabel')} <span className="text-red-400">*</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('submitCreator.descPlaceholder')}
                  rows={3}
                  maxLength={500}
                  className={inputClass + ' resize-y'}
                />
                <p className="text-[10px] text-gray-500 mt-1">{t('submitCreator.descCount').replace('{count}', String(description.length))}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-sm font-bold text-white">{t('submitCreator.categoriesLabel')} <span className="text-red-400">*</span></label>
                  {categories.length === 0 && (
                    <span className="text-[10px] text-red-400/80 font-semibold">{t('submitCreator.pickOne')}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat.toLowerCase().replace(/\s+/g, '-'))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        categories.includes(cat.toLowerCase().replace(/\s+/g, '-'))
                          ? 'bg-[#00AFF0]/20 border border-[#00AFF0]/50 text-[#00AFF0]'
                          : 'bg-white/[0.04] border border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}

                  {/* Extra categories from import that aren't in the predefined list */}
                  {extraCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 border border-purple-500/50 text-purple-300 transition-all flex items-center gap-1"
                    >
                      {cat} <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>

                {/* Add custom category */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={customCat}
                    onChange={(e) => setCustomCat(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); } }}
                    placeholder={t('submitCreator.addCustomCat')}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white placeholder-gray-600 text-xs focus:outline-none focus:border-[#00AFF0]/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={addCustomCategory}
                    disabled={!customCat.trim()}
                    className="px-3 py-2 rounded-lg text-xs font-bold bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30"
                  >
                    {t('submitCreator.addBtn')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">{t('submitCreator.locationLabel')}</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('submitCreator.locationPlaceholder')} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">{t('submitCreator.priceLabel')}</label>
                  <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('submitCreator.pricePlaceholder')} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Telegram — dedicated block */}
            <div className="rounded-2xl border border-[#00AFF0]/20 bg-gradient-to-r from-[#00AFF0]/[0.06] to-transparent p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-[#00AFF0]" />
                <h2 className="text-sm font-black text-white">{t('submitCreator.telegramSection')}</h2>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: t('submitCreator.telegramDesc')
                    .replace(/<tg>/g, '<span class="text-[#00AFF0] font-bold">')
                    .replace(/<\/tg>/g, '</span>')
                    .replace(/<b>/g, '<span class="text-white font-black">')
                    .replace(/<\/b>/g, '</span>')
                    .replace(/<rec>/g, '<span class="text-emerald-400 font-black">')
                    .replace(/<\/rec>/g, '</span>')
                }}
              />
              <input type="url" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/username" className={inputClass} />
            </div>

            {/* Social Media & Website */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-5">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">{t('submitCreator.socialTitle')} <span className="text-gray-600 font-normal normal-case">{t('submitCreator.socialOptional')}</span></h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">{t('submitCreator.websiteLabel')}</label>
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://linktr.ee/username" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">{t('submitCreator.instagramLabel')}</label>
                  <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/username" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">{t('submitCreator.twitterLabel')}</label>
                  <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/username" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">{t('submitCreator.tiktokLabel')}</label>
                  <input type="url" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@username" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Submit for FREE */}
              <button
                type="submit"
                disabled={!isValid || submitting || submittingFeatured}
                className="relative w-full overflow-hidden flex flex-col items-center justify-center gap-0.5 py-5 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-[2px]"
                style={{
                  background: isValid ? 'linear-gradient(135deg, #ffffff 0%, #e8f8ff 100%)' : '#e5e7eb',
                  border: '3px solid #00AFF0',
                  boxShadow: isValid ? '5px 5px 0px #00AFF0' : '2px 2px 0px #00AFF0',
                }}
              >
                {submitting ? (
                  <span className="flex items-center gap-2 text-[15px] font-black uppercase tracking-widest text-black">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploading ? t('submitCreator.uploadingPhotos') : t('submitCreator.submittingText')}
                  </span>
                ) : (
                  <span className="text-[1.2rem] font-black uppercase tracking-widest text-black leading-tight">{t('submitCreator.submitFree')}</span>
                )}
              </button>

              {/* Submit FEATURED */}
              <button
                type="button"
                onClick={handleSubmitFeatured}
                disabled={submitting || submittingFeatured}
                className="relative w-full overflow-hidden flex items-center justify-between gap-4 px-6 py-5 transition-all hover:opacity-90 disabled:cursor-not-allowed active:translate-y-[2px]"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #e6f9ff 100%)',
                  border: '3px solid #00AFF0',
                  boxShadow: '5px 5px 0px #00AFF0',
                }}
              >
                {submittingFeatured ? (
                  <span className="flex items-center gap-2 text-[15px] font-black uppercase tracking-widest text-black w-full justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploading ? t('submitCreator.uploading') : t('submitCreator.creatingPayment')}
                  </span>
                ) : (
                  <>
                    <span className="text-[1.2rem] font-black uppercase tracking-widest text-black leading-tight">{t('submitCreator.submitFeatured')}</span>
                    <div className="shrink-0 text-right leading-tight">
                      <span className="block font-black text-black text-[1.4rem] leading-none">{t('submitCreator.moreExposure')}</span>
                      <span className="block text-xs font-bold text-[#0090c8] uppercase tracking-widest">{t('submitCreator.forOneMonth')}</span>
                    </div>
                  </>
                )}
              </button>

              {/* OFM Agencies */}
              <Link
                href={lp('/OFM')}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 transition-all hover:opacity-90 active:translate-x-[2px] active:translate-y-[2px]"
                style={{
                  background: 'linear-gradient(160deg, #0c2d4e 0%, #0a3d62 60%, #064e3b 100%)',
                  border: '3px solid #0ea5e9',
                  boxShadow: '6px 6px 0px #0ea5e9',
                }}
              >
                <div className="leading-none">
                  <span className="block text-xs font-black uppercase tracking-widest text-sky-400/70 mb-0.5">{t('submitCreator.forOFM')}</span>
                  <span
                    className="block font-black uppercase leading-none text-white"
                    style={{ fontSize: '3rem', textShadow: '3px 3px 0px rgba(0,0,0,0.5)', lineHeight: 1 }}
                  >
                    OFM
                  </span>
                  <span
                    className="block font-black uppercase tracking-tight"
                    style={{ fontSize: '1rem', color: '#7dd3fc', lineHeight: 1.2 }}
                  >
                    {t('submitCreator.ofmAgencies')}
                  </span>
                </div>

                <div className="leading-none shrink-0 text-right">
                  <span className="block text-xs font-black uppercase tracking-widest text-sky-400/70 mb-0.5">{t('submitCreator.getLabel')}</span>
                  <span
                    className="block font-black text-white leading-none"
                    style={{ fontSize: '3.5rem', textShadow: '3px 3px 0px rgba(0,0,0,0.5)', lineHeight: 1 }}
                  >
                    100<span style={{ color: '#0ea5e9' }}>×</span>
                  </span>
                  <span
                    className="block font-black uppercase tracking-tight"
                    style={{ fontSize: '1rem', color: '#7dd3fc', lineHeight: 1.1 }}
                  >
                    {t('submitCreator.moreExposure100')}
                  </span>
                </div>
              </Link>
            </div>

            <p className="text-gray-600 text-xs text-center">
              {t('submitCreator.disclaimer')}
            </p>
          </form>
        )}
      </div>

      <Footer />
    </div>
  );
}
