import React, { useState, useRef, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import BookmarkButton from '@/components/BookmarkButton';
import { compressImage } from '@/lib/utils/compressImage';
import { Group } from './types';

interface GroupCardProps {
    group: Group;
    isFeatured?: boolean;
    isIndex: number;
    shouldPreload?: boolean;
    onVisible?: () => void;
    onOpenReviewModal?: (group: Group) => void;
    onOpenReportModal?: (group: Group) => void;
    isBookmarked?: boolean;
    bookmarkId?: string | null;
    itemType?: 'group' | 'bot';
    lockedPremium?: boolean;
    directLink?: string;
}

export default function GroupCard({ group, isFeatured = false, isIndex = 0, shouldPreload = false, onVisible, onOpenReviewModal, onOpenReportModal, isBookmarked = false, bookmarkId = null, itemType = 'group', lockedPremium = false, directLink }: GroupCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [deleted, setDeleted] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editData, setEditData] = useState({ name: '', description: '', image: '', telegramLink: '' });
    const [editUploading, setEditUploading] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const placeholder = '/assets/image.jpg';

    useEffect(() => {
        setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    }, []);
    const isAbsoluteUrl = (s: string) => typeof s === 'string' && (s.startsWith('https://') || s.startsWith('http://'));
    const initialImage = (group.image && isAbsoluteUrl(group.image)) ? group.image : (group.image && typeof group.image === 'string' && group.image.startsWith('/') ? group.image : placeholder);
    const [imageSrc, setImageSrc] = useState(initialImage);
    const [isInView, setIsInView] = useState(false);
    const hasFetchedRef = useRef(false);
    const imgRef = useRef<HTMLDivElement>(null);


    // Intersection Observer for lazy loading
    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        onVisible?.(); // Report visibility to parent
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '200px', // Start loading 200px before entering viewport - load more images in parallel
                threshold: 0.01,
            }
        );

        observer.observe(imgRef.current);

        return () => {
            observer.disconnect();
        };
    }, [onVisible]);

    const needsFetch = imageSrc === placeholder;

    useEffect(() => {
        if (shouldPreload && needsFetch && group._id && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetch(`/api/groups/${group._id}/image`)
                .then(res => res.json())
                .then(data => {
                    const url = data?.image;
                    if (url && typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/'))) {
                        setImageSrc(url);
                    }
                })
                .catch(() => {});
        }
    }, [shouldPreload, needsFetch, group._id]);

    useEffect(() => {
        if (isInView && needsFetch && group._id && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            const endpoint = itemType === 'bot'
                ? `/api/bots/${group._id}/image`
                : `/api/groups/${group._id}/image`;
            fetch(endpoint)
                .then(res => res.json())
                .then(data => {
                    const url = data?.image;
                    if (url && typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/'))) {
                        setImageSrc(url);
                    }
                })
                .catch(() => {});
        }
    }, [isInView, needsFetch, group._id, itemType]);

    const handleAdminDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Permanently delete "${group.name}"?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/groups/${group._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed');
            setDeleted(true);
        } catch {
            alert('Failed to delete group');
        }
    };

    const openEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditData({ name: group.name, description: group.description, image: imageSrc, telegramLink: (group as any).telegramLink || '' });
        setShowEdit(true);
    };

    const handleEditImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { alert('Max 10MB'); return; }
        setEditUploading(true);
        try {
            const compressed = await compressImage(file);
            const fd = new FormData();
            fd.append('file', compressed);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
            const data = await res.json();
            if (data.url) setEditData(prev => ({ ...prev, image: data.url }));
        } catch { alert('Upload failed'); }
        finally { setEditUploading(false); }
    };

    const handleEditSave = async () => {
        setEditSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/groups/${group._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: editData.name, description: editData.description, image: editData.image, telegramLink: editData.telegramLink }),
            });
            if (!res.ok) throw new Error('Failed');
            setImageSrc(editData.image);
            group.name = editData.name;
            group.description = editData.description;
            setShowEdit(false);
        } catch { alert('Failed to save'); }
        finally { setEditSaving(false); }
    };

    if (deleted) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: isIndex * 0.1 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="h-full relative"
        >
            {/* Bookmark + admin actions — anchored to motion.div, bookmark always on top */}
            <div className="absolute top-2 right-2 z-30 flex flex-col gap-1.5 items-end">
                <BookmarkButton
                    itemId={group._id}
                    itemType={itemType}
                    initialBookmarked={isBookmarked}
                    initialBookmarkId={bookmarkId}
                    size="md"
                    className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-black/70 backdrop-blur-md border border-white/15 hover:bg-black/90 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                />
                {isAdmin && (
                    <>
                        <button
                            onClick={openEdit}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600/80 hover:bg-blue-600 text-white text-xs backdrop-blur-sm transition-all"
                            title="Edit group"
                        >
                            ✏️
                        </button>
                        <button
                            onClick={handleAdminDelete}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs backdrop-blur-sm transition-all"
                            title="Delete group"
                        >
                            🗑️
                        </button>
                    </>
                )}
            </div>

            <div className={`glass rounded-2xl sm:rounded-3xl overflow-hidden h-full flex flex-col backdrop-blur-xl border transition-all duration-500 group ${lockedPremium
                ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(201,151,58,0.25)] hover:border-yellow-500/80 hover:shadow-[0_0_35px_rgba(201,151,58,0.4)]'
                : isFeatured
                    ? 'border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)] hover:border-yellow-500/60 hover:shadow-[0_0_50px_rgba(234,179,8,0.2)]'
                    : 'border-white/5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50'
                }`}>

                {/* Group Image */}
                <div ref={imgRef} className="relative w-full h-32 sm:h-52 overflow-hidden bg-[#1a1a1a]">
                    {isAbsoluteUrl(imageSrc) ? (
                        <img
                            key={imageSrc}
                            src={imageSrc}
                            alt={group.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                            loading={isIndex < 12 ? 'eager' : 'lazy'}
                            onError={() => setImageSrc(placeholder)}
                        />
                    ) : (
                        <img
                            src={imageSrc.startsWith('/') ? imageSrc : placeholder}
                            alt={group.name}
                            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                            loading={isIndex < 12 ? 'eager' : 'lazy'}
                            onError={() => setImageSrc(placeholder)}
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />

                    {lockedPremium && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2 flex-wrap z-20">
                        {lockedPremium && (
                            <div className="text-[10px] font-black px-2 py-1 rounded-md shadow-lg uppercase tracking-wider flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #fb5607, #ffbe0b)', color: '#1a0800' }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                Premium
                            </div>
                        )}
                        {itemType === 'bot' && (
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg uppercase tracking-wider flex items-center gap-1">
                                <span>🤖</span> Bot
                            </div>
                        )}
                        {isFeatured && itemType !== 'bot' && (
                            <div className="bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded-md shadow-lg uppercase tracking-wider flex items-center gap-1">
                                <span>⭐</span> Featured
                            </div>
                        )}
                        {group.pinned && !isFeatured && itemType !== 'bot' && (
                            <div className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg uppercase tracking-wider flex items-center gap-1">
                                <span>📌</span> Pinned
                            </div>
                        )}
                    </div>

                    {/* Stats Overlay — hidden on premium locked cards */}
                    {!lockedPremium && (
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                            <div className="flex gap-2 flex-wrap">
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                    <span className="text-xs">👁️</span>
                                    <span className="text-xs font-bold text-white">{(group.views || 0).toLocaleString()}</span>
                                </div>
                                {(group.memberCount || 0) > 0 && (
                                    <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                        <span className="text-xs">👥</span>
                                        <span className="text-xs font-bold text-white">{group.memberCount?.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Card Content */}
                <div className="p-3 sm:p-5 flex-grow flex flex-col relative">
                    {/* Title */}
                    <h3 className="text-sm sm:text-xl font-black text-white mb-2 sm:mb-3 leading-tight group-hover:text-blue-400 transition-colors flex items-center gap-1">
                        <span className="truncate min-w-0">{group.name}</span>
                        {group.verified && (
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                        )}
                    </h3>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4">
                        {(group.categories?.length ? group.categories : [group.category].filter(Boolean)).map((tag) => (
                            <span key={tag} className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-white/5 border border-white/5 text-gray-300 text-[10px] sm:text-xs font-medium">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Description */}
                    <div className="mb-3 sm:mb-6 flex-grow">
                        <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed">
                            {group.description}
                        </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-auto space-y-2 sm:space-y-3">
                        {/* Rating Row */}
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1">
                                <span className="text-yellow-500 text-[10px] sm:text-sm">⭐</span>
                                <span className="text-white font-bold text-[10px] sm:text-sm">{(group.averageRating || 0).toFixed(1)}</span>
                                <span className="text-gray-500 text-[10px] sm:text-xs">({group.reviewCount || 0})</span>
                            </div>
                            <div className="hidden sm:flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onOpenReviewModal?.(group);
                                    }}
                                    className="text-xs text-gray-400 hover:text-white transition-colors font-medium"
                                >
                                    Review
                                </button>
                                <span className="text-gray-600">|</span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onOpenReportModal?.(group);
                                    }}
                                    className="text-xs text-gray-400 hover:text-red-400 transition-colors font-medium"
                                >
                                    Report
                                </button>
                            </div>
                        </div>

                        {/* Main Button */}
                        <a
                            href={directLink
                                ? directLink
                                : lockedPremium
                                    ? '/premium'
                                    : group.isAdvertisement && group.advertisementUrl
                                        ? `/redirect.html?url=${encodeURIComponent(group.advertisementUrl)}&group=${group._id}`
                                        : itemType === 'bot'
                                            ? `/bots/${group.slug}`
                                            : `/${group.slug}`}
                            target="_blank"
                            rel={group.isAdvertisement ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                            className={`group/btn relative flex items-center justify-center w-full overflow-hidden rounded-xl py-2.5 sm:py-3.5 px-3 sm:px-4 font-black text-white shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${lockedPremium
                                ? 'hover:shadow-orange-500/40'
                                : isFeatured
                                    ? 'bg-gradient-to-r from-yellow-500 to-red-600 hover:shadow-orange-500/40'
                                    : itemType === 'bot'
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-cyan-500/40'
                                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-blue-500/40'
                                }`}
                            style={lockedPremium ? { background: 'linear-gradient(135deg, #fb5607, #ffbe0b)', color: '#1a0800' } : undefined}
                        >
                            <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />

                            <span className={`relative flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm uppercase tracking-wider`}>
                                {lockedPremium ? (
                                    <>
                                        <span className="text-base sm:text-lg">🔒</span> UNLOCK PREMIUM GROUPS
                                    </>
                                ) : group.isAdvertisement ? (
                                    <>
                                        <span>🔗</span> Visit
                                    </>
                                ) : itemType === 'bot' ? (
                                    <>
                                        <span className="text-base sm:text-lg">🤖</span> Open Bot
                                    </>
                                ) : (
                                    <>
                                        <span className="text-base sm:text-lg">🚀</span> Join
                                    </>
                                )}
                            </span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Admin Quick Edit Modal */}
            <AnimatePresence>
                {showEdit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setShowEdit(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                        >
                            <div className="p-5 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-white font-bold">Edit Group</h3>
                                <button onClick={() => setShowEdit(false)} className="text-[#666] hover:text-white text-xl">&times;</button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#999] uppercase mb-1.5">Image</label>
                                    <div className="flex items-center gap-3">
                                        {editData.image && <img src={editData.image} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />}
                                        <label className="cursor-pointer px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white hover:bg-white/10 transition-colors">
                                            {editUploading ? 'Uploading...' : 'Change image'}
                                            <input type="file" accept="image/*" onChange={handleEditImage} className="hidden" disabled={editUploading} />
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#999] uppercase mb-1.5">Name</label>
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#999] uppercase mb-1.5">Description</label>
                                    <textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                        rows={3}
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#999] uppercase mb-1.5">Telegram Link</label>
                                    <input
                                        type="text"
                                        value={editData.telegramLink}
                                        onChange={(e) => setEditData(prev => ({ ...prev, telegramLink: e.target.value }))}
                                        placeholder="https://t.me/..."
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                    />
                                </div>
                            </div>
                            <div className="p-5 border-t border-white/10 flex justify-end gap-3">
                                <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-[#999] hover:text-white transition-colors">Cancel</button>
                                <button
                                    onClick={handleEditSave}
                                    disabled={editSaving}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
                                >
                                    {editSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
