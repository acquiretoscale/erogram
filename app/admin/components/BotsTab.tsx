'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { compressImage } from '@/lib/utils/compressImage';
import { categories, countries } from '@/app/bots/constants';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';

type SortKey = 'name' | 'clicks24h' | 'clicks7d' | 'clicks' | 'created' | 'status' | 'category';
type StatusFilter = 'all' | 'approved' | 'pending' | 'rejected';

export default function BotsTab() {
    const [bots, setBots] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editingBot, setEditingBot] = useState<any>(null);
    const [botData, setBotData] = useState({
        name: '',
        description: '',
        category: 'All',
        country: 'All',
        telegramLink: '',
        image: '',
        status: 'pending' as 'pending' | 'approved' | 'rejected',
        pinned: false,
        topBot: false,
        showVerified: false,
    });
    const [isSaving, setIsSaving] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('approved');
    const [sortBy, setSortBy] = useState<SortKey>('clicks24h');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        fetchBots();
    }, []);

    const fetchBots = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/bots', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBots(res.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load bots');
        } finally {
            setIsLoading(false);
        }
    };

    const statusCounts = useMemo(() => {
        const counts = { all: bots.length, approved: 0, pending: 0, rejected: 0 };
        bots.forEach((b) => {
            if (b.status === 'approved') counts.approved++;
            else if (b.status === 'pending') counts.pending++;
            else if (b.status === 'rejected') counts.rejected++;
        });
        return counts;
    }, [bots]);

    const totalClicks = useMemo(() => bots.reduce((s, b) => s + (b.clickCount || 0), 0), [bots]);
    const totalClicks24h = useMemo(() => bots.reduce((s, b) => s + (b.clicks24h || 0), 0), [bots]);
    const totalClicks7d = useMemo(() => bots.reduce((s, b) => s + (b.clicks7d || 0), 0), [bots]);

    const filteredAndSorted = useMemo(() => {
        let list = bots;
        if (statusFilter !== 'all') list = list.filter((b) => b.status === statusFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (b) =>
                    b.name?.toLowerCase().includes(q) ||
                    b.category?.toLowerCase().includes(q) ||
                    b.country?.toLowerCase().includes(q) ||
                    b.telegramLink?.toLowerCase().includes(q)
            );
        }
        const sorted = [...list].sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
            else if (sortBy === 'clicks24h') cmp = (a.clicks24h || 0) - (b.clicks24h || 0);
            else if (sortBy === 'clicks7d') cmp = (a.clicks7d || 0) - (b.clicks7d || 0);
            else if (sortBy === 'clicks') cmp = (a.clickCount || 0) - (b.clickCount || 0);
            else if (sortBy === 'created') cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            else if (sortBy === 'status') cmp = (a.status || '').localeCompare(b.status || '');
            else if (sortBy === 'category') cmp = (a.category || '').localeCompare(b.category || '');
            return sortOrder === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [bots, statusFilter, searchQuery, sortBy, sortOrder]);

    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
    const paginatedBots = filteredAndSorted.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (key: SortKey) => {
        if (sortBy === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        else {
            setSortBy(key);
            setSortOrder(key === 'name' || key === 'category' || key === 'status' ? 'asc' : 'desc');
        }
        setCurrentPage(1);
    };

    const sortArrow = (key: SortKey) => (sortBy === key ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '');

    const handleEdit = (bot: any) => {
        setEditingBot(bot);
        setBotData({
            name: bot.name || '',
            description: bot.description || '',
            category: bot.category || 'All',
            country: bot.country || 'All',
            telegramLink: bot.telegramLink || '',
            image: bot.image || '',
            status: bot.status || 'pending',
            pinned: bot.pinned || false,
            topBot: bot.topBot || false,
            showVerified: bot.showVerified ?? false,
        });
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!botData.name || !botData.description || !botData.telegramLink) {
            alert('Name, description, and Telegram link are required');
            return;
        }
        if (!botData.telegramLink.startsWith('https://t.me/')) {
            alert('Telegram link must start with https://t.me/');
            return;
        }
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (editingBot) {
                await axios.put(`/api/admin/bots/${editingBot._id}`, botData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                alert('Creating bots from admin panel is not supported.');
                return;
            }
            setShowEditor(false);
            fetchBots();
        } catch (err: any) {
            console.error('Save error:', err);
            alert(err.response?.data?.message || 'Failed to save bot');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bot?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/bots/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBots();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete bot');
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { alert('Image size must be less than 10MB'); return; }
        if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
        setIsUploading(true);
        try {
            const compressedFile = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedFile);
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            setBotData({ ...botData, image: res.data.url });
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const formatDate = (d: string) => {
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="space-y-3">
            {/* Compact header: title + KPIs inline */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-xl font-black text-white">Bots <span className="text-sm font-normal text-[#666]">({statusCounts.approved} approved{statusCounts.pending > 0 ? `, ${statusCounts.pending} pending` : ''})</span></h1>
                <div className="flex items-center gap-4 text-xs tabular-nums">
                    <span className="text-green-400 font-bold">{totalClicks24h.toLocaleString()} <span className="text-[#666] font-normal">24h</span></span>
                    <span className="text-white font-bold">{totalClicks7d.toLocaleString()} <span className="text-[#666] font-normal">7d</span></span>
                    <span className="text-[#999] font-bold">{totalClicks.toLocaleString()} <span className="text-[#666] font-normal">lifetime</span></span>
                </div>
            </div>

            {/* Filters: pills + search + per-page — single compact row */}
            <div className="flex flex-wrap items-center gap-2">
                {(['all', 'approved', 'pending', 'rejected'] as StatusFilter[]).map((s) => (
                    <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${statusFilter === s ? 'bg-[#b31b1b] text-white border-[#b31b1b]' : 'bg-white/5 text-[#999] border-white/10 hover:border-white/20'}`}
                    >
                        {s === 'all' ? `All (${statusCounts.all})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${statusCounts[s]})`}
                    </button>
                ))}
                <div className="flex-grow" />
                <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-44 pl-8 pr-2 py-1 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white placeholder:text-gray-600 focus:ring-1 focus:ring-[#b31b1b] outline-none"
                    />
                </div>
                <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass rounded-xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center"><div className="w-8 h-8 border-3 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-[#666] text-xs">Loading…</p></div>
                ) : error ? (
                    <div className="p-8 text-center text-red-400 text-sm">{error}</div>
                ) : filteredAndSorted.length === 0 ? (
                    <div className="p-8 text-center text-[#666] text-sm">No bots found</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-bold text-[#666] uppercase cursor-pointer hover:text-white select-none" onClick={() => handleSort('name')}>Bot{sortArrow('name')}</th>
                                        <th className="px-3 py-2 text-left font-bold text-[#666] uppercase cursor-pointer hover:text-white select-none" onClick={() => handleSort('category')}>Cat{sortArrow('category')}</th>
                                        <th className="px-3 py-2 text-left font-bold text-[#666] uppercase cursor-pointer hover:text-white select-none" onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
                                        <th className="px-3 py-2 text-right font-bold text-[#666] uppercase cursor-pointer hover:text-white select-none" onClick={() => handleSort('clicks24h')}>24h{sortArrow('clicks24h')}</th>
                                        <th className="px-3 py-2 text-right font-bold text-[#666] uppercase cursor-pointer hover:text-white select-none" onClick={() => handleSort('clicks7d')}>7d{sortArrow('clicks7d')}</th>
                                        <th className="px-3 py-2 text-right font-bold text-[#666] uppercase cursor-pointer hover:text-white select-none" onClick={() => handleSort('clicks')}>Total{sortArrow('clicks')}</th>
                                        <th className="px-3 py-2 text-right font-bold text-[#666] uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedBots.map((bot) => (
                                        <tr key={bot._id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-3 py-1.5">
                                                <div className="flex items-center gap-2">
                                                    <img src={bot.image || PLACEHOLDER_IMAGE_URL} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL; }} />
                                                    <div className="min-w-0">
                                                        <div className="text-white font-medium truncate max-w-[180px] leading-tight flex items-center gap-1">
                                                            {bot.name}
                                                            {bot.pinned && <span className="text-[8px] bg-yellow-500/20 text-yellow-500 px-1 rounded">PIN</span>}
                                                            {bot.topBot && <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded">🏆</span>}
                                                            {bot.showVerified && <span className="text-blue-500">✓</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-[#777]">{bot.category}{bot.country && bot.country !== 'All' ? ` · ${bot.country}` : ''}</td>
                                            <td className="px-3 py-1.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${bot.status === 'approved' ? 'bg-green-500/20 text-green-400' : bot.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{bot.status}</span>
                                            </td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">
                                                <span className={`font-bold ${(bot.clicks24h || 0) > 0 ? 'text-green-400' : 'text-[#444]'}`}>{(bot.clicks24h || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">
                                                <span className={(bot.clicks7d || 0) > 0 ? 'text-white' : 'text-[#444]'}>{(bot.clicks7d || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">
                                                <span className={(bot.clickCount || 0) > 0 ? 'text-[#888]' : 'text-[#444]'}>{(bot.clickCount || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="px-3 py-1.5 text-right">
                                                <button onClick={() => handleEdit(bot)} className="text-blue-400 hover:underline mr-1.5">Edit</button>
                                                <button onClick={() => handleDelete(bot._id)} className="text-red-400 hover:underline">Del</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="px-3 py-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                            <span className="text-[#666] tabular-nums">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length}</span>
                            <div className="flex gap-1">
                                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white rounded disabled:opacity-30">«</button>
                                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white rounded disabled:opacity-30">‹</button>
                                <span className="px-2 py-0.5 text-white tabular-nums">{currentPage}/{totalPages}</span>
                                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white rounded disabled:opacity-30">›</button>
                                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-white rounded disabled:opacity-30">»</button>
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
                                <h2 className="text-xl font-bold text-white">Edit Bot</h2>
                                <button onClick={() => setShowEditor(false)} className="text-[#666] hover:text-white transition-colors">✕</button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Name</label>
                                        <input type="text" value={botData.name} onChange={(e) => setBotData({ ...botData, name: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Description</label>
                                        <textarea value={botData.description} onChange={(e) => setBotData({ ...botData, description: e.target.value })} rows={4} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none resize-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Category</label>
                                        <select value={botData.category} onChange={(e) => setBotData({ ...botData, category: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none appearance-none">
                                            {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Country</label>
                                        <select value={botData.country} onChange={(e) => setBotData({ ...botData, country: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none appearance-none">
                                            {countries.map((country) => (<option key={country} value={country}>{country}</option>))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Telegram Link</label>
                                        <input type="url" value={botData.telegramLink} onChange={(e) => setBotData({ ...botData, telegramLink: e.target.value })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Status</label>
                                        <select value={botData.status} onChange={(e) => setBotData({ ...botData, status: e.target.value as any })} className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none appearance-none">
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-3 justify-center">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={botData.pinned} onChange={(e) => setBotData({ ...botData, pinned: e.target.checked })} className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] text-[#b31b1b] focus:ring-[#b31b1b]" />
                                            <span className="text-white font-medium text-sm">Pin to top</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={botData.topBot} onChange={(e) => setBotData({ ...botData, topBot: e.target.checked })} className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] text-yellow-500 focus:ring-yellow-500" />
                                            <span className="text-white font-medium text-sm">Top Bot 🏆</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={botData.showVerified ?? false} onChange={(e) => setBotData({ ...botData, showVerified: e.target.checked })} className="w-5 h-5 rounded border-white/10 bg-[#1a1a1a] text-[#b31b1b] focus:ring-[#b31b1b]" />
                                            <span className="text-white font-medium text-sm">Verified checkmark</span>
                                        </label>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-[#666] uppercase mb-2">Image</label>
                                        <div className="flex items-center gap-4">
                                            {botData.image && (<img src={botData.image} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-white/10" />)}
                                            <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-[#999] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#b31b1b] file:text-white hover:file:bg-[#c42b2b] transition-all" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0a0a0a]">
                                <button onClick={() => setShowEditor(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-[#999] hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                                <button onClick={handleSave} disabled={isSaving || isUploading} className="px-6 py-3 rounded-xl text-sm font-bold bg-[#b31b1b] text-white hover:bg-[#c42b2b] transition-colors shadow-lg shadow-[#b31b1b]/20 disabled:opacity-50">
                                    {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
