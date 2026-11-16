'use client';

import { useRef, useState } from 'react';
import { Camera, Pencil, Save, X } from 'lucide-react';
import {
  saveArticleFrontEdit,
  uploadArticleFrontImage,
} from '@/lib/actions/adminArticles';
function token() {
  return localStorage.getItem('token') || '';
}

export function BlogArticleEditorFab({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c0392f] text-white font-bold text-sm shadow-lg shadow-[#c0392f]/30 hover:bg-[#a93226] transition-all"
      >
        <Pencil className="w-4 h-4" /> Edit article
      </button>
    </div>
  );
}

export default function BlogArticleEditorPanel({
  slug,
  title: initialTitle,
  excerpt: initialExcerpt,
  content: initialContent,
  featuredImage: initialImage,
  featured: initialFeatured,
  onSaved,
  onClose,
}: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  featured: boolean;
  onSaved: (next: { title: string; excerpt: string; content: string; featuredImage: string; featured: boolean }) => void;
  onClose: () => void;
}) {
  const coverRef = useRef<HTMLInputElement>(null);
  const insertRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [content, setContent] = useState(initialContent);
  const [featuredImage, setFeaturedImage] = useState(initialImage);
  const [featured, setFeatured] = useState(initialFeatured);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File, asMain: boolean) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { url } = await uploadArticleFrontImage(token(), slug, fd, asMain);
      if (asMain) {
        setFeaturedImage(url);
      } else {
        setContent((prev) => `${prev.trim()}\n\n![](${url})\n`);
      }
    } catch (e: any) {
      alert(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { alert('Title is required'); return; }
    if (!content.trim()) { alert('Content is required'); return; }
    setSaving(true);
    try {
      await saveArticleFrontEdit(token(), slug, {
        title: title.trim(),
        excerpt,
        content,
        featuredImage,
        featured,
      });
      onSaved({ title: title.trim(), excerpt, content, featuredImage, featured });
      onClose();
    } catch (e: any) {
      alert(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-10">
      <div className="w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-[#140a0a] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Edit article</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Main picture</label>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file, true);
              e.target.value = '';
            }}
          />
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/30">
              {featuredImage ? (
                <img src={featuredImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">No image</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#c0392f] text-white text-xs font-bold hover:bg-[#a93226] disabled:opacity-50"
            >
              {uploading ? 'Working…' : <><Camera className="w-3.5 h-3.5" /> Replace</>}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-[#1a1a1a] text-[#c0392f] focus:ring-[#c0392f]"
          />
          <span className="text-sm font-semibold text-white">Featured on the blog</span>
        </label>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 bg-[#1a1212] border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-[#c0392f]"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full p-3 bg-[#1a1212] border border-white/10 rounded-xl text-white outline-none resize-none focus:ring-2 focus:ring-[#c0392f]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Article text</label>
            <button
              type="button"
              onClick={() => insertRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/15 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" /> Add image in text
            </button>
            <input
              ref={insertRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, false);
                e.target.value = '';
              }}
            />
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="w-full p-3 bg-[#1a1212] border border-white/10 rounded-xl text-white text-sm font-mono outline-none resize-y focus:ring-2 focus:ring-[#c0392f]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/15">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c0392f] text-white text-sm font-bold hover:bg-[#a93226] disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
