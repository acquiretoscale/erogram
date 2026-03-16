'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VaultTab from '@/app/profile/VaultTab';

type ViewMode = 'admin' | 'premium' | 'free';

export default function PremiumVaultPage() {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setUsername(localStorage.getItem('username'));
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.premium) setIsPremium(true);
        if (data.isAdmin) { setIsAdmin(true); localStorage.setItem('isAdmin', 'true'); }
      })
      .catch(() => {});
  }, [mounted, router]);

  const effectivePremium = isAdmin
    ? viewMode === 'admin' || viewMode === 'premium'
    : isPremium;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#111111]">
      <Navbar username={username} setUsername={setUsername} />
      <div className="pt-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {isAdmin && (
            <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">View as:</span>
              {([
                { key: 'admin' as ViewMode, label: 'Admin', color: 'purple' },
                { key: 'premium' as ViewMode, label: 'Premium', color: 'amber' },
                { key: 'free' as ViewMode, label: 'Free', color: 'gray' },
              ]).map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === mode.key
                      ? mode.color === 'purple' ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                      : mode.color === 'amber' ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                      : 'bg-white/10 text-white ring-1 ring-white/20'
                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                  }`}
                >{mode.label}</button>
              ))}
            </div>
          )}
          <VaultTab isPremium={effectivePremium} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}
