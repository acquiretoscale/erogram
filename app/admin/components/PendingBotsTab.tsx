'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PendingBotsTab() {
    const [bots, setBots] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPendingBots();
    }, []);

    const fetchPendingBots = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please log in to view pending bots.');
                setIsLoading(false);
                return;
            }
            const res = await axios.get('/api/admin/bots', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBots(res.data.filter((b: any) => b.status === 'pending'));
            setError('');
        } catch (err: any) {
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                setError('Session expired or admin access required. Please log in again.');
                window.location.href = '/admin';
                return;
            }
            setError(err.response?.data?.message || 'Failed to load pending bots');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
        try {
            const token = localStorage.getItem('token');
            const bot = bots.find(b => b._id === id);
            if (!bot) return;

            await axios.put(`/api/admin/bots/${id}`, { ...bot, status }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setBots(bots.filter(b => b._id !== id));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-white mb-1">Pending Bots</h1>
                <p className="text-[#999] text-sm">{bots.length} bots waiting for approval</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full text-center py-12">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading pending bots...</p>
                    </div>
                ) : error ? (
                    <div className="col-span-full text-center text-red-400 py-12">{error}</div>
                ) : bots.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <div className="text-6xl mb-4">✅</div>
                        <p className="text-[#999]">No pending bots!</p>
                    </div>
                ) : (
                    bots.map((bot) => (
                        <div key={bot._id} className="glass rounded-2xl overflow-hidden border border-white/5 flex flex-col">
                            <div className="relative h-48 bg-[#1a1a1a]">
                                {bot.image ? (
                                    <img src={bot.image} alt={bot.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#666]">No Image</div>
                                )}
                                <div className="absolute top-3 right-3 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                                    PENDING
                                </div>
                            </div>

                            <div className="p-6 flex-grow flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-2">{bot.name}</h3>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300">{bot.category}</span>
                                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300">{bot.country}</span>
                                </div>
                                <p className="text-sm text-[#999] mb-4 line-clamp-3 flex-grow">{bot.description}</p>
                                <a href={bot.telegramLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mb-6 block truncate">
                                    {bot.telegramLink}
                                </a>

                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                    <button
                                        onClick={() => handleStatusChange(bot._id, 'rejected')}
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(bot._id, 'approved')}
                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-green-500/20"
                                    >
                                        Approve
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
