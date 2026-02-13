export default function GroupCardSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden h-full max-h-[500px] flex flex-col backdrop-blur-lg border border-white/10 animate-pulse">
      {/* Image skeleton */}
      <div className="relative w-full h-48 bg-gray-800">
        <div className="w-full h-full bg-gray-700 animate-pulse"></div>
      </div>

      {/* Content skeleton */}
      <div className="p-6 flex-grow flex flex-col">
        {/* Title skeleton */}
        <div className="h-6 bg-gray-700 rounded mb-4 animate-pulse"></div>

        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="h-6 w-16 bg-red-500/20 rounded-full animate-pulse"></div>
          <div className="h-6 w-20 bg-green-500/20 rounded-full animate-pulse"></div>
        </div>

        {/* Rating skeleton */}
        <div className="mb-4">
          <div className="flex gap-1 mb-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="w-4 h-4 bg-gray-600 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            <div className="h-8 w-16 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Description skeleton */}
        <div className="mb-6 flex-grow">
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
          </div>
        </div>

        {/* Creator skeleton */}
        <div className="mb-4">
          <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
        </div>

        {/* Button skeleton */}
        <div className="h-12 bg-gray-700 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
}