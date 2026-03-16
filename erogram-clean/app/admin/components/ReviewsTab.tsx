'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ReviewsTab() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingReview, setEditingReview] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/reviews', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviews(res.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load reviews');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Approve this review and make it public?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/reviews/${id}`, {
                status: 'approved',
                reviewedAt: new Date()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchReviews();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to approve review');
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Reject this review? It will not be published.')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/reviews/${id}`, {
                status: 'rejected',
                reviewedAt: new Date()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchReviews();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to reject review');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this review?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/reviews/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchReviews();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete review');
        }
    };

    const handleEdit = (review: any) => {
        setEditingReview(review._id);
        setEditFormData({
            content: review.content || '',
            rating: review.rating || 5,
            authorName: review.authorName || '',
            status: review.status || 'pending',
        });
    };

    const handleSave = async () => {
        if (!editingReview) return;

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/admin/reviews/${editingReview}`, editFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingReview(null);
            fetchReviews();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update review');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingReview(null);
        setEditFormData({});
    };

    const filteredReviews = reviews.filter((review) =>
        review.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.groupId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-white mb-1">Reviews</h1>
                <p className="text-[#999] text-sm">Moderate {reviews.length} user reviews</p>
            </div>

            {/* Search */}
            <div className="glass rounded-2xl p-6 border border-white/5">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search reviews..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            {/* Reviews Table */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading reviews...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400">{error}</div>
                ) : filteredReviews.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">No reviews found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Group</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Author</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Rating</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Review</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-[#666] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredReviews.map((review) => (
                                    <tr key={review._id} className="hover:bg-white/5 transition-colors group">
                                        {editingReview === review._id ? (
                                            <>
                                                <td className="px-6 py-4 text-white">
                                                    <div className="font-semibold">{review.groupId?.name || 'Unknown Group'}</div>
                                                    <div className="text-xs text-gray-400">{review.groupId?.category}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={editFormData.authorName || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, authorName: e.target.value })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                        placeholder="Author name"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={editFormData.rating || 5}
                                                        onChange={(e) => setEditFormData({ ...editFormData, rating: parseInt(e.target.value) })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                    >
                                                        <option value={1}>1</option>
                                                        <option value={2}>2</option>
                                                        <option value={3}>3</option>
                                                        <option value={4}>4</option>
                                                        <option value={5}>5</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <textarea
                                                        value={editFormData.content || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none resize-none focus:border-[#b31b1b]"
                                                        rows={3}
                                                        placeholder="Review content"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={editFormData.status || 'pending'}
                                                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="approved">Approved</option>
                                                        <option value="rejected">Rejected</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={handleSave}
                                                            disabled={isSaving}
                                                            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                                            title="Save"
                                                        >
                                                            💾
                                                        </button>
                                                        <button
                                                            onClick={handleCancel}
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
                                                <td className="px-6 py-4 text-white">
                                                    <div className="font-semibold">{review.groupId?.name || 'Unknown Group'}</div>
                                                    <div className="text-xs text-gray-400">{review.groupId?.category}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400">
                                                    {review.authorName || 'Anonymous'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <span className="text-yellow-400 mr-1">⭐</span>
                                                        <span className="text-white font-semibold">{review.rating}/5</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-300 max-w-xs truncate" title={review.content}>
                                                        {review.content}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${review.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                            review.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                        }`}>
                                                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEdit(review)}
                                                            className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            ✏️
                                                        </button>
                                                        {review.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(review._id)}
                                                                    className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                                                                    title="Approve"
                                                                >
                                                                    ✅
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(review._id)}
                                                                    className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors"
                                                                    title="Reject"
                                                                >
                                                                    ❌
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(review._id)}
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
