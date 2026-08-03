'use client';

import { useCallback, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NearMeLocationControls from './NearMeLocationControls';
import ProfileOFPremiumSearch from '@/app/profile/ProfileOFPremiumSearch';
import { OF_SEARCH_TOKENS, ofSearchNavProps } from '@/app/onlyfanssearch/ofSearchTokens';
import { useLocalePath } from '@/lib/i18n/client';

interface NearMeClientProps {
  visitorCountryCode?: string;
  visitorCity?: string;
  visitorAreaLabel?: string;
}

export default function NearMeClient({
  visitorCountryCode = '',
  visitorCity = '',
  visitorAreaLabel = '',
}: NearMeClientProps) {
  const lp = useLocalePath();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [placeSlug, setPlaceSlug] = useState<string | undefined>(undefined);
  const [placeLabel, setPlaceLabel] = useState('');
  const [locationMode, setLocationMode] = useState<'auto' | 'chosen'>('auto');

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
      window.location.href = `/login?redirect=${encodeURIComponent(lp('/onlyfanssearch/near-me'))}`;
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
  }, [savedIds, lp]);

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-20 pb-10">
        <section className="bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-8 pb-6 sm:pt-10 sm:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 sm:mb-8 max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white">
                OnlyFans <span className="text-[#00AFF0]">Near Me</span>: Connect with Local Creators
              </h1>
              <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/55">
                Discover Nearby OnlyFans Talent today
              </p>
            </div>
            <NearMeLocationControls
              mode={locationMode}
              chosenLabel={placeLabel}
              onUseMyLocation={() => {
                setPlaceSlug(undefined);
                setPlaceLabel('');
                setLocationMode('auto');
              }}
              onChoose={(slug, label) => {
                setPlaceSlug(slug);
                setPlaceLabel(label);
                setLocationMode('chosen');
              }}
            />
            <ProfileOFPremiumSearch
              tokens={OF_SEARCH_TOKENS}
              isPremium={false}
              freeAccess
              hideHeading
              layout="hero"
              minimalFilters
              nearMePage
              initialVisitorCountry={visitorCountryCode}
              initialVisitorCity={visitorCity}
              initialNearMeAreaLabel={visitorAreaLabel}
              nearMePlaceSlug={placeSlug}
              savedCreatorIds={savedIds}
              onToggleSave={handleToggleSave}
              loginRedirect={lp('/onlyfanssearch/near-me')}
              searchHubHref={lp('/onlyfanssearch')}
              {...ofSearchNavProps(lp)}
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
