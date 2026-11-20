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
      className={`inline uppercase tracking-tighter leading-none select-none font-black ${className}`}
      style={{ fontFamily: 'var(--font-inter-tight), sans-serif' }}
    >
      <span className={textClassName}>EROGRAM</span>
      <span style={{ color: accent }}>X</span>
    </span>
  );
}
