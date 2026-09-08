'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { AINSFW_CATEGORIES } from '@/app/ainsfw/types';
import { AINSFW_TOOL_PREVIEW_VIDEOS } from '@/lib/ainsfw/toolPreviewVideos';
import { ainsfwCtaButtonClass } from '@/lib/ainsfw/ctaButton';

const MAIN_CATEGORIES = AINSFW_CATEGORIES.filter((c) => c !== 'All');
const SUBSCRIPTION_OPTIONS = ['Free', 'Freemium & Paid', 'Paid'] as const;
const PAYMENT_OPTIONS = ['Credit Cards', 'Crypto', 'PayPal', 'Telegram Payment'] as const;

const PREVIEW_PAYMENT_ICON: Record<string, string> = {
  'Credit Cards': '💳',
  'Debit Cards': '💳',
  Crypto: '₿',
  PayPal: '🅿',
  'Telegram Payment': '✈',
  'Telegram Stars': '⭐',
};

const PREVIEW_DESC_WORDS = 200;
const MAX_DESCRIPTION_WORDS = 1000;
const PREVIEW_DEMO_VIDEO = AINSFW_TOOL_PREVIEW_VIDEOS['lovescape-ai-girlfriend'];
const PREVIEW_DEMO_SCREENSHOTS = [
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/gallery/lovescape-ai-girlfriend-1.webp',
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/gallery/lovescape-ai-girlfriend-2.webp',
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/gallery/lovescape-ai-girlfriend-3.webp',
  'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/ainsfw/gallery/lovescape-ai-girlfriend-4.webp',
];

export type ListingPreviewData = {
  toolName: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  categories: string[];
  subscription: string;
  paymentMethods: string[];
  screenshots?: string[];
  videoUrl?: string;
};

type EditField = 'name' | 'logo' | 'plan' | 'accepts' | 'categories' | 'description' | 'video' | null;

function limitToMaxWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return text.trim();
  return words.slice(0, max).join(' ');
}

function previewVendorLabel(websiteUrl: string, toolName: string): string {
  const raw = websiteUrl.trim();
  if (!raw) return `${toolName.replace(/\s+/g, '')}.com`.toLowerCase();
  try {
    const host = new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return raw;
  }
}

function previewMockDescription(toolName: string, vendor: string): string {
  return `${vendor} is where users shape AI companions with their own prompts, photos, and chat history. ${toolName} remembers what happened in earlier sessions and brings those details back in later replies instead of starting from zero every time. Visitors can test the free tier long enough to see if the tone and pacing match what they want before upgrading.

Members can request custom images during chat, keep storylines running across days, and switch between characters without losing the thread. The paid tier unlocks voice, unrestricted NSFW chat, and heavier image generation, which is the usual split in this category. Everything runs in the browser on desktop and mobile, and there is no native app yet.

Vague prompts still produce vague replies, and busy image requests sometimes need a second pass. For anyone listing on Erogram, this block shows how the finished description will sit under the screenshot gallery once live copy replaces this placeholder text.`;
}

function EditableBlock({
  editable,
  active,
  onActivate,
  label,
  className = '',
  children,
}: {
  editable: boolean;
  active: boolean;
  onActivate: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  if (!editable) return <div className={className}>{children}</div>;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (!active) onActivate();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!active) onActivate();
        }
      }}
      className={`${className} relative rounded-lg transition-all ${
        active
          ? 'ring-2 ring-[#22c55e] ring-offset-2 ring-offset-[#04140c]'
          : 'cursor-pointer hover:ring-2 hover:ring-[#22c55e]/45 hover:ring-offset-2 hover:ring-offset-[#04140c]'
      }`}
    >
      {!active && (
        <span className="absolute top-1 right-1 z-20 max-w-[11rem] text-right text-[8px] font-black uppercase tracking-wide leading-tight text-[#22c55e] bg-black/75 px-1.5 py-0.5 rounded pointer-events-none">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

function AdaptiveToolTitle({
  toolName,
  editable,
}: {
  toolName: string;
  editable: boolean;
}) {
  const titleRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const [titleSize, setTitleSize] = useState(30);

  useEffect(() => {
    const fitTitle = () => {
      const box = titleRef.current;
      const nameEl = nameRef.current;
      if (!box || !nameEl) return;

      const badgeReserve = 22;
      const editLabelReserve = editable ? 44 : 0;
      const maxWidth = Math.max(box.clientWidth - badgeReserve - editLabelReserve, 48);

      let size = 30;
      nameEl.style.whiteSpace = 'nowrap';
      nameEl.style.wordBreak = 'normal';
      nameEl.style.overflowWrap = 'normal';
      nameEl.style.fontSize = `${size}px`;

      while (size > 11 && nameEl.scrollWidth > maxWidth) {
        size -= 1;
        nameEl.style.fontSize = `${size}px`;
      }

      if (nameEl.scrollWidth > maxWidth) {
        nameEl.style.whiteSpace = 'normal';
        nameEl.style.overflowWrap = 'break-word';
        nameEl.style.wordBreak = 'break-word';
      }

      setTitleSize(size);
    };

    fitTitle();
    const ro = new ResizeObserver(fitTitle);
    if (titleRef.current) ro.observe(titleRef.current);
    return () => ro.disconnect();
  }, [toolName, editable]);

  return (
    <div ref={titleRef} className="w-full min-w-0 flex items-center gap-1.5">
      <span
        ref={nameRef}
        className="min-w-0 font-black text-white leading-[1.05] tracking-tight"
        style={{ fontSize: `${titleSize}px` }}
      >
        {toolName}
      </span>
      <VerifiedBadge className="!w-4 !h-4 shrink-0" />
    </div>
  );
}

function PreviewListingVideo({
  mp4,
  poster,
  toolName,
  logoSrc,
}: {
  mp4: string;
  poster?: string;
  toolName: string;
  logoSrc: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setVideoReady(false);
  }, [mp4]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { rootMargin: '120px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !videoRef.current) return;
    const v = videoRef.current;
    const onReady = () => setVideoReady(true);
    v.addEventListener('canplay', onReady);
    if (v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) onReady();
    return () => v.removeEventListener('canplay', onReady);
  }, [inView, mp4]);

  useEffect(() => {
    if (!inView || !videoReady || !videoRef.current) return;
    void videoRef.current.play().catch(() => {});
  }, [inView, videoReady]);

  const tryLabel = `TRY ${toolName.toUpperCase()}`;

  return (
    <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-white/10">
      <div className="relative w-full bg-black" style={{ aspectRatio: '360 / 608' }}>
        {poster ? (
          <img
            src={poster}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoReady ? 'opacity-0' : 'opacity-100'}`}
          />
        ) : null}
        {inView ? (
          <video
            key={mp4}
            ref={videoRef}
            src={mp4}
            muted
            loop
            playsInline
            preload="auto"
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : null}
        <div className="absolute top-2 left-2 z-10 w-7 h-7 scale-[1.05] origin-top-left rounded-lg overflow-hidden bg-gray-100 ring-1 ring-white/20">
          <img src={logoSrc} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 px-2 pb-2 pt-8 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
        <p className="text-white/70 text-[10px] font-bold text-center tracking-wide px-1 leading-tight">
          EXAMPLE OF HOW VIDEO PREVIEW LOOKS LIKE
        </p>
        <div className={ainsfwCtaButtonClass('videoSm', '!text-[10px] !py-1.5 !px-3')}>
          {tryLabel}
        </div>
      </div>
    </div>
  );
}

export default function ListingContentReview({
  name,
  description,
  imageUrl,
  websiteUrl,
  categories,
  subscription,
  paymentMethods,
  screenshots,
  videoUrl,
  editable = false,
  categoryLimit = 6,
  onChange,
  onLogoUpload,
  onVideoUpload,
}: {
  name: string;
  description: string;
  imageUrl: string;
  websiteUrl: string;
  categories: string[];
  subscription: string;
  paymentMethods: string[];
  screenshots?: string[];
  videoUrl?: string;
  editable?: boolean;
  categoryLimit?: number;
  onChange?: (patch: Partial<ListingPreviewData>) => void;
  onLogoUpload?: (file: File) => void;
  onVideoUpload?: (file: File) => void;
}) {
  const [editingField, setEditingField] = useState<EditField>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const toolName = name.trim() || 'Your Tool';
  const vendor = previewVendorLabel(websiteUrl, toolName);
  const heroSrc = imageUrl || '/assets/image.jpg';
  const bodyText = description.trim()
    ? limitToMaxWords(description.trim(), PREVIEW_DESC_WORDS)
    : previewMockDescription(toolName, vendor);
  const bodyParagraphs = bodyText.split(/\n\n+/).filter(Boolean);
  const tags = categories.length > 0 ? categories : ['AI Companion'];
  const customVideo = videoUrl?.trim() || '';
  const listingVideo = customVideo
    ? { mp4: customVideo }
    : PREVIEW_DEMO_VIDEO;
  const previewScreenshots = (screenshots && screenshots.length > 0)
    ? screenshots.slice(0, 4)
    : PREVIEW_DEMO_SCREENSHOTS.slice(0, 4);

  useEffect(() => {
    if (!editable) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setEditingField(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [editable]);

  const patch = (updates: Partial<ListingPreviewData>) => {
    onChange?.(updates);
  };

  const togglePayment = (method: string) => {
    const next = paymentMethods.includes(method)
      ? paymentMethods.filter((m) => m !== method)
      : [...paymentMethods, method];
    patch({ paymentMethods: next });
  };

  const toggleCategory = (item: string) => {
    const current = categories.length > 0 ? categories : ['AI Companion'];
    if (current.includes(item)) {
      const next = current.filter((c) => c !== item);
      patch({ categories: next.length > 0 ? next : current });
      return;
    }
    if (current.length >= categoryLimit) return;
    patch({ categories: [...current, item] });
  };

  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLogoUpload) onLogoUpload(file);
    e.target.value = '';
    setEditingField(null);
  };

  const handleVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onVideoUpload) onVideoUpload(file);
    e.target.value = '';
    setEditingField(null);
  };

  return (
    <div
      ref={rootRef}
      id="listing-preview"
      className={`ainsfw-bg rounded-xl border border-[#22c55e]/15 bg-[#04140c] overflow-hidden text-[#f5f5f5] ${editable ? '' : 'select-none'}`}
    >
      {editable && (
        <>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoPick}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={handleVideoPick}
          />
        </>
      )}

      <div className="p-3 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          <div className="lg:col-span-4 min-w-0 w-full">
            <EditableBlock
              editable={editable}
              active={editingField === 'name'}
              onActivate={() => setEditingField('name')}
              label="Edit name"
              className="mb-3 p-1 -m-1"
            >
              {editingField === 'name' ? (
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => patch({ toolName: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-2xl sm:text-3xl font-black text-white leading-none bg-[#0a1f12] border border-[#22c55e]/40 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#22c55e]/60"
                />
              ) : (
                <AdaptiveToolTitle toolName={toolName} editable={editable} />
              )}
            </EditableBlock>

            <div className="bg-[#0a1f12]/85 rounded-2xl border border-[#22c55e]/15 shadow-2xl overflow-hidden mb-3">
              <EditableBlock
                editable={editable}
                active={editingField === 'video'}
                onActivate={() => {
                  setEditingField('video');
                  videoInputRef.current?.click();
                }}
                label="UPLOAD YOUR VIDEO PREVIEW."
                className="p-3"
              >
                {listingVideo ? (
                  <PreviewListingVideo
                    mp4={listingVideo.mp4}
                    poster={'poster' in listingVideo ? listingVideo.poster : undefined}
                    toolName={toolName}
                    logoSrc={heroSrc}
                  />
                ) : (
                  <div className="relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden">
                    <img src={heroSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                )}
              </EditableBlock>

              <div className="px-3 pb-3 grid grid-cols-1 gap-2">
                <EditableBlock
                  editable={editable}
                  active={editingField === 'plan'}
                  onActivate={() => setEditingField('plan')}
                  label="Edit plan"
                  className="bg-white/5 rounded-xl border border-white/10 p-2 text-center"
                >
                  {editingField === 'plan' ? (
                    <select
                      autoFocus
                      value={subscription || 'Freemium & Paid'}
                      onChange={(e) => patch({ subscription: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-[10px] font-bold text-white bg-[#04140c] border border-[#22c55e]/40 rounded px-2 py-1 outline-none"
                    >
                      {SUBSCRIPTION_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <div className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Plan</div>
                      <div className="text-[10px] font-bold text-white leading-tight">{subscription || 'Freemium & Paid'}</div>
                    </>
                  )}
                </EditableBlock>

                <EditableBlock
                  editable={editable}
                  active={editingField === 'accepts'}
                  onActivate={() => setEditingField('accepts')}
                  label="Edit accepts"
                  className="bg-white/5 rounded-xl border border-white/10 p-2"
                >
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Accepts</div>
                  {editingField === 'accepts' ? (
                    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                      {PAYMENT_OPTIONS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePayment(p)}
                          className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-black border ${
                            paymentMethods.includes(p)
                              ? 'bg-[#22c55e]/25 text-white border-[#22c55e]/50'
                              : 'bg-white/10 text-white/70 border-white/20'
                          }`}
                        >
                          {PREVIEW_PAYMENT_ICON[p] || '💰'} {p}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {paymentMethods.length > 0 ? paymentMethods.map((p) => (
                        <span key={p} className="inline-flex items-center gap-0.5 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-[9px] font-black text-white">
                          {PREVIEW_PAYMENT_ICON[p] || '💰'} {p}
                        </span>
                      )) : (
                        <span className="text-[9px] text-gray-400">Not specified</span>
                      )}
                    </div>
                  )}
                </EditableBlock>

                <div className="w-full flex flex-col items-center gap-0.5 py-2 rounded-xl border border-[#22c55e]/20 bg-[#0a1f12]/85">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-3 h-3 text-[#22c55e] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-[#22c55e]">33 reviews</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 min-h-[2rem] flex items-end">
              Preview of {toolName}
            </h3>

            <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] grid-rows-2 gap-2 mb-6">
              <EditableBlock
                editable={editable}
                active={editingField === 'logo'}
                onActivate={() => {
                  setEditingField('logo');
                  logoInputRef.current?.click();
                }}
                label="Edit logo"
                className="row-span-2 relative rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5 h-full min-h-0 w-full"
              >
                <img src={heroSrc} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              </EditableBlock>
              {previewScreenshots.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5"
                >
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>

            <EditableBlock
              editable={editable}
              active={editingField === 'categories'}
              onActivate={() => setEditingField('categories')}
              label="Edit categories"
              className="mb-6 p-1 -m-1"
            >
              {editingField === 'categories' ? (
                <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {MAIN_CATEGORIES.map((item) => {
                    const active = tags.includes(item);
                    const disabled = !active && tags.length >= categoryLimit;
                    return (
                      <button
                        key={item}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleCategory(item)}
                        className={`rounded px-2 py-1 text-[10px] font-black border transition-colors disabled:opacity-30 ${
                          active
                            ? 'bg-[#22c55e]/25 text-white border-[#22c55e]/50'
                            : 'bg-white/10 text-gray-200 border-white/15'
                        }`}
                      >
                        {active ? '✓ ' : ''}{item}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 6).map((tag) => (
                    <span key={tag} className="bg-white/10 border border-white/15 rounded px-1.5 py-0.5 text-[9px] font-black text-gray-200">
                      #{tag.replace(/\s+/g, '-').toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
            </EditableBlock>

            <EditableBlock
              editable={editable}
              active={editingField === 'description'}
              onActivate={() => setEditingField('description')}
              label="Edit description"
              className="mb-6 p-1 -m-1"
            >
              {editingField === 'description' ? (
                <textarea
                  autoFocus
                  value={description}
                  onChange={(e) => patch({ description: limitToMaxWords(e.target.value, MAX_DESCRIPTION_WORDS) })}
                  onClick={(e) => e.stopPropagation()}
                  rows={8}
                  className="w-full text-sm sm:text-base leading-relaxed text-white bg-[#0a1f12] border border-[#22c55e]/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#22c55e]/60 resize-y min-h-[10rem]"
                />
              ) : (
                <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-4 pr-10">
                  {bodyParagraphs.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </EditableBlock>
          </div>
        </div>
      </div>
    </div>
  );
}
