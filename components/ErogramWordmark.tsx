export default function ErogramWordmark({
  accent = '#c0392f',
  textClassName = 'text-white',
  className = '',
}: {
  accent?: string;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center uppercase tracking-tighter leading-none select-none font-black ${className}`}
      style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
    >
      <span className={textClassName}>EROGRAM</span>
      <span
        className="-ml-px leading-none translate-y-[0.02em]"
        style={{ color: accent, fontSize: 'calc(1.14em + 1px)', lineHeight: 1 }}
      >
        X
      </span>
    </span>
  );
}
