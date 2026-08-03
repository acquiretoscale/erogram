'use client';

import type { ReactNode } from 'react';
import { useProfileTheme } from './ProfileThemeContext';
import { profileEyebrowClass, profileTitleClass } from './profileTheme';

type HeadingSize = 'hero' | 'xl' | 'lg' | 'md' | 'sm';

const SIZE_CLASS: Record<HeadingSize, string> = {
  hero: 'text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem]',
  xl: 'text-[1.75rem] sm:text-[2rem]',
  lg: 'text-[1.5rem]',
  md: 'text-[1.25rem] sm:text-[1.5rem]',
  sm: 'text-[1.05rem] leading-tight',
};

export function ProfileEyebrow({ children, className = '', muted = false }: { children: ReactNode; className?: string; muted?: boolean }) {
  const { theme, tokens } = useProfileTheme();
  if (theme === 'cyberpunk') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-[10px] font-bold uppercase tracking-[2px] ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse shrink-0" />
        {children}
      </div>
    );
  }
  if (theme === 'pornhub') {
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-md bg-[#FF9000] text-black text-[10px] font-black uppercase tracking-[0.14em] ${className}`}>
        {children}
      </div>
    );
  }
  if (theme === 'onlyfans') {
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full bg-[#00AFF0]/10 border border-[#00AFF0]/35 text-[#00AFF0] text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}>
        {children}
      </div>
    );
  }
  if (theme === 'telegram') {
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full bg-[#2AABEE]/14 border border-[#2AABEE]/40 text-[#6AB2F3] text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}>
        {children}
      </div>
    );
  }
  if (theme === 'erogram') {
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full bg-[#7f1d1d] border border-[#991b1b] text-[#FDFDFD] text-[10px] font-bold uppercase tracking-[0.14em] ${className}`}>
        {children}
      </div>
    );
  }
  if (theme === 'console') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff5e2a]/10 border border-[#ff5e2a]/30 text-[#ff7a3d] text-[10px] font-bold uppercase tracking-[0.14em] ${className}`}>
        <span className="w-1 h-1 rounded-full bg-[#ff7a3d] animate-pulse shrink-0" />
        {children}
      </div>
    );
  }
  return (
    <div className={`${profileEyebrowClass} ${className}`} style={{ color: muted ? tokens.muted : tokens.text }}>
      {children}
    </div>
  );
}

export function ProfileHeading({
  children,
  size = 'lg',
  accent,
  as: Tag = size === 'hero' ? 'h1' : 'h2',
  className = '',
}: {
  children: ReactNode;
  size?: HeadingSize;
  accent?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const { theme, tokens } = useProfileTheme();
  if (theme === 'cyberpunk') {
    return (
      <Tag className={`ainsfw-hero-title ${SIZE_CLASS[size]} leading-none ${size !== 'hero' ? 'mt-2' : ''} ${className}`}>
        {children}
        {accent != null && <> <span className="ainsfw-hero-customers">{accent}</span></>}
      </Tag>
    );
  }
  if (theme === 'pornhub') {
    const hubClass = size === 'hero' ? 'profile-ph-title-hub-text' : 'profile-ph-title-hub';
    return (
      <Tag className={`profile-ph-title ${SIZE_CLASS[size]} leading-none ${size !== 'hero' ? 'mt-2' : ''} ${className}`}>
        <span className="profile-ph-title-main">{children}</span>
        {accent != null && <span className={hubClass}>{accent}</span>}
      </Tag>
    );
  }
  if (theme === 'onlyfans') {
    return (
      <Tag className={`profile-of-title ${SIZE_CLASS[size]} leading-none ${size !== 'hero' ? 'mt-2' : ''} ${className}`}>
        <span className="profile-of-title-main">{children}</span>
        {accent != null && <span className="profile-of-title-accent">{accent}</span>}
      </Tag>
    );
  }
  if (theme === 'telegram') {
    return (
      <Tag className={`profile-tg-title ${SIZE_CLASS[size]} leading-none ${size !== 'hero' ? 'mt-2' : ''} ${className}`}>
        <span className="profile-tg-title-main">{children}</span>
        {accent != null && <span className="profile-tg-title-accent">{accent}</span>}
      </Tag>
    );
  }
  if (theme === 'erogram') {
    return (
      <Tag className={`profile-ero-title ${SIZE_CLASS[size]} leading-none ${size !== 'hero' ? 'mt-2' : ''} ${className}`}>
        <span className="profile-ero-title-main">{children}</span>
        {accent != null && <span className="profile-ero-title-accent">{accent}</span>}
      </Tag>
    );
  }
  if (theme === 'console') {
    return (
      <Tag className={`profile-console-title ${SIZE_CLASS[size]} leading-none ${size !== 'hero' ? 'mt-2' : ''} ${className}`}>
        <span className="profile-console-title-main">{children}</span>
        {accent != null && <span className="profile-console-title-accent">{accent}</span>}
      </Tag>
    );
  }
  return (
    <Tag
      className={`${profileTitleClass} ${SIZE_CLASS[size]} ${size !== 'hero' ? 'mt-2' : ''} ${className}`}
      style={{ color: tokens.text }}
    >
      {children}
      {accent != null && <> {accent}</>}
    </Tag>
  );
}
