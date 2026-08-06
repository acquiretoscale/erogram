'use client';

import { LayoutGrid, Rows3 } from 'lucide-react';
import {
  type OfSearchResultsView,
  type ProfileGridDensity,
  PROFILE_GRID_DENSITY_SPECS,
  saveOfSearchResultsView,
  saveProfileGridDensity,
} from './profileGridDensity';

type ToggleTokens = {
  pillBorder: string;
  pillBg: string;
  viewBtnBg: string;
  viewBtnTxt: string;
  accentDim: string;
};

export function OfSearchResultsViewToggle({
  value,
  onChange,
  tokens,
}: {
  value: OfSearchResultsView;
  onChange: (view: OfSearchResultsView) => void;
  tokens: ToggleTokens;
}) {
  const options: { view: OfSearchResultsView; icon: typeof LayoutGrid; title: string }[] = [
    { view: 'grid', icon: LayoutGrid, title: 'Mosaic view' },
    { view: 'feed', icon: Rows3, title: 'Feed view' },
  ];

  return (
    <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${tokens.pillBorder}` }}>
      {options.map(({ view, icon: Icon, title }) => {
        const active = value === view;
        return (
          <button
            key={view}
            type="button"
            onClick={() => {
              onChange(view);
              saveOfSearchResultsView(view);
            }}
            className="px-2.5 py-1.5 transition-all"
            style={{
              background: active ? tokens.viewBtnBg : tokens.pillBg,
              color: active ? tokens.viewBtnTxt : tokens.accentDim,
            }}
            title={title}
            aria-label={title}
            aria-pressed={active}
          >
            <Icon size={14} strokeWidth={2.5} />
          </button>
        );
      })}
    </div>
  );
}

export default function ProfileGridDensityToggle({
  value,
  onChange,
  tokens,
}: {
  value: ProfileGridDensity;
  onChange: (density: ProfileGridDensity) => void;
  tokens: ToggleTokens;
}) {
  const options = ([1, 2, 3] as ProfileGridDensity[]).map((d) => ({
    density: d,
    spec: PROFILE_GRID_DENSITY_SPECS[d],
  }));

  return (
    <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${tokens.pillBorder}` }}>
      {options.map(({ density, spec }) => {
        const active = value === density;
        return (
          <button
            key={density}
            type="button"
            onClick={() => {
              onChange(density);
              saveProfileGridDensity(density);
            }}
            className="px-2 py-1.5 text-[9px] font-black tabular-nums leading-none transition-all min-w-[2.25rem]"
            style={{
              background: active ? tokens.viewBtnBg : tokens.pillBg,
              color: active ? tokens.viewBtnTxt : tokens.accentDim,
            }}
            title={`${spec.mobile} per row on mobile, ${spec.desktop} on desktop`}
          >
            {spec.mobile}/{spec.desktop}
          </button>
        );
      })}
    </div>
  );
}
