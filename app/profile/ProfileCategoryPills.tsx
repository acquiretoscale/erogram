'use client';

export type ProfileCategoryPill = { slug: string; label: string };

export default function ProfileCategoryPills({
  categories,
  accent,
  border,
  className,
  variant = 'default',
}: {
  categories: ProfileCategoryPill[];
  accent: string;
  muted: string;
  border: string;
  className?: string;
  variant?: 'default' | 'overlay';
}) {
  const pills = (categories || []).filter((c) => c?.slug).slice(0, 8);
  if (!pills.length) return null;

  const overlay = variant === 'overlay';

  return (
    <div className={`flex flex-wrap gap-1 ${overlay ? '' : 'mt-1.5'} ${className || ''}`.trim()}>
      {pills.map((cat) => (
        <span
          key={cat.slug}
          className={
            overlay
              ? 'text-[8px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border border-white/20 text-white/90 bg-black/35 backdrop-blur-[2px]'
              : 'text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border'
          }
          style={
            overlay
              ? undefined
              : { color: accent, borderColor: border, backgroundColor: `${accent}12` }
          }
        >
          {cat.label}
        </span>
      ))}
    </div>
  );
}
