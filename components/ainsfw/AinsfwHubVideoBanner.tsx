'use client';

import { useEffect, useRef } from 'react';
import { FAPWISE_TRY_NOW_URL } from '@/lib/ainsfw/fapwiseLinks';

const GOLOVE_SRC = '/assets/ainsfw/videos/ai-girlfriend-golove.mp4';
const GOLOVE_HREF = 'https://go.cm-trk6.com/aff_c?offer_id=16115&aff_id=93961&url_id=0&aff_sub5=banner&source=ergoramx';

export const FAPWISE_SRC = '/assets/ainsfw/videos/fapwise-uncensored-ai.mp4';
export const FAPWISE_HREF = FAPWISE_TRY_NOW_URL;

/** Hub video. Clicking the video opens the ad link. */
export default function AinsfwHubVideoBanner({
  className = '',
  src = GOLOVE_SRC,
  href = GOLOVE_HREF,
  paired = false,
  large = false,
}: {
  className?: string;
  src?: string;
  href?: string;
  paired?: boolean;
  /** 50% bigger on desktop. */
  large?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, [src]);

  return (
    <div className={`w-full ${className}`.trim()}>
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={paired ? 'block w-full cursor-pointer' : `mx-auto block w-full cursor-pointer md:w-auto ${large ? 'md:max-w-[75vw]' : 'md:max-w-[50vw]'}`}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          src={src}
          preload="metadata"
          className={`pointer-events-none w-full h-auto ${large ? 'md:max-h-[420px]' : 'md:max-h-[280px]'} object-contain bg-black rounded-lg`}
        />
      </a>
    </div>
  );
}
