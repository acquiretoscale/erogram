'use client';

import { useState, useEffect } from 'react';
import { getReviews, updateReview, deleteReview } from '@/lib/actions/adminReviews';

type ReviewType = 'all' | 'group' | 'creator' | 'article' | 'ainsfw' | 'feed';

const TYPE_FILTERS: { id: ReviewType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'group', label: 'Groups' },
    { id: 'creator', label: 'Flame' },
    { id: 'article', label: 'Blog' },
    { id: 'ainsfw', label: 'AI NSFW' },
    { id: 'feed', label: 'Feed' },
];

const TYPE_LABEL: Record<string, string> = {
    group: 'Group',
    creator: 'Flame',
    article: 'Blog',
    ainsfw: 'AI NSFW',
    feed: 'Profile feed',
};

function LocationCell({ review }: { review: any }) {
    if (review.type === 'creator' && review.creatorSlug) {
        return (
            <>
                <a href={`/ofsearch/${review.creatorSlug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-400 hover:underline">
                    {review.creatorSlug}
                </a>
                <div className="text-xs text-gray-400">{TYPE_LABEL.creator}</div>
            </>
        );
    }
    if (review.type === 'article' && review.articleSlug) {
        return (
            <>
                <a href={`/blog/${review.articleSlug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-400 hover:underline">
                    {review.articleSlug}
                </a>
                <div className="text-xs text-gray-400">{TYPE_LABEL.article}</div>
            </>
        );
    }
    if (review.type === 'ainsfw' && review.ainsfwSlug) {
        return (
            <>
                <a href={`/ainsfw/${review.ainsfwSlug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-400 hover:underline">
                    {review.ainsfwSlug}
                </a>
                <div className="text-xs text-gray-400">{TYPE_LABEL.ainsfw}</div>
            </>
        );
    }
    if (review.type === 'feed') {
        return (
            <>
                {review.creatorSlug ? (
                    <a href={`/ofsearch/${review.creatorSlug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-400 hover:underline">
                        {review.creatorName || review.creatorSlug}
                    </a>
                ) : (
                    <span className="font-semibold text-teal-400">Profile media</span>
                )}
                <div className="text-xs text-gray-400 truncate max-w-[180px]" title={review.mediaKey}>
                    {TYPE_LABEL.feed}{review.mediaKey ? ` · ${review.mediaKey}` : ''}
                </div>
            </>
        );
    }
    const groupSlug = review.groupId?.slug;
    return (
        <>
            {groupSlug ? (
                <a href={`/${groupSlug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:underline">
                    {review.groupId?.name || 'Unknown'}
                </a>
            ) : (
                <div className="font-semibold">{review.groupId?.name || 'Unknown'}</div>
            )}
            <div className="text-xs text-gray-400">{review.groupId?.category || TYPE_LABEL.group}</div>
        </>
    );
}

export default function ReviewsTab() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<ReviewType>('all');
    const [editingReview, setEditingReview] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('type') as ReviewType | null;
        if (t && TYPE_FILTERS.some((f) => f.id === t)) setTypeFilter(t);
        const q = params.get('q');
        if (q) setSearchQuery(q);
    }, []);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const token = localStorage.getItem('token') || '';
            const data = await getReviews(token);
            setReviews(data);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Failed to load comments');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string, type?: string) => {
        if (!confirm('Approve and publish?')) return;
        try {
            const token = localStorage.getItem('token') || '';
            await updateReview(token, id, { status: 'approved', type });
            fetchReviews();
        } catch (err: any) {
            alert(err.message || 'Failed to approve');
        }
    };

    const handleReject = async (id: string, type?: string) => {
        if (!confirm('Reject this item?')) return;
        try {
            const token = localStorage.getItem('token') || '';
            await updateReview(token, id, { status: 'rejected', type });
            fetchReviews();
        } catch (err: any) {
            alert(err.message || 'Failed to reject');
        }
    };

    const handleDelete = async (id: string, type?: string) => {
        if (!confirm('Delete permanently?')) return;
        try {
            const token = localStorage.getItem('token') || '';
            await deleteReview(token, id, type);
            fetchReviews();
        } catch (err: any) {
            alert(err.message || 'Failed to delete');
        }
    };

    const handleEdit = (review: any) => {
        setEditingReview(review._id);
        setEditFormData({
            content: review.content || '',
            rating: review.rating || 5,
            authorName: review.authorName || '',
            status: review.status || 'pending',
            type: review.type,
        });
    };

    const handleSave = async () => {
        if (!editingReview) return;
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token') || '';
            await updateReview(token, editingReview, { ...editFormData, type: editFormData.type });
            setEditingReview(null);
            fetchReviews();
        } catch (err: any) {
            alert(err.message || 'Failed to update');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditingReview(null);
        setEditFormData({});
    };

    const pendingCount = reviews.filter((r) => r.status === 'pending').length;

    const filteredReviews = reviews.filter((review) => {
        if (typeFilter !== 'all' && review.type !== typeFilter) return false;
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            review.content?.toLowerCase().includes(q) ||
            review.authorName?.toLowerCase().includes(q) ||
            review.groupId?.name?.toLowerCase().includes(q) ||
            review.creatorSlug?.toLowerCase().includes(q) ||
            review.articleSlug?.toLowerCase().includes(q) ||
            review.ainsfwSlug?.toLowerCase().includes(q) ||
            review.mediaKey?.toLowerCase().includes(q)
        );
    });

    const typeCounts = reviews.reduce((acc: Record<string, number>, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-white mb-1">Comments & Reviews</h1>
                <p className="text-[#999] text-sm">
                    {reviews.length} total across groups, flame, blog, AI NSFW, and profile feed
                    {pendingCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                            {pendingCount} pending
                        </span>
                    )}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {TYPE_FILTERS.map((f) => {
                    const count = f.id === 'all' ? reviews.length : typeCounts[f.id] || 0;
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setTypeFilter(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                typeFilter === f.id
                                    ? 'bg-[#b31b1b]/20 text-[#ff6b6b] border-[#b31b1b]/40'
                                    : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white/80'
                            }`}
                        >
                            {f.label} ({count})
                        </button>
                    );
                })}
            </div>

            <div className="glass rounded-2xl p-6 border border-white/5">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search content, author, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400">{error}</div>
                ) : filteredReviews.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">Nothing found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Author</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Rating</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Content</th>
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
                                                <td className="px-6 py-4 text-white"><LocationCell review={review} /></td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="text"
                                                        value={editFormData.authorName || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, authorName: e.target.value })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    {review.type === 'article' || review.type === 'feed' ? (
                                                        <span className="text-gray-500 text-sm">N/A</span>
                                                    ) : (
                                                        <select
                                                            value={editFormData.rating || 5}
                                                            onChange={(e) => setEditFormData({ ...editFormData, rating: parseInt(e.target.value) })}
                                                            className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none focus:border-[#b31b1b]"
                                                        >
                                                            {[1, 2, 3, 4, 5].map((n) => (
                                                                <option key={n} value={n}>{n}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <textarea
                                                        value={editFormData.content || ''}
                                                        onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white outline-none resize-none focus:border-[#b31b1b]"
                                                        rows={3}
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
                                                        <button onClick={handleSave} disabled={isSaving} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30" title="Save">💾</button>
                                                        <button onClick={handleCancel} className="p-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30" title="Cancel">✕</button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 text-white"><LocationCell review={review} /></td>
                                                <td className="px-6 py-4 text-gray-400">{review.authorName || 'Member'}</td>
                                                <td className="px-6 py-4">
                                                    {review.type === 'article' || review.type === 'feed' ? (
                                                        <span className="text-gray-500">-</span>
                                                    ) : (
                                                        <div className="flex items-center">
                                                            <span className="text-yellow-400 mr-1">{review.type === 'creator' ? '🔥' : '⭐'}</span>
                                                            <span className="text-white font-semibold">{review.rating}/5</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-300 max-w-xs truncate" title={review.content}>{review.content}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                        review.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
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
                                                        <button onClick={() => handleEdit(review)} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg" title="Edit">✏️</button>
                                                        {review.status === 'pending' && (
                                                            <>
                                                                <button onClick={() => handleApprove(review._id, review.type)} className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg" title="Approve">✅</button>
                                                                <button onClick={() => handleReject(review._id, review.type)} className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg" title="Reject">❌</button>
                                                            </>
                                                        )}
                                                        <button onClick={() => handleDelete(review._id, review.type)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg" title="Delete">🗑️</button>
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
