'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, LayoutGrid, Rocket } from 'lucide-react';

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[15px] font-semibold text-white">Ad Network</h1>
        <p className="text-[11px] text-white/30 mt-0.5">{active.hint}</p>
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
