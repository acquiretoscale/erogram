import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type TrustedSponsor = {
  name: string;
  logo: string;
  width: number;
  height: number;
  /** Erogram AI NSFW tool slug → /ainsfw/{slug} */
  slug?: string;
};

export const TRUSTED_SPONSORS: TrustedSponsor[] = [
  { name: 'Candy AI', logo: '/assets/sponsors/candy-ai.webp', width: 170, height: 36, slug: 'candy-ai-ai-girlfriend' },
  { name: 'Instacam', logo: '/assets/sponsors/instacam.webp', width: 157, height: 44 },
  { name: 'Lovescape', logo: '/assets/sponsors/lovescape.webp', width: 119, height: 36, slug: 'lovescape-ai-girlfriend' },
];

const GREEN_HEADER_BG = 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)';
const ONLYFANS_HEADER_BG = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';

type Props = {
  variant?: 'light' | 'green' | 'onlyfans';
  sponsors?: TrustedSponsor[];
  title?: string;
  titleClassName?: string;
  subtitle?: ReactNode;
};

export default function TrustedByLeaders({
  variant = 'light',
  sponsors = TRUSTED_SPONSORS,
  title = 'Trusted by industry leaders',
  titleClassName,
  subtitle,
}: Props) {
  const isGreen = variant === 'green';
  const isOnlyfans = variant === 'onlyfans';
  const manySponsors = sponsors.length > 3;

  return (
    <section className={isGreen || isOnlyfans ? '' : 'mb-12'}>
      <div
        className={
          isGreen
            ? 'rounded-lg border-[3px] border-black px-6 py-5 sm:px-10 sm:py-7'
            : isOnlyfans
              ? `rounded-2xl border border-[#00AFF0]/25 shadow-[0_16px_40px_-20px_rgba(0,40,80,0.55)] ${manySponsors ? 'px-4 py-8 sm:px-6 sm:py-10' : 'px-8 py-10 sm:px-16 sm:py-12'}`
              : `rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.08)] ${manySponsors ? 'px-4 py-8 sm:px-6 sm:py-10' : 'px-8 py-10 sm:px-16 sm:py-12'}`
        }
        style={isGreen ? { background: GREEN_HEADER_BG } : isOnlyfans ? { background: ONLYFANS_HEADER_BG } : undefined}
      >
        <p
          className={
            titleClassName ??
            (isGreen || isOnlyfans
              ? 'text-center text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-white/45 mb-4 sm:mb-5'
              : 'text-center text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-neutral-400 mb-9 sm:mb-10')
          }
        >
          {title}
        </p>

        <div
          className={
            manySponsors
              ? `flex flex-row flex-wrap sm:flex-nowrap items-center justify-center w-full gap-2 sm:gap-2.5 md:gap-3 ${isGreen || isOnlyfans ? '' : 'gap-4'}`
              : `flex flex-col items-center justify-center mx-auto sm:flex-row sm:justify-between max-w-2xl ${isGreen || isOnlyfans ? 'gap-5 sm:gap-4' : 'gap-10 sm:gap-8'}`
          }
        >
          {sponsors.map((sponsor) => {
            const tileClass =
              isOnlyfans && manySponsors
                ? 'rounded-lg bg-white px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.28)]'
                : '';

            const imageClass = isOnlyfans
              ? manySponsors
                ? 'h-7 sm:h-8 md:h-9 w-auto max-w-[108px] sm:max-w-[128px] md:max-w-[152px] object-contain object-center'
                : 'h-7 sm:h-8 w-auto max-w-[140px] sm:max-w-[168px] object-contain object-center brightness-0 invert opacity-75 transition-opacity duration-300 group-hover:opacity-100'
              : manySponsors
                ? isGreen
                  ? 'h-5 sm:h-6 w-auto max-w-[72px] sm:max-w-[88px] object-contain object-center brightness-0 invert opacity-70 transition-all duration-300 group-hover:opacity-100'
                  : 'h-5 sm:h-6 w-auto max-w-[72px] sm:max-w-[88px] object-contain object-center grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100'
                : isGreen
                  ? 'h-6 sm:h-7 w-auto max-w-[120px] sm:max-w-[140px] object-contain object-center brightness-0 invert opacity-70 transition-all duration-300 group-hover:opacity-100'
                  : 'h-8 sm:h-9 md:h-10 w-auto max-w-[130px] sm:max-w-[160px] object-contain object-center grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100';

            const href = sponsor.slug ? `/ainsfw/${sponsor.slug}` : undefined;
            const inner = (
              <Image
                src={sponsor.logo}
                alt={sponsor.name}
                width={sponsor.width}
                height={sponsor.height}
                quality={100}
                sizes="(max-width: 640px) 100px, 140px"
                unoptimized
                className={imageClass}
              />
            );

            return (
              <div
                key={sponsor.name}
                className={`group flex items-center justify-center shrink-0 ${manySponsors ? 'px-0.5' : 'flex-1 min-w-0 px-1'} ${tileClass}`}
              >
                {href ? (
                  <Link href={href} className="flex items-center justify-center" aria-label={sponsor.name}>
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
        {subtitle ? (
          <p
            className={
              isGreen || isOnlyfans
                ? 'text-center text-sm sm:text-base text-white/70 mt-5 sm:mt-6 px-2 leading-relaxed'
                : 'text-center text-sm sm:text-base text-neutral-600 mt-6 sm:mt-8'
            }
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
