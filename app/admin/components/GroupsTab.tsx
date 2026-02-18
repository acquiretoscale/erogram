'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { compressImage } from '@/lib/utils/compressImage';
import { categories, countries } from '@/app/groups/constants';

export default function GroupsTab() {
    const [groups, setGroups] = useState<any[]>([]);
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
    });
    const [isSaving, setIsSaving] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchGroups();
    }, []);

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

    // Filter and Pagination Logic
    const filteredGroups = groups.filter((group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.country.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
    const paginatedGroups = filteredGroups.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Groups</h1>
                    <p className="text-[#999] text-sm">Manage {groups.length} total groups</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-grow md:flex-grow-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                            }}
                            className="w-full md:w-64 pl-10 pr-4 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading groups...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400">{error}</div>
                ) : filteredGroups.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">No groups found</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5 border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Group Info</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Stats</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-[#666] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedGroups.map((group) => (
                                        <tr key={group._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] overflow-hidden flex-shrink-0">
                                                        {(group.image && typeof group.image === 'string' && group.image.startsWith('https://')) ? (
                                                            <img
                                                                src={group.image}
                                                                alt={group.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { (e.target as HTMLImageElement).src = '/assets/image.jpg'; }}
                                                            />
                                                        ) : (
                                                            <img src="/assets/image.jpg" alt={group.name} className="w-full h-full object-cover" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white flex items-center gap-2">
                                                            {group.name}
                                                            {group.pinned && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">PINNED</span>}
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
                                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-300">{group.views?.toLocaleString() || 0} views</div>
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
                                Showing <span className="text-white font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, filteredGroups.length)}</span> of <span className="text-white font-medium">{filteredGroups.length}</span> results
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
                                            <span className="text-white font-medium">Pin to top</span>
                                        </label>
                                    </div>

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
