'use client';

import Image from 'next/image';

export default function OrganicGrowth() {
  return (
    <div className="rounded-2xl p-6 sm:p-8 mb-6 overflow-hidden bg-white border border-gray-100 shadow-sm">
      <div className="rounded-xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-3 bg-white">
          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#b31b1b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16 7 22 7 22 13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Organic Search Growth</h3>
            <p className="text-[10px] text-gray-600">Google Search Console — erogram.pro</p>
          </div>
          <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">Verified</span>
        </div>

        <div className="flex flex-col lg:flex-row bg-white">
          {/* Left — bold stat + chart */}
          <div className="flex-1 p-5 sm:p-6">

            {/* Bold statement — before the picture */}
            <div className="mb-6 pb-6 border-b border-gray-100">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#b31b1b] mb-2">Organic Growth</p>
              <span className="text-6xl sm:text-7xl font-black text-gray-900 leading-none tabular-nums">97%</span>
              <p className="text-base font-bold text-gray-700 leading-snug mt-2">
                Google organic traffic growth<br />in the last 3 months.
              </p>
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4">Last 3 Months — Google Search Console</p>

            {/* Chart image */}
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <Image
                src="/assets/google-search-console.png"
                alt="Google Search Console growth chart"
                width={680} height={640} className="w-full h-auto"
              />
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-3">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Source: Google Search Console — erogram.pro — Last 3 months</span>
            </div>
          </div>

          {/* Right — insight */}
          <div className="flex-1 p-5 sm:p-6 lg:border-l border-t lg:border-t-0 border-gray-100 bg-gray-50 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4">Advertiser Insight</p>

            <h4 className="text-lg font-black text-gray-900 mb-3 leading-snug">
              Growing audience.<br />
              <span className="text-[#b31b1b]">Your ROI compounds over time.</span>
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Advertisers who book early lock in current rates while benefiting from an audience that is <span className="text-gray-800 font-semibold">growing faster each month</span>.
              Every month of delay means a larger audience at the same price.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
