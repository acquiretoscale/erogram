'use client';

import { useRef, useState } from 'react';
import { Camera, Pencil, Save, Star, Trash2, X } from 'lucide-react';
import type { AINsfwTool } from './types';
import type { ToolStatsData } from '@/lib/actions/ainsfw';
import {
  adminDeleteToolCoverImage,
  adminDeleteToolGalleryImage,
  adminSaveToolContent,
  adminSetToolFeaturedImage,
  adminUploadToolCoverImage,
  adminUploadToolGalleryImage,
} from '@/lib/actions/ainsfwAdmin';

const PLACEHOLDER = '/assets/image.jpg';

function sameImage(a: string, b: string) {
  if (!a || !b) return false;
  return a.trim() === b.trim() || a.replace(/\/$/, '') === b.replace(/\/$/, '');
}

interface ToolDetailAdminPanelProps {
  tool: AINsfwTool;
  initialStats?: ToolStatsData;
  gallery: string[];
  featuredImage: string;
  onGalleryChange: (gallery: string[]) => void;
  onFeaturedChange: (url: string) => void;
  onDescriptionChange: (description: string) => void;
  onTryNowUrlChange: (url: string) => void;
  onVotesChange: (up: number, down: number) => void;
  onClose: () => void;
}

export default function ToolDetailAdminPanel({
  tool,
  initialStats,
  gallery,
  featuredImage,
  onGalleryChange,
  onFeaturedChange,
  onDescriptionChange,
  onTryNowUrlChange,
  onVotesChange,
  onClose,
}: ToolDetailAdminPanelProps) {
  const galleryUploadRef = useRef<HTMLInputElement>(null);
  const coverUploadRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState(tool.description);
  const [tryNowUrl, setTryNowUrl] = useState(tool.tryNowUrl);
  const [cover, setCover] = useState(featuredImage);
  const [upvotes, setUpvotes] = useState(initialStats?.upvotes ?? 0);
  const [downvotes, setDownvotes] = useState(initialStats?.downvotes ?? 0);
  const [saving, setSaving] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
  const coverPreview = cover && !sameImage(cover, PLACEHOLDER) ? cover : '';

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await adminSaveToolContent(token(), tool.slug, {
        description,
        tryNowUrl,
        upvotes,
        downvotes,
        imageOverride: cover,
      });
      onDescriptionChange(description);
      onTryNowUrlChange(tryNowUrl.trim());
      onVotesChange(result.upvotes, result.downvotes);
      onFeaturedChange(result.imageOverride || cover || PLACEHOLDER);
      onClose();
    } catch (e: any) {
      alert(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadGallery = async (file: File) => {
    setUploadingGallery(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await adminUploadToolGalleryImage(token(), tool.slug, fd);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      onGalleryChange(result.gallery);
    } catch (e: any) {
      alert(e.message || 'Upload failed');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleUploadCover = async (file: File) => {
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await adminUploadToolCoverImage(token(), tool.slug, fd);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      setCover(result.imageOverride);
      onFeaturedChange(result.imageOverride);
    } catch (e: any) {
      alert(e.message || 'Cover upload failed');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteCover = async () => {
    if (!confirm('Remove the main cover image?')) return;
    setUploadingCover(true);
    try {
      const result = await adminDeleteToolCoverImage(token(), tool.slug);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      setCover('');
      onFeaturedChange(PLACEHOLDER);
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteImage = async (url: string) => {
    if (!confirm('Delete this image from the gallery?')) return;
    setBusyUrl(url);
    try {
      const result = await adminDeleteToolGalleryImage(token(), tool.slug, url);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      onGalleryChange(result.gallery);
      if (sameImage(cover, url)) {
        const nextCover = result.gallery[0] || '';
        setCover(nextCover);
        onFeaturedChange(nextCover || PLACEHOLDER);
      }
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    } finally {
      setBusyUrl(null);
    }
  };

  const handleSetFeatured = async (url: string) => {
    setBusyUrl(url);
    try {
      const result = await adminSetToolFeaturedImage(token(), tool.slug, url);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      setCover(result.imageOverride);
      onFeaturedChange(result.imageOverride);
    } catch (e: any) {
      alert(e.message || 'Failed to set main picture');
    } finally {
      setBusyUrl(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-10">
      <div className="w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-[#0a140f] p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-white">Edit {tool.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Main cover picture</label>
          <input
            ref={coverUploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadCover(file);
              e.target.value = '';
            }}
          />
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/30">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 text-center px-1">No cover</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white mb-1">Card + hero image</div>
              <div className="text-[10px] text-[#666] truncate">{coverPreview || 'Placeholder will show'}</div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => coverUploadRef.current?.click()}
                disabled={uploadingCover}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#22c55e] text-black text-xs font-bold hover:bg-[#16a34a] disabled:opacity-50"
              >
                {uploadingCover ? 'Working…' : <><Camera className="w-3.5 h-3.5" /> {coverPreview ? 'Replace' : 'Upload'}</>}
              </button>
              {coverPreview && (
                <button
                  type="button"
                  onClick={handleDeleteCover}
                  disabled={uploadingCover}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 text-xs font-bold hover:bg-red-600/30 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Gallery</label>
            <button
              type="button"
              onClick={() => galleryUploadRef.current?.click()}
              disabled={uploadingGallery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/15 disabled:opacity-50"
            >
              {uploadingGallery ? 'Uploading…' : <><Camera className="w-3.5 h-3.5" /> Add to gallery</>}
            </button>
            <input
              ref={galleryUploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadGallery(file);
                e.target.value = '';
              }}
            />
          </div>
          {gallery.length === 0 ? (
            <p className="text-xs text-gray-500 p-3 rounded-xl bg-white/[0.03] border border-white/10">No gallery images yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gallery.map((url) => {
                const isFeatured = sameImage(cover, url);
                return (
                  <div key={url} className={`relative rounded-xl overflow-hidden border ${isFeatured ? 'border-[#22c55e]' : 'border-white/10'}`}>
                    <img src={url} alt="" className="w-full aspect-square object-cover bg-black/20" />
                    {isFeatured && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#22c55e] text-black text-[9px] font-black uppercase">
                        <Star className="w-3 h-3" /> Main
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex gap-1 p-2 bg-gradient-to-t from-black/90 to-transparent">
                      {!isFeatured && (
                        <button
                          type="button"
                          disabled={busyUrl === url}
                          onClick={() => handleSetFeatured(url)}
                          className="flex-1 px-2 py-1 rounded bg-[#22c55e] text-black text-[10px] font-bold hover:bg-[#16a34a] disabled:opacity-50"
                        >
                          Use as main
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyUrl === url}
                        onClick={() => handleDeleteImage(url)}
                        className="px-2 py-1 rounded bg-red-600/80 text-white hover:bg-red-600 disabled:opacity-50"
                        aria-label="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Link</label>
          <input
            type="url"
            value={tryNowUrl}
            onChange={(e) => setTryNowUrl(e.target.value)}
            placeholder="https://"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#22c55e]/50"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#22c55e]/50 resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Upvotes</label>
            <input
              type="number"
              min={0}
              value={upvotes}
              onChange={(e) => setUpvotes(Math.max(0, Number(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Downvotes</label>
            <input
              type="number"
              min={0}
              value={downvotes}
              onChange={(e) => setDownvotes(Math.max(0, Number(e.target.value) || 0))}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#22c55e] text-black font-black text-sm hover:bg-[#16a34a] transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={onClose} className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:text-white transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToolDetailAdminFab({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={onEdit}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#22c55e] text-black font-bold text-sm shadow-lg shadow-[#22c55e]/30 hover:bg-[#16a34a] transition-all"
      >
        <Pencil className="w-4 h-4" /> Edit tool
      </button>
    </div>
  );
}
