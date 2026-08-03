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
      <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Verified">
        <circle cx="12" cy="12" r="12" fill="#00AFF0" />
        <path
          d="M7.2 12.3l2.9 2.9 6.7-6.9"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-[#00AFF0]/25 bg-[#0c1e35] px-2.5 py-1.5 text-[10px] font-semibold leading-snug text-white/90 opacity-0 shadow-lg transition-opacity duration-150 group-hover/verified:opacity-100"
      >
        {tooltip}
      </span>
    </span>
  );
}

export const AINSFW_VERIFIED_TOOLTIP = 'Verified listing reviewed by the Erogram team.';
