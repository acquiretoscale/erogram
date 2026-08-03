import Image from 'next/image';

const SPONSORS = [
  { name: 'Candy AI', logo: '/assets/sponsors/candy-ai.webp', width: 170, height: 36 },
  { name: 'Instacam', logo: '/assets/sponsors/instacam.webp', width: 157, height: 44 },
  { name: 'Lovescape', logo: '/assets/sponsors/lovescape.webp', width: 119, height: 36 },
] as const;

const GREEN_HEADER_BG = 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)';

type Props = { variant?: 'light' | 'green' };

export default function TrustedByLeaders({ variant = 'light' }: Props) {
  const isGreen = variant === 'green';

  return (
    <section className={isGreen ? 'mb-0' : 'mb-12'}>
      <div
        className={
          isGreen
            ? 'rounded-lg border-[3px] border-black px-6 py-5 sm:px-10 sm:py-7'
            : 'rounded-2xl bg-white px-8 py-10 sm:px-16 sm:py-12 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.08)]'
        }
        style={isGreen ? { background: GREEN_HEADER_BG } : undefined}
      >
        <p
          className={
            isGreen
              ? 'text-center text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-white/45 mb-4 sm:mb-5'
              : 'text-center text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-neutral-400 mb-9 sm:mb-10'
          }
        >
          Trusted by industry leaders
        </p>

        <div className={`flex flex-col items-center justify-center max-w-2xl mx-auto sm:flex-row sm:justify-between ${isGreen ? 'gap-5 sm:gap-6' : 'gap-10 sm:gap-8'}`}>
          {SPONSORS.map((sponsor) => (
            <div
              key={sponsor.name}
              className="group flex flex-1 items-center justify-center"
            >
              <Image
                src={sponsor.logo}
                alt={sponsor.name}
                width={sponsor.width}
                height={sponsor.height}
                className={
                  isGreen
                    ? 'h-6 sm:h-7 w-auto max-w-[140px] object-contain object-center brightness-0 invert opacity-70 transition-all duration-300 group-hover:opacity-100'
                    : 'h-8 sm:h-9 md:h-10 w-auto max-w-[160px] object-contain object-center grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100'
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
