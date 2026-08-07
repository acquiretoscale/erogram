'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutGrid, Rocket } from 'lucide-react';
import { getAdTrackingKillSwitch, setAdTrackingKillSwitch } from '@/lib/adTrackingKillSwitch';

// Real routes (URL actually changes), each page its own file:
//   /admin/ad-network             → Overview (all your numbers, one place)
//   /admin/ad-network/management  → Management (pause / edit / cap ads by tier)
//   /admin/ad-network/launch      → Launch (create new ad campaigns)
const LINKS = [
  { href: '/admin/ad-network', label: 'Overview', icon: BarChart3, color: '#10b981', hint: 'All your ad numbers in one place' },
  { href: '/admin/ad-network/management', label: 'Management', icon: LayoutGrid, color: '#8b5cf6', hint: 'Pause, edit & cap ads by tier' },
  { href: '/admin/ad-network/launch', label: 'Launch', icon: Rocket, color: '#b31b1b', hint: 'Create a new ad campaign' },
] as const;

export default function AdNetworkNav() {
  const path = usePathname();
  const active = LINKS.find((l) => l.href === path) ?? LINKS[0];
  const [token, setToken] = useState('');
  const [trackingPaused, setTrackingPaused] = useState(false);
  const [loadingKill, setLoadingKill] = useState(true);
  const [savingKill, setSavingKill] = useState(false);
  const [killMsg, setKillMsg] = useState('');

  useEffect(() => {
    setToken(typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoadingKill(true);
    getAdTrackingKillSwitch(token)
      .then((v) => setTrackingPaused(Boolean(v)))
      .catch(() => {})
      .finally(() => setLoadingKill(false));
  }, [token]);

  const toggleKill = async () => {
    if (!token || savingKill) return;
    const next = !trackingPaused;
    setSavingKill(true);
    try {
      await setAdTrackingKillSwitch(token, next);
      setTrackingPaused(next);
      setKillMsg(next ? 'Ad tracking OFF sitewide' : 'Ad tracking ON again');
      setTimeout(() => setKillMsg(''), 3500);
    } catch {
      setKillMsg('Failed to update kill switch');
      setTimeout(() => setKillMsg(''), 3500);
    }
    setSavingKill(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[15px] font-semibold text-white">Ad Network</h1>
          <p className="text-[11px] text-white/30 mt-0.5">{active.hint}</p>
        </div>

        <div className="flex flex-col items-end gap-1.5 max-w-md">
          <button
            type="button"
            onClick={toggleKill}
            disabled={loadingKill || savingKill || !token}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${
              trackingPaused
                ? 'border-amber-400/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                : 'border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
            }`}
            title="Stops all ad click counting sitewide. Ads still show and rotate."
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                trackingPaused ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            {loadingKill
              ? 'Loading…'
              : trackingPaused
                ? 'Tracking KILL SWITCH: ON'
                : 'Tracking kill switch: Off'}
          </button>
          <p className="text-[10px] text-white/35 text-right leading-snug">
            {trackingPaused
              ? 'No ad clicks counted. Ads still serve and alternate. Caps and boost weight off.'
              : 'Click to pause all ad-network click tracking for a test week. Ads keep running.'}
          </p>
          {killMsg ? <p className="text-[10px] text-white/60">{killMsg}</p> : null}
        </div>
      </div>

      <div className="flex gap-1.5 border-b border-white/[0.06]">
        {LINKS.map((l) => {
          const Icon = l.icon;
          const isActive = l.href === active.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium transition-colors rounded-t-lg ${
                isActive
                  ? 'bg-white/[0.05] text-white border-b-2'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
              }`}
              style={isActive ? { borderBottomColor: l.color } : undefined}
            >
              <Icon size={14} style={isActive ? { color: l.color } : undefined} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
