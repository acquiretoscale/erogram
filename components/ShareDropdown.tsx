'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ShareDropdownProps {
  title: string;
  slug: string;
  itemType?: 'group' | 'bot';
  className?: string;
}

type ShareItem = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  iconBg: string;
  icon: React.ReactNode;
};

function BrandIcon({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <span
      className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-white"
      style={{ backgroundColor: bg }}
    >
      {children}
    </span>
  );
}

export default function ShareDropdown({ title, slug, itemType = 'group', className = '' }: ShareDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  const url = pageUrl || `https://erogram.pro/${slug}`;
  const kind = itemType === 'bot' ? 'Telegram bot' : 'Telegram group';
  const text = `Check out ${title} — ${kind} on Erogram`;

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
      close();
    }, 1400);
  };

  const shareItems: ShareItem[] = [
    {
      key: 'x',
      label: 'Share to X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      iconBg: '#000000',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      key: 'telegram',
      label: 'Share to Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      iconBg: '#229ED9',
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      key: 'whatsapp',
      label: 'Share to WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`,
      iconBg: '#25D366',
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      ),
    },
    {
      key: 'reddit',
      label: 'Share to Reddit',
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      iconBg: '#FF4500',
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
    },
    {
      key: 'tumblr',
      label: 'Share to Tumblr',
      href: `https://www.tumblr.com/widgets/share/tool?posttype=link&title=${encodeURIComponent(title)}&caption=${encodeURIComponent(text)}&content=${encodeURIComponent(url)}`,
      iconBg: '#001935',
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H3.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C7.84.051 7.941 0 8.051 0h3.975v6.456h5.725v3.819h-5.725v7.928c0 1.421.798 2.317 2.073 2.317 1.226 0 1.877-.955 1.877-2.317V9.747h4.395v3.683c0 5.096-2.859 10.57-8.633 10.57z" />
        </svg>
      ),
    },
    {
      key: 'copy-link',
      label: copiedKey === 'copy-link' ? 'Copied!' : 'Copy link',
      onClick: () => copyText(url, 'copy-link'),
      iconBg: '#E84393',
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: 'copy-time',
      label: copiedKey === 'copy-time' ? 'Copied!' : 'Copy current time',
      onClick: () => copyText(new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' }), 'copy-time'),
      iconBg: '#E84393',
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  const rowClass =
    'flex items-center gap-3.5 w-full px-4 py-3 text-left text-[15px] font-medium text-[#1a1a1a] hover:bg-[#f5f5f7] active:bg-[#ebebef] transition-colors';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Share"
        aria-expanded={open}
        className={`flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-200 ${
          open
            ? 'bg-white text-[#1a1a1a] border-white shadow-lg shadow-black/20'
            : 'bg-white/[0.08] border-white/20 text-white/80 hover:text-white hover:bg-white/[0.14] hover:border-white/30'
        }`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+10px)] z-[100] w-[min(100vw-2rem,280px)] rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          role="menu"
        >
          <div className="py-1.5">
            {shareItems.map(({ key, label, href, onClick, iconBg, icon }) =>
              href ? (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  role="menuitem"
                  onClick={close}
                  className={rowClass}
                >
                  <BrandIcon bg={iconBg}>{icon}</BrandIcon>
                  <span>{label}</span>
                </a>
              ) : (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  onClick={onClick}
                  className={rowClass}
                >
                  <BrandIcon bg={iconBg}>{icon}</BrandIcon>
                  <span>{label}</span>
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
