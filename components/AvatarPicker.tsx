'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getAvatarCatalog, updateUserAvatar, uploadUserAvatar } from '@/lib/actions/userProfile';

import type { ProfileThemeId } from '@/app/profile/profileTheme';
import { profileComponentColors } from '@/app/profile/profileTheme';

interface AvatarPickerProps {
  currentPhotoUrl: string | null;
  editorial?: boolean;
  themeMode?: ProfileThemeId;
  onSaved: (photoUrl: string) => void;
  onError?: (message: string) => void;
}

type Preset = { id: number; url: string };

function AvatarCircle({ src, size = 'md', colors }: { src?: string | null; size?: 'md' | 'lg' | 'xl'; colors?: ReturnType<typeof profileComponentColors> }) {
  const borderCls = colors ? '' : 'border-white/10';
  const emptyBg = colors ? '' : 'bg-white/5';
  const cls =
    size === 'xl' ? 'w-24 h-24' :
    size === 'lg' ? 'w-20 h-20' :
    'w-16 h-16';

  if (src) {
    return (
      <div className={`${cls} rounded-full overflow-hidden border-2 ${borderCls}`} style={colors ? { borderColor: colors.avatarBorder, backgroundColor: colors.avatarEmptyBg } : undefined}>
        <img src={src} alt="" className="w-full h-full object-cover scale-110" />
      </div>
    );
  }

  return (
    <div className={`${cls} rounded-full border-2 ${borderCls} ${emptyBg} flex items-center justify-center`} style={colors ? { borderColor: colors.avatarBorder, backgroundColor: colors.avatarEmptyBg } : undefined}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors?.muted ?? 'white'} strokeWidth="1.5" strokeOpacity={colors ? 1 : 0.3}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

export default function AvatarPicker({ currentPhotoUrl, editorial = false, themeMode, onSaved, onError }: AvatarPickerProps) {
  const mode = themeMode ?? (editorial ? 'light' : undefined);
  const colors = mode ? profileComponentColors(mode) : null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(currentPhotoUrl);
  const [draftUrl, setDraftUrl] = useState<string | null>(currentPhotoUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSavedUrl(currentPhotoUrl);
    if (!open) setDraftUrl(currentPhotoUrl);
  }, [currentPhotoUrl, open]);

  useEffect(() => {
    if (!open) return;
    setLoadingPresets(true);
    getAvatarCatalog()
      .then((res) => {
        if (res.ok) setPresets(res.presets);
        else onError?.(res.message || 'Could not load avatars');
      })
      .catch(() => onError?.('Could not load avatars'))
      .finally(() => setLoadingPresets(false));
  }, [open, onError]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const openModal = () => {
    setDraftUrl(savedUrl);
    setPendingFile(null);
    setOpen(true);
  };

  const closeModal = () => {
    setDraftUrl(savedUrl);
    setPendingFile(null);
    setOpen(false);
  };

  const persist = (photoUrl: string) => {
    localStorage.setItem('photoUrl', photoUrl);
    window.dispatchEvent(new CustomEvent('erogram:photoUrlUpdated', { detail: { photoUrl } }));
    setSavedUrl(photoUrl);
    onSaved(photoUrl);
    setOpen(false);
    setPendingFile(null);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      onError?.('Please log in again');
      return;
    }
    setSaving(true);
    try {
      if (pendingFile) {
        const fd = new FormData();
        fd.append('file', pendingFile);
        const res = await uploadUserAvatar(token, fd);
        if (!res.ok || !res.photoUrl) {
          onError?.(res.message || 'Upload failed');
          return;
        }
        persist(res.photoUrl);
        return;
      }

      const preset = presets.find((p) => p.url === draftUrl);
      if (preset) {
        const res = await updateUserAvatar(token, preset.id);
        if (!res.ok || !res.photoUrl) {
          onError?.(res.message || 'Failed to save avatar');
          return;
        }
        persist(res.photoUrl);
        return;
      }

      if (draftUrl && draftUrl !== savedUrl) {
        persist(draftUrl);
      }
    } catch {
      onError?.('Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  const onFilePick = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Please choose an image file');
      return;
    }
    setPendingFile(file);
    setDraftUrl(URL.createObjectURL(file));
  };

  const hasChanges = !!pendingFile || draftUrl !== savedUrl;

  return (
    <>
      <div className="mb-6 flex flex-col items-center">
        <button
          type="button"
          onClick={openModal}
          className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00aff0]/60"
          aria-label="Change avatar"
        >
          <AvatarCircle src={savedUrl} size="lg" colors={colors ?? undefined} />
          <span
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 border-2"
            style={{
              backgroundColor: colors?.btnBg ?? '#00aff0',
              borderColor: colors ? colors.text : '#111111',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          onClick={openModal}
          className="mt-3 text-xs font-semibold transition-colors hover:opacity-70"
          style={{ color: colors?.text ?? '#00aff0' }}
        >
          Change avatar
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFilePick(e.target.files?.[0] ?? null)}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="avatar-picker-title"
              className="relative w-full sm:max-w-md max-h-[88vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#161412] shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 id="avatar-picker-title" className="text-base font-black text-white">Choose an avatar</h3>
                    <p className="text-[11px] text-white/35 mt-0.5">Pick one or upload your own</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
                    aria-label="Close"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="mt-4 flex justify-center">
                  <motion.div
                    key={draftUrl || 'empty'}
                    initial={{ scale: 0.92, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                  >
                    <AvatarCircle src={draftUrl || savedUrl} size="xl" />
                  </motion.div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#00aff0]/40 transition-all text-sm font-semibold text-white/70 hover:text-white"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload your photo
                </button>

                {loadingPresets ? (
                  <div className="grid grid-cols-5 gap-2.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-full bg-white/[0.05] animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2.5">
                    {presets.map((avatar) => {
                      const active = !pendingFile && draftUrl === avatar.url;
                      return (
                        <motion.button
                          key={avatar.id}
                          type="button"
                          onClick={() => { setPendingFile(null); setDraftUrl(avatar.url); }}
                          whileTap={{ scale: 0.94 }}
                          className={`aspect-square rounded-full overflow-hidden transition-shadow ${
                            active ? 'ring-2 ring-[#00aff0] ring-offset-2 ring-offset-[#161412]' : 'ring-1 ring-white/10 hover:ring-white/25'
                          }`}
                        >
                          <img src={avatar.url} alt="" className="w-full h-full object-cover scale-110" loading="lazy" />
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-white/[0.06] flex gap-2 shrink-0 bg-[#161412]">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/70 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!hasChanges || saving || (!pendingFile && !draftUrl)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#00aff0' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
