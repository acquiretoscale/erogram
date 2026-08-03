'use client';

import { useEffect, useState } from 'react';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
import Link from 'next/link';
import ProfileGridDensityToggle from './ProfileGridDensityToggle';
import {
  loadProfileGridDensity,
  profileGridClass,
  profileGridGapClass,
  type ProfileGridDensity,
} from './profileGridDensity';

interface SavedCreator {
  _id: string;
  name: string;
  username: string;
  slug: string;
  avatar: string;
  bio: string;
  price: number;
  isFree: boolean;
  url: string;
  clicks: number;
  categories?: string[];
  likesCount?: number;
}

import type { ProfileThemeId } from './profileTheme';
import { isProfileThemedMode, profileComponentColors } from './profileTheme';
import { useProfileTheme } from './ProfileThemeContext';

export default function SavedModelsTab({ editorial = false, themeMode }: { editorial?: boolean; themeMode?: ProfileThemeId }) {
  const [creators, setCreators] = useState<SavedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridDensity, setGridDensity] = useState<ProfileGridDensity>(() => loadProfileGridDensity());
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  const { tokens } = useProfileTheme();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/onlyfans/save/creators', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.creators)) setCreators(data.creators);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = async (creatorId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setCreators((prev) => prev.filter((c) => c._id !== creatorId));

    try {
      await fetch('/api/onlyfans/save', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });
    } catch {
      // UI already updated
    }
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeletingSelected(true);
    try {
      for (const id of selectedIds) {
        await handleUnsave(id);
      }
      exitEditMode();
    } finally {
      setDeletingSelected(false);
    }
  };

  const mode = themeMode ?? (editorial ? 'light' : undefined);
  const themed = isProfileThemedMode(mode);
  const colors = mode && themed ? profileComponentColors(mode) : null;
  const plum = themed && tokens ? tokens.text : undefined;
  const muted = themed && tokens ? tokens.muted : undefined;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl animate-pulse"
            style={{ backgroundColor: colors?.fieldBg ?? 'rgba(255,255,255,0.03)' }}
          />
        ))}
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-16">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: editorial ? 'rgba(43,27,40,0.06)' : 'rgba(255,255,255,0.04)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: themed ? muted : 'rgba(255,255,255,0.2)' }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <h3 className={`text-lg font-bold mb-1 ${themed ? '' : 'text-white/60'}`} style={themed ? { color: plum } : undefined}>
          No saved models yet
        </h3>
        <p className={`text-sm max-w-sm mx-auto ${themed ? '' : 'text-white/30'}`} style={themed ? { color: muted } : undefined}>
          Browse the{' '}
          <a href="/onlyfanssearch" className="text-[#00AFF0] hover:underline">
            OnlyFans directory
          </a>{' '}
          and tap the heart icon to save your favorite creators here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className={`text-sm ${themed ? '' : 'text-white/40'}`} style={themed ? { color: muted } : undefined}>
          {creators.length} saved model{creators.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1.5">
          {editMode && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={deleteSelected}
              disabled={deletingSelected}
              className="px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all disabled:opacity-50"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              {deletingSelected ? 'Deleting...' : `Delete (${selectedIds.size})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => editMode ? exitEditMode() : setEditMode(true)}
            className="px-2.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all"
            style={
              editMode
                ? { background: tokens.accent, color: tokens.ink }
                : { background: tokens.hover, color: tokens.muted, border: `1px solid ${tokens.border}` }
            }
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
          <ProfileGridDensityToggle
            value={gridDensity}
            onChange={setGridDensity}
            tokens={{
              pillBorder: tokens.border,
              pillBg: editorial ? 'rgba(43,27,40,0.06)' : 'rgba(255,255,255,0.04)',
              viewBtnBg: tokens.accent,
              viewBtnTxt: tokens.ink,
              accentDim: tokens.muted,
            }}
          />
        </div>
      </div>

      <div className={`grid ${profileGridClass(gridDensity)} ${profileGridGapClass(gridDensity)}`}>
        {creators.map((creator) => {
          const selected = selectedIds.has(creator._id);
          const subtitle = creator.likesCount
            ? `${creator.likesCount >= 1000 ? `${(creator.likesCount / 1000).toFixed(1)}k` : creator.likesCount} likes`
            : creator.isFree ? 'Free' : `$${creator.price}`;

          if (editMode) {
            return (
              <button
                key={creator._id}
                type="button"
                onClick={() => toggleSelected(creator._id)}
                className="group rounded-xl overflow-hidden border text-left transition-all"
                style={{
                  borderColor: selected ? '#ef4444' : tokens.border,
                  backgroundColor: tokens.card,
                  boxShadow: selected ? '0 0 0 1px #ef444488' : undefined,
                }}
              >
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img
                    src={creator.avatar || '/assets/placeholder-no-image.png'}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span
                    className="absolute bottom-2 right-2 text-[9px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(0,175,240,0.9)', color: '#fff' }}
                  >
                    OnlyFans
                  </span>
                  <span
                    className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: selected ? '#ef4444' : 'rgba(255,255,255,0.8)',
                      backgroundColor: selected ? '#ef4444' : 'rgba(0,0,0,0.35)',
                    }}
                  >
                    {selected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                    )}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold truncate" style={{ color: tokens.text }}>{creator.name}</p>
                  <p className="text-[10px] truncate mt-0.5" style={{ color: tokens.muted }}>{subtitle}</p>
                </div>
              </button>
            );
          }

          return (
            <Link
              key={creator._id}
              href={ofCreatorProfileUrl(creator.slug || creator.username)}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl overflow-hidden border transition-all hover:opacity-95"
              style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
            >
              <div className="aspect-[3/4] overflow-hidden relative">
                <img
                  src={creator.avatar || '/assets/placeholder-no-image.png'}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span
                  className="absolute bottom-2 right-2 text-[9px] font-bold tracking-[0.14em] uppercase px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(0,175,240,0.9)', color: '#fff' }}
                >
                  OnlyFans
                </span>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold truncate" style={{ color: tokens.text }}>{creator.name}</p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: tokens.muted }}>{subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
