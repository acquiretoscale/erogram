'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface AdvertSidebarProps {
    onLogout: () => void;
    isOpen: boolean;
    onClose: () => void;
}

const tabs = [
    { href: '/advert', name: 'Overview', icon: '📊' },
    { href: '/advert/advertisers', name: 'Advertisers', icon: '🏢' },
    { href: '/advert/campaigns', name: 'Campaigns & CTAs', icon: '🎯' },
    { href: '/advert/feed-ads', name: 'Feed Ads', icon: '📰' },
    { href: '/advert/slots', name: 'Slots', icon: '🎰' },
    { href: '/advert/stories', name: 'Stories', icon: '📖' },
];

export default function AdvertSidebar({ onLogout, isOpen, onClose }: AdvertSidebarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/advert') return pathname === '/advert';
        return pathname.startsWith(href);
    };

    const handleClick = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) onClose();
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" />
                )}
            </AnimatePresence>

            <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-amber-400">Ads Manager</h1>
                        <p className="text-xs text-[#666] mt-1">Advertising Hub</p>
                    </div>
                    <button onClick={onClose} className="md:hidden text-[#666] hover:text-white">✕</button>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
                    {tabs.map((tab) => (
                        <Link key={tab.href} href={tab.href} onClick={handleClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(tab.href) ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-[#999] hover:bg-white/5 hover:text-white'}`}>
                            <span className="text-lg">{tab.icon}</span>
                            {tab.name}
                        </Link>
                    ))}

                    <div className="my-3 border-t border-white/10" />

                    <Link href="/admin" onClick={handleClick} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#b31b1b] hover:bg-[#b31b1b]/10 hover:text-[#c42b2b] transition-all duration-200">
                        <span className="text-lg">🛡️</span>
                        Admin Panel
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#999] hover:bg-white/5 hover:text-white transition-colors">
                        <span>🏠</span> Back to Site
                    </a>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
