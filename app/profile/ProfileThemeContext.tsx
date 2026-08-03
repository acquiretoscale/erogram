'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { updateUserProfileTheme } from '@/lib/actions/userProfile';
import {
  PROFILE_THEMES,
  clampProfileThemeForPremium,
  type ProfileThemeId,
  type ProfileThemeTokens,
  getProfileThemeTokens,
  isFreeProfileTheme,
  readProfileTheme,
  writeProfileTheme,
} from './profileTheme';

type ProfileThemeContextValue = {
  theme: ProfileThemeId;
  savedTheme: ProfileThemeId;
  tokens: ProfileThemeTokens;
  isPremium: boolean;
  previewTheme: (id: ProfileThemeId) => boolean;
  saveTheme: () => Promise<boolean>;
  themeSaving: boolean;
  themeSaved: boolean;
  themeDirty: boolean;
};

const ProfileThemeContext = createContext<ProfileThemeContextValue | null>(null);

function isStoredProfileTheme(v: string): v is ProfileThemeId {
  return v in PROFILE_THEMES;
}

export function ProfileThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ProfileThemeId>(() =>
    typeof window !== 'undefined' ? readProfileTheme() : 'light',
  );
  const [savedTheme, setSavedTheme] = useState<ProfileThemeId>(() =>
    typeof window !== 'undefined' ? readProfileTheme() : 'light',
  );
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const local = readProfileTheme();
    setThemeState(local);
    setSavedTheme(local);

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const premium = data?.premium === true;
        setIsPremium(premium);

        const fromAccount =
          data?.profileTheme && isStoredProfileTheme(data.profileTheme)
            ? (data.profileTheme as ProfileThemeId)
            : local;
        const allowed = clampProfileThemeForPremium(fromAccount, premium);
        writeProfileTheme(allowed);
        setThemeState(allowed);
        setSavedTheme(allowed);
      })
      .catch(() => {});
  }, []);

  const previewTheme = (id: ProfileThemeId) => {
    if (!isPremium && !isFreeProfileTheme(id)) return false;
    writeProfileTheme(id);
    setThemeState(id);
    setThemeSaved(false);
    return true;
  };

  const saveTheme = async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    if (!isPremium && !isFreeProfileTheme(theme)) return false;

    setThemeSaving(true);
    setThemeSaved(false);
    try {
      const res = await updateUserProfileTheme(token, theme);
      if (!res.ok) return false;
      setSavedTheme(theme);
      setThemeSaved(true);
      window.setTimeout(() => setThemeSaved(false), 3000);
      return true;
    } finally {
      setThemeSaving(false);
    }
  };

  const tokens = getProfileThemeTokens(theme);
  const themeDirty = theme !== savedTheme;

  return (
    <ProfileThemeContext.Provider
      value={{
        theme,
        savedTheme,
        tokens,
        isPremium,
        previewTheme,
        saveTheme,
        themeSaving,
        themeSaved,
        themeDirty,
      }}
    >
      {children}
    </ProfileThemeContext.Provider>
  );
}

export function useProfileTheme() {
  const ctx = useContext(ProfileThemeContext);
  if (!ctx) throw new Error('useProfileTheme must be used within ProfileThemeProvider');
  return ctx;
}
