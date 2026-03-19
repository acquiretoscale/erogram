'use client';

import { useState } from 'react';
import AdvertisersTab from '../components/AdvertisersTab';
import CtaManagerClient from '../cta/CtaManagerClient';
import { Briefcase, Target } from 'lucide-react';

const SECTIONS = [
  { id: 'advertisers', label: 'Advertisers',  icon: Briefcase, color: '#8b5cf6' },
  { id: 'cta',         label: 'CTA Manager',  icon: Target,    color: '#f97316' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export default function AdvertisersPage() {
  const [active, setActive] = useState<SectionId>('advertisers');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-white">Advertisers</h1>
        <p className="text-[11px] text-white/30 mt-0.5">Manage advertisers and call-to-action buttons</p>
      </div>

      <div className="flex gap-1.5 border-b border-white/[0.06] pb-0">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium transition-colors rounded-t-lg ${
                isActive
                  ? 'bg-white/[0.05] text-white border-b-2'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
              }`}
              style={isActive ? { borderBottomColor: s.color } : undefined}
            >
              <Icon size={14} style={isActive ? { color: s.color } : undefined} />
              {s.label}
            </button>
          );
        })}
      </div>

      <div>
        {active === 'advertisers' && <AdvertisersTab />}
        {active === 'cta' && <CtaManagerClient />}
      </div>
    </div>
  );
}
