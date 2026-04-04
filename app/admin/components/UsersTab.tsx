'use client';

import { useState, useEffect, useMemo } from 'react';
import { getUsers, updateUser, deleteUser, getBookmarkStats } from '@/lib/actions/adminUsers';

type PremiumFilter = 'all' | 'premium' | 'free';

function isPremiumActive(user: any): boolean {
    return user.premium === true &&
        (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date());
}

export default function UsersTab() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [premiumFilter, setPremiumFilter] = useState<PremiumFilter>('all');
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [bkStats, setBkStats] = useState<{ totalBookmarks: number; totalFolders: number; usersWithBookmarks: number; groupBookmarks: number; botBookmarks: number } | null>(null);

    useEffect(() => {
        fetchUsers();
        const token = localStorage.getItem('token') || '';
        getBookmarkStats(token).then(setBkStats).catch(() => {});
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token') || '';
            const data = await getUsers(token);
            setUsers(data);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (user: any) => {
        setEditingUser(user._id);
        setEditFormData(user);
    };

    const handleSave = async () => {
        if (!editingUser) return;

        try {
            const token = localStorage.getItem('token') || '';
            await updateUser(token, editingUser, editFormData);
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Failed to update user');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const token = localStorage.getItem('token') || '';
            await deleteUser(token, id);
            fetchUsers();
        } catch (err: any) {
            alert(err.message || 'Failed to delete user');
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                user.username?.toLowerCase().includes(q) ||
                user.email?.toLowerCase().includes(q) ||
                user.telegramUsername?.toLowerCase().includes(q) ||
                user.country?.toLowerCase().includes(q);

            if (premiumFilter === 'premium') return matchesSearch && isPremiumActive(user);
            if (premiumFilter === 'free') return matchesSearch && !isPremiumActive(user);
            return matchesSearch;
        });
    }, [users, searchQuery, premiumFilter]);

    const premiumCount = useMemo(() => users.filter(isPremiumActive).length, [users]);
    const savedOFStats = useMemo(() => {
        let usersWithSaves = 0;
        let totalSaves = 0;
        for (const u of users) {
            const n = u.savedCreators?.length ?? 0;
            if (n > 0) { usersWithSaves++; totalSaves += n; }
        }
        return { usersWithSaves, totalSaves, avg: usersWithSaves > 0 ? (totalSaves / usersWithSaves).toFixed(1) : '0' };
    }, [users]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Users</h1>
                    <p className="text-[#999] text-sm">
                        {users.length} registered &middot;{' '}
                        <span className="text-amber-400 font-medium">{premiumCount} premium</span>
                    </p>
                </div>
            </div>

            {/* Activation Stats */}
            <div className="space-y-3">
                {/* Bookmarks — groups & bots (Bookmark collection) */}
                <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Bookmarks (Groups & Bots)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1">Total bookmarks</p>
                            <p className="text-[22px] font-bold text-amber-300 tabular-nums leading-none">{(bkStats?.totalBookmarks ?? 0).toLocaleString()}</p>
                            <p className="text-[11px] text-white/30 mt-1">{(bkStats?.groupBookmarks ?? 0).toLocaleString()} groups · {(bkStats?.botBookmarks ?? 0).toLocaleString()} bots</p>
                        </div>
                        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1">Users who bookmarked</p>
                            <p className="text-[22px] font-bold text-white tabular-nums leading-none">{(bkStats?.usersWithBookmarks ?? 0).toLocaleString()}</p>
                            <p className="text-[11px] text-white/30 mt-1">{users.length > 0 ? (((bkStats?.usersWithBookmarks ?? 0) / users.length) * 100).toFixed(1) : '0'}% of all users</p>
                        </div>
                        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1">Folders created</p>
                            <p className="text-[22px] font-bold text-white tabular-nums leading-none">{(bkStats?.totalFolders ?? 0).toLocaleString()}</p>
                            <p className="text-[11px] text-white/30 mt-1">Across all users</p>
                        </div>
                        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1">Avg bookmarks / user</p>
                            <p className="text-[22px] font-bold text-white tabular-nums leading-none">{(bkStats?.usersWithBookmarks ?? 0) > 0 ? ((bkStats!.totalBookmarks / bkStats!.usersWithBookmarks).toFixed(1)) : '0'}</p>
                            <p className="text-[11px] text-white/30 mt-1">Per user with bookmarks</p>
                        </div>
                    </div>
                </div>

                {/* OF Creator Saves (User.savedCreators) */}
                <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">OF Creator Saves (Hearts)</p>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-pink-400/70 uppercase tracking-wider mb-1">Users who saved OF creators</p>
                            <p className="text-[22px] font-bold text-pink-300 tabular-nums leading-none">{savedOFStats.usersWithSaves.toLocaleString()}</p>
                            <p className="text-[11px] text-white/30 mt-1">{users.length > 0 ? ((savedOFStats.usersWithSaves / users.length) * 100).toFixed(1) : '0'}% of all users</p>
                        </div>
                        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-pink-400/70 uppercase tracking-wider mb-1">Total creator saves</p>
                            <p className="text-[22px] font-bold text-white tabular-nums leading-none">{savedOFStats.totalSaves.toLocaleString()}</p>
                            <p className="text-[11px] text-white/30 mt-1">Across all users</p>
                        </div>
                        <div className="bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3">
                            <p className="text-[10px] font-semibold text-pink-400/70 uppercase tracking-wider mb-1">Avg saves / active user</p>
                            <p className="text-[22px] font-bold text-white tabular-nums leading-none">{savedOFStats.avg}</p>
                            <p className="text-[11px] text-white/30 mt-1">Per user with saves</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search + Filter */}
            <div className="glass rounded-2xl p-6 border border-white/5 space-y-3">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search users by name, email, or telegram..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {([
                        { key: 'all' as PremiumFilter, label: 'All' },
                        { key: 'premium' as PremiumFilter, label: `Premium (${premiumCount})` },
                        { key: 'free' as PremiumFilter, label: 'Free' },
                    ]).map(f => (
                        <button
                            key={f.key}
                            onClick={() => setPremiumFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                premiumFilter === f.key
                                    ? f.key === 'premium'
                                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                                        : 'bg-white/10 text-white ring-1 ring-white/20'
                                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users Table */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading users...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400">{error}</div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">No users found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Telegram</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Premium</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Country</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-[#666] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-white/5 transition-colors group">
                                        {editingUser === user._id ? (
                                            <>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={editFormData.username || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="email"
                                                        value={editFormData.email || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={editFormData.telegramUsername || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, telegramUsername: e.target.value })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                        placeholder="@username"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={editFormData.isAdmin ? 'admin' : 'user'}
                                                        onChange={(e) => setEditFormData({ ...editFormData, isAdmin: e.target.value === 'admin' })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 text-xs">
                                                    {isPremiumActive(user) ? '⭐' : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 text-xs">
                                                    {user.country || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400">
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={handleSave}
                                                            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                                            title="Save"
                                                        >
                                                            💾
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingUser(null)}
                                                            className="p-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors"
                                                            title="Cancel"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 font-medium text-white">{user.username}</td>
                                                <td className="px-6 py-4 text-gray-400">{user.email || '-'}</td>
                                                <td className="px-6 py-4 text-blue-400">{user.telegramUsername ? `@${user.telegramUsername}` : '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${user.isAdmin
                                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        }`}>
                                                        {user.isAdmin ? 'Admin' : 'User'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isPremiumActive(user) ? (
                                                        <div>
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                                ⭐ {user.premiumPlan ? user.premiumPlan.charAt(0).toUpperCase() + user.premiumPlan.slice(1) : 'Active'}
                                                            </span>
                                                            <div className="text-[10px] text-white/30 mt-0.5">
                                                                {user.premiumExpiresAt
                                                                    ? `Exp ${new Date(user.premiumExpiresAt).toLocaleDateString()}`
                                                                    : 'Lifetime'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-white/20 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.country ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-300" title={[user.city, user.country, user.timezone].filter(Boolean).join(' · ')}>
                                                            {user.country}
                                                            {user.city && <span className="text-white/30">· {user.city}</span>}
                                                        </span>
                                                    ) : (
                                                        <span className="text-white/20 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400">
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user._id)}
                                                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
