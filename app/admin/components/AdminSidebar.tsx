'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    Star,
    Trophy,
    Bot,
    BookOpen,
    MessageSquareWarning,
    Flag,
    FileText,
    Target,
    Megaphone,
    Briefcase,
    Crown,
    User,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    ArrowLeft,
    ClockArrowDown,
} from 'lucide-react';

interface AdminSidebarProps {
    onLogout: () => void;
    isOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const tabs = [
    { href: '/admin',             name: 'Overview',       icon: LayoutDashboard },
    { href: '/admin/groups',      name: 'Groups Hub',     icon: Users },
    { href: '/admin/featured',    name: 'Featured',       icon: Star },
    { href: '/admin/best-groups', name: 'Best Groups',    icon: Trophy },
    { href: '/admin/bots',        name: 'Bots',           icon: Bot },
    { href: '/admin/pending-bots',name: 'Pending Bots',   icon: ClockArrowDown },
    { href: '/admin/stories',     name: 'Stories',        icon: BookOpen },
    { href: '/admin/reviews',     name: 'Reviews',        icon: MessageSquareWarning },
    { href: '/admin/reports',     name: 'Reports',        icon: Flag },
    { href: '/admin/articles',    name: 'Articles',       icon: FileText },
    { href: '/admin/cta',         name: 'CTA Manager',    icon: Target },
    { href: '/admin/adverts',     name: 'Adverts',        icon: Megaphone },
    { href: '/admin/advertisers', name: 'Advertisers',    icon: Briefcase },
    { href: '/admin/premium',     name: 'Premium',        icon: Crown },
    { href: '/admin/users',       name: 'Users',          icon: User },
    { href: '/admin/settings',    name: 'Settings',       icon: Settings },
];

export default function AdminSidebar({
    onLogout,
    isOpen,
    onClose,
    isCollapsed,
    onToggleCollapse,
}: AdminSidebarProps) {
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            <aside
                className={`fixed left-0 top-0 bottom-0 ${isCollapsed ? 'w-[60px]' : 'w-[220px]'} bg-[#0f0f0f] border-r border-white/[0.06] flex flex-col z-50 transition-all duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}
            >
                {/* Header */}
                <div className={`flex items-center border-b border-white/[0.06] h-14 ${isCollapsed ? 'justify-center px-0' : 'px-4 justify-between'}`}>
                    {!isCollapsed && (
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">Erogram</span>
                            <p className="text-[13px] font-semibold text-white leading-tight">Admin Console</p>
                        </div>
                    )}
                    <button
                        onClick={onToggleCollapse}
                        className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                    <button
                        onClick={onClose}
                        className="md:hidden flex h-7 w-7 items-center justify-center rounded-md text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = isActive(tab.href);
                        return (
                            <a
                                key={tab.href}
                                href={tab.href}
                                onClick={handleClick}
                                title={isCollapsed ? tab.name : undefined}
                                className={`flex items-center h-9 rounded-md transition-all duration-150 ${
                                    isCollapsed ? 'justify-center w-full px-0' : 'gap-2.5 px-3'
                                } ${
                                    active
                                        ? 'bg-red-600 text-white'
                                        : 'text-white/45 hover:text-white hover:bg-white/[0.05]'
                                }`}
                            >
                                <Icon
                                    size={15}
                                    className={`shrink-0 ${active ? 'text-white' : 'text-white/50'}`}
                                    strokeWidth={active ? 2.2 : 1.8}
                                />
                                {!isCollapsed && (
                                    <span className="text-[12.5px] font-medium truncate">{tab.name}</span>
                                )}
                            </a>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-2 pb-3 pt-2 border-t border-white/[0.06] space-y-0.5">
                    <a
                        href="/"
                        title={isCollapsed ? 'Back to Site' : undefined}
                        className={`flex items-center h-9 rounded-md transition-all duration-150 text-white/40 hover:text-white hover:bg-white/[0.05] ${
                            isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
                        }`}
                    >
                        <ArrowLeft size={15} className="shrink-0" strokeWidth={1.8} />
                        {!isCollapsed && <span className="text-[12.5px] font-medium">Back to Site</span>}
                    </a>
                    <button
                        onClick={onLogout}
                        title={isCollapsed ? 'Logout' : undefined}
                        className={`w-full flex items-center h-9 rounded-md transition-all duration-150 text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] ${
                            isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
                        }`}
                    >
                        <LogOut size={15} className="shrink-0" strokeWidth={1.8} />
                        {!isCollapsed && <span className="text-[12.5px] font-medium">Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
