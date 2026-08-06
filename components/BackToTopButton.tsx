'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type BackToTopTheme = {
  bg: string;
  hoverBg: string;
  icon: string;
  shadow: string;
  border?: string;
};

function getBackToTopTheme(pathname: string): BackToTopTheme {
  const p = pathname.toLowerCase();

  if (p.startsWith('/admin')) {
    return {
      bg: '#b31b1b',
      hoverBg: '#c42b2b',
      icon: '#ffffff',
      shadow: '0 10px 28px rgba(179, 27, 27, 0.45)',
    };
  }

  if (p.startsWith('/advert')) {
    return {
      bg: '#d97706',
      hoverBg: '#f59e0b',
      icon: '#ffffff',
      shadow: '0 10px 28px rgba(217, 119, 6, 0.45)',
    };
  }

  if (
    p.startsWith('/ainsfw') ||
    p.startsWith('/add/ainsfw') ||
    p.startsWith('/best-ai-nsfw-tools') ||
    p.startsWith('/promo') ||
    p.startsWith('/advertise') ||
    p.startsWith('/promo')
  ) {
    return {
      bg: '#22c55e',
      hoverBg: '#16a34a',
      icon: '#000000',
      shadow: '4px 4px 0px #000000',
      border: '3px solid #000000',
    };
  }

  if (
    p.startsWith('/onlyfanssearch') ||
    p.startsWith('/submit') ||
    p.includes('-onlyfans') ||
    (p.startsWith('/profile/') && p !== '/profile/leaderboard') ||
    p.startsWith('/ofm') ||
    p.startsWith('/of/')
  ) {
    return {
      bg: '#00AFF0',
      hoverBg: '#009ADB',
      icon: '#ffffff',
      shadow: '0 10px 28px rgba(0, 175, 240, 0.45)',
    };
  }

  return {
    bg: '#b31b1b',
    hoverBg: '#c42b2b',
    icon: '#ffffff',
    shadow: '0 10px 28px rgba(179, 27, 27, 0.45)',
  };
}

export default function BackToTopButton() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const theme = getBackToTopTheme(pathname || '/');
  const mobileStickyOffset = (pathname || '').toLowerCase().startsWith('/add/ainsfw');

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed right-6 z-[9999] w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
        mobileStickyOffset ? 'bottom-[4.75rem] md:bottom-6' : 'bottom-6'
      } ${theme.border ? 'rounded-lg' : 'rounded-full'} ${
        show ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{
        background: theme.bg,
        color: theme.icon,
        boxShadow: theme.shadow,
        border: theme.border,
      }}
      aria-label="Back to top"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
