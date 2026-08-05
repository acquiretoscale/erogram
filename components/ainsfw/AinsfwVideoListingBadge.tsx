export default function AinsfwVideoListingBadge({
  src,
  alt,
  title,
  className = '',
}: {
  src: string;
  alt: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex overflow-hidden rounded-md border border-white/25 bg-black/55 shadow-lg ring-1 ring-black/20 ${className}`.trim()}
      title={title}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        onError={(e) => { (e.target as HTMLImageElement).src = '/assets/image.jpg'; }}
      />
    </span>
  );
}
