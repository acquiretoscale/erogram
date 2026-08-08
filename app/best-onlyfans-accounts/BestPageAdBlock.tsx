interface BestPageAdBlockProps {
  ads: Array<{
    _id: string;
    name?: string;
    ofUsername?: string;
    destinationUrl?: string;
  }>;
}

export default function BestPageAdBlock({ ads }: BestPageAdBlockProps) {
  if (!ads.length) return null;

  return (
    <section className="rounded-2xl border border-[#00AFF0]/20 bg-white p-4 sm:p-5 mb-12">
      <h3 className="text-sm font-black text-[#2B1B28] mb-3">
        TRENDING ON <span className="text-[#00AFF0]">EROGRAM</span>
      </h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none p-0 m-0">
        {ads.slice(0, 4).map((c) => {
          // Promoted / paid: always use their destination/tracking URL. Never force /go.
          const href = c.destinationUrl || '#';
          return (
            <li key={c._id}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(43,27,40,0.08)] px-3 py-2.5 text-sm font-bold text-[#2B1B28] transition-colors hover:border-[#00AFF0]/35"
              >
                <span className="truncate">{c.name || username}</span>
                <span className="text-[10px] uppercase tracking-wide text-[#00AFF0] shrink-0">View</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
