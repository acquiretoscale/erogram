'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { submitCreator } from '@/lib/actions/submitCreator';
import { useTranslation, useLocalePath } from '@/lib/i18n/client';

const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#00AFF0]/50 focus:ring-1 focus:ring-[#00AFF0]/30 transition-all';

const CATEGORY_OPTIONS = [
  'Asian','Blonde','Teen','MILF','Amateur','Redhead','Goth','Petite',
  'Big Ass','Big Boobs','Brunette','Latina','Ahegao','Alt','Cosplay',
  'Fitness','Tattoo','Curvy','Ebony','Feet','Lingerie','Thick','Streamer','Piercing',
];

const MAX_PHOTOS = 8;

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
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; slug?: string; id?: string; error?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [liveUsers, setLiveUsers] = useState(0);

  useEffect(() => {
    const fetchActive = () => {
      fetch('/api/advertise-stats', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (typeof d.activeVisitors === 'number') setLiveUsers(d.activeVisitors); })
        .catch(() => {});
    };
    fetchActive();
    const id = setInterval(fetchActive, 300_000);
    return () => clearInterval(id);
  }, []);

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

  const hasImages = photos.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !onlyfansUrl.trim() || !description.trim() || !hasImages) return;

    setSubmitting(true);
    setResult(null);

    try {
      setUploading(true);
      const uploadedUrls = await Promise.all(photos.map((p) => uploadPhoto(p.file)));
      setUploading(false);

      const res = await submitCreator({
        name: name.trim(),
        onlyfansUrl: onlyfansUrl.trim(),
        website: website.trim(),
        description: description.trim(),
        photoUrls: uploadedUrls,
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        telegram: telegram.trim(),
        tiktok: tiktok.trim(),
        location: location.trim(),
        categories,
        price: price.trim(),
      });
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Something went wrong.' });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const isValid = name.trim() && onlyfansUrl.trim() && description.trim().length >= 20 && hasImages && categories.length > 0;

  return (
    <div className="min-h-screen bg-[#0a1117]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Promote Your OnlyFans
          </h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto leading-relaxed">
            Dozens of content creators and agencies work with us to grow their OnlyFans traffic. Get access to the best and most qualified leads to make more money with your OnlyFans. Submit your profile for <span className="text-white font-bold">FREE</span>.
          </p>
          {liveUsers > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-bold text-white text-sm tabular-nums">{liveUsers.toLocaleString()}</span>
              <span className="text-white/40 text-[11px] sm:text-sm">visiting Erogram right now</span>
            </div>
          )}
        </div>

        {result?.success ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#00AFF0]/30 bg-white p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#00AFF0] mx-auto mb-4" />
              <h2 className="text-xl font-black text-gray-900 mb-2">Profile Submitted!</h2>
              <div className="inline-block px-4 py-1.5 rounded-full bg-green-100 border border-green-300 text-green-700 text-xs font-black uppercase tracking-wider mb-4">
                ✓ Pending Approval
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Our team will review and approve your profile shortly — usually within 48 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={lp('/onlyfanssearch')}
                  className="px-6 py-3 rounded-xl bg-[#00AFF0] text-white font-black text-sm shadow-md hover:bg-[#009AD6] transition-all"
                >
                  {t('submitCreator.backToSearch')}
                </Link>
                <Link
                  href={lp('/submit')}
                  onClick={() => { setResult(null); setName(''); setOnlyfansUrl(''); setDescription(''); setPhotos([]); setCategories([]); }}
                  className="px-6 py-3 rounded-xl border-2 border-[#00AFF0] text-[#00AFF0] font-bold text-sm hover:bg-[#00AFF0]/10 transition-all"
                >
                  Submit Another
                </Link>
              </div>
            </div>
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

              <div>
                <label className="block text-sm font-bold text-white mb-1">{t('submitCreator.nameLabel')} <span className="text-red-400">*</span></label>
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
                        Photo {i + 1}
                      </span>
                    </div>
                  ))}

                  {photos.length < MAX_PHOTOS && (
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
                disabled={!isValid || submitting}
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

            </div>

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
                    href="mailto:Isabella@erogram.biz"
                    className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#00AFF0] text-white font-bold text-sm hover:bg-[#009AD6] transition-colors whitespace-nowrap"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    Isabella@erogram.biz
                  </a>
                  <a
                    href="https://t.me/RVN8888"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors whitespace-nowrap"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/></svg>
                    @RVN8888 on Telegram
                  </a>
                </div>
              </div>
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
