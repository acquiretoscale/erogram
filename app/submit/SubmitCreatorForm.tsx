'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Search } from 'lucide-react';
import {
  submitCreator,
  fetchCreatorFromApify,
  createFeaturedCreatorInvoice,
  type CreatorLookupResult,
} from '@/lib/actions/submitCreator';
import {
  saveSubmitCreatorDraft,
  loadSubmitCreatorDraft,
  clearSubmitCreatorDraft,
  loadSubmitCreatorPlan,
  clearSubmitCreatorPlan,
  type SubmitCreatorDraft,
} from '@/lib/submitCreatorDraft';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import { useTranslation } from '@/lib/i18n/client';

const inputClass =
  'w-full px-4 py-3 rounded-xl border-2 border-[#00AFF0]/35 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-[0_4px_14px_-6px_rgba(0,175,240,0.2)] focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/40 focus:border-[#00AFF0] transition-all';

const inputCompactClass =
  'flex-1 px-3 py-2 rounded-lg border border-[#00AFF0]/25 bg-white text-gray-900 placeholder:text-gray-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#00AFF0]/30 focus:border-[#00AFF0] transition-all';

const cardClass =
  'rounded-2xl border border-[#00AFF0]/20 bg-white p-5 sm:p-6 space-y-5 shadow-[0_8px_30px_-12px_rgba(0,175,240,0.18)]';

const sectionTitleClass = 'text-xs font-black text-[#2B1B28] uppercase tracking-wider';

const labelClass = 'block text-sm font-bold text-gray-900 mb-2';

const toggleActiveClass = 'bg-[#00AFF0] text-white shadow-sm';

const toggleIdleClass =
  'bg-white/10 border border-white/15 text-white/60 hover:text-white hover:border-[#00AFF0]/30';

const pillActiveClass = 'bg-[#00AFF0] text-white border border-[#00AFF0]';

const pillIdleClass =
  'bg-[#f0f8ff] border border-[#00AFF0]/20 text-gray-700 hover:border-[#00AFF0]/40 hover:text-gray-900';

const choiceActiveClass = 'bg-[#00AFF0] text-white border border-[#00AFF0]';

const choiceIdleClass =
  'bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#00AFF0]/30 hover:text-gray-900';

const submitBtnClass =
  'w-full py-4 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] text-white text-sm sm:text-base font-black uppercase tracking-wider shadow-[0_8px_24px_-8px_rgba(0,175,240,0.55)] hover:shadow-[0_12px_28px_-6px_rgba(0,175,240,0.65)] hover:from-[#009ADB] hover:to-[#00BFE8] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none';

const CATEGORY_OPTIONS = [
  'Asian','Blonde','Teen','MILF','Amateur','Redhead','Goth','Petite',
  'Big Ass','Big Boobs','Brunette','Latina','Ahegao','Alt','Cosplay',
  'Fitness','Tattoo','Curvy','Ebony','Feet','Lingerie','Thick','Streamer','Piercing',
];

const MAX_PHOTOS = 8;

function parseOnlyfansUsername(raw: string): string {
  const trimmed = raw.trim().replace(/^@/, '');
  if (/onlyfans\.com/i.test(trimmed)) {
    const m = trimmed.match(/onlyfans\.com\/([a-zA-Z0-9._-]+)/i);
    return (m?.[1] || '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
  }
  return trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

type Props = {
  posterType: 'creator' | 'agency';
  showAgencyPromo?: boolean;
};

export default function SubmitCreatorForm({ posterType, showAgencyPromo = false }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeRef = useRef(false);

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
  const [accountRole, setAccountRole] = useState<'creator' | 'agency' | ''>(posterType);
  const [lookingForAgency, setLookingForAgency] = useState<'yes' | 'no' | ''>('');
  const [contactMethod, setContactMethod] = useState<'telegram' | 'whatsapp' | ''>('');
  const [contactHandle, setContactHandle] = useState('');
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [importedPhotoUrls, setImportedPhotoUrls] = useState<string[]>([]);
  const [entryMode, setEntryMode] = useState<'import' | 'manual'>('import');
  const [importQuery, setImportQuery] = useState('');
  const [importApifyFetching, setImportApifyFetching] = useState(false);
  const [importError, setImportError] = useState('');
  const [importApplied, setImportApplied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; slug?: string; id?: string; error?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fillFromImport = useCallback((c: CreatorLookupResult) => {
    setName(c.name);
    setOnlyfansUrl(`https://onlyfans.com/${c.username}`);
    setDescription(c.bio || '');
    setWebsite(c.website || '');
    setInstagram(c.instagramUrl || '');
    setTwitter(c.twitterUrl || '');
    setTelegram(c.telegramUrl || '');
    setTiktok(c.tiktokUrl || '');
    setLocation(c.location || '');
    setCategories(c.categories || []);
    setPrice(c.isFree ? 'free' : c.price ? String(c.price) : '');
    setImportedPhotoUrls([c.avatar, c.header].filter(Boolean));
    setPhotos([]);
    setImportApplied(true);
    setImportError('');
    setEntryMode('manual');
  }, []);

  const handleApifyImport = async () => {
    const username = parseOnlyfansUsername(importQuery);
    if (!username) {
      setImportError('Enter a valid OnlyFans username or link.');
      return;
    }
    setImportApifyFetching(true);
    setImportError('');
    try {
      const result = await fetchCreatorFromApify(username);
      if (result) {
        fillFromImport(result);
      } else {
        setImportError('Creator not found on OnlyFans. Check the username and try again.');
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed. Please try again.');
    } finally {
      setImportApifyFetching(false);
    }
  };

  const totalPhotoCount = importedPhotoUrls.length + photos.length;

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_PHOTOS - totalPhotoCount;
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

  const removeImportedPhoto = (idx: number) => {
    setImportedPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
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

  const hasImages = totalPhotoCount > 0;

  const buildDraft = (photoUrls: string[]): SubmitCreatorDraft => ({
    name: name.trim(),
    onlyfansUrl: onlyfansUrl.trim(),
    website: website.trim(),
    description: description.trim(),
    photoUrls,
    instagram: instagram.trim(),
    twitter: twitter.trim(),
    telegram: telegram.trim(),
    tiktok: tiktok.trim(),
    location: location.trim(),
    categories,
    price: price.trim(),
    submitterType: accountRole === 'agency' ? 'agency' : 'creator',
    lookingForAgency: lookingForAgency === 'yes',
    submitContactMethod: contactMethod === 'telegram' ? 'telegram' : 'whatsapp',
    submitContactValue: contactHandle.trim(),
  });

  const runSubmit = useCallback(async (draft: SubmitCreatorDraft, token: string) => {
    setSubmitting(true);
    setUploading(false);
    setResult(null);
    try {
      const res = await submitCreator({ ...draft, token });
      if (res.success) {
        const plan = loadSubmitCreatorPlan() || 'free';
        clearSubmitCreatorDraft();

        if (plan === 'boosted' && res.id) {
          const invoice = await createFeaturedCreatorInvoice(res.id, token);
          clearSubmitCreatorPlan();
          if (invoice.url) {
            window.location.href = invoice.url;
            return;
          }
          router.replace(`/profile?tab=listings&creatorLive=1&boost=pay&creatorId=${encodeURIComponent(res.id)}`);
          return;
        }

        clearSubmitCreatorPlan();
        router.replace('/profile?creatorLive=1');
        return;
      }
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  }, [router]);

  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      const plan = loadSubmitCreatorPlan() || 'free';
      router.replace(`/submit/join?plan=${plan}`);
    }
  }, [router]);

  useEffect(() => {
    if (searchParams.get('resume') !== '1' || resumeRef.current) return;
    const token = localStorage.getItem('token');
    const draft = loadSubmitCreatorDraft();
    if (!token || !draft) return;

    resumeRef.current = true;
    setName(draft.name);
    setOnlyfansUrl(draft.onlyfansUrl);
    setWebsite(draft.website);
    setDescription(draft.description);
    setInstagram(draft.instagram);
    setTwitter(draft.twitter);
    setTelegram(draft.telegram);
    setTiktok(draft.tiktok);
    setLocation(draft.location);
    setCategories(draft.categories);
    setPrice(draft.price);
    setAccountRole(draft.submitterType);
    setLookingForAgency(draft.lookingForAgency ? 'yes' : 'no');
    setContactMethod(draft.submitContactMethod);
    setContactHandle(draft.submitContactValue);
    setImportedPhotoUrls(draft.photoUrls);
    setPhotos([]);
    setImportApplied(true);
    setEntryMode('manual');
    void runSubmit(draft, token);
  }, [searchParams, runSubmit, posterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !onlyfansUrl.trim() || !description.trim() || !hasImages) return;

    setSubmitting(true);
    setResult(null);

    try {
      setUploading(true);
      const uploadedUrls = await Promise.all(photos.map((p) => uploadPhoto(p.file)));
      const photoUrls = [...importedPhotoUrls, ...uploadedUrls].slice(0, MAX_PHOTOS);
      setUploading(false);

      const draft = buildDraft(photoUrls);
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        saveSubmitCreatorDraft(draft);
        setSubmitting(false);
        const plan = loadSubmitCreatorPlan() || 'free';
        router.push(`/submit/join?plan=${plan}`);
        return;
      }

      await runSubmit(draft, token);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Something went wrong.' });
      setSubmitting(false);
      setUploading(false);
    }
  };

  const isValid =
    name.trim() &&
    onlyfansUrl.trim() &&
    description.trim().length >= 20 &&
    hasImages &&
    categories.length > 0 &&
    accountRole !== '' &&
    lookingForAgency !== '' &&
    contactMethod !== '' &&
    contactHandle.trim();

  if (result?.success) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#00AFF0]/30 bg-white p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#00AFF0] mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Profile live on Erogram</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your listing is published. Open your profile to manage it anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/profile?creatorLive=1"
              className="px-6 py-3 rounded-xl bg-[#00AFF0] text-white font-black text-sm shadow-md hover:bg-[#009AD6] transition-all"
            >
              Go to my profile
            </Link>
            {result.slug && (
              <Link
                href={`${ofCreatorProfileUrl(result.slug)}?edit=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl border-2 border-[#00AFF0] text-[#00AFF0] font-bold text-sm hover:bg-[#00AFF0]/10 transition-all"
              >
                Edit listing
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (submitting && searchParams.get('resume') === '1') {
    return (
      <div className="rounded-2xl border border-[#00AFF0]/20 bg-white p-10 text-center shadow-[0_8px_30px_-12px_rgba(0,175,240,0.18)]">
        <Loader2 className="w-10 h-10 text-[#00AFF0] animate-spin mx-auto mb-4" />
        <p className="text-gray-900 text-sm font-bold">Publishing your listing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.06] border border-white/10">
        <button
          type="button"
          onClick={() => setEntryMode('import')}
          className={`py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            entryMode === 'import' ? toggleActiveClass : toggleIdleClass
          }`}
        >
          Import from OnlyFans
        </button>
        <button
          type="button"
          onClick={() => setEntryMode('manual')}
          className={`py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            entryMode === 'manual' ? toggleActiveClass : toggleIdleClass
          }`}
        >
          Add manually
        </button>
      </div>

      {entryMode === 'import' && !importApplied && (
        <div className={`${cardClass} space-y-4`}>
          <p className="text-sm text-gray-600">Enter an OnlyFans username or paste a profile link. We will pull your public profile data.</p>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={importQuery}
              onChange={(e) => { setImportQuery(e.target.value); setImportError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApifyImport();
                }
              }}
              placeholder="username or https://onlyfans.com/username"
              className={`${inputClass} pl-10`}
            />
            {importApifyFetching && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00AFF0] animate-spin" />
            )}
          </div>

          {importError && (
            <p className="text-sm text-red-600">{importError}</p>
          )}

          <button
            type="button"
            disabled={importApifyFetching || !importQuery.trim()}
            onClick={handleApifyImport}
            className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[#00AFF0] to-[#00D4FF] hover:from-[#009ADB] hover:to-[#00BFE8] disabled:opacity-50 text-white text-sm font-bold transition-all"
          >
            {importApifyFetching ? 'Importing from OnlyFans... (30-60s)' : 'Import from OnlyFans'}
          </button>
        </div>
      )}

      {importApplied && entryMode === 'import' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-[#00AFF0]/30 bg-white text-sm text-[#0077B3] shadow-[0_4px_14px_-6px_rgba(0,175,240,0.15)]">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[#00AFF0]" />
          <span className="flex-1">Profile imported. Review the form below and submit.</span>
          <button
            type="button"
            onClick={() => { setImportApplied(false); setImportQuery(''); }}
            className="text-xs font-bold text-[#00AFF0] hover:text-[#009AD6] underline"
          >
            Import another
          </button>
        </div>
      )}

      {(entryMode === 'manual' || importApplied) && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {result?.error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{result.error}</span>
            </div>
          )}

          <div className={cardClass}>
            <h2 className={sectionTitleClass}>{t('submitCreator.required')}</h2>

            <div>
              <label className={labelClass}>{t('submitCreator.nameLabel')} <span className="text-red-500">*</span></label>
              <p className="text-[11px] text-gray-500 mb-2">{t('submitCreator.nameHint')}</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('submitCreator.namePlaceholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t('submitCreator.onlyfansUrl')} <span className="text-red-500">*</span></label>
              <input type="url" value={onlyfansUrl} onChange={(e) => setOnlyfansUrl(e.target.value)} placeholder="https://onlyfans.com/username" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>
                {t('submitCreator.photosLabel')} <span className="text-red-500">*</span>
                <span className="text-gray-500 font-normal ml-2">{t('submitCreator.upToPhotos').replace('{max}', String(MAX_PHOTOS))}</span>
              </label>

              <div className="flex flex-wrap gap-3 mb-3">
                {importedPhotoUrls.map((url, i) => (
                  <div key={`imported-${i}`} className="relative w-28 h-28 rounded-xl overflow-hidden border border-[#00AFF0]/30 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImportedPhoto(i)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#00AFF0]/80 text-[10px] text-white font-bold">
                      Imported
                    </span>
                  </div>
                ))}
                {photos.map((p, i) => (
                  <div key={`upload-${i}`} className="relative w-28 h-28 rounded-xl overflow-hidden border border-[#00AFF0]/20 group">
                    <img src={p.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-[10px] text-gray-300 font-bold">
                      Photo {i + 1}
                    </span>
                  </div>
                ))}

                {totalPhotoCount < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-28 h-28 rounded-xl border-2 border-dashed border-[#00AFF0]/30 bg-[#f0f8ff] flex flex-col items-center justify-center gap-2 text-[#00AFF0] hover:border-[#00AFF0] hover:bg-[#e8f6ff] transition-all"
                  >
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] font-bold">{t('submitCreator.addPhoto')}</span>
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotos(e.target.files)} />
            </div>

            <div>
              <label className={labelClass}>{t('submitCreator.descLabel')} <span className="text-red-500">*</span></label>
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
                <label className="text-sm font-bold text-gray-900">{t('submitCreator.categoriesLabel')} <span className="text-red-500">*</span></label>
                {categories.length === 0 && (
                  <span className="text-[10px] text-red-500 font-semibold">{t('submitCreator.pickOne')}</span>
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
                        ? pillActiveClass
                        : pillIdleClass
                    }`}
                  >
                    {cat}
                  </button>
                ))}

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

              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); } }}
                  placeholder={t('submitCreator.addCustomCat')}
                  className={inputCompactClass}
                />
                <button
                  type="button"
                  onClick={addCustomCategory}
                  disabled={!customCat.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-bold bg-[#f0f8ff] border border-[#00AFF0]/25 text-[#0077B3] hover:bg-[#00AFF0]/10 hover:border-[#00AFF0]/40 transition-all disabled:opacity-30"
                >
                  {t('submitCreator.addBtn')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('submitCreator.locationLabel')}</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('submitCreator.locationPlaceholder')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('submitCreator.priceLabel')}</label>
                <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('submitCreator.pricePlaceholder')} className={inputClass} />
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className={sectionTitleClass}>{t('submitCreator.socialTitle')} <span className="text-gray-400 font-normal normal-case">{t('submitCreator.socialOptional')}</span></h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('submitCreator.websiteLabel')}</label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://linktr.ee/username" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('submitCreator.instagramLabel')}</label>
                <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/username" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('submitCreator.twitterLabel')}</label>
                <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/username" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t('submitCreator.tiktokLabel')}</label>
                <input type="url" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@username" className={inputClass} />
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className={sectionTitleClass}>About you <span className="text-red-500 normal-case">*</span></h2>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#00AFF0]/40 hover:bg-[#f0f8ff] has-[:checked]:border-[#00AFF0] has-[:checked]:bg-[#f0f8ff]">
                <input
                  type="radio"
                  name="accountRole"
                  checked={accountRole === 'creator'}
                  onChange={() => setAccountRole('creator')}
                  className="mt-1 accent-[#00AFF0]"
                  required
                />
                <span className="text-sm font-semibold text-gray-900 leading-snug">
                  I&apos;m creating this account for myself as a creator
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#00AFF0]/40 hover:bg-[#f0f8ff] has-[:checked]:border-[#00AFF0] has-[:checked]:bg-[#f0f8ff]">
                <input
                  type="radio"
                  name="accountRole"
                  checked={accountRole === 'agency'}
                  onChange={() => setAccountRole('agency')}
                  className="mt-1 accent-[#00AFF0]"
                  required
                />
                <span className="text-sm font-semibold text-gray-900 leading-snug">
                  I&apos;m creating this account for my client as an agency.
                </span>
              </label>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-900 mb-3">Are your account managed by an agency? <span className="text-red-500">*</span></p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLookingForAgency('yes')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    lookingForAgency === 'yes' ? choiceActiveClass : choiceIdleClass
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setLookingForAgency('no')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    lookingForAgency === 'no' ? choiceActiveClass : choiceIdleClass
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-900 mb-3">What&apos;s the best way to get in touch: Telegram / Whatsapp <span className="text-red-500">*</span></p>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setContactMethod('telegram')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    contactMethod === 'telegram' ? choiceActiveClass : choiceIdleClass
                  }`}
                >
                  Telegram
                </button>
                <button
                  type="button"
                  onClick={() => setContactMethod('whatsapp')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    contactMethod === 'whatsapp' ? choiceActiveClass : choiceIdleClass
                  }`}
                >
                  Whatsapp
                </button>
              </div>
              {contactMethod && (
                <input
                  type="text"
                  value={contactHandle}
                  onChange={(e) => setContactHandle(e.target.value)}
                  placeholder={contactMethod === 'telegram' ? '@username or t.me/link' : 'WhatsApp number with country code'}
                  className={inputClass}
                  required
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || submitting}
            className={submitBtnClass}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {uploading ? t('submitCreator.uploadingPhotos') : t('submitCreator.submittingText')}
              </span>
            ) : (
              t('submitCreator.submitFree')
            )}
          </button>

          {showAgencyPromo && (
            <>
              <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-4">For OFM Agency Owners</h2>
              <div className="rounded-2xl bg-white p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-8">
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00AFF0] mb-2">Get Featured on Erogram</p>
                    <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-2">
                      Get 100× More Views with Paid Promotion
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Contact us for a custom quote. We'll get your creators in front of the right audience.
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2.5 w-full sm:w-auto">
                    <a
                      href="mailto:isabella@erogram.biz"
                      className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#00AFF0] text-white font-bold text-sm hover:bg-[#009AD6] transition-colors whitespace-nowrap"
                    >
                      isabella@erogram.biz
                    </a>
                    <a
                      href="https://t.me/erogramDOTpro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors whitespace-nowrap"
                    >
                      @erogramDOTpro on Telegram
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}

          <p className="text-white/40 text-xs text-center">
            {t('submitCreator.disclaimer')}
          </p>
        </form>
      )}
    </div>
  );
}
