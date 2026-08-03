'use client';

import { useEffect, useState } from 'react';
import { useProfileTheme } from './ProfileThemeContext';
import {
  hasChosenProfileAvatar,
  hasCustomizedFeedCategories,
  hasExploredProfileFeed,
} from '@/lib/profileHomeSetup';

type TabTarget = 'settings' | 'feed';

const STEPS = [
  {
    id: 'avatar',
    title: 'Pick your avatar',
    tab: 'settings' as TabTarget,
    cta: 'Pick avatar',
  },
  {
    id: 'feed-categories',
    title: 'Customise your feed',
    tab: 'settings' as TabTarget,
    cta: 'Choose categories',
  },
  {
    id: 'explore-feed',
    title: 'Explore your feed',
    tab: 'feed' as TabTarget,
    cta: 'Open My Feed',
  },
];

export default function ProfileHomeSetupSteps({
  photoUrl,
  interests,
  onNavigate,
}: {
  photoUrl: string | null;
  interests: string[];
  onNavigate: (tab: TabTarget) => void;
}) {
  const { tokens } = useProfileTheme();
  const [feedExplored, setFeedExplored] = useState(false);

  useEffect(() => {
    setFeedExplored(hasExploredProfileFeed());
    const sync = () => setFeedExplored(hasExploredProfileFeed());
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const done = {
    avatar: hasChosenProfileAvatar(photoUrl),
    'feed-categories': hasCustomizedFeedCategories(interests),
    'explore-feed': feedExplored,
  };

  const remaining = STEPS.filter((step) => !done[step.id as keyof typeof done]);
  if (remaining.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STEPS.map((step, index) => {
          const complete = done[step.id as keyof typeof done];
          return (
            <div
              key={step.id}
              className="rounded-xl border p-4 flex flex-col"
              style={{
                borderColor: complete ? tokens.accent : tokens.border,
                backgroundColor: complete ? tokens.hover : tokens.card,
                opacity: complete ? 0.72 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                  style={{
                    backgroundColor: complete ? tokens.accent : tokens.hover,
                    color: complete ? tokens.ink : tokens.text,
                    border: complete ? 'none' : `1px solid ${tokens.border}`,
                  }}
                >
                  {complete ? '✓' : index + 1}
                </span>
                {complete && (
                  <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: tokens.accent }}>
                    Done
                  </span>
                )}
              </div>
              <h4 className="text-[14px] font-bold leading-tight mb-4 flex-1" style={{ color: tokens.text }}>
                {step.title}
              </h4>
              {!complete && (
                <button
                  type="button"
                  onClick={() => onNavigate(step.tab)}
                  className="w-full rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: tokens.accent, color: tokens.ink }}
                >
                  {step.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
