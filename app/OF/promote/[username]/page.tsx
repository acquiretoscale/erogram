'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { importCreatorToOFMAgency } from '@/lib/actions/ofClients';
import { PROMOTE_OF_CREATOR_PLACEMENTS } from '@/lib/adPlacements';

export default function PromoteCreatorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = use(params);
  const username = decodeURIComponent(raw);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('token') || '';
      if (!token) {
        setError('Not logged in');
        return;
      }
      try {
        const res = await importCreatorToOFMAgency(token, {
          username,
          clientId: 'ofm-creators',
          defaultPlacements: PROMOTE_OF_CREATOR_PLACEMENTS,
        });
        if (cancelled) return;
        window.location.replace(`/ofm/${res.agencySlug}/${res.creator.slug}`);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Promote failed');
      }
    })();
    return () => { cancelled = true; };
  }, [username]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-6">
        <p className="text-red-400 font-bold text-center">{error}</p>
        <Link href="/OF/creators" className="text-[#00AFF0] text-sm font-bold">← Back to creators</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#00AFF0]" />
      <p className="text-white/50 text-sm">Opening OFM for @{username}…</p>
    </div>
  );
}
