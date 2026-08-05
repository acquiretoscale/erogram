'use client';

import { useEffect, useState } from 'react';
import AvatarPicker from '@/components/AvatarPicker';
import InterestsEditSection from '@/components/InterestsEditSection';
import { type InterestOption } from '@/lib/userInterests';
import type { ProfileThemeId } from './profileTheme';
import { useProfileTheme } from './ProfileThemeContext';
import {
  hasChosenProfileAvatar,
  hasCustomizedFeedCategories,
} from '@/lib/profileHomeSetup';

const EXPLORE_FEED_DONE_COLOR = '#16a34a';
type TabTarget = 'feed';
type ExpandedStep = 'avatar' | 'feed-categories';

const STEPS = [
  {
    id: 'avatar' as const,
    title: 'Pick your avatar',
    cta: 'Pick avatar',
  },
  {
    id: 'feed-categories' as const,
    title: 'Customise your feed',
    cta: 'Choose categories',
  },
  {
    id: 'explore-feed' as const,
    title: 'Explore your feed',
    cta: 'Open My Feed',
  },
];

export default function ProfileHomeSetupSteps({
  photoUrl,
  interests,
  preferredPlatforms,
  aiInterests,
  tagOptions,
  aiOptions,
  themeMode,
  onNavigate,
  onAvatarSaved,
  onAvatarError,
  onInterestsSaved,
  onInterestsError,
}: {
  photoUrl: string | null;
  interests: string[];
  preferredPlatforms: string[];
  aiInterests: string[];
  tagOptions: InterestOption[];
  aiOptions: InterestOption[];
  themeMode: ProfileThemeId;
  onNavigate: (tab: TabTarget) => void;
  onAvatarSaved: (url: string) => void;
  onAvatarError: (msg: string) => void;
  onInterestsSaved: (data: { preferredPlatforms: string[]; interests: string[]; aiInterests: string[] }) => void;
  onInterestsError: (msg: string) => void;
}) {
  const { tokens } = useProfileTheme();
  const [expandedStep, setExpandedStep] = useState<ExpandedStep | null>(null);
  const categoriesReady = hasCustomizedFeedCategories(interests);

  const done = {
    avatar: hasChosenProfileAvatar(photoUrl),
    'feed-categories': categoriesReady,
    'explore-feed': categoriesReady,
  };

  useEffect(() => {
    if (expandedStep === 'avatar' && done.avatar) setExpandedStep(null);
    if (expandedStep === 'feed-categories' && done['feed-categories']) setExpandedStep(null);
  }, [done.avatar, done['feed-categories'], expandedStep]);

  const remaining = STEPS.filter((step) => !done[step.id]);
  if (remaining.length === 0) return null;

  const handleStepClick = (stepId: typeof STEPS[number]['id']) => {
    if (stepId === 'explore-feed') {
      onNavigate('feed');
      return;
    }
    setExpandedStep((prev) => (prev === stepId ? null : stepId));
  };

  return (
    <section className="mb-10">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-black leading-tight mb-2" style={{ color: tokens.text }}>
          Welcome to Erogram
        </h2>
        <p className="text-sm leading-relaxed max-w-2xl" style={{ color: tokens.muted }}>
          Set up your profile in 3 quick steps. Takes under a minute and makes everything you see match what you actually like.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STEPS.map((step, index) => {
          const complete = done[step.id];
          const expanded = expandedStep === step.id;
          const isExploreFeed = step.id === 'explore-feed';
          const accentColor = isExploreFeed && complete ? EXPLORE_FEED_DONE_COLOR : tokens.accent;
          return (
            <div
              key={step.id}
              className="rounded-xl border p-4 flex flex-col"
              style={{
                borderColor: complete ? accentColor : expanded ? tokens.accent : tokens.border,
                backgroundColor: complete ? tokens.hover : expanded ? tokens.hover : tokens.card,
                opacity: complete && !isExploreFeed ? 0.72 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
                  style={{
                    backgroundColor: complete ? accentColor : tokens.hover,
                    color: complete ? '#fff' : tokens.text,
                    border: complete ? 'none' : `1px solid ${tokens.border}`,
                  }}
                >
                  {complete ? '✓' : index + 1}
                </span>
                {complete && (
                  <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: accentColor }}>
                    Done
                  </span>
                )}
              </div>
              <h4 className="text-[14px] font-bold leading-tight mb-4 flex-1" style={{ color: tokens.text }}>
                {step.title}
              </h4>
              {(isExploreFeed || !complete) && (
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className="w-full rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    backgroundColor: isExploreFeed && complete ? EXPLORE_FEED_DONE_COLOR : tokens.accent,
                    color: isExploreFeed && complete ? '#fff' : tokens.ink,
                  }}
                >
                  {expanded && !isExploreFeed ? 'Close' : step.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {expandedStep === 'avatar' && !done.avatar && (
        <AvatarPicker
          themeMode={themeMode}
          currentPhotoUrl={photoUrl}
          hideTrigger
          startOpen
          onOpenChange={(open) => { if (!open) setExpandedStep(null); }}
          onSaved={onAvatarSaved}
          onError={onAvatarError}
        />
      )}

      {expandedStep === 'feed-categories' && !done['feed-categories'] && (
        <div
          className="mt-3 rounded-xl border p-4 sm:p-6"
          style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
        >
          <InterestsEditSection
            themeMode={themeMode}
            preferredPlatforms={preferredPlatforms}
            interests={interests}
            aiInterests={aiInterests}
            tagOptions={tagOptions}
            aiOptions={aiOptions}
            onSaved={onInterestsSaved}
            onError={onInterestsError}
          />
        </div>
      )}
    </section>
  );
}
