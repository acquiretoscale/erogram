'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ImageIcon, Loader2, Video } from 'lucide-react';
import { listAiToolGenerations } from '@/lib/actions/wavespeedImageToVideo';
import type { AiToolGenerationRecord } from '@/lib/imageToVideo/types';
import { getAuthToken, getImageToVideoClientId } from '../clientId';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ArchiveClient() {
  const [items, setItems] = useState<AiToolGenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const result = await listAiToolGenerations(getImageToVideoClientId(), getAuthToken());
      if (cancelled) return;
      if (result.error && !result.items.length) setError(result.error);
      setItems(result.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#00AFF0] mb-2">Archive</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Past generations</h1>
        </div>
        <Link
          href="/image-to-video"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-white hover:border-[#00AFF0]/40"
        >
          Back to tool
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 font-medium">{error}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-white/60 text-sm">No generations yet.</p>
          <Link href="/image-to-video" className="inline-block mt-4 text-sm font-semibold text-[#00AFF0] hover:underline">
            Create your first one
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
            >
              <div className="aspect-video bg-black relative">
                {item.mode === 'video' ? (
                  <video
                    src={item.outputUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.outputUrl} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/70 text-white">
                  {item.mode === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {item.mode}
                </div>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-white/45">{formatWhen(item.createdAt)}</p>
                {item.prompt ? (
                  <p className="text-sm text-white/75 line-clamp-2">{item.prompt}</p>
                ) : null}
                {item.mode === 'video' ? (
                  <p className="text-xs text-white/45">
                    {item.videoModel === 'cheap' ? 'Cheap' : 'Current'}
                    {item.quality ? ` · ${item.quality}` : ''}
                    {item.duration ? ` · ${item.duration}s` : ''}
                  </p>
                ) : null}
                <a
                  href={item.outputUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm font-semibold text-[#00AFF0] hover:underline"
                >
                  Open result
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
