/** Twitter / X-style verified mark — shared on Top Groups (Erogram, OF creators, feed ads). */
export default function TwitterVerifiedIcon({
  className = 'w-4 h-4 sm:w-5 sm:h-5 shrink-0',
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/assets/verified-tick.png" alt="" className={`${className} object-contain`} />
  );
}
