'use client';

import Link from 'next/link';

const PROFILES = [
  { slug: 'enzogonzo', name: 'Enzo Gonzo', avatar: 'https://i.pravatar.cc/300?img=68' },
  { slug: 'vickykovaks', name: 'Vicky Kovaks', avatar: 'https://i.pravatar.cc/300?img=47' },
];

export default function CreatorProfileList() {
  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-4">
      <h1 className="text-lg font-bold text-white mb-6">Creator Profiles</h1>
      {PROFILES.map(p => (
        <Link key={p.slug} href={`/${p.slug}`}
          className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#00AFF0]/30 transition-all group">
          <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
          <div>
            <p className="text-white font-semibold group-hover:text-[#00AFF0] transition-colors">{p.name}</p>
            <p className="text-white/30 text-xs">@{p.slug}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
