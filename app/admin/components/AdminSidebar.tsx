'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminSidebarProps {
    onLogout: () => void;
    isOpen: boolean;
    onClose: () => void;
}

const tabs = [
    { href: '/admin', name: 'Overview', icon: '📊' },
    { href: '/admin/groups', name: 'Groups', icon: '👥' },
    { href: '/admin/bots', name: 'Bots', icon: '🤖' },
    { href: '/admin/pending-groups', name: 'Pending Groups', icon: '⏳' },
    { href: '/admin/pending-bots', name: 'Pending Bots', icon: '🤖' },
    { href: '/admin/csv-import', name: 'CSV Import', icon: '📤' },
    { href: '/admin/stories', name: 'Stories', icon: '📖' },
    { href: '/admin/reviews', name: 'Reviews', icon: '⭐' },
    { href: '/admin/reports', name: 'Reports', icon: '🚨' },
    { href: '/admin/articles', name: 'Articles', icon: '📝' },
    { href: '/admin/adverts', name: 'Adverts', icon: '📢' },
    { href: '/admin/advertisers', name: 'Advertisers', icon: '💰' },
    { href: '/admin/premium', name: 'Premium', icon: '💎' },
    { href: '/admin/users', name: 'Users', icon: '👤' },
    { href: '/admin/settings', name: 'Settings', icon: '⚙️' },
];

export default function AdminSidebar({ onLogout, isOpen, onClose }: AdminSidebarProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    const handleClick = () => {
        if (window.innerWidth < 768) onClose();
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            <aside
                className={`fixed left-0 top-0 bottom-0 w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black gradient-text">Admin Panel</h1>
                        <p className="text-xs text-[#666] mt-1">v2.0.0</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="md:hidden text-[#666] hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            onClick={handleClick}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                isActive(tab.href)
                                    ? 'bg-[#b31b1b] text-white shadow-lg shadow-[#b31b1b]/20'
                                    : 'text-[#999] hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            {tab.name}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <a
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#999] hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <span>🏠</span> Back to Site
                    </a>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
