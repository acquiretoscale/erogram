'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    isOpen: boolean;
    onClose: () => void;
}

const tabs = [
    { id: 'buttons', name: 'CTA Buttons', icon: '🔘' },
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'groups', name: 'Groups', icon: '👥' },
    { id: 'bots', name: 'Bots', icon: '🤖' },
    { id: 'pending', name: 'Pending Groups', icon: '⏳' },
    { id: 'pending-bots', name: 'Pending Bots', icon: '🤖' },
    { id: 'reviews', name: 'Reviews', icon: '⭐' },
    { id: 'reports', name: 'Reports', icon: '🚨' },
    { id: 'articles', name: 'Articles', icon: '📝' },
    { id: 'adverts', name: 'Adverts', icon: '📢' },
    { id: 'advertisers', name: 'Advertisers', icon: '💰' },
    { id: 'users', name: 'Users', icon: '👤' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
];

export default function AdminSidebar({ activeTab, setActiveTab, onLogout, isOpen, onClose }: AdminSidebarProps) {
    // Close sidebar when clicking outside on mobile (handled by overlay) or when route changes
    // But here we are SPA-like, so just close on tab selection if mobile
    const handleTabClick = (id: string) => {
        setActiveTab(id);
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
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

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 bottom-0 w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
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
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-[#b31b1b] text-white shadow-lg shadow-[#b31b1b]/20'
                                : 'text-[#999] hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            {tab.name}
                        </button>
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
