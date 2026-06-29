import Link from 'next/link';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', href: '/ofm' },
  { id: 'manage', label: 'Manage Ads', href: '/ofm/manage' },
] as const;

export default function OFMNav({ active }: { active: 'dashboard' | 'manage' }) {
  return (
    <div className="sticky top-0 z-30 bg-[#080c14]/95 backdrop-blur border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center gap-1 h-12">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${active === t.id ? 'bg-[#00AFF0] text-black' : 'text-white/40 hover:text-white/70'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
