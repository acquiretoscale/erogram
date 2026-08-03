'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, MapPin, Navigation } from 'lucide-react';
import { getTopBestOfByType } from '@/app/best-onlyfans-accounts/bestOfPages';

const NEO_BTN =
  'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-[2.5px] border-black font-black text-[11px] sm:text-[12px] uppercase tracking-wide text-white bg-[#005a8c] shadow-[4px_4px_0_0_#000] hover:bg-[#006da8] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all';

export default function NearMeLocationControls({
  mode,
  chosenLabel,
  onUseMyLocation,
  onChoose,
}: {
  mode: 'auto' | 'chosen';
  chosenLabel?: string;
  onUseMyLocation: () => void;
  onChoose: (slug: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'country' | 'state'>('country');

  const countries = useMemo(() => getTopBestOfByType('country', 200).filter((p) => p.count > 0), []);
  const states = useMemo(() => getTopBestOfByType('state', 50).filter((p) => p.count > 0), []);
  const items = tab === 'country' ? countries : states;

  return (
    <div className="max-w-3xl mx-auto mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onUseMyLocation}
          className={`${NEO_BTN} ${mode === 'auto' ? 'ring-2 ring-[#00AFF0] ring-offset-2 ring-offset-[#111111]' : ''}`}
        >
          <Navigation size={15} strokeWidth={2.5} />
          Use my location
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`${NEO_BTN} ${mode === 'chosen' ? 'ring-2 ring-[#00AFF0] ring-offset-2 ring-offset-[#111111]' : ''}`}
        >
          <MapPin size={15} strokeWidth={2.5} />
          Choose a location
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {mode === 'chosen' && chosenLabel ? (
        <p className="text-center text-xs text-white/45 mt-2">Showing creators in {chosenLabel}</p>
      ) : null}

      {open && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0c1520]/95 backdrop-blur-sm p-3 sm:p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setTab('country')}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors ${
                tab === 'country' ? 'bg-[#00AFF0] text-white' : 'bg-white/[0.05] text-white/55 hover:text-white/85'
              }`}
            >
              Countries
            </button>
            <button
              type="button"
              onClick={() => setTab('state')}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors ${
                tab === 'state' ? 'bg-[#00AFF0] text-white' : 'bg-white/[0.05] text-white/55 hover:text-white/85'
              }`}
            >
              US States
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
            {items.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => {
                  onChoose(item.slug, item.label);
                  setOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-white/12 bg-white/[0.04] text-[11px] font-semibold text-white/75 hover:border-[#00AFF0]/45 hover:text-[#00AFF0] transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
