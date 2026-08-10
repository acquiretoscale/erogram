'use client';

import { useTranslation } from '@/lib/i18n/client';
import type { AINsfwCategory, AinsfwSortOption, PaymentOption, PricingModel } from './types';
import { AINSFW_CATEGORIES, AINSFW_SORT_OPTIONS, ALL_PAYMENT_OPTIONS, PRICING_MODEL_OPTIONS } from './types';

interface AinsfwToolsFilterBarProps {
  activeCategory: AINsfwCategory;
  activePricing: PricingModel;
  activePayment: PaymentOption | 'All';
  activeSort: AinsfwSortOption;
  search: string;
  onCategoryChange: (cat: AINsfwCategory) => void;
  onPricingChange: (model: PricingModel) => void;
  onPaymentChange: (pay: PaymentOption | 'All') => void;
  onSortChange: (sort: AinsfwSortOption) => void;
  onSearchChange: (q: string) => void;
  onClear: () => void;
}

const selectCls =
  'h-8 pl-2.5 pr-7 rounded-lg bg-[#04140c]/80 border border-[#22c55e]/25 text-white text-[10px] sm:text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#22c55e]/50 appearance-none cursor-pointer min-w-0';

const pillBase = 'h-8 px-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-colors border whitespace-nowrap';
const pillIdle = 'bg-[#04140c]/80 text-white/70 border-[#22c55e]/25 hover:border-[#22c55e]/50 hover:text-white';
const pillActive = 'bg-[#22c55e] text-black border-[#22c55e]';

export default function AinsfwToolsFilterBar({
  activeCategory,
  activePricing,
  activePayment,
  activeSort,
  search,
  onCategoryChange,
  onPricingChange,
  onPaymentChange,
  onSortChange,
  onSearchChange,
  onClear,
}: AinsfwToolsFilterBarProps) {
  const { t } = useTranslation();
  const catLabel = (cat: string) => t(`ainsfw.categories.${cat}`, cat);
  const pricingLabel = (model: string) => {
    if (model === 'All') return t('ainsfw.allModels', 'All models');
    if (model === 'Free') return t('ainsfw.free', 'Free');
    if (model === 'Paid') return t('ainsfw.paid', 'Paid');
    if (model === 'Freemium') return t('ainsfw.freemium', 'Freemium');
    return model;
  };
  const sortLabel = (value: string, fallback: string) => {
    if (value === 'default') return t('ainsfw.sortDefault', 'Default');
    if (value === 'top-upvotes') return t('ainsfw.sortTopUpvotes', 'Top upvotes');
    return fallback;
  };
  const hasFilters =
    activeCategory !== 'All' ||
    activePricing !== 'All' ||
    activePayment !== 'All' ||
    activeSort !== 'default' ||
    !!search.trim();

  return (
    <div className="mb-10 sm:mb-14 rounded-2xl border border-[#22c55e]/15 bg-[#0a1f12] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="relative shrink-0">
          <select
            value={activeCategory}
            onChange={(e) => onCategoryChange(e.target.value as AINsfwCategory)}
            aria-label="Category"
            className={`${selectCls} max-w-[9.5rem] sm:max-w-[11rem]`}
          >
            {AINSFW_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-[#0a1f12]">
                {cat === 'All' ? t('ainsfw.allCategories', 'All categories') : catLabel(cat)}
              </option>
            ))}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {PRICING_MODEL_OPTIONS.map((model) => {
            const isActive = activePricing === model;
            const label = pricingLabel(model);
            return (
              <button
                key={model}
                type="button"
                onClick={() => onPricingChange(model)}
                aria-pressed={isActive}
                className={`${pillBase} ${isActive ? pillActive : pillIdle}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative shrink-0">
          <select
            value={activePayment}
            onChange={(e) => onPaymentChange(e.target.value as PaymentOption | 'All')}
            aria-label="Accepted payment"
            className={`${selectCls} max-w-[8.5rem] sm:max-w-[9.5rem]`}
          >
            <option value="All" className="bg-[#0a1f12]">{t('ainsfw.allPayments', 'All payments')}</option>
            {ALL_PAYMENT_OPTIONS.map((pay) => (
              <option key={pay} value={pay} className="bg-[#0a1f12]">{pay}</option>
            ))}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {AINSFW_SORT_OPTIONS.map(({ value, label }) => {
            const isActive = activeSort === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onSortChange(value)}
                aria-pressed={isActive}
                className={`${pillBase} ${isActive ? pillActive : pillIdle}`}
              >
                {sortLabel(value, label)}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[7rem] sm:min-w-[9rem]">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('ainsfw.searchPlaceholder', 'Search…')}
            aria-label="Search AI NSFW tools"
            className="w-full h-8 pl-7 pr-7 rounded-lg bg-[#04140c]/80 border border-[#22c55e]/25 text-white text-[10px] sm:text-[11px] placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-[#22c55e]/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className={`${pillBase} ${pillIdle} shrink-0`}
          >
            {t('ainsfw.clear', 'Clear')}
          </button>
        )}
      </div>
    </div>
  );
}
