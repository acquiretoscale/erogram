'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteCreatorBySlug } from '@/lib/actions/ofCreatorsBrowse';

export default function BestOfDeleteButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
  }, []);

  if (!isAdmin || !slug) return null;

  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Remove this creator from Top 10 rankings?')) return;
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Login required');
      return;
    }
    setBusy(true);
    try {
      await deleteCreatorBySlug(token, slug);
      router.refresh();
    } catch (err) {
      alert((err as Error).message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      title="Delete profile"
      aria-label="Delete profile"
      className="absolute top-3 right-3 z-30 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-red-300 disabled:opacity-40 transition-colors"
    >
      <Trash2 size={15} />
    </button>
  );
}
