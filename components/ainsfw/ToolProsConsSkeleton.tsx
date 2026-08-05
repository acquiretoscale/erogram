const MAX_ITEMS = 10;

const listClass =
  'list-none space-y-2.5 text-left [&>li]:relative [&>li]:pl-5 [&>li]:text-[15px] [&>li]:text-gray-200 [&>li]:leading-relaxed [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.55em] [&>li]:before:h-1.5 [&>li]:before:w-1.5 [&>li]:before:rounded-full';

const sectionTitleClass =
  'text-center text-2xl sm:text-3xl font-black text-[#22c55e] mb-5 tracking-tight';

function BulletList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'pro' | 'con';
}) {
  const filled = items.filter(Boolean).slice(0, MAX_ITEMS);
  if (filled.length === 0) return null;

  const isPro = tone === 'pro';

  return (
    <div
      className={`rounded-xl p-4 sm:p-5 ${
        isPro
          ? 'bg-[#22c55e]/10 border border-[#22c55e]/25'
          : 'bg-[#f87171]/10 border border-[#f87171]/25'
      }`}
    >
      <h3 className={`text-base font-bold mb-3 ${isPro ? 'text-[#86efac]' : 'text-[#fca5a5]'}`}>
        {title}
      </h3>
      <ul className={`${listClass} ${isPro ? '[&>li]:before:bg-[#22c55e]' : '[&>li]:before:bg-[#f87171]'}`}>
        {filled.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ToolProsConsSkeleton({
  pros = [],
  cons = [],
}: {
  pros?: string[];
  cons?: string[];
}) {
  if (pros.length === 0 && cons.length === 0) return null;

  return (
    <section className="mb-10 max-w-3xl mx-auto">
      <h2 className={sectionTitleClass}>Pros and Cons</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <BulletList title="Pros" items={pros} tone="pro" />
        <BulletList title="Cons" items={cons} tone="con" />
      </div>
    </section>
  );
}
