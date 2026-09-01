'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Archive } from 'lucide-react';
import type { VideoModel } from '@/lib/imageToVideo/types';

type Props = {
  imageUrl: string;
  mode: 'image' | 'video';
  phase: 'uploading' | 'generating';
  videoModel: VideoModel;
};

function estimateSeconds(phase: 'uploading' | 'generating', mode: 'image' | 'video', videoModel: VideoModel) {
  if (phase === 'uploading') return 8;
  if (mode === 'image') return 45;
  return videoModel === 'cheap' ? 60 : 90;
}

export default function GenerationLoadingOverlay({ imageUrl, mode, phase, videoModel }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const total = estimateSeconds(phase, mode, videoModel);
  const remaining = Math.max(0, total - elapsed);
  const progress = Math.min(98, (elapsed / total) * 100);

  useEffect(() => {
    setElapsed(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, mode, videoModel]);

  const label =
    phase === 'uploading'
      ? 'Uploading image'
      : mode === 'image'
        ? 'Generating image'
        : 'Generating video';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <p className="text-4xl sm:text-5xl font-bold text-white tabular-nums mb-5">
          {remaining > 0 ? `${remaining}s` : '...'}
        </p>
        <div className="w-full max-w-xs h-1.5 rounded-full bg-white/20 overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-[#FF7A1A] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-base sm:text-lg font-medium text-white/90">{label}</p>
      </div>

      <div className="relative z-10 px-6 pb-10 sm:pb-12 text-center">
        <p className="text-sm text-white/80 mb-4">You can find your results in archive</p>
        <Link
          href="/image-to-video/archive"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#FF7A1A] text-[#FF7A1A] text-sm font-semibold hover:bg-[#FF7A1A]/10 transition-colors"
        >
          <Archive className="w-4 h-4" />
          Archive
        </Link>
      </div>
    </div>
  );
}
