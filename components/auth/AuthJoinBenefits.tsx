'use client';

import { Bookmark, Rocket, Search, Shield } from 'lucide-react';

export const JOIN_BENEFITS = [
  { icon: Search, text: 'Browse thousands of profiles by niche' },
  { icon: Bookmark, text: 'Bookmark and save your favourites' },
  { icon: Rocket, text: 'Unlock the full Erogram experience' },
  { icon: Shield, text: 'Unlock beta features' },
] as const;

export default function AuthJoinBenefits({ isAinsfwTheme }: { isAinsfwTheme: boolean }) {
  const itemClass =
    'flex items-center gap-2 px-2.5 py-2 rounded-lg bg-black/[0.03] border border-black/10';

  const iconWrap = isAinsfwTheme
    ? 'flex-shrink-0 w-6 h-6 rounded-md bg-[#22c55e]/10 flex items-center justify-center'
    : 'flex-shrink-0 w-6 h-6 rounded-md bg-[#00AFF0]/10 flex items-center justify-center';

  return (
    <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
      {JOIN_BENEFITS.map(({ icon: Icon, text }) => (
        <div key={text} className={itemClass}>
          <div className={iconWrap}>
            <Icon className={`w-3 h-3 ${isAinsfwTheme ? 'text-[#22c55e]' : 'text-[#00AFF0]'}`} />
          </div>
          <span className="text-[11px] sm:text-xs text-gray-700 font-medium leading-tight">{text}</span>
        </div>
      ))}
    </div>
  );
}
