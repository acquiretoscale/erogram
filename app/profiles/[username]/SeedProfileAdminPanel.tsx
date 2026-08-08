'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  canEditSeedProfile,
  updateSeedProfile,
  uploadSeedProfilePhoto,
  getSeedProfilePresets,
} from '@/lib/actions/seedProfileAdmin';

type Props = {
  userId: string;
  username: string;
  firstName: string | null;
  sex: string | null;
  bio: string | null;
  photoUrl: string | null;
  joinedAt: string;
};

export default function SeedProfileAdminPanel({
  userId,
  username: initialUsername,
  firstName: initialFirstName,
  sex: initialSex,
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
      <div className="mb-6">
        {showPhoto ? (
          <img
            src={showPhoto}
            alt=""
            className="w-24 h-24 rounded-full object-cover border-2 border-slate-600"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold">
            {(editing ? nextUsername : initialUsername).charAt(0).toUpperCase()}
          </div>
        )}
        {editing && canEdit ? (
          <div className="mt-3 flex flex-col gap-2">
            <label className="cursor-pointer text-xs text-amber-300 hover:text-amber-200 w-fit">
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
                    className={`w-8 h-8 rounded-full overflow-hidden border-2 ${selectedPreset === p.id ? 'border-amber-400' : 'border-slate-700'}`}
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-4">
        {editing && canEdit ? (
          <>
            <label className="block">
              <span className="text-xs text-slate-400">Display name</span>
              <input
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-amber-600/50 text-white text-2xl font-bold"
              />
            </label>
            <label className="block mt-3">
              <span className="text-xs text-slate-400">Username</span>
              <div className="mt-1 flex items-center rounded-lg bg-slate-900 border border-amber-600/50 overflow-hidden">
                <span className="pl-3 text-slate-500">@</span>
                <input
                  value={nextUsername}
                  onChange={(e) => setNextUsername(e.target.value.replace(/^@/, '').toLowerCase())}
                  className="flex-1 px-2 py-2 bg-transparent text-xl text-slate-300 outline-none"
                />
              </div>
            </label>
            <label className="block mt-3">
              <span className="text-xs text-slate-400">Sex</span>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="mt-1 w-full max-w-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm"
              >
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
            <label className="block mt-3">
              <span className="text-xs text-slate-400">Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm resize-none"
              />
            </label>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <h1 className="text-3xl font-bold">{displayName}</h1>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-1 px-2 py-0.5 rounded text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
                >
                  Edit
                </button>
              ) : null}
            </div>
            <p className="text-xl text-slate-400 mt-1">
              @{initialUsername}
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="ml-2 px-2 py-0.5 rounded text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
                >
                  Edit
                </button>
              ) : null}
            </p>
            {(editing ? sex : initialSex) ? (
              <p className="text-sm text-slate-500 mt-2 capitalize">{editing ? sex : initialSex}</p>
            ) : null}
          </>
        )}
      </div>

      {!editing && initialBio ? (
        <div className="mb-6">
          <p className="text-slate-300 text-base leading-relaxed">{initialBio}</p>
        </div>
      ) : null}

      {editing && canEdit ? (
        <div className="flex items-center justify-end gap-3 mb-6">
          {msg ? <span className="text-xs text-red-400 mr-auto">{msg}</span> : null}
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : null}

      <div className="pt-6 border-t border-slate-700">
        <p className="text-sm text-slate-500">Joined {joinedLabel}</p>
      </div>
    </>
  );
}
