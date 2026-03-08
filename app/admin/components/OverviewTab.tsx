'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface OverviewTabProps {
    metrics: {
        userCount: number;
        groupCount: number;
        approvedGroupCount: number;
        pendingGroupCount: number;
        pendingBotCount?: number;
        pendingReviewCount?: number;
        pendingReportCount?: number;
        totalViews: number;
    };
}

export default function OverviewTab({ metrics }: OverviewTabProps) {
    const cardVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
    };

    const stats = [
        { title: 'Total Users', value: metrics.userCount, icon: '👥', color: 'bg-blue-500' },
        { title: 'Total Groups', value: metrics.groupCount, icon: '📦', color: 'bg-green-500' },
        { title: 'Approved', value: metrics.approvedGroupCount, icon: '✅', color: 'bg-purple-500' },
        { title: 'Pending', value: metrics.pendingGroupCount, icon: '⏳', color: 'bg-orange-500' },
        { title: 'Total Views', value: metrics.totalViews.toLocaleString(), icon: '👁️', color: 'bg-pink-500' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: index * 0.1 }}
                        className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-10 h-10 rounded-xl ${stat.color}/20 flex items-center justify-center text-xl`}>
                                    {stat.icon}
                                </div>
                            </div>

                            <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                            <p className="text-sm text-[#999]">{stat.title}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass p-8 rounded-3xl border border-white/5"
                >
                    <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            href="/admin/groups"
                            className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
                        >
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">➕</span>
                            <span className="font-semibold text-white block">Add Group</span>
                            <span className="text-xs text-[#666]">Manage listings</span>
                        </Link>
                        <Link
                            href="/admin/advertisers"
                            className="p-4 bg-pink-500/15 hover:bg-pink-500/25 rounded-xl border border-pink-500/30 text-left transition-all group"
                        >
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">🔘</span>
                            <span className="font-semibold text-white block">CTA Buttons</span>
                            <span className="text-xs text-pink-200/80">Navbar & Join page links</span>
                        </Link>
                        <Link
                            href="/admin/adverts"
                            className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
                        >
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">📢</span>
                            <span className="font-semibold text-white block">Create Ad</span>
                            <span className="text-xs text-[#666]">Launch a new campaign</span>
                        </Link>
                        <Link
                            href="/admin/articles"
                            className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
                        >
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">📝</span>
                            <span className="font-semibold text-white block">Write Article</span>
                            <span className="text-xs text-[#666]">Publish new content</span>
                        </Link>
                        <Link
                            href="/admin/settings"
                            className="p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-left transition-all group"
                        >
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">⚙️</span>
                            <span className="font-semibold text-white block">Settings</span>
                            <span className="text-xs text-[#666]">Configure site options</span>
                        </Link>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass p-8 rounded-3xl border border-white/5"
                >
                    <h2 className="text-xl font-bold text-white mb-6">System Status</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-green-400 font-medium">API Operational</span>
                            </div>
                            <span className="text-xs text-green-500/60">99.9% Uptime</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                <span className="text-blue-400 font-medium">Database Connected</span>
                            </div>
                            <span className="text-xs text-blue-500/60">12ms Latency</span>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10">
                            <h3 className="text-sm font-bold text-[#999] uppercase mb-4">Pending Review</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Link
                                    href="/admin/pending-groups"
                                    className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between hover:bg-orange-500/20 transition-colors"
                                >
                                    <span className="text-orange-400 font-medium">Groups</span>
                                    <span className="bg-orange-500 text-black text-xs font-bold px-2 py-1 rounded-full">{metrics.pendingGroupCount}</span>
                                </Link>
                                <Link
                                    href="/admin/pending-bots"
                                    className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between hover:bg-purple-500/20 transition-colors"
                                >
                                    <span className="text-purple-400 font-medium">Bots</span>
                                    <span className="bg-purple-500 text-black text-xs font-bold px-2 py-1 rounded-full">{metrics.pendingBotCount || 0}</span>
                                </Link>
                                <Link
                                    href="/admin/reviews"
                                    className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between hover:bg-blue-500/20 transition-colors"
                                >
                                    <span className="text-blue-400 font-medium">Reviews</span>
                                    <span className="bg-blue-500 text-black text-xs font-bold px-2 py-1 rounded-full">{metrics.pendingReviewCount || 0}</span>
                                </Link>
                                <Link
                                    href="/admin/reports"
                                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between hover:bg-red-500/20 transition-colors"
                                >
                                    <span className="text-red-400 font-medium">Reports</span>
                                    <span className="bg-red-500 text-black text-xs font-bold px-2 py-1 rounded-full">{metrics.pendingReportCount || 0}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
