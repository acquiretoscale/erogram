import { ainsfwStarTier } from '@/lib/ainsfw/reviewStars';

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

type Size = 'card' | 'detail';

const SIZE: Record<Size, string> = {
  card: 'w-2.5 h-2.5',
  detail: 'w-4 h-4',
};

function OneStar({
  tier,
  size,
  filledClass,
  emptyClass,
}: {
  tier: 'full' | 'half' | 'empty';
  size: Size;
  filledClass: string;
  emptyClass: string;
}) {
  const dim = SIZE[size];
  if (tier === 'empty') {
    return (
      <svg className={`${dim} ${emptyClass}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d={STAR_PATH} />
      </svg>
    );
  }
  if (tier === 'full') {
    return (
      <svg className={`${dim} ${filledClass}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d={STAR_PATH} />
      </svg>
    );
  }
  return (
    <span className={`relative inline-block shrink-0 ${dim}`} aria-hidden>
      <svg className={`absolute inset-0 ${emptyClass}`} viewBox="0 0 24 24" fill="currentColor">
        <path d={STAR_PATH} />
      </svg>
      <svg
        className={`absolute inset-0 ${filledClass}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ clipPath: 'inset(0 50% 0 0)' }}
      >
        <path d={STAR_PATH} />
      </svg>
    </span>
  );
}

export default function AinsfwReviewStars({
  avg,
  size,
  filledClass,
  emptyClass,
}: {
  avg: number;
  size: Size;
  filledClass: string;
  emptyClass: string;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((s) => (
        <OneStar
          key={s}
          tier={ainsfwStarTier(avg, s)}
          size={size}
          filledClass={filledClass}
          emptyClass={emptyClass}
        />
      ))}
    </div>
  );
}
