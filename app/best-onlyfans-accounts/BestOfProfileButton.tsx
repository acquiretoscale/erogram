'use client';

import type { ReactNode } from 'react';

/**
 * Option B: creator profile links are opened via JS so Google/guests can't crawl them.
 * Lives in a client component because BestOfPageView is a server component and
 * cannot pass an onClick handler across the RSC boundary.
 */
export default function BestOfProfileButton({
  erogramHref,
  className,
  children,
}: {
  erogramHref: string;
  className?: string;
  children: ReactNode;
}) {
  const handleErogramProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) {
      window.open(`/join-erogram?redirect=${encodeURIComponent(erogramHref)}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(erogramHref, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button type="button" onClick={handleErogramProfile} className={className}>
      {children}
    </button>
  );
}
