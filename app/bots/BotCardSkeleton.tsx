import React from 'react';

export default function BotCardSkeleton() {
    return (
        <div className="glass rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col backdrop-blur-xl border border-white/5 animate-pulse">
            {/* Image skeleton */}
            <div className="relative w-full h-32 sm:h-52 bg-gray-800">
                <div className="w-full h-full bg-gray-700 animate-pulse"></div>
            </div>

            {/* Content skeleton */}
            <div className="p-3 sm:p-5 flex-grow flex flex-col">
                {/* Title skeleton */}
                <div className="h-4 sm:h-7 bg-gray-700 rounded mb-2 sm:mb-3 animate-pulse w-3/4"></div>

                {/* Tags skeleton */}
                <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4">
                    <div className="h-4 sm:h-6 w-14 sm:w-20 bg-gray-700 rounded-lg animate-pulse"></div>
                    <div className="h-4 sm:h-6 w-10 sm:w-16 bg-gray-700 rounded-lg animate-pulse"></div>
                </div>

                {/* Description skeleton */}
                <div className="mb-3 sm:mb-6 flex-grow">
                    <div className="space-y-1.5 sm:space-y-2">
                        <div className="h-3 sm:h-4 bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 sm:h-4 bg-gray-700 rounded animate-pulse w-5/6"></div>
                    </div>
                </div>

                {/* Button skeleton */}
                <div className="mt-auto">
                    <div className="h-9 sm:h-12 bg-gray-700 rounded-xl animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}
