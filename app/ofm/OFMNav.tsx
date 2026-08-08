import Link from 'next/link';

const TABS = [
  { id: 'home', label: 'Clients', href: '/ofm' },
  { id: 'legal', label: 'Legal', href: '/ofm/legal', highlight: true },
  { id: 'claims', label: 'Claimed Profiles', href: '/ofm/claims' },
  { id: 'manage', label: 'Manage Ads', href: '/ofm/manage' },
] as const;

export default function OFMNav({ active }: { active: 'home' | 'dashboard' | 'manage' | 'claims' | 'legal' }) {
  return (
    <div className="sticky top-0 z-30 bg-[#080c14]/95 backdrop-blur border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex items-center gap-1 h-12">
        {TABS.map((t) => {
          const isActive = active === t.id || (active === 'dashboard' && t.id === 'home');
          const danger = 'highlight' in t && t.highlight;
          return (
            <Link
              key={t.id}
              href={t.href}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${
                isActive
                  ? danger
                    ? 'bg-red-500 text-white'
                    : 'bg-[#00AFF0] text-black'
                  : danger
                    ? 'text-red-400/90 hover:text-red-300 hover:bg-red-500/10 border border-red-500/25'
                    : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
