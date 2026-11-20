'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MediaKitContent } from '@/lib/mediakit/types';
import { patchMediaKitField } from '@/lib/actions/mediakitContent';
import { setMediaKitField } from '@/lib/mediakit/resolve';

type MediaKitEditContextValue = {
  content: MediaKitContent;
  canEdit: boolean;
  editMode: boolean;
  saving: boolean;
  saveError: string | null;
  setEditMode: (on: boolean) => void;
  saveField: (path: string, value: string) => Promise<void>;
};

const MediaKitEditContext = createContext<MediaKitEditContextValue | null>(null);

export function useMediaKitEdit() {
  const ctx = useContext(MediaKitEditContext);
  if (!ctx) throw new Error('useMediaKitEdit outside provider');
  return ctx;
}

export function useMediaKitEditOptional() {
  return useContext(MediaKitEditContext);
}

export default function MediaKitEditProvider({
  initialContent,
  children,
}: {
  initialContent: MediaKitContent;
  children: ReactNode;
}) {
  const [content, setContent] = useState(initialContent);
  const [canEdit, setCanEdit] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('edit') === '1';
    const allow = () => {
      setCanEdit(true);
      if (fromQuery) setEditMode(true);
    };
    const id = window.setTimeout(() => {
      const publisher = localStorage.getItem('isPublisher') === 'true';
      const admin = localStorage.getItem('isAdmin') === 'true';
      if (admin || publisher) allow();
    }, 0);
    const token = localStorage.getItem('token');
    if (!token) return () => window.clearTimeout(id);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d?.isAdmin || d?.isPublisher) allow();
      })
      .catch(() => {});
    return () => window.clearTimeout(id);
  }, []);

  const saveField = useCallback(async (path: string, value: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setSaveError('Log in as admin or publisher first.');
      return;
    }
    setContent((prev) => setMediaKitField(prev, path, value));
    setSaving(true);
    setSaveError(null);
    const result = await patchMediaKitField(token, path, value);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setContent(result.content);
  }, []);

  const value = useMemo(
    () => ({
      content,
      canEdit,
      editMode,
      saving,
      saveError,
      setEditMode,
      saveField,
    }),
    [content, canEdit, editMode, saving, saveError, saveField],
  );

  return (
    <MediaKitEditContext.Provider value={value}>
      {canEdit && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[80] w-[min(100%,22rem)] -translate-x-1/2 px-3">
          <div
            className={`pointer-events-auto rounded-lg border-2 border-black px-3 py-2 text-center text-xs font-bold shadow-lg ${
              editMode ? 'bg-[#facc15] text-black' : 'bg-[#0a2e1a] text-white'
            }`}
          >
            {editMode ? (
              <span>
                {saving ? 'Saving…' : saveError ? saveError : 'Click a line, then Save. Cancel keeps the old text.'}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="w-full uppercase tracking-wide"
              >
                Edit media kit
              </button>
            )}
          </div>
        </div>
      )}
      {children}
    </MediaKitEditContext.Provider>
  );
}

export function getFieldValue(content: MediaKitContent, path: string): string {
  const keys = path.split('.');
  let cur: unknown = content;
  for (const key of keys) {
    if (cur === null || cur === undefined) return '';
    const idx = Number(key);
    if (Number.isInteger(idx) && key === String(idx)) {
      cur = (cur as unknown[])[idx];
    } else {
      cur = (cur as Record<string, unknown>)[key];
    }
  }
  return typeof cur === 'string' ? cur : '';
}

export function previewField(content: MediaKitContent, path: string, fallback: string) {
  const v = getFieldValue(content, path);
  return v || fallback;
}