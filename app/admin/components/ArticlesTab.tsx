'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { getArticles, getArticle, createArticle, updateArticle, deleteArticle, getArticleStats } from '@/lib/actions/adminArticles';
import { getAdvertisersDashboard } from '@/lib/actions/adminCampaigns';
import { getAuthors, upsertAuthor, deleteAuthor, type AuthorProfile } from '@/lib/actions/authors';
import { compressImage } from '@/lib/utils/compressImage';
import ArticleEditor from './ArticleEditor';
import AuthorsManager from './AuthorsManager';
import CreatorOfMonthManager from './CreatorOfMonthManager';
import { BLOG_CATEGORIES } from '@/lib/blog/categories';


export default function ArticlesTab() {
    const [articles, setArticles] = useState<any[]>([]);
    const [advertisers, setAdvertisers] = useState<{ _id: string; name: string }[]>([]);
    const [articleStats, setArticleStats] = useState<{ totalClicks: number; totalClicks24h: number; totalClicks7d: number; totalClicks30d: number; count: number }>({ totalClicks: 0, totalClicks24h: 0, totalClicks7d: 0, totalClicks30d: 0, count: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editingArticle, setEditingArticle] = useState<any>(null);
    const [articleData, setArticleData] = useState({
        title: '',
        content: '',
        excerpt: '',
        featuredImage: '',
        status: 'draft' as 'draft' | 'published',
        blogCategory: 'adult-entertainment',
        authorSlug: 'eros',
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
        videoBlocks: [] as { url: string; caption: string; link: string; linktext: string; position: string }[],
        ctaBlocks: [] as { url: string; text: string; headline: string; description: string; position: string }[],
    });
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [authors, setAuthors] = useState<AuthorProfile[]>([]);
    const [showAuthors, setShowAuthors] = useState(false);
    const refreshAuthors = () => getAuthors().then(setAuthors).catch(() => {});

    type SortKey = 'title' | 'advertiser' | 'clicks' | 'views24h' | 'views7d' | 'views30d' | 'published' | 'status';
    const [sortBy, setSortBy] = useState<SortKey>('views30d');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleSort = (key: SortKey) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder(key === 'title' || key === 'advertiser' || key === 'status' ? 'asc' : 'desc');
        }
    };

    useEffect(() => {
        fetchArticles().then((list) => {
            const slug = sessionStorage.getItem('adminEditArticle');
            if (slug && list.length > 0) {
                sessionStorage.removeItem('adminEditArticle');
                const found = list.find((a: any) => a.slug === slug);
                if (found) handleEdit(found);
            }
        });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        getAdvertisersDashboard(token)
            .then((data) => setAdvertisers(data?.advertisers ?? []))
            .catch(() => {});
        getArticleStats(token || '')
            .then((data) => setArticleStats({ totalClicks: data?.totalClicks ?? 0, totalClicks24h: data?.totalClicks24h ?? 0, totalClicks7d: data?.totalClicks7d ?? 0, totalClicks30d: data?.totalClicks30d ?? 0, count: data?.count ?? 0 }))
            .catch(() => {});
        refreshAuthors();
    }, []);

    const fetchArticles = async () => {
        setError('');
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token') || '';
            const list = await getArticles(token);
            const articleList = Array.isArray(list) ? list : [];
            setArticles(articleList);
            const statsData = await getArticleStats(token);
            setArticleStats({ totalClicks: statsData?.totalClicks ?? 0, totalClicks24h: statsData?.totalClicks24h ?? 0, totalClicks7d: statsData?.totalClicks7d ?? 0, totalClicks30d: statsData?.totalClicks30d ?? 0, count: statsData?.count ?? 0 });
            return articleList;
        } catch (err: any) {
            setError(err.message || 'Failed to load articles');
            setArticles([]);
            return [];
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
            blogCategory: 'adult-entertainment',
            authorSlug: 'eros',
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
            videoBlocks: [],
            ctaBlocks: [],
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
            blogCategory: article.blogCategory || 'adult-entertainment',
            authorSlug: article.authorSlug || 'eros',
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
            videoBlocks: article.videoBlocks || [],
            ctaBlocks: article.ctaBlocks || [],
        });
        setTagInput('');
        if (article.content !== undefined) {
            setArticleData((prev) => ({ ...prev, content: article.content || '' }));
            return;
        }
        try {
            const token = localStorage.getItem('token') || '';
            const full = await getArticle(token, article._id);
            setArticleData((prev) => ({
                ...prev,
                content: full.content || '',
                title: full.title || prev.title,
                excerpt: full.excerpt ?? prev.excerpt,
                featuredImage: full.featuredImage ?? prev.featuredImage,
                status: (full.status === 'published' || full.status === 'draft') ? full.status : prev.status,
                blogCategory: full.blogCategory || prev.blogCategory,
                authorSlug: full.authorSlug || prev.authorSlug,
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
                videoBlocks: full.videoBlocks || prev.videoBlocks,
                ctaBlocks: full.ctaBlocks || prev.ctaBlocks,
            }));
            setEditingArticle(full);
        } catch (err: any) {
            console.error('Failed to load article:', err);
            alert(err.message || 'Failed to load article');
        }
    };

    const [saveSuccess, setSaveSuccess] = useState('');

    const doSave = async (statusOverride?: 'draft' | 'published') => {
        const payload = { ...articleData };
        if (statusOverride) payload.status = statusOverride;

        if (!payload.title.trim()) { alert('Title is required'); return; }
        if (!payload.content.trim()) { alert('Content is required'); return; }

        setIsSaving(true);
        setSaveSuccess('');
        try {
            const token = localStorage.getItem('token') || '';

            if (editingArticle) {
                await updateArticle(token, editingArticle._id, payload);
            } else {
                await createArticle(token, payload);
            }

            setArticleData(prev => ({ ...prev, status: payload.status }));
            const msg = payload.status === 'published' ? 'Published!' : 'Draft saved!';
            setSaveSuccess(msg);
            fetchArticles();
            setTimeout(() => setSaveSuccess(''), 3000);
        } catch (err: any) {
            console.error('Save error:', err);
            alert(err.message || 'Failed to save article');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDraft = () => doSave('draft');
    const handlePublish = () => doSave('published');
    const handleSave = () => doSave();

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this article?')) return;

        try {
            const token = localStorage.getItem('token') || '';
            await deleteArticle(token, id);
            fetchArticles();
        } catch (err: any) {
            alert(err.message || 'Failed to delete article');
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
            // Keyword-rich R2 filename from the article title (SEO). Falls back to UUID if empty.
            if (articleData.title?.trim()) formData.append('name', articleData.title.trim());

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

    const sortedArticles = [...filteredArticles].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        if (sortBy === 'title') {
            aVal = (a.title || '').toLowerCase();
            bVal = (b.title || '').toLowerCase();
        } else if (sortBy === 'advertiser') {
            aVal = (a.advertiserName || '').toLowerCase();
            bVal = (b.advertiserName || '').toLowerCase();
        } else if (sortBy === 'clicks') {
            aVal = a.views ?? 0;
            bVal = b.views ?? 0;
        } else if (sortBy === 'views24h') {
            aVal = a.views24h ?? 0;
            bVal = b.views24h ?? 0;
        } else if (sortBy === 'views7d') {
            aVal = a.views7d ?? 0;
            bVal = b.views7d ?? 0;
        } else if (sortBy === 'views30d') {
            aVal = a.views30d ?? 0;
            bVal = b.views30d ?? 0;
        } else if (sortBy === 'published') {
            aVal = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            bVal = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        } else if (sortBy === 'status') {
            aVal = a.status || '';
            bVal = b.status || '';
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? cmp : -cmp;
    });

    if (showEditor) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowEditor(false)}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm"
                        >
                            &larr; Back
                        </button>
                        <h1 className="text-2xl font-black text-white">
                            {editingArticle ? 'Edit Article' : 'New Article'}
                        </h1>
                        {articleData.status === 'published' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/20">Live</span>
                        )}
                        {articleData.status === 'draft' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/20">Draft</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {saveSuccess && (
                            <span className="text-green-400 text-sm font-semibold animate-pulse">{saveSuccess}</span>
                        )}
                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving || isUploading}
                            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50 text-sm font-bold"
                        >
                            {isSaving && articleData.status !== 'published' ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={isSaving || isUploading}
                            className="px-5 py-2.5 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl transition-colors disabled:opacity-50 text-sm font-bold shadow-lg shadow-[#b31b1b]/20"
                        >
                            {isSaving && articleData.status === 'published' ? 'Publishing...' : articleData.status === 'published' ? 'Update & Publish' : 'Publish'}
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
                                <label className="block text-sm font-semibold text-[#999] mb-2">Blog Category</label>
                                <select
                                    value={articleData.blogCategory}
                                    onChange={(e) => setArticleData({ ...articleData, blogCategory: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                >
                                    {BLOG_CATEGORIES.map((c) => (
                                        <option key={c.slug} value={c.slug}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-[#999]">Author (byline)</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAuthors((s) => !s)}
                                        className="text-xs font-semibold text-[#b31b1b] hover:text-[#e23] transition-colors"
                                    >
                                        {showAuthors ? 'Close authors' : 'Manage authors'}
                                    </button>
                                </div>
                                <select
                                    value={articleData.authorSlug}
                                    onChange={(e) => setArticleData({ ...articleData, authorSlug: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                >
                                    {authors.map((a) => (
                                        <option key={a.slug} value={a.slug}>{a.name}{a.role ? ` — ${a.role}` : ''}</option>
                                    ))}
                                </select>
                                {showAuthors && (
                                    <AuthorsManager
                                        authors={authors}
                                        onChanged={refreshAuthors}
                                    />
                                )}
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

                    {/* ─── Visual Article Editor (TipTap) ─── */}
                    {articleData.content ? (
                        <ArticleEditor
                            key={editingArticle?._id || 'new'}
                            content={articleData.content}
                            onChange={(md) => setArticleData(prev => ({ ...prev, content: md }))}
                        />
                    ) : !editingArticle ? (
                        <ArticleEditor
                            content=""
                            onChange={(md) => setArticleData(prev => ({ ...prev, content: md }))}
                        />
                    ) : (
                        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading article content...</div>
                    )}

                    {/* ─── Embedded Media & CTAs (visual cards) ─── */}
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-white font-bold text-sm">Embedded Media & CTAs ({articleData.videoBlocks.length + articleData.ctaBlocks.length})</h3>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setArticleData(prev => ({ ...prev, videoBlocks: [...prev.videoBlocks, { url: '', caption: '', link: '', linktext: '', position: 'after_intro' }] }))}
                                    className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">+ Video</button>
                                <button type="button" onClick={() => setArticleData(prev => ({ ...prev, ctaBlocks: [...prev.ctaBlocks, { url: '', text: '', headline: '', description: '', position: 'after_intro' }] }))}
                                    className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors">+ CTA</button>
                            </div>
                        </div>

                        {articleData.videoBlocks.length === 0 && articleData.ctaBlocks.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">No videos or CTAs yet. Click + Video or + CTA to add.</div>
                        )}

                        {/* Video cards */}
                        {articleData.videoBlocks.map((v, i) => (
                            <div key={`v-${i}`} className="rounded-xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
                                {/* Preview */}
                                {v.url && (
                                    <div className="bg-black aspect-video max-h-[200px] overflow-hidden">
                                        {/\.(mp4|webm|ogg)(\?|$)/i.test(v.url) ? (
                                            <video src={v.url} className="w-full h-full object-contain" preload="metadata" />
                                        ) : (
                                            <iframe src={v.url} className="w-full h-full border-none" />
                                        )}
                                    </div>
                                )}
                                <div className="p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">🎬 Video {i + 1}
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 uppercase">{v.position === 'after_intro' ? 'Top' : v.position === 'middle' ? 'Mid' : 'Bottom'}</span>
                                        </span>
                                        <button type="button" onClick={() => setArticleData(prev => ({ ...prev, videoBlocks: prev.videoBlocks.filter((_, idx) => idx !== i) }))}
                                            className="text-xs text-red-400 hover:text-red-300 font-bold">✕ Delete</button>
                                    </div>
                                    <input placeholder="Video URL *" value={v.url} onChange={e => { const b = [...articleData.videoBlocks]; b[i] = { ...b[i], url: e.target.value }; setArticleData(prev => ({ ...prev, videoBlocks: b })); }}
                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 outline-none" />
                                    <div className="flex gap-2">
                                        <input placeholder="Caption" value={v.caption} onChange={e => { const b = [...articleData.videoBlocks]; b[i] = { ...b[i], caption: e.target.value }; setArticleData(prev => ({ ...prev, videoBlocks: b })); }}
                                            className="flex-1 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 outline-none" />
                                        <select value={v.position} onChange={e => { const b = [...articleData.videoBlocks]; b[i] = { ...b[i], position: e.target.value }; setArticleData(prev => ({ ...prev, videoBlocks: b })); }}
                                            className="p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs outline-none w-28">
                                            <option value="after_intro">📍 Top</option>
                                            <option value="middle">📍 Middle</option>
                                            <option value="end">📍 Bottom</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input placeholder="CTA Link" value={v.link} onChange={e => { const b = [...articleData.videoBlocks]; b[i] = { ...b[i], link: e.target.value }; setArticleData(prev => ({ ...prev, videoBlocks: b })); }}
                                            className="flex-1 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 outline-none" />
                                        <input placeholder="Button text" value={v.linktext} onChange={e => { const b = [...articleData.videoBlocks]; b[i] = { ...b[i], linktext: e.target.value }; setArticleData(prev => ({ ...prev, videoBlocks: b })); }}
                                            className="w-40 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 outline-none" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* CTA cards */}
                        {articleData.ctaBlocks.map((c, i) => (
                            <div key={`c-${i}`} className="rounded-xl border border-green-500/30 bg-green-500/5 overflow-hidden">
                                {/* CTA Preview */}
                                {c.url && c.text && (
                                    <div className="bg-gradient-to-br from-[#140909] via-[#0f0f0f] to-[#090909] p-5 text-center">
                                        <p className="text-white font-bold text-sm">{c.headline || 'Ready to continue?'}</p>
                                        {c.description && <p className="text-gray-400 text-xs mt-1">{c.description}</p>}
                                        <span className="inline-block mt-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-b from-[#22c55e] to-[#15803d]">{c.text}</span>
                                    </div>
                                )}
                                <div className="p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">🔗 CTA {i + 1}
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 uppercase">{c.position === 'after_intro' ? 'Top' : c.position === 'middle' ? 'Mid' : 'Bottom'}</span>
                                        </span>
                                        <button type="button" onClick={() => setArticleData(prev => ({ ...prev, ctaBlocks: prev.ctaBlocks.filter((_, idx) => idx !== i) }))}
                                            className="text-xs text-red-400 hover:text-red-300 font-bold">✕ Delete</button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input placeholder="URL *" value={c.url} onChange={e => { const b = [...articleData.ctaBlocks]; b[i] = { ...b[i], url: e.target.value }; setArticleData(prev => ({ ...prev, ctaBlocks: b })); }}
                                            className="flex-1 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 outline-none" />
                                        <input placeholder="Button text *" value={c.text} onChange={e => { const b = [...articleData.ctaBlocks]; b[i] = { ...b[i], text: e.target.value }; setArticleData(prev => ({ ...prev, ctaBlocks: b })); }}
                                            className="w-40 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 outline-none" />
                                    </div>
                                    <div className="flex gap-2">
                                        <input placeholder="Headline" value={c.headline} onChange={e => { const b = [...articleData.ctaBlocks]; b[i] = { ...b[i], headline: e.target.value }; setArticleData(prev => ({ ...prev, ctaBlocks: b })); }}
                                            className="flex-1 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 outline-none" />
                                        <select value={c.position} onChange={e => { const b = [...articleData.ctaBlocks]; b[i] = { ...b[i], position: e.target.value }; setArticleData(prev => ({ ...prev, ctaBlocks: b })); }}
                                            className="p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs outline-none w-28">
                                            <option value="after_intro">📍 Top</option>
                                            <option value="middle">📍 Middle</option>
                                            <option value="end">📍 Bottom</option>
                                        </select>
                                    </div>
                                    <input placeholder="Description" value={c.description} onChange={e => { const b = [...articleData.ctaBlocks]; b[i] = { ...b[i], description: e.target.value }; setArticleData(prev => ({ ...prev, ctaBlocks: b })); }}
                                        className="w-full p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 outline-none" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sticky bottom bar */}
                <div className="sticky bottom-0 z-30 -mx-6 -mb-6 px-6 py-4 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        {articleData.status === 'published' && (
                            <span className="flex items-center gap-1.5 text-green-400"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Published</span>
                        )}
                        {articleData.status === 'draft' && (
                            <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400" /> Draft</span>
                        )}
                        {saveSuccess && (
                            <span className="text-green-400 font-semibold animate-pulse">{saveSuccess}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving || isUploading}
                            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50 text-sm font-bold"
                        >
                            {isSaving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={isSaving || isUploading}
                            className="px-6 py-2.5 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl transition-colors disabled:opacity-50 text-sm font-bold shadow-lg shadow-[#b31b1b]/20"
                        >
                            {isSaving ? 'Publishing...' : articleData.status === 'published' ? 'Update & Publish' : 'Publish'}
                        </button>
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
                <div className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">Article views</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="text-2xl font-black text-green-400">{articleStats.totalClicks24h.toLocaleString()}</div>
                        <div className="text-xs text-[#999]">Last 24h</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">{articleStats.totalClicks7d.toLocaleString()}</div>
                        <div className="text-xs text-[#999]">Last 7 days</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">{articleStats.totalClicks30d.toLocaleString()}</div>
                        <div className="text-xs text-[#999]">Last 30 days</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="text-2xl font-black text-[#999]">{articleStats.totalClicks.toLocaleString()}</div>
                        <div className="text-xs text-[#999]">Lifetime</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                        <div className="text-2xl font-black text-white">{articleStats.count}</div>
                        <div className="text-xs text-[#999]">Articles</div>
                    </div>
                </div>
            </div>

            {/* Blog: Creator of the Month (paid cover slot) */}
            <CreatorOfMonthManager />

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
                ) : sortedArticles.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">No articles found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-[#666]">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase w-12"> </th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase cursor-pointer hover:text-white transition-colors select-none" onClick={() => handleSort('title')}>
                                        Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase cursor-pointer hover:text-white transition-colors select-none" onClick={() => handleSort('advertiser')}>
                                        Advertiser {sortBy === 'advertiser' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-bold text-xs uppercase cursor-pointer hover:text-white transition-colors select-none" onClick={() => handleSort('views24h')}>
                                        24h {sortBy === 'views24h' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-bold text-xs uppercase cursor-pointer hover:text-white transition-colors select-none" onClick={() => handleSort('views7d')}>
                                        7d {sortBy === 'views7d' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-bold text-xs uppercase cursor-pointer hover:text-white transition-colors select-none" onClick={() => handleSort('views30d')}>
                                        30d {sortBy === 'views30d' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-right font-bold text-xs uppercase cursor-pointer hover:text-white transition-colors select-none" onClick={() => handleSort('clicks')}>
                                        Lifetime {sortBy === 'clicks' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase cursor-pointer hover:text-white transition-colors select-none" onClick={() => handleSort('status')}>
                                        Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase cursor-pointer hover:text-white transition-colors select-none" onClick={() => handleSort('published')}>
                                        Published {sortBy === 'published' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-xs uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {sortedArticles.map((article) => (
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
                                        <td className="px-4 py-3 text-right">
                                            <span className={`tabular-nums ${(article.views24h ?? 0) > 0 ? 'text-green-400 font-semibold' : 'text-[#666]'}`}>{(article.views24h ?? 0).toLocaleString()}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`tabular-nums ${(article.views7d ?? 0) > 0 ? 'text-white font-semibold' : 'text-[#666]'}`}>{(article.views7d ?? 0).toLocaleString()}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`tabular-nums ${(article.views30d ?? 0) > 0 ? 'text-white font-semibold' : 'text-[#666]'}`}>{(article.views30d ?? 0).toLocaleString()}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[#999] tabular-nums">{(article.views ?? 0).toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${article.status === 'published' ? 'bg-green-500/20 text-green-400' : 'text-[#666]'}`}>{article.status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-[#999] text-xs whitespace-nowrap">
                                            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
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
