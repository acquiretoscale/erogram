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
    growthPercent?: number;
}

export default function GroupCard({ group, isFeatured = false, isIndex = 0, shouldPreload = false, onVisible, onOpenReviewModal, onOpenReportModal, isBookmarked = false, bookmarkId = null, itemType = 'group', lockedPremium = false, directLink, growthPercent }: GroupCardProps) {
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

    // ── Accent system ──
    // Default groups = orange (matches screenshot). Blue reserved for OF-creator ads (AdvertCard only).
    const accent = lockedPremium
        ? { from: '#fb5607', to: '#ffbe0b', glow: 'rgba(251,86,7,0.45)', text: '#ffbe0b' }
        : isFeatured
            ? { from: '#ff5e2a', to: '#ff9432', glow: 'rgba(255,94,42,0.5)', text: '#ff8c42' }
            : itemType === 'bot'
                ? { from: '#2563eb', to: '#06b6d4', glow: 'rgba(37,99,235,0.45)', text: '#38bdf8' }
                : { from: '#ff5e2a', to: '#ff9432', glow: 'rgba(255,94,42,0.5)', text: '#ff8c42' };

    return (
        <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: isIndex * 0.1 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="h-full relative group/card"
        >
            {/* Accent aura glow behind the card */}
            <div
                className="pointer-events-none absolute -inset-[1.5px] rounded-[20px] sm:rounded-[26px] opacity-50 blur-[10px] transition-opacity duration-500 group-hover/card:opacity-90"
                style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
            />
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

            <div
                className="relative rounded-[18px] sm:rounded-3xl overflow-hidden h-full flex flex-col border border-white/10 transition-all duration-500 group"
                style={{ background: 'linear-gradient(180deg, #131a24 0%, #0d1117 100%)' }}
            >

                {/* Group Image — inset, rounded, dominant */}
                <div ref={imgRef} className="relative w-full aspect-square overflow-hidden rounded-[14px] sm:rounded-2xl m-2 sm:m-2.5 lg:m-2 mb-0 bg-[#11151f]">
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

                    {/* Badge pill — top-left (Verified / Premium / Bot / Featured / Pinned) */}
                    <div className="absolute top-3 left-3 z-20 flex">
                        {lockedPremium ? (
                            <div className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffbe0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                Premium
                            </div>
                        ) : group.verified ? (
                            <div className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5">
                                <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                                Verified
                            </div>
                        ) : itemType === 'bot' ? (
                            <div className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5">
                                <span>🤖</span> Bot
                            </div>
                        ) : isFeatured ? (
                            <div className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5">
                                <span>⭐</span> Featured
                            </div>
                        ) : group.pinned ? (
                            <div className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5">
                                <span>📌</span> Pinned
                            </div>
                        ) : null}
                    </div>

                    {/* Stats strip — on image, bottom (rating · views · members) */}
                    {!lockedPremium && (
                        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-t from-black/70 to-transparent overflow-hidden">
                            {/* Rating */}
                            <div className="flex items-center gap-0.5 shrink-0">
                                <span className="text-yellow-400 text-[9px]">⭐</span>
                                <span className="text-white font-bold text-[9px] leading-none">{(group.averageRating || 0).toFixed(1)}</span>
                            </div>
                            <span className="text-white/20 text-[8px] shrink-0">·</span>
                            {/* Views */}
                            <div className="flex items-center gap-0.5 shrink-0">
                                <span className="text-white font-bold text-[9px] leading-none">{(group.views || 0).toLocaleString()}</span>
                                <span className="text-white/40 text-[8px] leading-none">views</span>
                            </div>
                            {(group.memberCount || 0) > 0 && (
                                <>
                                    <span className="text-white/20 text-[8px] shrink-0">·</span>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <span className="text-white font-bold text-[9px] leading-none">{group.memberCount?.toLocaleString()}</span>
                                        <span className="text-white/40 text-[8px] leading-none">members</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Card Content */}
                <div className="p-3 sm:p-4 lg:p-3 flex-grow flex flex-col relative">
                    {/* Category label (uppercase, muted) */}
                    <div className="mb-1">
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                            {(group.categories?.length ? group.categories[0] : group.category) || 'Group'}
                        </span>
                    </div>

                    {/* Title — orange gradient */}
                    <h3 className={`font-black leading-tight flex items-center justify-between gap-2 min-w-0 mb-1.5 ${typeof growthPercent === 'number' ? 'text-[13px] sm:text-sm' : 'text-sm sm:text-base'}`}>
                        <span className="flex items-center gap-1.5 min-w-0">
                            <span
                                className="truncate min-w-0 bg-clip-text text-transparent"
                                style={{ backgroundImage: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
                            >{group.name}</span>
                            {group.verified && (
                                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67.63 13.43-.25 12-.25S9.33.63 8.66 1.94c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 7.33 1.75 8.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>
                            )}
                        </span>
                        {typeof growthPercent === 'number' && (
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-black text-[#34d399] shrink-0">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 17L17 7" />
                                    <path d="M10 7h7v7" />
                                </svg>
                                +{growthPercent.toFixed(1)}%
                            </span>
                        )}
                    </h3>

                    {/* Description */}
                    <div className="mb-2 flex-grow">
                        <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                            {group.description}
                        </p>
                    </div>


                    {/* Footer Actions — Join button + Review */}
                    <div className="mt-auto flex items-stretch gap-2">
                        {/* Main CTA */}
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
                            className="group/btn relative flex-1 flex items-center justify-center overflow-hidden rounded-xl py-2 sm:py-2.5 px-3 font-black transition-all duration-300 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                            style={lockedPremium
                                ? { background: 'linear-gradient(135deg, #fb5607, #ffbe0b)', color: '#1a0800', border: 'none' }
                                : { background: 'linear-gradient(135deg, #ff5e2a, #ff9432)', color: '#fff', border: 'none', boxShadow: '0 4px 14px -6px rgba(255,94,42,0.65)' }
                            }
                        >
                            <span className="text-xs sm:text-sm font-bold">
                                {lockedPremium ? '🔒 Unlock Premium' : group.isAdvertisement ? 'Visit' : itemType === 'bot' ? 'Open Bot' : 'Join channel'}
                            </span>
                        </a>

                        {/* Review — text button */}
                        {!lockedPremium && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOpenReviewModal?.(group);
                                }}
                                title="Leave a review"
                                className="shrink-0 flex items-center justify-center gap-1 px-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors text-[11px] font-semibold"
                            >
                                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                Review
                            </button>
                        )}
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
