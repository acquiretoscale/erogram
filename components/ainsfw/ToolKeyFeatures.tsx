const MAX_FEATURES = 12;

const listClass =
  'list-none space-y-2.5 text-left [&>li]:relative [&>li]:pl-5 [&>li]:text-[15px] [&>li]:text-gray-200 [&>li]:leading-relaxed [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.55em] [&>li]:before:h-1.5 [&>li]:before:w-1.5 [&>li]:before:rounded-full [&>li]:before:bg-[#22c55e]';

const sectionTitleClass =
  'text-center text-2xl sm:text-3xl font-black text-[#22c55e] mb-5 tracking-tight';

export default function ToolKeyFeatures({ features }: { features: string[] }) {
  const items = features.filter(Boolean).slice(0, MAX_FEATURES);
  if (items.length === 0) return null;

  return (
    <section className="mb-10 max-w-2xl mx-auto">
      <h2 className={sectionTitleClass}>Key Features</h2>
      <ul className={listClass}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
