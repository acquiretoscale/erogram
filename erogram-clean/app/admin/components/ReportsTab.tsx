'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ReportsTab() {
    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/reports', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(res.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load reports');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolve = async (id: string) => {
        if (!confirm('Mark this report as resolved?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/reports/${id}`, { status: 'resolved' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchReports();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to resolve report');
        }
    };

    const handleMarkPending = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/reports/${id}`, { status: 'pending' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchReports();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update report');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this report?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/reports/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchReports();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete report');
        }
    };

    const filteredReports = reports.filter((report) => {
        const matchesSearch = !searchQuery ||
            report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.groupDetails?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.groupDetails?.category?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || report.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-white mb-1">Reports</h1>
                <p className="text-[#999] text-sm">Manage {reports.length} user reports</p>
            </div>

            {/* Filters */}
            <div className="glass rounded-2xl p-6 border border-white/5">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                        <input
                            type="text"
                            placeholder="Search reports..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full md:w-48 p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Reports Table */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading reports...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400">{error}</div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">No reports found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Reported Group</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Reason</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-[#666] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredReports.map((report) => (
                                    <tr key={report._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 text-white">
                                            <div className="font-semibold">{report.groupDetails?.name || 'Unknown Group'}</div>
                                            <div className="text-xs text-gray-400">
                                                {report.groupDetails?.category} • {report.groupDetails?.country}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-300 max-w-xs truncate" title={report.reason}>
                                                {report.reason}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${report.status === 'resolved'
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                }`}>
                                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {report.status === 'pending' ? (
                                                    <button
                                                        onClick={() => handleResolve(report._id)}
                                                        className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                                                        title="Resolve"
                                                    >
                                                        ✅
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleMarkPending(report._id)}
                                                        className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors"
                                                        title="Mark Pending"
                                                    >
                                                        ↩️
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(report._id)}
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
                )}
            </div>
        </div>
    );
}
