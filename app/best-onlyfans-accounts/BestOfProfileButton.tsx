'use client';

import type { ReactNode } from 'react';

/**
 * Option B: creator profile links are opened via JS so Google/guests can't crawl them.
 * Lives in a client component because BestOfPageView is a server component and
 * cannot pass an onClick handler across the RSC boundary.
 */
export default function BestOfProfileButton({
  ofHref,
  className,
  children,
}: {
  ofHref: string;
  className?: string;
  children: ReactNode;
}) {
  const handleVisitProfile = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-bestof-bookmark]')) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    if (!ofHref || ofHref === '#') return;
    window.open(ofHref, '_blank', 'noopener,noreferrer');
  };

  return (
    <button type="button" onClick={handleVisitProfile} className={className}>
      {children}
    </button>
  );
}
