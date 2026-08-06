'use client';

import { useEffect, useState } from 'react';
import { type InterestOption } from '@/lib/userInterests';
import { getProfileInterestOptions, updateUserInterests } from '@/lib/actions/userProfile';

import type { ProfileThemeId } from '@/app/profile/profileTheme';
import { profileComponentColors } from '@/app/profile/profileTheme';

interface InterestsEditSectionProps {
  preferredPlatforms: string[];
  interests: string[];
  aiInterests: string[];
  tagOptions?: InterestOption[];
  aiOptions?: InterestOption[];
  editorial?: boolean;
  embedded?: boolean;
  minimumCategories?: number;
  themeMode?: ProfileThemeId;
  onSaved: (data: { preferredPlatforms: string[]; interests: string[]; aiInterests: string[] }) => void;
  onError?: (message: string) => void;
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function InterestsEditSection({
  interests,
  tagOptions: tagOptionsProp,
  editorial = false,
  embedded = false,
  minimumCategories = 0,
  themeMode,
  onSaved,
  onError,
}: InterestsEditSectionProps) {
  const mode = themeMode ?? (editorial ? 'light' : undefined);
  const c = mode ? profileComponentColors(mode) : null;
  const [ofCats, setOfCats] = useState<string[]>(interests);
  const [saving, setSaving] = useState(false);
  const [tagOptions, setTagOptions] = useState<InterestOption[]>(tagOptionsProp || []);
  const [loadingOptions, setLoadingOptions] = useState(!tagOptionsProp?.length);

  useEffect(() => {
    setOfCats(interests);
  }, [interests]);

  useEffect(() => {
    if (tagOptionsProp?.length) {
      setTagOptions(tagOptionsProp);
      setLoadingOptions(false);
      return;
    }
    let cancelled = false;
    getProfileInterestOptions()
      .then((opts) => {
        if (cancelled) return;
        setTagOptions(opts.tagInterests);
      })
      .catch(() => onError?.('Failed to load categories'))
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tagOptionsProp, onError]);

  const dirty = JSON.stringify([...ofCats].sort()) !== JSON.stringify([...interests].sort());
  const minMet = minimumCategories <= 0 || ofCats.length >= minimumCategories;
  const canSave = dirty && minMet && !saving && !loadingOptions;

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      onError?.('Please log in again');
      return;
    }
    if (minimumCategories > 0 && ofCats.length < minimumCategories) {
      onError?.(`Pick at least ${minimumCategories} categories to personalize your feed.`);
      return;
    }
    setSaving(true);
    try {
      const res = await updateUserInterests(token, {
        preferredPlatforms: ['onlyfans'],
        interests: ofCats,
        aiInterests: [],
      });
      if (!res.ok) {
        onError?.(res.message || 'Failed to save interests');
        return;
      }
      onSaved({
        preferredPlatforms: res.preferredPlatforms,
        interests: res.interests,
        aiInterests: res.aiInterests,
      });
    } catch {
      onError?.('Failed to save interests');
    } finally {
      setSaving(false);
    }
  };

  const pillStyle = (active: boolean): React.CSSProperties | undefined =>
    c ? {
      backgroundColor: active ? c.pillActiveBg : c.inputBg,
      borderColor: c.border,
      color: active ? c.pillActiveText : c.muted,
    } : undefined;

  const pill = (active: boolean) =>
    embedded && c
      ? 'px-2.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.06em] transition-all border'
      : c
      ? 'px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border'
      : `px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
          active
            ? 'bg-[#00aff0]/15 border-[#00aff0]/40 text-[#00aff0]'
            : 'bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
        }`;

  const sectionLabel = c ? 'text-[11px] font-bold tracking-[0.2em] uppercase mb-2' : 'text-[11px] font-semibold text-white/45 mb-2';
  const saveBtn = embedded && c
    ? 'w-full py-2.5 rounded-md text-[12px] font-bold tracking-[0.06em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90'
    : c
    ? 'w-full py-2.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90'
    : 'w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 bg-white/[0.06] hover:bg-white/[0.1]';

  return (
    <div
      className={`mb-6 space-y-4 text-left ${embedded ? '' : 'border-t pt-6'} ${embedded ? '' : c ? '' : 'border-white/[0.06]'}`}
      style={embedded ? undefined : c ? { borderColor: c.border } : undefined}
    >
      <div>
        {(minimumCategories > 0 || !embedded) && (
        <div className={`flex flex-wrap items-center gap-2 mb-2 ${minimumCategories > 0 ? 'justify-end' : ''}`}>
          {minimumCategories <= 0 && !embedded && (
            <p className={sectionLabel} style={{ color: c?.muted, marginBottom: 0 }}>Categories</p>
          )}
          {minimumCategories > 0 && (
            <p className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: minMet ? c?.text ?? '#00aff0' : c?.muted ?? 'rgba(255,255,255,0.45)' }}>
              {ofCats.length} selected · min {minimumCategories}
            </p>
          )}
        </div>
        )}
        {loadingOptions ? (
          <p className="text-[11px]" style={{ color: c?.muted }}>Loading categories...</p>
        ) : (
          <div className={`flex flex-wrap gap-1.5 max-h-80 overflow-y-auto pr-1 ${embedded && c ? 'sm:gap-2' : ''}`}>
            {tagOptions.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setOfCats((prev) => toggle(prev, item.slug))}
                className={pill(ofCats.includes(item.slug))}
                style={pillStyle(ofCats.includes(item.slug))}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className={saveBtn}
        style={c ? { backgroundColor: c.btnBg, color: c.btnText } : undefined}
      >
        {saving ? 'Saving...' : 'Save interests'}
      </button>
    </div>
  );
}
