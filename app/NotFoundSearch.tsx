'use client';

import { useCallback, useEffect, useState } from 'react';
import ProfileOFPremiumSearch from '@/app/profile/ProfileOFPremiumSearch';
import { OF_SEARCH_TOKENS, ofSearchNavProps } from '@/app/onlyfanssearch/ofSearchTokens';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';

export default function NotFoundSearch() {
  const lp = useLocalePath();
  const { t } = useTranslation();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/onlyfans/save', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.savedIds)) setSavedIds(new Set(data.savedIds));
      })
      .catch(() => {});
  }, []);

  const handleToggleSave = useCallback(async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent('/onlyfanssearch')}`;
      return;
    }

    const alreadySaved = savedIds.has(creatorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });

    try {
      await fetch('/api/onlyfans/save', {
        method: alreadySaved ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(creatorId);
        else next.delete(creatorId);
        return next;
      });
    }
  }, [savedIds]);

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
          {t('ofSearch.heroTitle')}{' '}
          <span className="text-[#00AFF0]">{t('ofSearch.heroTitleAccent')}</span>
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-white/50 max-w-md mx-auto">
          {t('ofSearch.heroDesc')}
        </p>
      </div>
      <ProfileOFPremiumSearch
      tokens={OF_SEARCH_TOKENS}
      isPremium={false}
      freeAccess
      hideHeading
      layout="hero"
      minimalFilters
      savedCreatorIds={savedIds}
      onToggleSave={handleToggleSave}
      loginRedirect={lp('/onlyfanssearch')}
      {...ofSearchNavProps(lp)}
    />
    </div>
  );
}
