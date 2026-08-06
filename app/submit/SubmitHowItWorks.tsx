const STEPS = [
  {
    step: 'STEP 1',
    title: 'One-click import',
    body: 'Import your OnlyFans profile in a single click - photos, bio, and details transfer automatically.',
  },
  {
    step: 'STEP 2',
    title: 'Create your Erogram account',
    body: 'Set up your free account in under a minute and claim your page.',
  },
  {
    step: 'STEP 3',
    title: 'Customize & choose your plan',
    body: 'Add your socials, extra photos/videos, and niche tags. Stay free or unlock Boosted ($197/Week) for Top 10 rankings + OnlyFans Search feed placement.',
  },
  {
    step: 'STEP 4',
    title: 'Happy Growth!',
    body: null,
  },
] as const;

const HEADER_BG = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';

export default function SubmitHowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-title"
      className="relative left-1/2 w-[min(100vw-1rem,64rem)] max-w-5xl -translate-x-1/2"
    >
      <div
        className="rounded-2xl border border-[#00AFF0]/25 overflow-hidden shadow-[0_12px_36px_-18px_rgba(0,80,140,0.45)]"
        style={{ background: HEADER_BG }}
      >
        <h2
          id="how-it-works-title"
          className="text-center text-[11px] sm:text-xs font-black uppercase tracking-[0.22em] text-[#00AFF0] pt-5 sm:pt-6 pb-4 px-4"
        >
          How it works
        </h2>

        <ol className="grid grid-cols-4 gap-1.5 sm:gap-3 px-2 sm:px-4 pb-4 sm:pb-5 list-none m-0">
          {STEPS.map((step) => (
            <li
              key={step.step}
              className="flex flex-col rounded-lg sm:rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2.5 sm:px-3.5 sm:py-4 min-h-0"
            >
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.12em] sm:tracking-[0.18em] text-[#00AFF0] mb-1.5 sm:mb-2 m-0">
                {step.step}
              </p>
              <h3 className="text-[11px] sm:text-sm font-black text-white leading-snug mb-0">
                {step.title}
              </h3>
              {step.body ? (
                <p className="text-[9px] sm:text-xs leading-snug sm:leading-relaxed text-white/60 mt-1.5 sm:mt-2 mb-0">
                  {step.body}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
