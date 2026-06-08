'use client';

import { useState, useCallback, useRef } from 'react';
import { compressImage } from '@/lib/utils/compressImage';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArticleEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  className?: string;
}

function uploadImage(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('file', compressed);
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
      });
      if (res.data?.url) resolve(res.data.url);
      else reject(new Error('No URL returned'));
    } catch (err) { reject(err); }
  });
}

export default function ArticleEditor({ content, onChange, className }: ArticleEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newContent = before + text + after;
    onChange(newContent);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    }, 0);
  }, [content, onChange]);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      insertAtCursor(`\n![${file.name.replace(/\.[^.]+$/, '')}](${url})\n`);
    } catch { alert('Image upload failed'); }
    finally { setUploading(false); }
  }, [insertAtCursor]);

  const insertVideo = useCallback(() => {
    const url = prompt('Video URL (mp4 or embed):');
    if (!url) return;
    const caption = prompt('Caption (optional):') || '';
    const link = prompt('CTA link (optional):') || '';
    const linktext = link ? (prompt('CTA button text:') || 'Learn more') : '';
    const lines = [`url: ${url}`];
    if (caption) lines.push(`caption: ${caption}`);
    if (link) lines.push(`link: ${link}`);
    if (linktext) lines.push(`linktext: ${linktext}`);
    insertAtCursor(`\n\n\`\`\`video\n${lines.join('\n')}\n\`\`\`\n\n`);
  }, [insertAtCursor]);

  const insertCta = useCallback(() => {
    const url = prompt('CTA URL:');
    if (!url) return;
    const text = prompt('Button text:');
    if (!text) return;
    const headline = prompt('Headline (optional):') || '';
    const description = prompt('Description (optional):') || '';
    const lines = [`url: ${url}`, `text: ${text}`];
    if (headline) lines.push(`headline: ${headline}`);
    if (description) lines.push(`description: ${description}`);
    insertAtCursor(`\n\n\`\`\`cta\n${lines.join('\n')}\n\`\`\`\n\n`);
  }, [insertAtCursor]);

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Count video/cta blocks
  const videoCount = (content.match(/```video/g) || []).length;
  const ctaCount = (content.match(/```cta/g) || []).length;

  // Preview: render markdown with video/cta blocks as visual cards
  const previewComponents = {
    pre: ({ children }: any) => {
      const child = Array.isArray(children) ? children[0] : children;
      const cls = child?.props?.className || '';
      const lang = typeof cls === 'string' ? cls.replace(/^language-/, '') : '';
      const codeContent = String(child?.props?.children ?? '');

      if (lang === 'video') {
        const data: Record<string, string> = {};
        for (const line of codeContent.trim().split('\n')) {
          const idx = line.indexOf(':');
          if (idx === -1) continue;
          data[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
        }
        const isVid = /\.(mp4|webm|ogg)(\?|$)/i.test(data.url || '');
        return (
          <div className="my-4 rounded-xl border-2 border-blue-400 bg-blue-50 overflow-hidden">
            {data.url && (
              <div className="bg-black max-h-[200px] overflow-hidden">
                {isVid ? <video src={data.url} controls className="w-full max-h-[200px] object-contain" preload="metadata" />
                  : <iframe src={data.url} className="w-full aspect-video max-h-[200px] border-none" />}
              </div>
            )}
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="text-blue-600 font-bold text-xs">🎬 VIDEO</span>
              {data.caption && <span className="text-gray-500 text-xs">{data.caption}</span>}
              {data.linktext && <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded">{data.linktext}</span>}
            </div>
          </div>
        );
      }

      if (lang === 'cta') {
        const data: Record<string, string> = {};
        for (const line of codeContent.trim().split('\n')) {
          const idx = line.indexOf(':');
          if (idx === -1) continue;
          data[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
        }
        return (
          <div className="my-4 rounded-xl border-2 border-green-400 bg-green-50 overflow-hidden">
            <div className="bg-gradient-to-br from-[#140909] to-[#090909] p-4 text-center">
              <p className="text-white font-bold text-sm">{data.headline || 'Ready to continue?'}</p>
              {data.description && <p className="text-gray-400 text-xs mt-1">{data.description}</p>}
              <span className="inline-block mt-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-b from-[#22c55e] to-[#15803d]">{data.text}</span>
            </div>
            <div className="px-4 py-2">
              <span className="text-green-600 font-bold text-xs">🔗 CTA BLOCK</span>
            </div>
          </div>
        );
      }

      return <pre className="bg-gray-50 p-4 rounded-xl overflow-x-auto my-4 border border-gray-200 text-sm">{children}</pre>;
    },
    h2: ({ children }: any) => <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3 border-b border-gray-200 pb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">{children}</h3>,
    p: ({ children }: any) => <p className="text-gray-700 leading-relaxed mb-4 text-sm">{children}</p>,
    a: ({ href, children }: any) => <a href={href} className="text-[#b31b1b] underline" target="_blank" rel="noopener noreferrer">{children}</a>,
    img: ({ src, alt }: any) => <img src={src} alt={alt} className="rounded-lg max-w-full my-4" />,
    ul: ({ children }: any) => <ul className="list-disc pl-5 mb-4 text-sm text-gray-700 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-4 text-sm text-gray-700 space-y-1">{children}</ol>,
    blockquote: ({ children }: any) => <blockquote className="border-l-4 border-[#b31b1b] pl-4 my-4 text-gray-500 italic text-sm">{children}</blockquote>,
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className || ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80 flex-wrap">
        <button type="button" onClick={() => setMode('write')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === 'write' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Write</button>
        <button type="button" onClick={() => setMode('preview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === 'preview' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Preview</button>
        <div className="w-px h-5 bg-gray-200 mx-2" />
        <button type="button" onClick={insertVideo}
          className="px-2.5 py-1.5 rounded-md text-xs text-blue-600 hover:bg-blue-50 font-bold">🎬 Video</button>
        <button type="button" onClick={insertCta}
          className="px-2.5 py-1.5 rounded-md text-xs text-green-600 hover:bg-green-50 font-bold">🔗 CTA</button>
        <button type="button" onClick={() => imageInputRef.current?.click()}
          className="px-2.5 py-1.5 rounded-md text-xs text-gray-600 hover:bg-gray-100 font-medium">🖼 Image</button>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-400">
          {videoCount > 0 && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-bold">{videoCount} video{videoCount > 1 ? 's' : ''}</span>}
          {ctaCount > 0 && <span className="px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-bold">{ctaCount} CTA{ctaCount > 1 ? 's' : ''}</span>}
        </div>
      </div>

      {uploading && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-blue-600 text-xs font-medium">Uploading image...</div>
      )}

      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => onChange(e.target.value)}
          className="w-full min-h-[500px] px-6 py-5 text-gray-800 text-[15px] leading-relaxed font-mono outline-none resize-y"
          placeholder="Write your article in markdown..."
          onDrop={e => {
            const file = e.dataTransfer?.files?.[0];
            if (file?.type.startsWith('image/')) { e.preventDefault(); handleImageUpload(file); }
          }}
          onPaste={e => {
            const items = e.clipboardData?.items;
            if (items) for (const item of Array.from(items)) {
              if (item.type.startsWith('image/')) { e.preventDefault(); const f = item.getAsFile(); if (f) handleImageUpload(f); break; }
            }
          }}
        />
      ) : (
        <div className="px-6 py-5 min-h-[500px] prose prose-sm max-w-none">
          <ReactMarkdown components={previewComponents} remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
    </div>
  );
}
