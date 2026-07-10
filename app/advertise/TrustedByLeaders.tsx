import Image from 'next/image';

const SPONSORS = [
  { name: 'Candy AI', logo: '/assets/sponsors/candy-ai.webp', width: 170, height: 36 },
  { name: 'Instacam', logo: '/assets/sponsors/instacam.webp', width: 157, height: 44 },
  { name: 'Lovescape', logo: '/assets/sponsors/lovescape.webp', width: 119, height: 36 },
] as const;

export default function TrustedByLeaders() {
  return (
    <section className="mb-12">
      <div className="rounded-2xl bg-white px-8 py-10 sm:px-16 sm:py-12 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.08)]">
        <p className="text-center text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-neutral-400 mb-9 sm:mb-10">
          Trusted by industry leaders
        </p>

        <div className="flex flex-col items-center justify-center gap-10 sm:flex-row sm:justify-between sm:gap-8 max-w-2xl mx-auto">
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
                className="h-8 sm:h-9 md:h-10 w-auto max-w-[160px] object-contain object-center grayscale opacity-60 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
