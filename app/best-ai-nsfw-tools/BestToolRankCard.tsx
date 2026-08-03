'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import FallbackImage from '@/components/FallbackImage';
import type { Top10ToolRankEntry } from '@/lib/bestAiNsfwTools/top10List';

const CATEGORY_BADGE: Record<string, string> = {
  'AI Companion': 'bg-blue-700/90 text-white',
  'Undress AI': 'bg-slate-700/90 text-white',
  'AI Sexting / Chat': 'bg-emerald-700/90 text-white',
  'AI NSFW Image Generator': 'bg-amber-600/90 text-white',
  'AI Porn Generator': 'bg-rose-700/90 text-white',
  'AI NSFW Roleplay': 'bg-zinc-800/90 text-white',
  'Adult Games': 'bg-purple-800/90 text-white',
};

const PAYMENT_ICON: Record<string, string> = {
  'Credit Cards': '💳',
  Crypto: '₿',
  PayPal: 'P',
};

const PLACEHOLDER = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL || '/assets/placeholder-no-image.png';

function imageSrc(image: string) {
  return image && image.startsWith('https://') ? image : PLACEHOLDER;
}

type Props = {
  entry: Top10ToolRankEntry;
  moreDetailsLabel: string;
  userReviewsLabel: string;
  index: number;
};

export default function BestToolRankCard({
  entry,
  moreDetailsLabel,
  userReviewsLabel,
  index,
}: Props) {
  const { tool, rank } = entry;
  const mainImg = imageSrc(tool.image);

  const [gallery, setGallery] = useState<string[]>(tool.galleryImages.length ? tool.galleryImages : [mainImg]);
  const [slideIdx, setSlideIdx] = useState(0);
  const [galleryFetched, setGalleryFetched] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (!cardRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setIsInView(true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: '200px', threshold: 0.01 },
    );
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || galleryFetched) return;
    setGalleryFetched(true);
    fetch(
      `/api/ainsfw/images?slug=${encodeURIComponent(tool.slug)}&name=${encodeURIComponent(tool.name)}&vendor=${encodeURIComponent(tool.vendor)}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.images?.length) {
          setGallery([mainImg, ...d.images.filter((img: string) => img !== mainImg)].slice(0, 7));
        }
      })
      .catch(() => {});
  }, [isInView, galleryFetched, tool.slug, tool.name, tool.vendor, mainImg]);

  const goSlide = useCallback(
    (dir: 1 | -1, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setSlideIdx((prev) => {
        const next = prev + dir;
        if (next < 0) return gallery.length - 1;
        if (next >= gallery.length) return 0;
        return next;
      });
    },
    [gallery.length],
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) goSlide(dx < 0 ? 1 : -1);
  };

  const currentSrc = gallery[slideIdx] || mainImg;
  const hasMultiple = gallery.length > 1;

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="relative rounded-2xl border border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-sm overflow-hidden"
    >
      <div className="absolute top-0 left-0 z-10 px-5 py-2 rounded-br-2xl bg-[#22c55e] text-black font-black text-lg">
        #{rank}
      </div>

      <div className="flex flex-col md:flex-row gap-6 p-5 md:p-7 pt-14 md:pt-7 md:pl-20">
        <div className="w-full md:w-56 lg:w-64 flex-shrink-0 mx-auto md:mx-0">
          <div
            className="group/img relative aspect-square rounded-xl overflow-hidden border border-[#22c55e]/20 shadow-lg shadow-black/30 bg-[#0a0a0a]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {isInView && (
              <FallbackImage src={imageSrc(currentSrc)} alt={tool.name} className="object-cover w-full h-full" />
            )}

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={(e) => goSlide(-1, e)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/70 text-white flex items-center justify-center text-lg font-bold opacity-100 md:opacity-0 md:group-hover/img:opacity-100 transition-opacity hover:bg-black/90"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => goSlide(1, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/70 text-white flex items-center justify-center text-lg font-bold opacity-100 md:opacity-0 md:group-hover/img:opacity-100 transition-opacity hover:bg-black/90"
                  aria-label="Next image"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSlideIdx(i);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${i === slideIdx ? 'bg-white scale-110' : 'bg-white/35'}`}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {slideIdx + 1}/{gallery.length}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-grow flex flex-col justify-center min-w-0">
          <h2 className="text-2xl md:text-3xl font-black mb-3 text-white">
            <Link href={`/ainsfw/${tool.slug}`} className="hover:text-[#22c55e] transition-colors">
              {tool.name}
            </Link>
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e]">
              {tool.reviewCount.toLocaleString()} {userReviewsLabel}
            </span>
            {tool.displayCategories.map((cat, i) => (
              <span
                key={cat}
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  i === 0
                    ? CATEGORY_BADGE[cat] || 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                    : 'bg-white/5 text-white/70 border border-white/15'
                }`}
              >
                {cat}
              </span>
            ))}
            {tool.payment.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/15">
                {tool.payment.map((method) => (
                  <span
                    key={method}
                    title={method}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/30 text-[11px] font-black text-white/90 leading-none"
                  >
                    {PAYMENT_ICON[method] || '💰'}
                  </span>
                ))}
              </span>
            )}
          </div>

          <p className="text-white/55 text-sm md:text-base mb-6 leading-relaxed line-clamp-4">{tool.description}</p>

          <Link
            href={`/ainsfw/${tool.slug}`}
            className="inline-flex justify-center items-center w-full sm:w-auto min-h-[48px] px-6 bg-[#fde047] text-black font-black text-sm uppercase tracking-wide border-[3px] border-black rounded-none shadow-[5px_5px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-[5px] active:translate-y-[5px] transition-[transform,box-shadow] duration-150"
          >
            {moreDetailsLabel}
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
