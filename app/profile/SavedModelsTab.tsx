'use client';

import { useEffect, useState } from 'react';
import { Heart, ExternalLink, Grid2X2, LayoutGrid } from 'lucide-react';

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
}

export default function SavedModelsTab() {
  const [creators, setCreators] = useState<SavedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [cols, setCols] = useState<2 | 4>(4);

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
      // Silently fail — the UI already updated optimistically
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Heart size={28} className="text-white/20" />
        </div>
        <h3 className="text-lg font-bold text-white/60 mb-1">No saved models yet</h3>
        <p className="text-sm text-white/30 max-w-sm mx-auto">
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
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/40">
          {creators.length} saved model{creators.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          <button
            onClick={() => setCols(4)}
            className={`p-1.5 rounded-md transition-all ${cols === 4 ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
            title="4 per row"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setCols(2)}
            className={`p-1.5 rounded-md transition-all ${cols === 2 ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
            title="2 per row"
          >
            <Grid2X2 size={16} />
          </button>
        </div>
      </div>

      <div className={`grid gap-2 sm:gap-3 ${cols === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {creators.map((creator) => (
          <div
            key={creator._id}
            className="relative rounded-2xl overflow-hidden bg-white shadow-md"
          >
            <a
              href={creator.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="relative aspect-[3/4] bg-gray-100">
                {creator.avatar ? (
                  <img
                    src={creator.avatar}
                    alt={creator.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300 bg-gradient-to-br from-gray-100 to-gray-200">
                    {creator.name.charAt(0)}
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent pt-8 pb-2 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold text-sm truncate">{creator.name}</span>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                      creator.isFree ? 'bg-emerald-400 text-white' : 'bg-[#00AFF0] text-white'
                    }`}>
                      {creator.isFree ? 'Free' : `$${creator.price}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 truncate">@{creator.username}</p>
                </div>
              </div>
            </a>

            <button
              onClick={() => handleUnsave(creator._id)}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-red-500/80 hover:scale-110"
              title="Remove from saved"
            >
              <Heart size={15} className="text-rose-500" fill="currentColor" />
            </button>

            <a
              href={creator.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-[#00AFF0] hover:bg-[#00AFF0]/5 transition-colors"
            >
              View profile
              <ExternalLink size={13} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
