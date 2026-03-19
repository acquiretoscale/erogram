'use client';

import { useState } from 'react';
import UsersTab from '../components/UsersTab';
import PremiumTab from '../components/PremiumTab';
import { User, Crown } from 'lucide-react';

const SECTIONS = [
  { id: 'users',   label: 'Users',   icon: User,  color: '#6366f1' },
  { id: 'premium', label: 'Premium', icon: Crown, color: '#eab308' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export default function UsersPage() {
  const [active, setActive] = useState<SectionId>('users');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-white">Users</h1>
        <p className="text-[11px] text-white/30 mt-0.5">Manage users and premium subscriptions</p>
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
        {active === 'users' && <UsersTab />}
        {active === 'premium' && <PremiumTab />}
      </div>
    </div>
  );
}
