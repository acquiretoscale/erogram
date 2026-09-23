'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/stats', label: 'Dashboard', icon: '📈' },
  { href: '/schedules', label: 'Schedules', icon: '⏰' },
  { href: '/creators', label: 'Creators', icon: '⭐' },
  { href: '/groups', label: 'Groups', icon: '👥' },
  { href: '/templates', label: 'Templates', icon: '📝' },
  { href: '/media', label: 'Media', icon: '🖼️' },
  { href: '/logs', label: 'Post Logs', icon: '📋' },
];

const OWNER_NAV = [
  { href: '/users', label: 'Users', icon: '👤' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem('tgm_role');
    if (cached) { setRole(cached); return; }
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { setRole(d.role || null); if (d.role) sessionStorage.setItem('tgm_role', d.role); })
      .catch(() => {});
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  const allNav = role === 'owner' ? [...NAV, ...OWNER_NAV] : NAV;

  const navContent = (
    <>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {allNav.map(n => (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
              pathname === n.href ? 'bg-[#b31b1b]/20 text-white font-semibold' : 'text-[#999] hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        {role && (
          <p className="px-3 py-1 text-xs text-[#555] mb-1 capitalize">{role}</p>
        )}
        <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-[#888] hover:text-white rounded-lg hover:bg-white/5 transition">
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#111] border-b border-white/10 flex items-center justify-between px-4 h-14">
        <button onClick={() => setOpen(true)} className="p-2 -ml-2 text-white" aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 className="text-sm font-bold tracking-tight">TGempire</h1>
        <div className="w-8" />
      </header>

      {/* Mobile drawer backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {/* Mobile slide-out drawer */}
      <aside className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#111] border-r border-white/10 flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">TGempire</h1>
            <p className="text-xs text-[#888]">Telegram Automation</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 text-[#888] hover:text-white" aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 bg-[#111] border-r border-white/10 min-h-screen flex-col">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-tight">TGempire</h1>
          <p className="text-xs text-[#888]">Telegram Automation</p>
        </div>
        {navContent}
      </aside>
    </>
  );
}
