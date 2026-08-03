import Image from 'next/image';

type Props = {
  compact?: boolean;
  variant?: 'devil-girl' | 'mascot-blended';
  className?: string;
  /** Edge fade color — defaults to black. Use page background color to blend in. */
  fadeColor?: string;
  /** Drop border/shadow so the image melts into the page background. */
  softBlend?: boolean;
  /** Span the full viewport width instead of the default capped container. */
  fullWidth?: boolean;
};

export default function ErogramDevilGirlFooter({
  compact = false,
  variant = 'devil-girl',
  className = '',
  fadeColor = '#000000',
  softBlend = false,
  fullWidth = false,
}: Props) {
  if (variant === 'mascot-blended') {
    const fadeSolid = fadeColor;
    const fadeSoft = fadeColor.startsWith('#')
      ? `${fadeColor}d9`
      : fadeColor;
    const fadeMid = fadeColor.startsWith('#')
      ? `${fadeColor}80`
      : fadeColor;

    return (
      <div className={`relative w-full px-4 sm:px-6 lg:px-8 mt-6 mb-0 pointer-events-none select-none ${className}`}>
        <div
          className={
            fullWidth
              ? 'relative mx-auto w-full overflow-hidden'
              : 'relative mx-auto max-w-5xl xl:max-w-7xl 2xl:max-w-[1440px] overflow-hidden'
          }
          style={
            softBlend
              ? undefined
              : { border: '3px solid #000000', boxShadow: '6px 6px 0px #000000' }
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/erogram-mascot-blended.jpg"
            alt=""
            width={1024}
            height={575}
            className="w-full h-auto block"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className={
                softBlend
                  ? 'absolute top-0 left-0 w-[14%] h-[14%] sm:w-[12%] sm:h-[12%]'
                  : 'absolute top-0 left-0 w-6 h-6 sm:w-10 sm:h-10'
              }
              style={{
                background: softBlend
                  ? `radial-gradient(circle at 0 0, ${fadeSolid} 0%, ${fadeMid} 45%, transparent 100%)`
                  : `radial-gradient(circle at 0 0, ${fadeSolid} 0%, transparent 70%)`,
              }}
            />
            <div
              className={
                softBlend
                  ? 'absolute top-0 right-0 w-[14%] h-[14%] sm:w-[12%] sm:h-[12%]'
                  : 'absolute top-0 right-0 w-6 h-6 sm:w-10 sm:h-10'
              }
              style={{
                background: softBlend
                  ? `radial-gradient(circle at 100% 0, ${fadeSolid} 0%, ${fadeMid} 45%, transparent 100%)`
                  : `radial-gradient(circle at 100% 0, ${fadeSolid} 0%, transparent 70%)`,
              }}
            />
            <div
              className={
                softBlend
                  ? 'absolute bottom-0 left-0 w-[14%] h-[14%] sm:w-[12%] sm:h-[12%]'
                  : 'absolute bottom-0 left-0 w-6 h-6 sm:w-10 sm:h-10'
              }
              style={{
                background: softBlend
                  ? `radial-gradient(circle at 0 100%, ${fadeSolid} 0%, ${fadeMid} 45%, transparent 100%)`
                  : `radial-gradient(circle at 0 100%, ${fadeSolid} 0%, transparent 70%)`,
              }}
            />
            <div
              className={
                softBlend
                  ? 'absolute bottom-0 right-0 w-[14%] h-[14%] sm:w-[12%] sm:h-[12%]'
                  : 'absolute bottom-0 right-0 w-6 h-6 sm:w-10 sm:h-10'
              }
              style={{
                background: softBlend
                  ? `radial-gradient(circle at 100% 100%, ${fadeSolid} 0%, ${fadeMid} 45%, transparent 100%)`
                  : `radial-gradient(circle at 100% 100%, ${fadeSolid} 0%, transparent 70%)`,
              }}
            />
            <div
              className={softBlend ? 'absolute inset-x-0 top-0 h-[13%]' : 'absolute inset-x-0 top-0 h-[8%]'}
              style={{
                background: softBlend
                  ? `linear-gradient(to bottom, ${fadeSolid} 0%, ${fadeSoft} 35%, ${fadeMid} 65%, transparent 100%)`
                  : `linear-gradient(to bottom, ${fadeSoft} 0%, transparent 100%)`,
              }}
            />
            <div
              className={softBlend ? 'absolute inset-x-0 bottom-0 h-[16%]' : 'absolute inset-x-0 bottom-0 h-[10%]'}
              style={{
                background: softBlend
                  ? `linear-gradient(to top, ${fadeSolid} 0%, ${fadeSoft} 35%, ${fadeMid} 65%, transparent 100%)`
                  : `linear-gradient(to top, ${fadeSoft} 0%, transparent 100%)`,
              }}
            />
            <div
              className={softBlend ? 'absolute inset-y-0 left-0 w-[11%]' : 'absolute inset-y-0 left-0 w-[6%]'}
              style={{
                background: softBlend
                  ? `linear-gradient(to right, ${fadeSolid} 0%, ${fadeSoft} 40%, ${fadeMid} 70%, transparent 100%)`
                  : `linear-gradient(to right, ${fadeSoft} 0%, transparent 100%)`,
              }}
            />
            <div
              className={softBlend ? 'absolute inset-y-0 right-0 w-[11%]' : 'absolute inset-y-0 right-0 w-[6%]'}
              style={{
                background: softBlend
                  ? `linear-gradient(to left, ${fadeSolid} 0%, ${fadeSoft} 40%, ${fadeMid} 70%, transparent 100%)`
                  : `linear-gradient(to left, ${fadeSoft} 0%, transparent 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex justify-center px-4 pointer-events-none select-none ${
        compact ? 'py-0 -mt-5 -mb-8' : 'py-0 mt-2 pb-0'
      }`}
    >
      <Image
        src="/assets/erogram-devil-girl.png"
        alt=""
        width={180}
        height={287}
        sizes={compact ? '126px' : '(max-width: 640px) 120px, 160px'}
        className={
          compact
            ? 'h-auto w-[84px] sm:w-[105px] md:w-[126px] object-contain opacity-95'
            : 'h-auto w-[100px] sm:w-[130px] md:w-[160px] object-contain opacity-95'
        }
      />
    </div>
  );
}
