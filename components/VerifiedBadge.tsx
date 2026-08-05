function VerifiedCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#00AFF0" />
      <path
        d="M7.2 12.3l2.9 2.9 6.7-6.9"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function VerifiedBadge({
  className = 'w-5 h-5 sm:w-6 sm:h-6',
  tooltip = 'This is a verified creator by EROgram team.',
}: {
  className?: string;
  tooltip?: string;
}) {
  return (
    <span
      className="relative inline-flex shrink-0 cursor-help group/verified"
      title={tooltip}
    >
      <VerifiedCheckIcon className={className} />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-[#00AFF0]/25 bg-[#0c1e35] px-2.5 py-1.5 text-[10px] font-semibold leading-snug text-white/90 opacity-0 shadow-lg transition-opacity duration-150 group-hover/verified:opacity-100"
      >
        {tooltip}
      </span>
    </span>
  );
}

/** Fancy pill label: "VERIFIED BY EROGRAM" */
export function VerifiedByErogramLabel({
  size = 'compact',
  className = '',
}: {
  size?: 'compact' | 'banner' | 'bannerSm' | 'bannerMd' | 'detail';
  className?: string;
}) {
  const isBanner = size === 'banner' || size === 'bannerSm' || size === 'bannerMd' || size === 'detail';
  const isHalf = size === 'bannerSm';
  const isMd = size === 'bannerMd';
  const isDetail = size === 'detail';

  const padClass = isDetail
    ? 'gap-2 px-[14px] py-[6px] sm:gap-[5.6px] sm:px-[9.8px] sm:py-[4.2px]'
    : isHalf
      ? 'gap-1 px-[7px] py-[3px] sm:gap-[2.8px] sm:px-[4.9px] sm:py-[2.1px]'
      : isMd
        ? 'gap-1 px-2 py-0.5 sm:gap-[2.8px] sm:px-[5.6px] sm:py-[1.4px]'
        : isBanner
          ? 'gap-2 px-3.5 py-1.5 sm:gap-[5.6px] sm:px-[9.8px] sm:py-[4.2px]'
          : 'gap-1 px-2 py-0.5 sm:gap-[2.8px] sm:px-[5.6px] sm:py-[1.4px]';

  const iconClass = isDetail
    ? 'w-4 h-4 sm:w-[11.2px] sm:h-[11.2px]'
    : isHalf
      ? 'w-2 h-2 sm:w-[5.6px] sm:h-[5.6px]'
      : isMd
        ? 'w-2.5 h-2.5 sm:w-[8.4px] sm:h-[8.4px]'
        : isBanner
          ? 'w-4 h-4 sm:w-[12.6px] sm:h-[12.6px]'
          : 'w-3 h-3 sm:w-[8.4px] sm:h-[8.4px]';

  const textClass = isDetail
    ? 'text-[14px] sm:text-[11.2px]'
    : isHalf
      ? 'text-[7px] sm:text-[5.6px]'
      : isMd
        ? 'text-[9px] sm:text-[7px]'
        : isBanner
          ? 'text-[10px] sm:text-[8.4px]'
          : 'text-[7px] sm:text-[5.6px]';

  return (
    <span
      className={`relative inline-flex items-center overflow-hidden rounded-full border border-[#00AFF0]/40 bg-gradient-to-r from-[#001a33] via-[#002244] to-[#001a33] shadow-[0_0_12px_rgba(0,175,240,0.25)] ${padClass} ${className}`}
      title={AINSFW_VERIFIED_TOOLTIP}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#00AFF0]/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]"
      />
      <VerifiedCheckIcon className={iconClass} />
      <span
        className={`relative font-black uppercase tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-r from-[#7dd3fc] via-white to-[#7dd3fc] ${textClass}`}
      >
        Verified by Erogram
      </span>
    </span>
  );
}

export const AINSFW_VERIFIED_TOOLTIP = 'Verified listing reviewed by the Erogram team.';
