'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { compressImage } from '@/lib/utils/compressImage';

/* ─── SVG icon helpers (inline to avoid extra deps) ─── */
const I = ({ d, className = '' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${className}`}><path d={d} /></svg>
);
const ICONS = {
  bold:       <I d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6zM6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />,
  italic:     <I d="M19 4h-9M14 20H5M15 4 9 20" />,
  strike:     <I d="M16 4H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8M4 12h16" />,
  h1:         <span className="text-xs font-black leading-none">H1</span>,
  h2:         <span className="text-xs font-black leading-none">H2</span>,
  h3:         <span className="text-xs font-black leading-none">H3</span>,
  link:       <I d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
  image:      <I d="M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10m18 0-3.5-4.5L15 14l-4-5-4 5m16-4v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6" />,
  quote:      <I d="M3 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2z" />,
  ul:         <I d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  ol:         <I d="M10 6h11M10 12h11M10 18h11M4 6V2l-1 1M3 10h2l-2 2.5L5 15M3 18v-1h2v-1H3" />,
  code:       <I d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  hr:         <I d="M3 12h18" />,
  cta:        <span className="text-[10px] font-black leading-none tracking-tight">CTA</span>,
};

export default function ArticlesTab() {
    const [articles, setArticles] = useState<any[]>([]);
    const [advertisers, setAdvertisers] = useState<{ _id: string; name: string }[]>([]);
    const [articleStats, setArticleStats] = useState<{ totalClicks: number; totalClicks24h: number; totalClicks7d: number; totalClicks30d: number; count: number }>({ totalClicks: 0, totalClicks24h: 0, totalClicks7d: 0, totalClicks30d: 0, count: 0 });
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
        fetchArticles();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        axios.get('/api/admin/advertisers-dashboard', { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setAdvertisers(res.data?.advertisers ?? []))
            .catch(() => {});
        axios.get('/api/admin/articles/stats', { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setArticleStats({ totalClicks: res.data?.totalClicks ?? 0, totalClicks24h: res.data?.totalClicks24h ?? 0, totalClicks7d: res.data?.totalClicks7d ?? 0, totalClicks30d: res.data?.totalClicks30d ?? 0, count: res.data?.count ?? 0 }))
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
        setArticleStats({ totalClicks: statsRes.data?.totalClicks ?? 0, totalClicks24h: statsRes.data?.totalClicks24h ?? 0, totalClicks7d: statsRes.data?.totalClicks7d ?? 0, totalClicks30d: statsRes.data?.totalClicks30d ?? 0, count: statsRes.data?.count ?? 0 });
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

    const [saveSuccess, setSaveSuccess] = useState('');

    const doSave = async (statusOverride?: 'draft' | 'published') => {
        const payload = { ...articleData };
        if (statusOverride) payload.status = statusOverride;

        if (!payload.title.trim()) { alert('Title is required'); return; }
        if (!payload.content.trim()) { alert('Content is required'); return; }

        setIsSaving(true);
        setSaveSuccess('');
        try {
            const token = localStorage.getItem('token');

            if (editingArticle) {
                await axios.put(`/api/admin/articles/${editingArticle._id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/admin/articles', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setArticleData(prev => ({ ...prev, status: payload.status }));
            const msg = payload.status === 'published' ? 'Published!' : 'Draft saved!';
            setSaveSuccess(msg);
            fetchArticles();
            setTimeout(() => setSaveSuccess(''), 3000);
        } catch (err: any) {
            console.error('Save error:', err);
            alert(err.response?.data?.message || 'Failed to save article');
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

    /* ─── Rich-toolbar helpers ─── */
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const inlineImgRef = useRef<HTMLInputElement>(null);
    const [isInlineUploading, setIsInlineUploading] = useState(false);
    const [linkDialog, setLinkDialog] = useState<{ open: boolean; mode: 'link' | 'cta'; selectedText: string }>({ open: false, mode: 'link', selectedText: '' });
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const [ctaDesc, setCtaDesc] = useState('');
    const savedSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

    const insertAtCursor = useCallback((before: string, after = '') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selected = text.substring(start, end);
        const replacement = before + (after ? selected : '') + after;
        const newContent = text.substring(0, after ? start : start) + replacement + text.substring(after ? end : end);
        setArticleData(prev => ({ ...prev, content: after ? text.substring(0, start) + replacement + text.substring(end) : text.substring(0, start) + before + text.substring(end) }));
        const cursorPos = after
            ? (selected ? start + before.length + selected.length + after.length : start + before.length)
            : start + before.length;
        setTimeout(() => {
            ta.focus();
            if (after && selected) {
                ta.selectionStart = start;
                ta.selectionEnd = cursorPos;
            } else {
                ta.selectionStart = ta.selectionEnd = after ? start + before.length : cursorPos;
            }
        }, 0);
    }, []);

    const wrapSelection = useCallback((prefix: string, suffix: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const selected = text.substring(start, end);
        const newContent = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
        setArticleData(prev => ({ ...prev, content: newContent }));
        setTimeout(() => {
            ta.focus();
            if (selected) {
                ta.selectionStart = start;
                ta.selectionEnd = start + prefix.length + selected.length + suffix.length;
            } else {
                ta.selectionStart = ta.selectionEnd = start + prefix.length;
            }
        }, 0);
    }, []);

    const prefixLines = useCallback((prefix: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = text.indexOf('\n', end);
        const actualEnd = lineEnd === -1 ? text.length : lineEnd;
        const block = text.substring(lineStart, actualEnd);
        const prefixed = block.split('\n').map(l => prefix + l).join('\n');
        const newContent = text.substring(0, lineStart) + prefixed + text.substring(actualEnd);
        setArticleData(prev => ({ ...prev, content: newContent }));
        setTimeout(() => { ta.focus(); }, 0);
    }, []);

    const openLinkDialog = useCallback((mode: 'link' | 'cta') => {
        const ta = textareaRef.current;
        if (!ta) return;
        const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        savedSelectionRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
        setLinkText(selected || '');
        setLinkUrl('');
        setCtaDesc('');
        setLinkDialog({ open: true, mode, selectedText: selected });
    }, []);

    const confirmLinkDialog = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta || !linkUrl.trim()) { setLinkDialog(p => ({ ...p, open: false })); return; }
        const { start, end } = savedSelectionRef.current;
        const text = ta.value;

        if (linkDialog.mode === 'link') {
            const display = linkText.trim() || linkUrl;
            const md = `[${display}](${linkUrl.trim()})`;
            const newContent = text.substring(0, start) + md + text.substring(end);
            setArticleData(prev => ({ ...prev, content: newContent }));
            setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + md.length; }, 0);
        } else {
            const btnText = linkText.trim() || 'Learn More';
            const block = `\n\`\`\`cta\nurl: ${linkUrl.trim()}\ntext: ${btnText}\ndescription: ${ctaDesc.trim()}\n\`\`\`\n`;
            const newContent = text.substring(0, start) + block + text.substring(end);
            setArticleData(prev => ({ ...prev, content: newContent }));
            setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + block.length; }, 0);
        }
        setLinkDialog(p => ({ ...p, open: false }));
    }, [linkUrl, linkText, ctaDesc, linkDialog.mode]);

    const handleInlineImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { alert('Max 10 MB'); return; }
        if (!file.type.startsWith('image/')) { alert('Select an image file'); return; }
        setIsInlineUploading(true);
        try {
            const compressed = await compressImage(file);
            const fd = new FormData();
            fd.append('file', compressed);
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
            });
            const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
            const ta = textareaRef.current;
            if (ta) {
                const pos = ta.selectionStart;
                const text = ta.value;
                const img = `\n![${alt}](${res.data.url})\n`;
                setArticleData(prev => ({ ...prev, content: text.substring(0, pos) + img + text.substring(pos) }));
                setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = pos + img.length; }, 0);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Upload failed');
        } finally {
            setIsInlineUploading(false);
            if (inlineImgRef.current) inlineImgRef.current.value = '';
        }
    }, []);

    const handleEditorDrop = useCallback(async (e: React.DragEvent) => {
        const file = e.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        e.preventDefault();
        e.stopPropagation();
        setIsInlineUploading(true);
        try {
            const compressed = await compressImage(file);
            const fd = new FormData();
            fd.append('file', compressed);
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
            });
            const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
            const ta = textareaRef.current;
            if (ta) {
                const pos = ta.selectionStart;
                const text = ta.value;
                const img = `\n![${alt}](${res.data.url})\n`;
                setArticleData(prev => ({ ...prev, content: text.substring(0, pos) + img + text.substring(pos) }));
                setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = pos + img.length; }, 0);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Upload failed');
        } finally {
            setIsInlineUploading(false);
        }
    }, []);

    const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key === 'b') { e.preventDefault(); wrapSelection('**', '**'); }
        else if (mod && e.key === 'i') { e.preventDefault(); wrapSelection('*', '*'); }
        else if (mod && e.key === 'k') { e.preventDefault(); openLinkDialog('link'); }
        else if (e.key === 'Tab') {
            e.preventDefault();
            const ta = textareaRef.current;
            if (!ta) return;
            const start = ta.selectionStart;
            const text = ta.value;
            setArticleData(prev => ({ ...prev, content: text.substring(0, start) + '  ' + text.substring(start) }));
            setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
        }
    }, [wrapSelection, openLinkDialog]);

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

    /* ─── Markdown preview components (renders CTA blocks as styled cards) ─── */
    const previewComponents = {
        pre: ({ children }: any) => {
            const child = Array.isArray(children) ? children[0] : children;
            const cls = child?.props?.className || '';
            const lang = typeof cls === 'string' ? cls.replace(/^language-/, '') : '';
            const codeContent = String(child?.props?.children ?? '');
            if (lang === 'cta') {
                const lines = codeContent.trim().split('\n');
                let url = '', text = '', description = '', headline = '';
                for (const line of lines) {
                    const idx = line.indexOf(':');
                    if (idx === -1) continue;
                    const key = line.slice(0, idx).trim().toLowerCase();
                    const val = line.slice(idx + 1).trim();
                    if (key === 'url') url = val;
                    else if (key === 'text') text = val;
                    else if (key === 'description') description = val;
                    else if (key === 'headline' || key === 'title') headline = val;
                }
                if (!url || !text) return null;
                const heading = headline || 'Ready to continue?';
                return (
                    <div className="not-prose my-5">
                        <div className="mx-auto max-w-2xl relative overflow-hidden rounded-2xl border border-[#b31b1b]/20 bg-gradient-to-br from-[#140909] via-[#0f0f0f] to-[#090909]">
                            <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-[#b31b1b]/15 blur-[90px] pointer-events-none" />
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4d4d]/35 to-transparent" />
                            <div className="relative z-10 px-5 py-6 text-center">
                                <h4 className="text-white text-lg font-black">{heading}</h4>
                                {description && <p className="mt-2 text-gray-300 text-xs leading-relaxed max-w-xl mx-auto">{description}</p>}
                                <div className="mt-5 flex justify-center">
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ textDecoration: 'none', pointerEvents: 'auto', cursor: 'pointer' }}
                                        className="group inline-flex w-full sm:w-auto sm:min-w-[300px] items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-black text-sm uppercase tracking-[0.1em] text-white bg-gradient-to-b from-[#ff4d4d] to-[#b31b1b] border border-[#ff6b6b]/50 ring-1 ring-white/10 hover:from-[#ff5d5d] hover:to-[#c61f1f] shadow-[0_14px_30px_rgba(179,27,27,0.52),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.02] whitespace-nowrap"
                                    >
                                        {text}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                                    </a>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b31b1b]/25 to-transparent" />
                        </div>
                    </div>
                );
            }
            return <pre className="bg-[#111] p-4 rounded-lg overflow-x-auto my-4 border border-white/10 text-sm">{children}</pre>;
        },
    };

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

                    {/* ─── Rich Markdown Editor ─── */}
                    <div className="glass rounded-2xl border border-white/5 overflow-hidden">

                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-[#111] border-b border-white/10">
                            {/* Headings */}
                            <button type="button" title="Heading 1" onClick={() => prefixLines('# ')} className="toolbar-btn">{ICONS.h1}</button>
                            <button type="button" title="Heading 2" onClick={() => prefixLines('## ')} className="toolbar-btn">{ICONS.h2}</button>
                            <button type="button" title="Heading 3" onClick={() => prefixLines('### ')} className="toolbar-btn">{ICONS.h3}</button>
                            <span className="w-px h-5 bg-white/10 mx-1.5" />

                            {/* Inline formatting */}
                            <button type="button" title="Bold (Ctrl+B)" onClick={() => wrapSelection('**', '**')} className="toolbar-btn">{ICONS.bold}</button>
                            <button type="button" title="Italic (Ctrl+I)" onClick={() => wrapSelection('*', '*')} className="toolbar-btn">{ICONS.italic}</button>
                            <button type="button" title="Strikethrough" onClick={() => wrapSelection('~~', '~~')} className="toolbar-btn">{ICONS.strike}</button>
                            <span className="w-px h-5 bg-white/10 mx-1.5" />

                            {/* Link & Image */}
                            <button type="button" title="Insert Link (Ctrl+K)" onClick={() => openLinkDialog('link')} className="toolbar-btn">{ICONS.link}</button>
                            <button type="button" title="Upload Image" onClick={() => inlineImgRef.current?.click()} className="toolbar-btn relative">
                                {ICONS.image}
                                {isInlineUploading && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
                            </button>
                            <input ref={inlineImgRef} type="file" accept="image/*" className="hidden" onChange={handleInlineImage} />
                            <span className="w-px h-5 bg-white/10 mx-1.5" />

                            {/* Block formatting */}
                            <button type="button" title="Blockquote" onClick={() => prefixLines('> ')} className="toolbar-btn">{ICONS.quote}</button>
                            <button type="button" title="Bullet List" onClick={() => prefixLines('- ')} className="toolbar-btn">{ICONS.ul}</button>
                            <button type="button" title="Numbered List" onClick={() => prefixLines('1. ')} className="toolbar-btn">{ICONS.ol}</button>
                            <button type="button" title="Inline Code" onClick={() => wrapSelection('`', '`')} className="toolbar-btn">{ICONS.code}</button>
                            <button type="button" title="Horizontal Rule" onClick={() => insertAtCursor('\n---\n')} className="toolbar-btn">{ICONS.hr}</button>
                            <span className="w-px h-5 bg-white/10 mx-1.5" />

                            {/* CTA Block */}
                            <button type="button" title="Insert CTA Block (tracked button)" onClick={() => openLinkDialog('cta')} className="toolbar-btn !px-2.5 bg-[#b31b1b]/10 border border-[#b31b1b]/20 text-[#ff6b6b] hover:bg-[#b31b1b]/20">
                                {ICONS.cta}
                            </button>

                            {/* Right-aligned: view mode toggle */}
                            <div className="ml-auto flex items-center gap-1 pl-3">
                                {(['edit', 'split', 'preview'] as const).map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setEditorMode(m)}
                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${editorMode === m ? 'bg-[#b31b1b] text-white' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                                    >
                                        {m === 'edit' ? 'Write' : m === 'split' ? 'Split' : 'Preview'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Link / CTA Dialog */}
                        {linkDialog.open && (
                            <div className="px-4 py-3 bg-[#0d0d0d] border-b border-white/10 flex flex-wrap items-end gap-3">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">URL *</label>
                                    <input
                                        autoFocus
                                        type="url"
                                        value={linkUrl}
                                        onChange={e => setLinkUrl(e.target.value)}
                                        placeholder="https://"
                                        className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-[#b31b1b]"
                                        onKeyDown={e => e.key === 'Enter' && confirmLinkDialog()}
                                    />
                                </div>
                                <div className="flex-1 min-w-[160px]">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{linkDialog.mode === 'cta' ? 'Button text' : 'Link text'}</label>
                                    <input
                                        type="text"
                                        value={linkText}
                                        onChange={e => setLinkText(e.target.value)}
                                        placeholder={linkDialog.mode === 'cta' ? 'Learn More' : 'Click here'}
                                        className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-[#b31b1b]"
                                        onKeyDown={e => e.key === 'Enter' && confirmLinkDialog()}
                                    />
                                </div>
                                {linkDialog.mode === 'cta' && (
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={ctaDesc}
                                            onChange={e => setCtaDesc(e.target.value)}
                                            placeholder="Optional description text"
                                            className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-1 focus:ring-[#b31b1b]"
                                            onKeyDown={e => e.key === 'Enter' && confirmLinkDialog()}
                                        />
                                    </div>
                                )}
                                <button type="button" onClick={confirmLinkDialog} className="px-4 py-1.5 bg-[#b31b1b] hover:bg-[#c42b2b] text-white text-sm font-bold rounded-lg transition-colors">
                                    Insert
                                </button>
                                <button type="button" onClick={() => setLinkDialog(p => ({ ...p, open: false }))} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-sm rounded-lg transition-colors">
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Upload overlay */}
                        {isInlineUploading && (
                            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-amber-400 text-xs font-medium">Uploading image...</span>
                            </div>
                        )}

                        {/* Editor body */}
                        {editorMode === 'edit' || editorMode === 'split' ? (
                            <div className={editorMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-0' : ''}>
                                <div
                                    className="relative"
                                    onDrop={handleEditorDrop}
                                    onDragOver={e => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); }}
                                >
                                    <textarea
                                        ref={textareaRef}
                                        value={articleData.content}
                                        onChange={(e) => setArticleData({ ...articleData, content: e.target.value })}
                                        onKeyDown={handleEditorKeyDown}
                                        className="w-full h-[600px] p-5 bg-transparent text-white placeholder:text-gray-600 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                                        placeholder="Start writing your article..."
                                    />
                                </div>
                                {editorMode === 'split' && (
                                    <div className="p-6 border-t lg:border-t-0 lg:border-l border-white/10 overflow-auto max-h-[640px] prose prose-invert max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={previewComponents}>{articleData.content}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-6 overflow-auto max-h-[640px] prose prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={previewComponents}>{articleData.content}</ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Toolbar CSS */}
                    <style>{`
                        .toolbar-btn {
                            display: inline-flex; align-items: center; justify-content: center;
                            width: 32px; height: 32px; border-radius: 6px;
                            color: #999; transition: all 0.15s;
                        }
                        .toolbar-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
                        .toolbar-btn:active { background: rgba(255,255,255,0.12); transform: scale(0.95); }
                    `}</style>
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
