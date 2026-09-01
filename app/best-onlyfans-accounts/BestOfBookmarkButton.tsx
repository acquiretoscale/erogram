'use client';

import { Bookmark } from 'lucide-react';

function goRegisterLogin() {
  if (typeof window === 'undefined') return;
  const redirect = `${window.location.pathname}${window.location.search}`;
  window.location.href = `/join-erogram?redirect=${encodeURIComponent(redirect)}`;
}

export default function BestOfBookmarkButton() {
  return (
    <span
      data-bestof-bookmark="1"
      role="link"
      tabIndex={0}
      title="Bookmark"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        goRegisterLogin();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          goRegisterLogin();
        }
      }}
      className="inline-flex shrink-0 self-stretch items-center justify-center rounded-xl text-white px-3.5 cursor-pointer hover:opacity-95"
      style={{ backgroundColor: '#00AFF0', boxShadow: '0 8px 22px rgba(0,175,240,0.35)' }}
    >
      <Bookmark size={18} aria-hidden="true" />
    </span>
  );
}
