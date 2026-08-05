/** Matches top-right SUBMIT YOUR TOOL button — border + ring treatment. */
export const AINSFW_SUBMIT_CTA_BASE =
  'bg-[#facc15] border-2 border-[#fff566] text-black font-black uppercase tracking-tight ring-2 ring-[#fef08a] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] hover:bg-[#fde047] active:bg-[#eab308] transition-all disabled:opacity-70 disabled:cursor-not-allowed';

export type AinsfwCtaVariant = 'header' | 'md' | 'lg' | 'full' | 'videoSm' | 'videoLg' | 'card';

export function ainsfwCtaButtonClass(variant: AinsfwCtaVariant = 'md', extra = '') {
  const base = `inline-flex items-center justify-center ${AINSFW_SUBMIT_CTA_BASE}`;
  const sizes: Record<AinsfwCtaVariant, string> = {
    header: 'h-9 sm:h-10 w-[6.75rem] sm:w-[7.5rem] rounded-md text-[9px] sm:text-[10px] whitespace-nowrap px-1 shrink-0',
    md: 'px-6 py-3 rounded-xl text-sm',
    lg: 'px-10 py-4 rounded-xl text-lg sm:text-xl',
    full: 'w-full px-8 py-5 rounded-2xl text-xl',
    videoSm: 'w-[94%] max-w-full px-4 py-2.5 rounded-lg text-xs sm:text-sm whitespace-nowrap',
    videoLg: 'w-[94%] max-w-full px-5 py-4 rounded-xl text-sm sm:text-base whitespace-nowrap',
    card: 'w-full text-[10px] sm:text-xs tracking-[1px] text-center py-1.5 rounded-lg',
  };
  return [base, sizes[variant], extra].filter(Boolean).join(' ');
}
