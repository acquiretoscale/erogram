'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { compressImage } from '@/lib/utils/compressImage';
import { categories, countries } from '@/app/groups/constants';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';

export default function GroupsTab() {
    const [groups, setGroups] = useState<any[]>([]);
    const [advertisers, setAdvertisers] = useState<{ _id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [groupData, setGroupData] = useState({
        name: '',
        description: '',
        category: 'All',
        country: 'All',
        telegramLink: '',
        image: '',
        status: 'pending' as 'pending' | 'approved' | 'rejected',
        pinned: false,
        verified: false,
        advertiserId: '' as string,
        showVerified: false,
        premiumOnly: false,
    });

    const [premiumFilter, setPremiumFilter] = useState<'all' | 'premium' | 'public'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'scheduled' | 'rejected'>('all');
    const [isSaving, setIsSaving] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Sort: column key and direction
    type SortKey = 'name' | 'category' | 'status' | 'views' | 'recent' | 'clicks' | 'recentClicks' | 'country' | 'dateAdded';
    const [sortBy, setSortBy] = useState<SortKey>('dateAdded');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Bulk selection and actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    // Info tooltip: which column's details are visible
    const [infoTooltip, setInfoTooltip] = useState<'views' | 'clicks' | null>(null);
    // Fetch Telegram photos
    const [fetchingPhotos, setFetchingPhotos] = useState(false);
    const [photoProgress, setPhotoProgress] = useState<{ done: number; total: number; success: number } | null>(null);

    useEffect(() => {
        fetchGroups();
        fetchAdvertisers();
    }, []);

    const fetchAdvertisers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/advertisers', { headers: { Authorization: `Bearer ${token}` } });
            setAdvertisers(res.data.map((a: any) => ({ _id: a._id, name: a.name })));
        } catch {}
    };

    const fetchGroups = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/groups', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(res.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load groups');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (group: any) => {
        setEditingGroup(group);
        setGroupData({
            name: group.name || '',
            description: group.description || '',
            category: group.category || 'All',
            country: group.country || 'All',
            telegramLink: group.telegramLink || '',
            image: group.image || '',
            status: group.status || 'pending',
            pinned: group.pinned || false,
            verified: group.verified || false,
            advertiserId: group.advertiserId || '',
            showVerified: group.showVerified ?? false,
            premiumOnly: group.premiumOnly || false,
        });
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!groupData.name || !groupData.description || !groupData.telegramLink) {
            alert('Name, description, and Telegram link are required');
            return;
        }

        if (!groupData.telegramLink.startsWith('https://t.me/')) {
            alert('Telegram link must start with https://t.me/');
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');

            if (editingGroup) {
                await axios.put(`/api/admin/groups/${editingGroup._id}`, groupData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                alert('Creating groups from admin panel is not supported. Please use the public interface.');
                return;
            }

            setShowEditor(false);
            fetchGroups();
        } catch (err: any) {
            console.error('Save error:', err);
            alert(err.response?.data?.message || 'Failed to save group');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this group?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/groups/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchGroups();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete group');
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be less than 10MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        setIsUploading(true);
        try {
            const compressedFile = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedFile);

            const token = localStorage.getItem('token');
            const res = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            setGroupData({ ...groupData, image: res.data.url });
        } catch (err: any) {
            console.error('Upload error:', err);
            alert(err.response?.data?.message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const getRecentViews = (g: any) => g.weeklyViews ?? 0;
    const getRecentClicks = (g: any) => g.weeklyClicks ?? 0;

    const filteredGroups = groups.filter((group) => {
        const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            group.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (group.country || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (group.telegramLink || '').toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (premiumFilter === 'premium' && !group.premiumOnly) return false;
        if (premiumFilter === 'public' && group.premiumOnly) return false;
        if (statusFilter !== 'all' && group.status !== statusFilter) return false;
        return true;
    });

    const sortedGroups = [...filteredGroups].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        if (sortBy === 'name') {
            aVal = (a.name || '').toLowerCase();
            bVal = (b.name || '').toLowerCase();
        } else if (sortBy === 'category') {
            aVal = (a.category || '').toLowerCase();
            bVal = (b.category || '').toLowerCase();
        } else if (sortBy === 'status') {
            aVal = (a.status || '');
            bVal = (b.status || '');
        } else if (sortBy === 'views') {
            aVal = a.views ?? 0;
            bVal = b.views ?? 0;
        } else if (sortBy === 'recent') {
            aVal = getRecentViews(a);
            bVal = getRecentViews(b);
        } else if (sortBy === 'clicks') {
            aVal = a.clickCount ?? 0;
            bVal = b.clickCount ?? 0;
        } else if (sortBy === 'recentClicks') {
            aVal = getRecentClicks(a);
            bVal = getRecentClicks(b);
        } else if (sortBy === 'country') {
            aVal = (a.country || '').toLowerCase();
            bVal = (b.country || '').toLowerCase();
        } else if (sortBy === 'dateAdded') {
            aVal = new Date(a.createdAt || 0).getTime();
            bVal = new Date(b.createdAt || 0).getTime();
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? cmp : -cmp;
    });

    const totalPages = Math.ceil(sortedGroups.length / itemsPerPage);
    const paginatedGroups = sortedGroups.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(key);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllPage = () => {
        const pageIds = paginatedGroups.map((g) => g._id);
        const allSelected = pageIds.every((id) => selectedIds.has(id));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) pageIds.forEach((id) => next.delete(id));
            else pageIds.forEach((id) => next.add(id));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const handleBulkStatus = async (newStatus: 'approved' | 'rejected') => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Set ${selectedIds.size} group(s) to ${newStatus}?`)) return;
        setBulkActionLoading(true);
        const token = localStorage.getItem('token');
        let done = 0;
        let failed = 0;
        for (const id of selectedIds) {
            try {
                await axios.put(
                    `/api/admin/groups/${id}`,
                    { status: newStatus },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                done++;
            } catch {
                failed++;
            }
        }
        setBulkActionLoading(false);
        setSelectedIds(new Set());
        fetchGroups();
        alert(failed ? `Updated ${done} group(s). ${failed} failed.` : `Updated ${done} group(s) to ${newStatus}.`);
    };

    const handleBulkPremium = async (value: boolean) => {
        if (selectedIds.size === 0) return;
        const label = value ? 'Premium Vault' : 'Public';
        if (!confirm(`Move ${selectedIds.size} group(s) to ${label}?`)) return;
        setBulkActionLoading(true);
        const token = localStorage.getItem('token');
        let done = 0;
        let failed = 0;
        for (const id of selectedIds) {
            try {
                await axios.put(
                    `/api/admin/groups/${id}`,
                    { premiumOnly: value },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                done++;
            } catch {
                failed++;
            }
        }
        setBulkActionLoading(false);
        setSelectedIds(new Set());
        fetchGroups();
        alert(failed ? `Moved ${done} group(s). ${failed} failed.` : `Moved ${done} group(s) to ${label}.`);
    };

    const handleSendPremiumNotification = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/admin/groups/${id}/premium-notification`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('✅ Premium notification sent!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send notification');
        }
    };

    const isMissingImage = (g: any) =>
        !g.image || g.image === '/assets/image.jpg' || g.image === PLACEHOLDER_IMAGE_URL;

    const fetchTelegramPhotos = async () => {
        const target = selectedIds.size > 0
            ? groups.filter(g => selectedIds.has(g._id) && isMissingImage(g))
            : filteredGroups.filter(isMissingImage);

        if (target.length === 0) {
            alert('No groups with missing images found in the current selection/filter.');
            return;
        }

        if (!confirm(`Fetch Telegram profile pictures for ${target.length} group(s) missing images?`)) return;

        setFetchingPhotos(true);
        setPhotoProgress({ done: 0, total: target.length, success: 0 });
        const token = localStorage.getItem('token');
        let totalSuccess = 0;

        for (let i = 0; i < target.length; i += 5) {
            const batch = target.slice(i, i + 5).map(g => g._id);
            try {
                const res = await axios.post('/api/admin/csv-import/fetch-photos', { groupIds: batch }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const results = res.data?.results || [];
                for (const r of results) {
                    if (r.status === 'success' && r.url) {
                        totalSuccess++;
                        setGroups(prev => prev.map(g => g._id === r.id ? { ...g, image: r.url } : g));
                    }
                }
            } catch { /* continue */ }
            setPhotoProgress({ done: Math.min(i + 5, target.length), total: target.length, success: totalSuccess });
        }

        setFetchingPhotos(false);
        setPhotoProgress(null);
        alert(`Done! Fetched ${totalSuccess} of ${target.length} images from Telegram.`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Groups</h1>
                    <p className="text-[#999] text-sm">Manage {groups.length} total groups</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto flex-wrap">
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                        className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-[#b31b1b] outline-none appearance-none"
                    >
                        <option value="all">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select
                        value={premiumFilter}
                        onChange={(e) => { setPremiumFilter(e.target.value as any); setCurrentPage(1); }}
                        className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-[#b31b1b] outline-none appearance-none"
                    >
                        <option value="all">All Groups</option>
                        <option value="premium">Premium Only</option>
                        <option value="public">Public Only</option>
                    </select>
                    <div className="relative flex-grow md:flex-grow-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full md:w-64 pl-10 pr-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={fetchTelegramPhotos}
                        disabled={fetchingPhotos}
                        className="px-3 py-2 bg-[#0088cc]/15 border border-[#0088cc]/25 text-[#4ab3f4] rounded-xl text-sm font-medium hover:bg-[#0088cc]/25 disabled:opacity-50 transition-all flex items-center gap-2 whitespace-nowrap"
                        title={selectedIds.size > 0 ? `Fetch images for ${selectedIds.size} selected groups` : 'Fetch missing images from Telegram'}
                    >
                        {fetchingPhotos ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-[#4ab3f4]/30 border-t-[#4ab3f4] rounded-full animate-spin" />
                                {photoProgress ? `${photoProgress.done}/${photoProgress.total}` : 'Fetching...'}
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                                Fetch Images
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Photo fetch progress bar */}
            {fetchingPhotos && photoProgress && (
                <div className="rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 p-3 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#0088cc] rounded-full transition-all duration-300"
                            style={{ width: `${(photoProgress.done / photoProgress.total) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs text-[#4ab3f4] font-medium whitespace-nowrap">
                        {photoProgress.done}/{photoProgress.total} — {photoProgress.success} fetched
                    </span>
                </div>
            )}

            {/* Table */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading groups...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400">{error}</div>
                ) : sortedGroups.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">No groups found</div>
                ) : (
                    <>
                        {/* Bulk action bar */}
                        {selectedIds.size > 0 && (
                            <div className="px-6 py-3 bg-white/5 border-b border-white/10 flex flex-wrap items-center gap-3">
                                <span className="text-sm text-white font-medium">{selectedIds.size} selected</span>
                                <button
                                    onClick={() => handleBulkStatus('approved')}
                                    disabled={bulkActionLoading}
                                    className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 disabled:opacity-50 transition-colors"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleBulkStatus('rejected')}
                                    disabled={bulkActionLoading}
                                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                                >
                                    Reject
                                </button>
                                <span className="w-px h-5 bg-white/10" />
                                <button
                                    onClick={() => handleBulkPremium(true)}
                                    disabled={bulkActionLoading}
                                    className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
                                >
                                    Move to Vault
                                </button>
                                <button
                                    onClick={() => handleBulkPremium(false)}
                                    disabled={bulkActionLoading}
                                    className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                                >
                                    Make Public
                                </button>
                                <span className="w-px h-5 bg-white/10" />
                                <button
                                    onClick={fetchTelegramPhotos}
                                    disabled={fetchingPhotos}
                                    className="px-3 py-1.5 bg-[#0088cc]/20 text-[#4ab3f4] rounded-lg text-sm font-medium hover:bg-[#0088cc]/30 disabled:opacity-50 transition-colors"
                                >
                                    {fetchingPhotos ? 'Fetching...' : 'Fetch Images'}
                                </button>
                                <span className="w-px h-5 bg-white/10" />
                                <button
                                    onClick={clearSelection}
                                    className="px-3 py-1.5 bg-white/10 text-gray-400 rounded-lg text-sm hover:bg-white/15 transition-colors"
                                >
                                    Clear selection
                                </button>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5 border-b border-white/5">
                                    <tr>
                                        <th className="px-4 py-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={paginatedGroups.length > 0 && paginatedGroups.every((g) => selectedIds.has(g._id))}
                                                onChange={toggleSelectAllPage}
                                                className="rounded border-white/20 bg-[#1a1a1a] text-[#b31b1b] focus:ring-[#b31b1b]"
                                            />
                                        </th>
                                        <th
                                            className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort('name')}
                                        >
                                            Group Info {sortBy === 'name' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </th>
                                        <th
                                            className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort('category')}
                                        >
                                            Category {sortBy === 'category' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </th>
                                        <th
                                            className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort('status')}
                                        >
                                            Status {sortBy === 'status' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </th>
                                        <th
                                            className="px-4 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort('dateAdded')}
                                        >
                                            Added {sortBy === 'dateAdded' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                                        </th>
                                        <th
                                            className="px-4 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none relative"
                                            onClick={() => handleSort('views')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Views {sortBy === 'views' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setInfoTooltip(infoTooltip === 'views' ? null : 'views'); }} className="w-3.5 h-3.5 rounded-full bg-white/10 hover:bg-white/20 text-[9px] flex items-center justify-center text-gray-400 hover:text-white">i</button>
                                            </div>
                                            {infoTooltip === 'views' && (
                                                <div className="absolute mt-1 left-0 z-20 w-56 p-2 bg-[#1a1a1a] border border-white/20 rounded-lg text-[11px] text-gray-300 shadow-xl font-normal normal-case tracking-normal">
                                                    <strong className="text-white">Views</strong>: Each time someone opens this group&apos;s detail page. Lifetime total.
                                                </div>
                                            )}
                                        </th>
                                        <th
                                            className="px-4 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort('recent')}
                                        >
                                            Last 72h {sortBy === 'recent' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th
                                            className="px-4 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none relative"
                                            onClick={() => handleSort('clicks')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Clicks {sortBy === 'clicks' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setInfoTooltip(infoTooltip === 'clicks' ? null : 'clicks'); }} className="w-3.5 h-3.5 rounded-full bg-white/10 hover:bg-white/20 text-[9px] flex items-center justify-center text-gray-400 hover:text-white">i</button>
                                            </div>
                                            {infoTooltip === 'clicks' && (
                                                <div className="absolute mt-1 left-0 z-20 w-56 p-2 bg-[#1a1a1a] border border-white/20 rounded-lg text-[11px] text-gray-300 shadow-xl font-normal normal-case tracking-normal">
                                                    <strong className="text-white">Clicks</strong>: Each time someone clicks the join/visit button to open the group on Telegram. Lifetime total.
                                                </div>
                                            )}
                                        </th>
                                        <th
                                            className="px-4 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort('recentClicks')}
                                        >
                                            Last 72h {sortBy === 'recentClicks' && (sortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-[#666] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedGroups.map((group) => (
                                        <tr key={group._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(group._id)}
                                                    onChange={() => toggleSelect(group._id)}
                                                    className="rounded border-white/20 bg-[#1a1a1a] text-[#b31b1b] focus:ring-[#b31b1b]"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] overflow-hidden flex-shrink-0">
                                                        {(group.image && typeof group.image === 'string' && group.image.startsWith('https://')) ? (
                                                            <img
                                                                src={group.image}
                                                                alt={group.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL; }}
                                                            />
                                                        ) : (
                                                            <img src={group.image || PLACEHOLDER_IMAGE_URL} alt={group.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL; }} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white flex items-center gap-2">
                                                            {group.name}
                                                            {group.premiumOnly && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">VAULT</span>}
                                                            {group.pinned && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">FEATURED</span>}
                                                            {group.pinned && group.advertiserId && (() => {
                                                                const adv = advertisers.find((a) => a._id === group.advertiserId);
                                                                return adv ? <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{adv.name}</span> : null;
                                                            })()}
                                                        </div>
                                                        <div className="text-xs text-[#666] truncate max-w-[200px]">{group.telegramLink}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm text-gray-300">{group.category}</span>
                                                    <span className="text-xs text-[#666]">{group.country}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${group.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    group.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    group.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                                                </span>
                                                {group.premiumOnly && <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">VAULT</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-[#666] whitespace-nowrap">{group.createdAt ? new Date(group.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-gray-300 tabular-nums">{(group.views ?? 0).toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`text-sm tabular-nums ${getRecentViews(group) > 0 ? 'text-green-400' : 'text-gray-500'}`}>{getRecentViews(group).toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-gray-300 tabular-nums">{(group.clickCount ?? 0).toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`text-sm tabular-nums ${getRecentClicks(group) > 0 ? 'text-green-400' : 'text-gray-500'}`}>{getRecentClicks(group).toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleSendPremiumNotification(group._id)}
                                                        className="p-2 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-colors"
                                                        title="Send Premium Notification"
                                                    >
                                                        ⭐
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(group)}
                                                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(group._id)}
                                                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
                            <div className="text-sm text-[#666]">
                                Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, sortedGroups.length)}</span> of <span className="text-white font-medium">{sortedGroups.length}</span> results
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {showEditor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
                        >
                            <div className="sticky top-0 bg-[#111] border-b border-white/10 p-6 flex justify-between items-center z-10">
                                <h2 className="text-xl font-bold text-white">Edit Group</h2>
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="text-[#666] hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Name</label>
                                        <input
                                            type="text"
                                            value={groupData.name}
                                            onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
                                            className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Description</label>
                                        <textarea
                                            value={groupData.description}
                                            onChange={(e) => setGroupData({ ...groupData, description: e.target.value })}
                                            rows={4}
                                            className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Category</label>
                                        <select
                                            value={groupData.category}
                                            onChange={(e) => setGroupData({ ...groupData, category: e.target.value })}
                                            className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none appearance-none"
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Country</label>
                                        <select
                                            value={groupData.country}
                                            onChange={(e) => setGroupData({ ...groupData, country: e.target.value })}
                                            className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none appearance-none"
                                        >
                                            {countries.map((country) => (
                                                <option key={country} value={country}>{country}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Telegram Link</label>
                                        <input
                                            type="url"
                                            value={groupData.telegramLink}
                                            onChange={(e) => setGroupData({ ...groupData, telegramLink: e.target.value })}
                                            className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Status</label>
                                        <select
                                            value={groupData.status}
                                            onChange={(e) => setGroupData({ ...groupData, status: e.target.value as any })}
                                            className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none appearance-none"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={groupData.pinned}
                                                onChange={(e) => setGroupData({ ...groupData, pinned: e.target.checked })}
                                                className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] text-[#b31b1b] focus:ring-[#b31b1b]"
                                            />
                                            <span className="text-white font-medium">Pin to top (featured slot)</span>
                                        </label>
                                        <span className="text-xs text-[#999] ml-3">Max 2 featured slots on groups page</span>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={groupData.showVerified ?? false}
                                                onChange={(e) => setGroupData({ ...groupData, showVerified: e.target.checked })}
                                                className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] text-[#b31b1b] focus:ring-[#b31b1b]"
                                            />
                                            <span className="text-white font-medium">Show verified checkmark</span>
                                        </label>
                                    </div>

                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={groupData.verified}
                                                onChange={(e) => setGroupData({ ...groupData, verified: e.target.checked })}
                                                className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] text-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="text-white font-medium flex items-center gap-2">
                                                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                                                Verified checkmark
                                            </span>
                                        </label>
                                        <span className="text-xs text-[#666] ml-3">Shows a blue verified badge next to the group title</span>
                                    </div>

                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={groupData.premiumOnly}
                                                onChange={(e) => setGroupData({ ...groupData, premiumOnly: e.target.checked })}
                                                className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] text-amber-500 focus:ring-amber-500"
                                            />
                                            <span className="text-white font-medium flex items-center gap-2">
                                                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                                                Premium Vault
                                            </span>
                                        </label>
                                        <span className="text-xs text-[#666] ml-3">Hidden from public, only visible to premium users</span>
                                    </div>

                                    {groupData.pinned && (
                                        <div>
                                            <label className="block text-xs font-bold text-[#666] uppercase mb-2">Assign advertiser (tracked in dashboard)</label>
                                            <select
                                                value={groupData.advertiserId}
                                                onChange={(e) => setGroupData({ ...groupData, advertiserId: e.target.value })}
                                                className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] text-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#b31b1b]/50"
                                            >
                                                <option value="">No advertiser (untracked)</option>
                                                {advertisers.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Image</label>
                                        <div className="flex items-center gap-4">
                                            {groupData.image && (
                                                <img src={groupData.image} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-white/10" />
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="block w-full text-sm text-[#999] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#b31b1b] file:text-white hover:file:bg-[#c42b2b] transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0a0a0a]">
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="px-6 py-3 rounded-xl text-sm font-bold text-[#999] hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || isUploading}
                                    className="px-6 py-3 rounded-xl text-sm font-bold bg-[#b31b1b] text-white hover:bg-[#c42b2b] transition-colors shadow-lg shadow-[#b31b1b]/20 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
