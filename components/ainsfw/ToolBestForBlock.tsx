export default function ToolBestForBlock({
  bestFor,
  notIdealFor,
}: {
  bestFor?: string;
  notIdealFor?: string;
}) {
  if (!bestFor && !notIdealFor) return null;

  return (
    <section className="mb-8 grid sm:grid-cols-2 gap-6">
      {bestFor ? (
        <div>
          <h3 className="text-base font-bold text-white mb-1">Best for</h3>
          <p className="text-[15px] text-gray-200 leading-relaxed">{bestFor}</p>
        </div>
      ) : null}
      {notIdealFor ? (
        <div>
          <h3 className="text-base font-bold text-white mb-1">Not ideal for</h3>
          <p className="text-[15px] text-gray-200 leading-relaxed">{notIdealFor}</p>
        </div>
      ) : null}
    </section>
  );
}
