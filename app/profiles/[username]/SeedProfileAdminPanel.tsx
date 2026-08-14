'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  canEditSeedProfile,
  updateSeedProfile,
  uploadSeedProfilePhoto,
  getSeedProfilePresets,
} from '@/lib/actions/seedProfileAdmin';
import { countryToFlagEmoji } from '@/lib/utils/geo';

type Props = {
  userId: string;
  username: string;
  firstName: string | null;
  sex: string | null;
  country: string | null;
  bio: string | null;
  photoUrl: string | null;
  joinedAt: string;
};

const CREAM = '#F7F4EC';
const PLUM = '#2B1B28';
const MUTED = '#6B6568';
const INK = '#FDFDFD';
const BORDER = 'rgba(43,27,40,0.12)';

export default function SeedProfileAdminPanel({
  userId,
  username: initialUsername,
  firstName: initialFirstName,
  sex: initialSex,
  country: initialCountry,
  bio: initialBio,
  photoUrl: initialPhotoUrl,
  joinedAt,
}: Props) {
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(initialFirstName || '');
  const [nextUsername, setNextUsername] = useState(initialUsername);
  const [sex, setSex] = useState(initialSex || '');
  const [bio, setBio] = useState(initialBio || '');
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(initialPhotoUrl || '');
  const [presets, setPresets] = useState<{ id: number; url: string }[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    if (!token) return;
    canEditSeedProfile(token, initialUsername).then((res) => {
      if (res.canEdit) {
        setCanEdit(true);
        getSeedProfilePresets().then(setPresets).catch(() => {});
      }
    }).catch(() => {});
  }, [initialUsername]);

  useEffect(() => {
    if (editing) return;
    setNextUsername(initialUsername);
    setFirstName(initialFirstName || '');
    setSex(initialSex || '');
    setBio(initialBio || '');
    setPhotoUrl(initialPhotoUrl || '');
    setAvatarPreview(initialPhotoUrl || '');
  }, [initialUsername, initialFirstName, initialSex, initialBio, initialPhotoUrl, editing]);

  const displayName = firstName || initialUsername;
  const showPhoto = editing ? avatarPreview : photoUrl;
  const genderLabel = (editing ? sex : initialSex) === 'female' ? 'F' : (editing ? sex : initialSex) === 'male' ? 'M' : '';
  const countryLabel = (() => {
    const raw = (initialCountry || '').trim();
    if (!raw) return '';
    const upper = raw.toUpperCase();
    if (upper === 'GB' || upper === 'UK') return 'UK';
    if (/^[A-Z]{2}$/.test(upper)) return upper;
    return raw;
  })();
  const countryFlag = countryToFlagEmoji(initialCountry || countryLabel);

  const onFile = (file: File | null) => {
    setAvatarFile(file);
    setSelectedPreset(null);
    if (!file) {
      setAvatarPreview(photoUrl);
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onCancel = () => {
    setEditing(false);
    setMsg('');
    setAvatarFile(null);
    setSelectedPreset(null);
    setNextUsername(initialUsername);
    setFirstName(initialFirstName || '');
    setSex(initialSex || '');
    setBio(initialBio || '');
    setPhotoUrl(initialPhotoUrl || '');
    setAvatarPreview(initialPhotoUrl || '');
  };

  const onSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const token = localStorage.getItem('token') || '';
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const up = await uploadSeedProfilePhoto(token, userId, fd);
        setPhotoUrl(up.photoUrl);
        setAvatarPreview(up.photoUrl);
        setAvatarFile(null);
      }
      const updated = await updateSeedProfile(token, userId, {
        firstName,
        username: nextUsername,
        sex,
        bio,
        presetAvatarId: selectedPreset,
      });
      setEditing(false);
      setMsg('');
      const newUsername = updated.username || nextUsername;
      if (newUsername !== initialUsername) {
        router.push(`/profiles/@${newUsername}`);
      } else {
        router.refresh();
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const joinedLabel = new Date(joinedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-5">
        <div
          className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0 rounded-2xl overflow-hidden shadow-xl border-4"
          style={{ borderColor: CREAM, backgroundColor: PLUM }}
        >
          {showPhoto ? (
            <img
              src={showPhoto}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-5xl font-black"
              style={{
                color: 'rgba(253,253,253,0.45)',
                background: 'linear-gradient(135deg, #3a0f1e 0%, #240a14 50%, #0c0508 100%)',
              }}
            >
              {(editing ? nextUsername : initialUsername).charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          {editing && canEdit ? null : (
            <>
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: PLUM }}>
                  {displayName}
                </h1>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="mt-1 px-2 py-0.5 rounded text-xs font-semibold hover:opacity-70"
                    style={{ color: PLUM }}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <p className="text-base sm:text-lg mt-1" style={{ color: MUTED }}>
                @{initialUsername}
              </p>
            </>
          )}
        </div>
      </div>

      {editing && canEdit ? (
        <div className="mt-3 flex flex-col gap-2 mb-4">
          <label className="cursor-pointer text-xs font-semibold hover:opacity-70 w-fit" style={{ color: PLUM }}>
            Upload photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </label>
          {presets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(p.id);
                    setAvatarFile(null);
                    setAvatarPreview(p.url);
                  }}
                  className="w-8 h-8 rounded-full overflow-hidden border-2"
                  style={{ borderColor: selectedPreset === p.id ? PLUM : BORDER }}
                >
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mb-4">
        {editing && canEdit ? (
          <>
            <label className="block">
              <span className="text-xs" style={{ color: MUTED }}>Display name</span>
              <input
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-2xl font-bold outline-none"
                style={{ backgroundColor: CREAM, borderColor: PLUM, color: PLUM }}
              />
            </label>
            <label className="block mt-3">
              <span className="text-xs" style={{ color: MUTED }}>Username</span>
              <div className="mt-1 flex items-center rounded-lg border overflow-hidden" style={{ backgroundColor: CREAM, borderColor: PLUM }}>
                <span className="pl-3" style={{ color: MUTED }}>@</span>
                <input
                  value={nextUsername}
                  onChange={(e) => setNextUsername(e.target.value.replace(/^@/, '').toLowerCase())}
                  className="flex-1 px-2 py-2 bg-transparent text-xl outline-none"
                  style={{ color: PLUM }}
                />
              </div>
            </label>
            <label className="block mt-3">
              <span className="text-xs" style={{ color: MUTED }}>Sex</span>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="mt-1 w-full max-w-xs px-3 py-2 rounded-lg border text-sm"
                style={{ backgroundColor: CREAM, borderColor: BORDER, color: PLUM }}
              >
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="block mt-3">
              <span className="text-xs" style={{ color: MUTED }}>Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ backgroundColor: CREAM, borderColor: BORDER, color: PLUM }}
              />
            </label>
          </>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border" style={{ backgroundColor: 'rgba(43,27,40,0.04)', borderColor: BORDER }}>
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: MUTED }}>Country</span>
              <span className="text-sm font-extrabold tracking-wide inline-flex items-center gap-1.5" style={{ color: PLUM }}>
                {countryLabel ? (
                  <>
                    {countryFlag ? <span className="text-base leading-none" aria-hidden>{countryFlag}</span> : null}
                    {countryLabel}
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border" style={{ backgroundColor: 'rgba(43,27,40,0.04)', borderColor: BORDER }}>
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: MUTED }}>Gender</span>
              <span className="text-sm font-extrabold tracking-wide" style={{ color: PLUM }}>{genderLabel || '—'}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border col-span-2 sm:col-span-1" style={{ backgroundColor: 'rgba(43,27,40,0.04)', borderColor: BORDER }}>
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: MUTED }}>Joined</span>
              <span className="text-sm font-bold text-center leading-tight" style={{ color: PLUM }}>{joinedLabel}</span>
            </div>
          </div>
        )}
      </div>

      {!editing && initialBio ? (
        <div className="mb-2 mt-5 rounded-xl border px-4 py-3" style={{ backgroundColor: 'rgba(43,27,40,0.03)', borderColor: BORDER }}>
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{initialBio}</p>
        </div>
      ) : null}

      {editing && canEdit ? (
        <div className="flex items-center justify-end gap-3 mb-2 mt-4">
          {msg ? <span className="text-xs text-red-600 mr-auto">{msg}</span> : null}
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm hover:opacity-70" style={{ color: MUTED }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-full text-[11px] font-bold tracking-[0.18em] uppercase disabled:opacity-50 hover:opacity-90"
            style={{ color: INK, backgroundColor: PLUM }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}
    </>
  );
}
