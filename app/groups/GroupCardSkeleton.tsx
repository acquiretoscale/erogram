export default function GroupCardSkeleton() {
  return (
    <div
      className="relative rounded-[18px] sm:rounded-3xl overflow-hidden h-full flex flex-col border border-white/10 animate-pulse"
      style={{ background: 'linear-gradient(180deg, #0e1320 0%, #0a0d16 100%)' }}
    >
      {/* Image skeleton — inset, rounded */}
      <div className="relative w-full aspect-square rounded-[14px] sm:rounded-2xl m-2 sm:m-2.5 mb-0 bg-[#11151f]">
        <div className="w-full h-full rounded-[14px] sm:rounded-2xl bg-white/5 animate-pulse"></div>
      </div>

      {/* Content skeleton */}
      <div className="p-3 sm:p-5 flex-grow flex flex-col">
        {/* Title skeleton */}
        <div className="h-4 sm:h-6 bg-white/10 rounded mb-3 sm:mb-4 animate-pulse w-2/3"></div>

        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <div className="h-5 sm:h-6 w-12 sm:w-16 bg-white/5 rounded-lg animate-pulse"></div>
          <div className="h-5 sm:h-6 w-14 sm:w-20 bg-white/5 rounded-lg animate-pulse"></div>
        </div>

        {/* Description skeleton */}
        <div className="mb-3 sm:mb-6 flex-grow">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="h-3 sm:h-4 bg-white/10 rounded animate-pulse"></div>
            <div className="h-3 sm:h-4 bg-white/10 rounded animate-pulse w-3/4"></div>
          </div>
        </div>

        {/* Button skeleton */}
        <div className="h-10 sm:h-12 bg-white/10 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
}
