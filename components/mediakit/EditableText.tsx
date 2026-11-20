'use client';

import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { useMediaKitEdit, getFieldValue } from './MediaKitEditProvider';

type EditableTextProps = {
  path: string;
  fallback: string;
  multiline?: boolean;
  className?: string;
};

export default function EditableText({ path, fallback, multiline, className }: EditableTextProps) {
  const { content, canEdit, editMode, saveField } = useMediaKitEdit();
  const display = getFieldValue(content, path) || fallback;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    fieldRef.current?.focus();
  }, [editing]);

  if (!canEdit || !editMode) {
    return <span className={`whitespace-pre-line ${className ?? ''}`}>{display}</span>;
  }

  const start = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setDraft(getFieldValue(content, path) || fallback);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(getFieldValue(content, path) || fallback);
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    const next = draft.replace(/\u00a0/g, ' ').trimEnd();
    if (!next.trim()) {
      setError('Text cannot be empty.');
      return;
    }
    if (next === (getFieldValue(content, path) || fallback)) {
      setEditing(false);
      return;
    }
    try {
      await saveField(path, next);
      setEditing(false);
    } catch {
      setError('Could not save. Stay logged in as admin or publisher.');
    }
  };

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={start}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            start(e as unknown as MouseEvent);
          }
        }}
        className={`cursor-pointer whitespace-pre-line rounded-sm outline outline-1 outline-dashed outline-[#22c55e]/80 outline-offset-1 hover:bg-[#ecfdf5] ${className ?? ''}`}
      >
        {display || fallback}
      </span>
    );
  }

  const shared = 'w-full rounded-md border-2 border-[#16a34a] bg-white px-2 py-1.5 text-sm font-semibold text-black';

  return (
    <span className="relative z-20 block min-w-[8rem]" onClick={(e) => e.stopPropagation()}>
      {multiline ? (
        <textarea
          ref={fieldRef as RefObject<HTMLTextAreaElement>}
          value={draft}
          rows={8}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
          }}
          className={shared}
        />
      ) : (
        <input
          ref={fieldRef as RefObject<HTMLInputElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void save();
            }
            if (e.key === 'Escape') cancel();
          }}
          className={shared}
        />
      )}
      {error ? <p className="mt-1 text-[11px] font-semibold text-red-600">{error}</p> : null}
      <span className="mt-1 flex gap-1">
        <button
          type="button"
          onClick={() => void save()}
          className="rounded bg-[#16a34a] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded border border-black/20 bg-white px-2 py-1 text-[10px] font-bold text-black"
        >
          Cancel
        </button>
      </span>
    </span>
  );
}