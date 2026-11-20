'use client';

import Image from 'next/image';

const INFEED_IMAGE_EXAMPLE = '/assets/promo/infeed-image-ad-example.webp';
const CARD_HEIGHT = '480px';

const VERIFIED_BADGE = (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/assets/verified-tick.png" alt="" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 object-contain" />
);

function InFeedImageAdTemplate() {
  return (
    <div
      className="rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/50"
      style={{ height: CARD_HEIGHT }}
    >
      <div className="relative w-full h-[52%] min-h-[220px] overflow-hidden bg-[#1a1a1a] shrink-0">
        <Image
          src={INFEED_IMAGE_EXAMPLE}
          alt=""
          fill
          sizes="280px"
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-3 left-3">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
            <span className="text-xs text-red-400">⚡</span>
            <span className="text-xs font-bold text-white">247 visiting now</span>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0 bg-[#0a0a0a]">
        <h3 className="font-black text-white mb-2 sm:mb-3 leading-tight flex items-center gap-1.5 text-lg sm:text-xl">
          <span className="truncate min-w-0">Your Brand Here</span>
          {VERIFIED_BADGE}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed flex-1">
          Native in-feed image placement. Same card format users see across EROGRAM<span className="text-red-500">X</span> feed and pages.
        </p>
        <div className="mt-auto space-y-3 pt-3">
          <div className="flex items-center gap-1 px-1">
            <span className="text-yellow-500 text-sm">⭐</span>
            <span className="text-white font-bold text-sm">4.9</span>
            <span className="text-gray-500 text-xs">(19)</span>
          </div>
          <div className="w-full py-3.5 px-4 rounded-xl font-black text-white text-sm uppercase tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg text-center">
            Visit Site
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InFeedAdFormatComparison() {
  return (
    <section className="mb-12">
      <div className="overflow-hidden bg-white" style={{ border: '3px solid #000', boxShadow: '6px 6px 0px #000', color: '#000' }}>
        <div className="px-6 py-5 sm:px-8 text-center" style={{ background: 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)' }}>
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight uppercase tracking-tight">
            Example of our In feed integrated ads.
          </h2>
        </div>

        <div className="px-4 sm:px-8 py-6 sm:py-8 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center sm:items-start">
            <div className="w-full max-w-[280px] sm:w-[280px] shrink-0 pointer-events-none select-none">
              <InFeedImageAdTemplate />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
