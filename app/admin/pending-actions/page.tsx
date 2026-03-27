'use client';

import { getPendingCounts } from '@/lib/actions/adminStats';
import { useState, useEffect } from 'react';
import PendingBotsTab from '../components/PendingBotsTab';
import ReviewsTab from '../components/ReviewsTab';
import ReportsTab from '../components/ReportsTab';
import { Bot, MessageSquareWarning, Flag } from 'lucide-react';

const SECTIONS = [
  { id: 'bots',    label: 'Pending Bots', icon: Bot,                 color: '#7c3aed' },
  { id: 'reviews', label: 'Reviews',      icon: MessageSquareWarning, color: '#0284c7' },
  { id: 'reports', label: 'Reports',      icon: Flag,                 color: '#ef4444' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

export default function PendingActionsPage() {
  const [active, setActive] = useState<SectionId>('bots');
  const [counts, setCounts] = useState({ bots: 0, reviews: 0, reports: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const data = await getPendingCounts(token);
        setCounts({ bots: data.bots || 0, reviews: data.reviews || 0, reports: data.reports || 0 });
      } catch {}
    };
    fetchCounts();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-white">Pending Actions</h1>
        <p className="text-[11px] text-white/30 mt-0.5">
          {counts.bots + counts.reviews + counts.reports} items need your attention
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-white/[0.06] pb-0">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const count = counts[s.id];
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
              {count > 0 && (
                <span
                  className="text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 text-white"
                  style={{ background: s.color }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {active === 'bots' && <PendingBotsTab />}
        {active === 'reviews' && <ReviewsTab />}
        {active === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}
