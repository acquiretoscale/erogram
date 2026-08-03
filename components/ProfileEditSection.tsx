'use client';

import { useEffect, useState } from 'react';
import { updateUserProfile } from '@/lib/actions/userProfile';

import type { ProfileThemeId } from '@/app/profile/profileTheme';
import { profileComponentColors } from '@/app/profile/profileTheme';

interface ProfileEditSectionProps {
  username: string | null;
  firstName: string | null;
  bio: string | null;
  memberSince: string | null;
  editorial?: boolean;
  themeMode?: ProfileThemeId;
  onSaved: (data: { firstName: string | null; bio: string | null }) => void;
  onError?: (message: string) => void;
}

export default function ProfileEditSection({
  username,
  firstName,
  bio,
  memberSince,
  editorial = false,
  themeMode,
  onSaved,
  onError,
}: ProfileEditSectionProps) {
  const mode = themeMode ?? (editorial ? 'light' : undefined);
  const c = mode ? profileComponentColors(mode) : null;
  const [displayName, setDisplayName] = useState(firstName || '');
  const [bioText, setBioText] = useState(bio || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(firstName || '');
    setBioText(bio || '');
  }, [firstName, bio]);

  const memberLabel = memberSince
    ? new Date(memberSince).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const dirty =
    displayName.trim() !== (firstName || '').trim() ||
    bioText.trim() !== (bio || '').trim();

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      onError?.('Please log in again');
      return;
    }
    setSaving(true);
    try {
      const res = await updateUserProfile(token, {
        firstName: displayName,
        bio: bioText,
      });
      if (!res.ok) {
        onError?.(res.message || 'Failed to save profile');
        return;
      }
      if (res.firstName) localStorage.setItem('firstName', res.firstName);
      else localStorage.removeItem('firstName');
      window.dispatchEvent(new CustomEvent('erogram:profileUpdated', { detail: { firstName: res.firstName } }));
      onSaved({ firstName: res.firstName, bio: res.bio });
    } catch {
      onError?.('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const labelCls = c ? 'text-[11px] font-semibold mb-1.5' : 'block text-[11px] font-semibold text-white/45 mb-1.5';
  const fieldCls = c
    ? 'w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1'
    : 'w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#00aff0]/50 focus:ring-1 focus:ring-[#00aff0]/30';
  const btnCls = c
    ? 'w-full py-2.5 rounded-full text-[11px] font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90'
    : 'w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 bg-white/[0.06] hover:bg-white/[0.1]';

  return (
    <div className={`mb-6 space-y-4 text-left ${c ? 'border-t pt-6' : ''}`} style={c ? { borderColor: c.border } : undefined}>
      {memberLabel && (
        <div
          className={`rounded-xl px-3 py-2.5 ${c ? 'border' : 'border border-white/[0.06] bg-white/[0.03]'}`}
          style={c ? { borderColor: c.border, backgroundColor: c.fieldBg } : undefined}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: c?.muted ?? undefined }}>Member since</p>
          <p className="text-sm font-semibold" style={{ color: c?.text ?? undefined }}>{memberLabel}</p>
        </div>
      )}

      <div>
        <label htmlFor="profile-display-name" className={labelCls} style={{ color: c?.muted }}>
          Display name
        </label>
        <input
          id="profile-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          placeholder={username || 'Your name'}
          className={fieldCls}
          style={c ? { backgroundColor: c.inputBg, border: `1px solid ${c.fieldBorder}`, color: c.inputText } : undefined}
        />
        {username && (
          <p className="text-[10px] mt-1" style={{ color: c?.muted }}>@{username}</p>
        )}
      </div>

      <div>
        <label htmlFor="profile-bio" className={labelCls} style={{ color: c?.muted }}>
          Bio
        </label>
        <textarea
          id="profile-bio"
          value={bioText}
          onChange={(e) => setBioText(e.target.value)}
          maxLength={160}
          rows={3}
          placeholder=""
          className={`${fieldCls} resize-none`}
          style={c ? { backgroundColor: c.inputBg, border: `1px solid ${c.fieldBorder}`, color: c.inputText } : undefined}
        />
        <p className="text-[10px] mt-1 text-right" style={{ color: c?.muted }}>{bioText.length}/160</p>
      </div>

      <button type="button" onClick={handleSave} disabled={!dirty || saving} className={btnCls} style={c ? { backgroundColor: c.btnBg, color: c.btnText } : undefined}>
        {saving ? 'Saving...' : 'Save profile'}
      </button>
    </div>
  );
}
