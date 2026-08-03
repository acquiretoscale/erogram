'use client';

import { useEffect, useState } from 'react';
import { USER_PLATFORMS, type InterestOption } from '@/lib/userInterests';
import { getProfileInterestOptions, updateUserInterests } from '@/lib/actions/userProfile';

import type { ProfileThemeId } from '@/app/profile/profileTheme';
import { getProfileThemeTokens, profileComponentColors } from '@/app/profile/profileTheme';

interface InterestsEditSectionProps {
  preferredPlatforms: string[];
  interests: string[];
  aiInterests: string[];
  tagOptions?: InterestOption[];
  aiOptions?: InterestOption[];
  editorial?: boolean;
  themeMode?: ProfileThemeId;
  onSaved: (data: { preferredPlatforms: string[]; interests: string[]; aiInterests: string[] }) => void;
  onError?: (message: string) => void;
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function InterestsEditSection({
  preferredPlatforms,
  interests,
  aiInterests,
  tagOptions: tagOptionsProp,
  aiOptions: aiOptionsProp,
  editorial = false,
  themeMode,
  onSaved,
  onError,
}: InterestsEditSectionProps) {
  const mode = themeMode ?? (editorial ? 'light' : undefined);
  const c = mode ? profileComponentColors(mode) : null;
  const tokens = mode ? getProfileThemeTokens(mode) : null;
  const [platforms, setPlatforms] = useState<string[]>(preferredPlatforms);
  const [ofCats, setOfCats] = useState<string[]>(interests);
  const [aiCats, setAiCats] = useState<string[]>(aiInterests);
  const [saving, setSaving] = useState(false);
  const [tagOptions, setTagOptions] = useState<InterestOption[]>(tagOptionsProp || []);
  const [aiOptions, setAiOptions] = useState<InterestOption[]>(aiOptionsProp || []);
  const [loadingOptions, setLoadingOptions] = useState(!tagOptionsProp?.length);

  useEffect(() => {
    setPlatforms(preferredPlatforms);
    setOfCats(interests);
    setAiCats(aiInterests);
  }, [preferredPlatforms, interests, aiInterests]);

  useEffect(() => {
    if (tagOptionsProp?.length) {
      setTagOptions(tagOptionsProp);
      setAiOptions(aiOptionsProp || []);
      setLoadingOptions(false);
      return;
    }
    let cancelled = false;
    getProfileInterestOptions()
      .then((opts) => {
        if (cancelled) return;
        setTagOptions(opts.tagInterests);
        setAiOptions(opts.aiInterests);
      })
      .catch(() => onError?.('Failed to load categories'))
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tagOptionsProp, aiOptionsProp, onError]);

  const showOfTg = platforms.includes('onlyfans') || platforms.includes('telegram');
  const showAi = platforms.includes('ai');

  const dirty =
    JSON.stringify([...platforms].sort()) !== JSON.stringify([...preferredPlatforms].sort()) ||
    JSON.stringify([...ofCats].sort()) !== JSON.stringify([...interests].sort()) ||
    JSON.stringify([...aiCats].sort()) !== JSON.stringify([...aiInterests].sort());

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      onError?.('Please log in again');
      return;
    }
    setSaving(true);
    try {
      const res = await updateUserInterests(token, {
        preferredPlatforms: platforms,
        interests: ofCats,
        aiInterests: aiCats,
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
    c
      ? 'px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border'
      : `px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
          active
            ? 'bg-[#00aff0]/15 border-[#00aff0]/40 text-[#00aff0]'
            : 'bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
        }`;

  const platformStyle = (active: boolean): React.CSSProperties | undefined =>
    c ? {
      backgroundColor: active ? tokens!.hover : c.inputBg,
      borderColor: c.border,
    } : undefined;

  const platformBtn = (active: boolean) =>
    c
      ? 'flex-1 min-w-[90px] px-3 py-2.5 rounded-xl text-left transition-all border'
      : `flex-1 min-w-[90px] px-3 py-2.5 rounded-xl text-left transition-all border ${
          active ? 'bg-[#00aff0]/10 border-[#00aff0]/40' : 'bg-white/[0.03] border-white/10 hover:border-white/20'
        }`;

  const sectionLabel = c ? 'text-[11px] font-bold tracking-[0.2em] uppercase mb-2' : 'text-[11px] font-semibold text-white/45 mb-2';
  const saveBtn = c
    ? 'w-full py-2.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90'
    : 'w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 bg-white/[0.06] hover:bg-white/[0.1]';

  return (
    <div className={`mb-6 space-y-4 text-left border-t pt-6 ${c ? '' : 'border-white/[0.06]'}`} style={c ? { borderColor: c.border } : undefined}>
      <div>
        <p className={sectionLabel} style={{ color: c?.muted }}>Platforms</p>
        <div className="flex flex-wrap gap-2">
          {USER_PLATFORMS.map((p) => {
            const active = platforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatforms((prev) => toggle(prev, p.id))}
                className={platformBtn(active)}
                style={platformStyle(active)}
              >
                <span className="text-sm font-bold block" style={{ color: active ? c?.text ?? undefined : c?.muted ?? undefined }}>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showOfTg && (
        <div>
          <p className={sectionLabel} style={{ color: c?.muted }}>
            {platforms.includes('onlyfans') && platforms.includes('telegram')
              ? 'OnlyFans & Telegram categories'
              : platforms.includes('onlyfans')
                ? 'OnlyFans categories'
                : 'Telegram categories'}
          </p>
          {loadingOptions ? (
            <p className="text-[11px]" style={{ color: c?.muted }}>Loading categories...</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-80 overflow-y-auto pr-1">
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
      )}

      {showAi && (
        <div>
          <p className={sectionLabel} style={{ color: c?.muted }}>AI NSFW categories</p>
          {loadingOptions ? (
            <p className="text-[11px]" style={{ color: c?.muted }}>Loading categories...</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {aiOptions.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setAiCats((prev) => toggle(prev, item.slug))}
                  className={pill(aiCats.includes(item.slug))}
                  style={pillStyle(aiCats.includes(item.slug))}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving || loadingOptions}
        className={saveBtn}
        style={c ? { backgroundColor: c.btnBg, color: c.btnText } : undefined}
      >
        {saving ? 'Saving...' : 'Save interests'}
      </button>
    </div>
  );
}
