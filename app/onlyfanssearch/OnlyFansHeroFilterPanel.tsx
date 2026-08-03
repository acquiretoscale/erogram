'use client';

import Link from 'next/link';
import { Check, Crown } from 'lucide-react';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';
import type { ProfilePremiumPriceFilter } from '@/lib/actions/ofCreatorsBrowse';
import { getHeroFilterSilos, type BrowseFilterItem } from '@/app/onlyfanssearch/onlyfansBrowseFilterData';

function TickBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center shrink-0 transition-all duration-150 ${
        checked
          ? 'bg-[#00AFF0] border-[#00AFF0] shadow-[0_0_10px_rgba(0,175,240,0.45)]'
          : 'border-white/25 bg-white/[0.04]'
      }`}
    >
      {checked ? <Check size={11} className="text-white" strokeWidth={3} /> : null}
    </span>
  );
}

function FilterChip({
  label,
  checked,
  onClick,
  compact = false,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border font-semibold leading-tight transition-all duration-150 ${
        compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 rounded-xl text-[12px]'
      } ${
        checked
          ? 'border-[#00AFF0]/60 bg-[#00AFF0]/12 text-white shadow-[inset_0_0_0_1px_rgba(0,175,240,0.15)]'
          : 'border-white/10 bg-white/[0.04] text-white/75 hover:border-white/22 hover:bg-white/[0.07] hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function SiloSection({
  label,
  items,
  selected,
  onSelect,
  compact = false,
}: {
  label: string;
  items: BrowseFilterItem[];
  selected: string | null;
  onSelect: (slug: string) => void;
  compact?: boolean;
}) {
  if (!items.length) return null;

  return (
    <div>
      <p className={`font-bold uppercase tracking-[0.14em] text-white/35 mb-1.5 ${compact ? 'text-[9px]' : 'text-[11px] mb-2'}`}>{label}</p>
      <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-2'}`}>
        {items.map((item) => (
          <FilterChip
            key={item.slug}
            label={item.label}
            checked={selected === item.slug}
            onClick={() => onSelect(item.slug)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function PremiumRow({
  checked,
  onChange,
  label,
  compact = false,
  locked = false,
  onLockedClick,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  compact?: boolean;
  locked?: boolean;
  onLockedClick?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => {
        if (locked) {
          onLockedClick?.();
          return;
        }
        onChange(!checked);
      }}
      className={`flex items-center justify-between gap-2 w-full rounded-lg border text-left transition-all duration-150 ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2.5 rounded-xl'
      } ${
        checked
          ? 'border-[#00AFF0]/60 bg-[#00AFF0]/12 text-white'
          : locked
            ? 'border-white/10 bg-white/[0.03] text-white/50 hover:border-[#00AFF0]/35 hover:bg-[#00AFF0]/08'
            : 'border-white/10 bg-white/[0.04] text-white/75 hover:border-white/22 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Crown size={compact ? 11 : 13} className="text-[#00AFF0] shrink-0" fill="currentColor" />
        <span className={`font-semibold truncate ${compact ? 'text-[10px]' : 'text-[12px]'}`}>{label}</span>
        {!compact && (
          <span className="text-[9px] font-black uppercase tracking-wider text-[#00AFF0]/80">{t('groups.premium')}</span>
        )}
      </div>
      <TickBox checked={checked} />
    </button>
  );
}

export default function OnlyFansHeroFilterPanel({
  priceFilter,
  setPriceFilter,
  selectedCategory,
  onSelectCategory,
  instagramOnly,
  setInstagramOnly,
  joinWithinDays,
  setJoinWithinDays,
  onClear,
  compact = false,
  canUsePremiumFilters = true,
  onPremiumRequired,
}: {
  priceFilter: ProfilePremiumPriceFilter;
  setPriceFilter: (v: ProfilePremiumPriceFilter) => void;
  selectedCategory: string | null;
  onSelectCategory: (slug: string) => void;
  instagramOnly: boolean;
  setInstagramOnly: (v: boolean) => void;
  joinWithinDays: number;
  setJoinWithinDays: (v: number) => void;
  onClear: () => void;
  compact?: boolean;
  canUsePremiumFilters?: boolean;
  onPremiumRequired?: () => void;
}) {
  const lp = useLocalePath();
  const { t } = useTranslation();
  const silos = getHeroFilterSilos();

  const priceOptions: { key: ProfilePremiumPriceFilter; label: string }[] = [
    { key: 'all', label: t('ofSearch.all') },
    { key: 'free', label: t('ofSearch.free') },
    { key: 'paid', label: t('ofSearch.paid') },
  ];

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-[#0a121c]/95 backdrop-blur-md shadow-[0_12px_40px_-16px_rgba(0,0,0,0.85)] ${
      compact ? 'p-2.5 space-y-2.5' : 'rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]'
    }`}>
      <div className={`grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-black/25 border border-white/[0.06] ${compact ? '' : 'gap-2 rounded-xl'}`}>
        {priceOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setPriceFilter(opt.key)}
            className={`rounded-md font-bold uppercase tracking-wide transition-all duration-150 ${
              compact ? 'py-1.5 text-[10px]' : 'py-2.5 rounded-lg text-[12px]'
            } ${
              priceFilter === opt.key
                ? 'bg-[#00AFF0] text-white shadow-[0_4px_14px_-4px_rgba(0,175,240,0.65)]'
                : 'text-white/50 hover:text-white/85'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {silos.map((silo) => (
        <SiloSection
          key={silo.id}
          label={silo.label}
          items={silo.items}
          selected={selectedCategory}
          onSelect={onSelectCategory}
          compact={compact}
        />
      ))}

      <div className={`border-t border-white/[0.07] space-y-1.5 ${compact ? 'pt-2' : 'pt-3 space-y-2'}`}>
        {!compact && (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">{t('groups.premium')}</p>
        )}
        <PremiumRow
          checked={instagramOnly}
          onChange={setInstagramOnly}
          label={t('ofSearch.hasInstagram')}
          compact={compact}
          locked={!canUsePremiumFilters}
          onLockedClick={onPremiumRequired}
        />
        <PremiumRow
          checked={joinWithinDays === 30}
          onChange={(v) => setJoinWithinDays(v ? 30 : 0)}
          label={t('home.new')}
          compact={compact}
          locked={!canUsePremiumFilters}
          onLockedClick={onPremiumRequired}
        />
      </div>

      <div className={`flex items-center justify-between border-t border-white/[0.07] ${compact ? 'pt-1.5' : 'pt-2'}`}>
        <button
          type="button"
          onClick={onClear}
          className={`font-semibold uppercase tracking-wide text-white/40 hover:text-[#00AFF0] transition-colors ${compact ? 'text-[9px]' : 'text-[11px]'}`}
        >
          {t('ofSearch.clear')}
        </button>
        <Link href={lp('/onlyfanssearch/categories')} className={`font-semibold text-[#00AFF0] hover:opacity-85 transition-opacity ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
          {t('home.viewAllCategories')}
        </Link>
      </div>
    </div>
  );
}
