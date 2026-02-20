'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { compressImage } from '@/lib/utils/compressImage';

export default function ArticlesTab() {
    const [articles, setArticles] = useState<any[]>([]);
    const [advertisers, setAdvertisers] = useState<{ _id: string; name: string }[]>([]);
    const [articleStats, setArticleStats] = useState<{ totalClicks: number; count: number }>({ totalClicks: 0, count: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editingArticle, setEditingArticle] = useState<any>(null);
    const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('split');
    const [articleData, setArticleData] = useState({
        title: '',
        content: '',
        excerpt: '',
        featuredImage: '',
        status: 'draft' as 'draft' | 'published',
        tags: [] as string[],
        advertiserId: '',
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        ogImage: '',
        ogTitle: '',
        ogDescription: '',
        twitterCard: 'summary_large_image' as 'summary' | 'summary_large_image',
        twitterImage: '',
        twitterTitle: '',
        twitterDescription: '',
    });
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchArticles();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        axios.get('/api/admin/advertisers-dashboard', { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setAdvertisers(res.data?.advertisers ?? []))
            .catch(() => {});
        axios.get('/api/admin/articles/stats', { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setArticleStats({ totalClicks: res.data?.totalClicks ?? 0, count: res.data?.count ?? 0 }))
            .catch(() => {});
    }, []);

    const fetchArticles = async () => {
        setError('');
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/articles', {
                headers: { Authorization: `Bearer ${token}` },
                params: { _: Date.now() },
            });
            setArticles(Array.isArray(res.data) ? res.data : []);
        const statsRes = await axios.get('/api/admin/articles/stats', { headers: { Authorization: `Bearer ${token}` } });
        setArticleStats({ totalClicks: statsRes.data?.totalClicks ?? 0, count: statsRes.data?.count ?? 0 });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load articles');
            setArticles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingArticle(null);
        setArticleData({
            title: '',
            content: '',
            excerpt: '',
            featuredImage: '',
            status: 'draft',
            tags: [],
            advertiserId: '',
            metaTitle: '',
            metaDescription: '',
            metaKeywords: '',
            ogImage: '',
            ogTitle: '',
            ogDescription: '',
            twitterCard: 'summary_large_image',
            twitterImage: '',
            twitterTitle: '',
            twitterDescription: '',
        });
        setTagInput('');
        setShowEditor(true);
    };

    const handleEdit = async (article: any) => {
        setShowEditor(true);
        setEditingArticle(article);
        setArticleData({
            title: article.title || '',
            content: '',
            excerpt: article.excerpt || '',
            featuredImage: article.featuredImage || '',
            status: (article.status === 'published' || article.status === 'draft') ? article.status : 'draft',
            tags: article.tags || [],
            advertiserId: article.advertiserId || '',
            metaTitle: article.metaTitle || '',
            metaDescription: article.metaDescription || '',
            metaKeywords: article.metaKeywords || '',
            ogImage: article.ogImage || '',
            ogTitle: article.ogTitle || '',
            ogDescription: article.ogDescription || '',
            twitterCard: article.twitterCard || 'summary_large_image',
            twitterImage: article.twitterImage || '',
            twitterTitle: article.twitterTitle || '',
            twitterDescription: article.twitterDescription || '',
        });
        setTagInput('');
        if (article.content !== undefined) {
            setArticleData((prev) => ({ ...prev, content: article.content || '' }));
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/admin/articles/${article._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const full = res.data;
            setArticleData((prev) => ({
                ...prev,
                content: full.content || '',
                title: full.title || prev.title,
                excerpt: full.excerpt ?? prev.excerpt,
                featuredImage: full.featuredImage ?? prev.featuredImage,
                status: (full.status === 'published' || full.status === 'draft') ? full.status : prev.status,
                tags: full.tags || prev.tags,
                advertiserId: full.advertiserId || prev.advertiserId,
                metaTitle: full.metaTitle ?? prev.metaTitle,
                metaDescription: full.metaDescription ?? prev.metaDescription,
                metaKeywords: full.metaKeywords ?? prev.metaKeywords,
                ogImage: full.ogImage ?? prev.ogImage,
                ogTitle: full.ogTitle ?? prev.ogTitle,
                ogDescription: full.ogDescription ?? prev.ogDescription,
                twitterCard: full.twitterCard ?? prev.twitterCard,
                twitterImage: full.twitterImage ?? prev.twitterImage,
                twitterTitle: full.twitterTitle ?? prev.twitterTitle,
                twitterDescription: full.twitterDescription ?? prev.twitterDescription,
            }));
            setEditingArticle(full);
        } catch (err: any) {
            console.error('Failed to load article:', err);
            alert(err.response?.data?.message || 'Failed to load article');
        }
    };

    const handleSave = async () => {
        if (!articleData.title || !articleData.content) {
            alert('Title and content are required');
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');

            if (editingArticle) {
                await axios.put(`/api/admin/articles/${editingArticle._id}`, articleData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/admin/articles', articleData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setShowEditor(false);
            fetchArticles();
        } catch (err: any) {
            console.error('Save error:', err);
            alert(err.response?.data?.message || 'Failed to save article');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this article?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/articles/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchArticles();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete article');
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

            setArticleData({ ...articleData, featuredImage: res.data.url });
        } catch (err: any) {
            console.error('Upload error:', err);
            alert(err.response?.data?.message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !articleData.tags.includes(tagInput.trim())) {
            setArticleData({
                ...articleData,
                tags: [...articleData.tags, tagInput.trim()]
            });
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setArticleData({
            ...articleData,
            tags: articleData.tags.filter(tag => tag !== tagToRemove)
        });
    };

    const filteredArticles = articles.filter((article) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const title = (article.title || '').toLowerCase();
        const excerpt = (article.excerpt || '').toLowerCase();
        const advertiserName = (article.advertiserName || '').toLowerCase();
        return title.includes(q) || excerpt.includes(q) || advertiserName.includes(q);
    });

    if (showEditor) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-black text-white mb-2">
                        {editingArticle ? 'Edit Article' : 'Create Article'}
                    </h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowEditor(false)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isUploading}
                            className="px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Article'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Article Metadata */}
                    <div className="glass rounded-2xl p-6 border border-white/5">
                        <h2 className="text-xl font-bold text-white mb-4">Article Information</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={articleData.title}
                                    onChange={(e) => setArticleData({ ...articleData, title: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                    placeholder="Article title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Excerpt</label>
                                <textarea
                                    value={articleData.excerpt}
                                    onChange={(e) => setArticleData({ ...articleData, excerpt: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none resize-none"
                                    placeholder="Short description"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Assign to advertiser</label>
                                <select
                                    value={articleData.advertiserId || ''}
                                    onChange={(e) => setArticleData({ ...articleData, advertiserId: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] outline-none"
                                >
                                    <option value="">None</option>
                                    {advertisers.map((a) => (
                                        <option key={a._id} value={a._id}>{a.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-[#666] mt-1">Same advertisers as in Advertisers section (optional).</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[#999] mb-2">Status</label>
                                    <select
                                        value={articleData.status}
                                        onChange={(e) => setArticleData({ ...articleData, status: e.target.value as 'draft' | 'published' })}
                                        className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-[#999] mb-2">Featured Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#b31b1b] file:text-white hover:file:bg-[#c42b2b]"
                                    />
                                    {articleData.featuredImage && (
                                        <div className="mt-2">
                                            <img src={articleData.featuredImage} alt="Preview" className="max-w-xs rounded-lg" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Tags</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        className="flex-1 p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                        placeholder="Add tag and press Enter"
                                    />
                                    <button
                                        onClick={handleAddTag}
                                        className="px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {articleData.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1 bg-[#b31b1b]/20 text-[#b31b1b] rounded-full text-sm flex items-center gap-2"
                                        >
                                            {tag}
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="hover:text-red-400"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Editor Mode Toggle */}
                    <div className="flex gap-2 justify-center">
                        <button
                            onClick={() => setEditorMode('edit')}
                            className={`px-4 py-2 rounded-lg transition-colors ${editorMode === 'edit'
                                ? 'bg-[#b31b1b] text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setEditorMode('preview')}
                            className={`px-4 py-2 rounded-lg transition-colors ${editorMode === 'preview'
                                ? 'bg-[#b31b1b] text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Preview
                        </button>
                        <button
                            onClick={() => setEditorMode('split')}
                            className={`px-4 py-2 rounded-lg transition-colors ${editorMode === 'split'
                                ? 'bg-[#b31b1b] text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            Split
                        </button>
                    </div>

                    {/* Markdown Editor */}
                    <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                        {editorMode === 'edit' || editorMode === 'split' ? (
                            <div className={editorMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-0' : ''}>
                                <div className="p-6">
                                    <textarea
                                        value={articleData.content}
                                        onChange={(e) => setArticleData({ ...articleData, content: e.target.value })}
                                        className="w-full h-[600px] p-4 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none resize-none font-mono text-sm"
                                        placeholder="# Write your article in Markdown..."
                                    />
                                </div>
                                {editorMode === 'split' && (
                                    <div className="p-6 border-t lg:border-t-0 lg:border-l border-white/10 overflow-auto max-h-[600px] prose prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{articleData.content}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-6 overflow-auto max-h-[600px] prose prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{articleData.content}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Articles</h1>
                    <p className="text-[#999] text-sm">List view · assign to advertisers</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-6 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#b31b1b]/20"
                >
                    + New Article
                </button>
            </div>

            {/* Dashboard: total clicks */}
            <div className="glass rounded-xl p-5 border border-white/5">
                <div className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">Article clicks</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">{articleStats.totalClicks.toLocaleString()}</div>
                        <div className="text-xs text-[#999]">Total (all time)</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">{articleStats.count}</div>
                        <div className="text-xs text-[#999]">Articles</div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="glass rounded-2xl p-4 border border-white/5">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            {/* Articles list (table / feed style) */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading articles...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button onClick={() => { setIsLoading(true); fetchArticles(); }} className="px-6 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold">Retry</button>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">No articles found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-[#666]">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase w-12"> </th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase">Title</th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase">Advertiser</th>
                                    <th className="px-4 py-3 text-right font-bold text-xs uppercase">Clicks</th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase">Status</th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredArticles.map((article) => (
                                    <tr key={article._id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            {article.featuredImage ? (
                                                <img src={article.featuredImage} alt="" className="h-10 w-16 object-cover rounded" />
                                            ) : (
                                                <div className="h-10 w-16 rounded bg-white/10" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-white line-clamp-1">{article.title}</span>
                                            {article.excerpt && <div className="text-xs text-[#666] line-clamp-1 mt-0.5">{article.excerpt}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-[#999]">{article.advertiserName || '—'}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-white">{(article.views ?? 0).toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${article.status === 'published' ? 'bg-green-500/20 text-green-400' : 'text-[#666]'}`}>{article.status}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => handleEdit(article)} className="text-blue-400 hover:underline mr-2">Edit</button>
                                            <button onClick={() => handleDelete(article._id)} className="text-red-400 hover:underline">Delete</button>
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
