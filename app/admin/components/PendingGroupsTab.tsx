'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { categories, countries } from '@/app/groups/constants';

export default function PendingGroupsTab() {
    const [groups, setGroups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPendingGroups();
    }, []);

    const fetchPendingGroups = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please log in to view pending groups.');
                setIsLoading(false);
                return;
            }
            const res = await axios.get('/api/admin/groups', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(res.data.filter((g: any) => g.status === 'pending'));
            setError('');
        } catch (err: any) {
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                setError('Session expired or admin access required. Please log in again.');
                window.location.href = '/admin';
                return;
            }
            setError(err.response?.data?.message || 'Failed to load pending groups');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
        try {
            const token = localStorage.getItem('token');
            // We need to send the full object or at least the required fields. 
            // But the PUT endpoint expects a full body usually. 
            // Let's find the group first.
            const group = groups.find(g => g._id === id);
            if (!group) return;

            await axios.put(`/api/admin/groups/${id}`, { ...group, status }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Remove from list
            setGroups(groups.filter(g => g._id !== id));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleApprovePremium = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const group = groups.find(g => g._id === id);
            if (!group) return;

            await axios.post(`/api/admin/groups/${id}/premium-notification`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('✅ Premium notification sent! You can now approve the group when ready.');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send notification');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-white mb-1">Pending Groups</h1>
                <p className="text-[#999] text-sm">{groups.length} groups waiting for approval</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full text-center py-12">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading pending groups...</p>
                    </div>
                ) : error ? (
                    <div className="col-span-full text-center text-red-400 py-12">{error}</div>
                ) : groups.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <div className="text-6xl mb-4">✅</div>
                        <p className="text-[#999]">No pending groups!</p>
                    </div>
                ) : (
                    groups.map((group) => (
                        <div key={group._id} className="glass rounded-2xl overflow-hidden border border-white/5 flex flex-col">
                            <div className="relative h-48 bg-[#1a1a1a]">
                                {(group.image && typeof group.image === 'string' && group.image.startsWith('https://')) ? (
                                    <img
                                        src={group.image}
                                        alt={group.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/assets/image.jpg';
                                        }}
                                    />
                                ) : (
                                    <img
                                        src="/assets/image.jpg"
                                        alt={group.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <div className="absolute top-3 right-3 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                                    PENDING
                                </div>
                            </div>

                            <div className="p-6 flex-grow flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-2">{group.name}</h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300">{group.category}</span>
                                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300">{group.country}</span>
                                </div>
                                <p className="text-sm text-[#999] mb-4 line-clamp-3 flex-grow">{group.description}</p>
                                <a href={group.telegramLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mb-6 block truncate">
                                    {group.telegramLink}
                                </a>

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <button
                                        onClick={() => handleStatusChange(group._id, 'rejected')}
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(group._id, 'approved')}
                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-green-500/20"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleApprovePremium(group._id)}
                                        className="col-span-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                                    >
                                        <span>⭐</span> Send to Premium
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
