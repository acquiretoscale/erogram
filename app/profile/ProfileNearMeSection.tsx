'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { getNearMeCreators, type NearMeCreatorItem } from '@/lib/actions/userProfile';
import { useProfileTheme } from './ProfileThemeContext';
import { ProfileHeading } from './ProfileTypography';
import ProfileGridDensityToggle from './ProfileGridDensityToggle';
import {
  loadProfileGridDensity,
  profileGridClass,
  profileGridGapClass,
  type ProfileGridDensity,
} from './profileGridDensity';

interface ProfileNearMeSectionProps {
  savedCreatorIds: Set<string>;
  onToggleSave: (creatorId: string) => void;
}

export default function ProfileNearMeSection({
  savedCreatorIds,
  onToggleSave,
}: ProfileNearMeSectionProps) {
  const { tokens } = useProfileTheme();
  const [creators, setCreators] = useState<NearMeCreatorItem[]>([]);
  const [areaLabel, setAreaLabel] = useState('');
  const [needsLocation, setNeedsLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shuffling, setShuffling] = useState(false);
  const [gridDensity, setGridDensity] = useState<ProfileGridDensity>(() => loadProfileGridDensity());

  const load = useCallback(async (seed?: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await getNearMeCreators(token, seed || 'default');
    if (!res.ok) return;
    setCreators(res.creators);
    setAreaLabel(res.areaLabel);
    setNeedsLocation(res.needsLocation);
  }, []);

  useEffect(() => {
    load('initial').finally(() => setLoading(false));
  }, [load]);

  const shuffle = async () => {
    setShuffling(true);
    try {
      await load(String(Date.now()));
    } finally {
      setShuffling(false);
    }
  };

  return (
    <section className="mb-10">
      <div className="border-b pb-4 mb-5" style={{ borderColor: tokens.border }}>
        <ProfileHeading size="md" as="h3" className="!mt-0">
          Near me
        </ProfileHeading>
        {areaLabel && !needsLocation && (
          <p className="text-[11px] mt-1" style={{ color: tokens.muted }}>
            {areaLabel}
          </p>
        )}
        {creators.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <ProfileGridDensityToggle
              value={gridDensity}
              onChange={setGridDensity}
              tokens={{
                pillBorder: tokens.border,
                pillBg: tokens.hover,
                viewBtnBg: tokens.accent,
                viewBtnTxt: tokens.ink,
                accentDim: tokens.muted,
              }}
            />
            <button
              type="button"
              onClick={shuffle}
              disabled={shuffling}
              className="text-[11px] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ color: tokens.text }}
            >
              Shuffle
            </button>
          </div>
        )}
      </div>

      {loading || shuffling ? (
        <div className={`grid ${profileGridClass(gridDensity)} ${profileGridGapClass(gridDensity)}`}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl animate-pulse" style={{ backgroundColor: tokens.hover }} />
          ))}
        </div>
      ) : needsLocation ? (
        <p className="text-sm" style={{ color: tokens.muted }}>
          Region not detected yet. Log in again from your area, or browse with search above.
        </p>
      ) : creators.length === 0 ? (
        <p className="text-sm" style={{ color: tokens.muted }}>
          No nearby creators found for your region yet.
        </p>
      ) : (
        <div className={`grid ${profileGridClass(gridDensity)} ${profileGridGapClass(gridDensity)}`}>
          {creators.map((creator) => (
            <div
              key={creator._id}
              className="group rounded-xl overflow-hidden border transition-all hover:opacity-95 relative"
              style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
            >
              <a
                href={`/${creator.username}-onlyfans`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img
                    src={creator.avatar}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/placeholder-no-image.png';
                    }}
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold truncate" style={{ color: tokens.text }}>
                    {creator.name || creator.username}
                  </p>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: tokens.muted }}>
                    @{creator.username}
                    {creator.location ? ` · ${creator.location}` : ''}
                  </p>
                </div>
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSave(creator._id);
                }}
                className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                  savedCreatorIds.has(creator._id)
                    ? 'bg-[#00AFF0] text-white shadow-lg'
                    : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white'
                }`}
              >
                <Bookmark size={14} fill={savedCreatorIds.has(creator._id) ? 'currentColor' : 'none'} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
