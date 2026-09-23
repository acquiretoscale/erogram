'use client';

import { useEffect, useState, useRef } from 'react';

interface Button { text: string; url: string }
interface Template {
  _id: string;
  name: string;
  text: string;
  buttons: Button[][];
  parseMode: string;
  mediaUrl: string;
  mediaType: string;
  mediaFolder: string;
}

interface LibFile { key: string; url: string; size: number }
interface LibFolder { name: string; count: number }

function MediaPickerModal({
  onPick,
  onClose,
}: {
  onPick: (url: string, type: 'photo' | 'video') => void;
  onClose: () => void;
}) {
  const [folders, setFolders] = useState<LibFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<LibFile[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    fetch('/api/media?withCounts=1')
      .then(r => r.json())
      .then(data => {
        const raw = data.folders || [];
        setFolders(Array.isArray(raw) && raw[0]?.name != null
          ? raw
          : raw.map((f: string) => ({ name: f, count: 0 })));
        setLoadingFolders(false);
      });
  }, []);

  async function openFolder(name: string) {
    setActiveFolder(name);
    setLoadingFiles(true);
    const res = await fetch(`/api/media?folder=${encodeURIComponent(name)}`);
    const data = await res.json();
    setFiles(data.files || []);
    setLoadingFiles(false);
  }

  function pick(file: LibFile) {
    const isVideo = /\.(mp4|webm|mov)$/i.test(file.key);
    onPick(file.url, isVideo ? 'video' : 'photo');
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start sm:items-center justify-center z-[60] p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col my-2 sm:my-0">
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <h3 className="font-semibold">Pick from Media Library</h3>
          <button onClick={onClose} className="text-[#888] hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Folder list */}
          <div className="w-44 shrink-0 border-r border-white/10 p-3 overflow-y-auto">
            {loadingFolders ? (
              <p className="text-xs text-[#888] p-2">Loading...</p>
            ) : folders.length === 0 ? (
              <p className="text-xs text-[#888] p-2">No folders yet</p>
            ) : (
              <div className="space-y-1">
                {folders.map(f => (
                  <button
                    key={f.name}
                    onClick={() => openFolder(f.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      activeFolder === f.name
                        ? 'bg-[#b31b1b]/20 text-white font-medium'
                        : 'text-[#999] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="block truncate">{f.name}/</span>
                    <span className="text-xs text-[#666]">{f.count} files</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            {!activeFolder && (
              <div className="flex items-center justify-center h-full text-[#666] text-sm">
                Select a folder on the left
              </div>
            )}
            {activeFolder && loadingFiles && (
              <div className="flex items-center justify-center h-full text-[#888] text-sm">Loading...</div>
            )}
            {activeFolder && !loadingFiles && files.length === 0 && (
              <div className="flex items-center justify-center h-full text-[#888] text-sm">No files in this folder</div>
            )}
            {activeFolder && !loadingFiles && files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {files.map(f => {
                  const isVideo = /\.(mp4|webm|mov)$/i.test(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => pick(f)}
                      className="group relative aspect-square bg-[#111] rounded-lg overflow-hidden border border-white/5 hover:border-[#b31b1b] transition"
                    >
                      {isVideo ? (
                        <video src={f.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={f.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">Select</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CtaButton { text: string; url: string }
interface CtaVariant { name: string; caption: string; buttons: CtaButton[][] }
interface CtaConfig { enabled: boolean; frequency: number; variants: CtaVariant[] }
type VariantStats = Record<string, number>;

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [mediaFolders, setMediaFolders] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cta, setCta] = useState<CtaConfig>({ enabled: false, frequency: 3, variants: [] });
  const [variantStats, setVariantStats] = useState<VariantStats>({});
  const [ctaSaving, setCtaSaving] = useState(false);
  const [ctaMsg, setCtaMsg] = useState('');
  const [activeVariant, setActiveVariant] = useState(0);

  async function loadTemplates() {
    const [tRes, mRes, ctaRes] = await Promise.all([
      fetch('/api/templates'),
      fetch('/api/media'),
      fetch('/api/settings/cta'),
    ]);
    setTemplates(await tRes.json());
    const mData = await mRes.json();
    const raw = mData.folders || [];
    setMediaFolders(Array.isArray(raw) && raw[0]?.name != null ? raw.map((f: any) => f.name) : raw);
    const ctaData = await ctaRes.json();
    setCta({
      enabled: ctaData.enabled || false,
      frequency: ctaData.frequency || 3,
      variants: ctaData.variants || [],
    });
    setVariantStats(ctaData.variantStats || {});
    setLoading(false);
  }

  useEffect(() => { loadTemplates(); }, []);

  async function saveCta() {
    setCtaSaving(true);
    setCtaMsg('');
    try {
      const res = await fetch('/api/settings/cta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cta),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Save failed');
      setCtaMsg('Saved');
      setTimeout(() => setCtaMsg(''), 3000);
    } catch (e: any) {
      setCtaMsg(e.message || 'Error saving');
    } finally {
      setCtaSaving(false);
    }
  }

  function updateCta(patch: Partial<CtaConfig>) { setCta(prev => ({ ...prev, ...patch })); }

  function updateVariant(idx: number, patch: Partial<CtaVariant>) {
    updateCta({ variants: cta.variants.map((v, i) => i === idx ? { ...v, ...patch } : v) });
  }
  function addVariant() {
    const name = String.fromCharCode(65 + cta.variants.length); // A, B, C...
    updateCta({ variants: [...cta.variants, { name, caption: '', buttons: [] }] });
    setActiveVariant(cta.variants.length);
  }
  function removeVariant(idx: number) {
    const next = cta.variants.filter((_, i) => i !== idx);
    updateCta({ variants: next });
    if (activeVariant >= next.length) setActiveVariant(Math.max(0, next.length - 1));
  }
  function vAddRow(vi: number) {
    const v = cta.variants[vi];
    updateVariant(vi, { buttons: [...v.buttons, [{ text: '', url: '' }]] });
  }
  function vAddBtn(vi: number, ri: number) {
    const v = cta.variants[vi];
    updateVariant(vi, { buttons: v.buttons.map((row, i) => i === ri ? [...row, { text: '', url: '' }] : row) });
  }
  function vUpdateBtn(vi: number, ri: number, bi: number, field: 'text' | 'url', val: string) {
    const v = cta.variants[vi];
    updateVariant(vi, { buttons: v.buttons.map((row, r) => r === ri ? row.map((btn, b) => b === bi ? { ...btn, [field]: val } : btn) : row) });
  }
  function vRemoveBtn(vi: number, ri: number, bi: number) {
    const v = cta.variants[vi];
    updateVariant(vi, { buttons: v.buttons.map((row, r) => r === ri ? row.filter((_, b) => b !== bi) : row).filter(row => row.length > 0) });
  }

  function insertLinkIntoText() {
    if (!editing) return;
    const url = prompt('Link URL (include https://)');
    if (!url) return;
    const base = (editing.text || '').trimEnd();
    const prefix = base ? base + '\n' : '';
    const linkHtml = `<a href="${url}">tap here</a>`;
    setEditing({ ...editing, text: prefix + linkHtml });
  }

  async function handleSave() {
    if (!editing) return;
    const method = editing._id ? 'PUT' : 'POST';
    await fetch('/api/templates', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
    setEditing(null);
    loadTemplates();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
    loadTemplates();
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('folder', 'promos');
    fd.append('file', file);
    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
    const data = await res.json();
    const isVideo = /\.(mp4|webm|mov)$/i.test(file.name);
    setEditing({ ...editing, mediaUrl: data.url, mediaType: isVideo ? 'video' : 'photo', mediaFolder: '' });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handlePickFromLibrary(url: string, type: 'photo' | 'video') {
    if (!editing) return;
    setEditing({ ...editing, mediaUrl: url, mediaType: type, mediaFolder: '' });
    setShowPicker(false);
  }

  function addButtonRow() {
    if (!editing) return;
    setEditing({ ...editing, buttons: [...(editing.buttons || []), [{ text: '', url: '' }]] });
  }

  function addButtonToRow(rowIdx: number) {
    if (!editing) return;
    const buttons = [...(editing.buttons || [])];
    buttons[rowIdx] = [...buttons[rowIdx], { text: '', url: '' }];
    setEditing({ ...editing, buttons });
  }

  function updateButton(rowIdx: number, btnIdx: number, field: 'text' | 'url', value: string) {
    if (!editing) return;
    const buttons = [...(editing.buttons || [])];
    buttons[rowIdx] = [...buttons[rowIdx]];
    buttons[rowIdx][btnIdx] = { ...buttons[rowIdx][btnIdx], [field]: value };
    setEditing({ ...editing, buttons });
  }

  function removeButton(rowIdx: number, btnIdx: number) {
    if (!editing) return;
    const buttons = [...(editing.buttons || [])];
    buttons[rowIdx] = buttons[rowIdx].filter((_, i) => i !== btnIdx);
    if (buttons[rowIdx].length === 0) buttons.splice(rowIdx, 1);
    setEditing({ ...editing, buttons });
  }

  if (loading) return <p className="text-[#888]">Loading...</p>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Templates</h2>
        <button
          onClick={() => setEditing({ name: '', text: '', buttons: [], parseMode: 'HTML', mediaUrl: '', mediaType: '', mediaFolder: '' })}
          className="px-4 py-2 bg-[#b31b1b] text-white rounded-lg text-sm font-medium hover:bg-[#d42020] transition w-full sm:w-auto"
        >
          + New Template
        </button>
      </div>

      {/* Media picker modal */}
      {showPicker && editing && (
        <MediaPickerModal
          onPick={handlePickFromLibrary}
          onClose={() => setShowPicker(false)}
        />
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 sm:p-6 w-full max-w-xl my-4 sm:my-8">
            <h3 className="text-lg font-semibold mb-4">{editing._id ? 'Edit Template' : 'New Template'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1">Template Name</label>
                <input
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b]"
                  value={editing.name || ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Dating CTA"
                />
              </div>

              {/* Media Section */}
              <div>
                <label className="block text-xs text-[#888] mb-1">Image / Video (optional)</label>
                {editing.mediaUrl ? (
                  <div>
                    <div className="bg-[#111] border border-white/10 rounded-lg overflow-hidden">
                      {editing.mediaType === 'video' ? (
                        <video src={editing.mediaUrl} className="w-full max-h-48 object-contain" controls />
                      ) : (
                        <img src={editing.mediaUrl} alt="" className="w-full max-h-48 object-contain" />
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setShowPicker(true)}
                        className="px-3 py-1.5 text-xs bg-white/5 rounded hover:bg-white/10 transition"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => setEditing({ ...editing, mediaUrl: '', mediaType: '' })}
                        className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Three options in one row */}
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex flex-col items-center justify-center px-3 py-3 bg-[#111] border border-dashed border-white/20 rounded-lg cursor-pointer hover:border-white/40 transition text-center">
                        <span className="text-lg mb-1">⬆️</span>
                        <span className="text-xs text-[#888]">{uploading ? 'Uploading...' : 'Upload file'}</span>
                        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaUpload} className="hidden" disabled={uploading} />
                      </label>
                      <button
                        onClick={() => setShowPicker(true)}
                        className="flex flex-col items-center justify-center px-3 py-3 bg-[#111] border border-dashed border-white/20 rounded-lg hover:border-[#b31b1b]/50 hover:bg-[#b31b1b]/5 transition"
                      >
                        <span className="text-lg mb-1">🖼️</span>
                        <span className="text-xs text-[#888]">Pick from library</span>
                      </button>
                      <div className="flex flex-col justify-center px-3 py-3 bg-[#111] border border-dashed border-white/20 rounded-lg">
                        <span className="text-xs text-[#666] mb-1 text-center">Paste URL</span>
                        <input
                          className="w-full p-1.5 bg-[#0a0a0a] border border-white/10 rounded text-xs text-white outline-none"
                          placeholder="https://..."
                          onBlur={e => {
                            const url = e.target.value.trim();
                            if (url) {
                              const isVid = /\.(mp4|webm|mov)$/i.test(url);
                              setEditing({ ...editing, mediaUrl: url, mediaType: isVid ? 'video' : 'photo' });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-[#555]">— or —</span>
                    </div>
                    <div className="bg-[#111] border border-dashed border-purple-500/20 rounded-lg p-3">
                      <label className="block text-xs text-purple-400 mb-1 font-medium">Random from folder</label>
                      <select
                        className="w-full p-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm outline-none"
                        value={editing.mediaFolder || ''}
                        onChange={e => setEditing({ ...editing, mediaFolder: e.target.value, mediaUrl: '', mediaType: '' })}
                      >
                        <option value="">— Disabled —</option>
                        {mediaFolders.map(f => <option key={f} value={f}>{f}/</option>)}
                      </select>
                      <p className="text-[10px] text-[#555] mt-1">Each post picks a random image/video from this folder. Great for promos.</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-[#666] mt-1">Sent as the image in Telegram. Leave empty for text-only posts.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[#888]">Message Text (HTML)</label>
                  <button
                    type="button"
                    onClick={insertLinkIntoText}
                    className="text-[11px] text-blue-400 hover:text-blue-300"
                  >
                    + Insert link
                  </button>
                </div>
                <textarea
                  className="w-full p-2.5 bg-[#111] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b] h-32 font-mono"
                  value={editing.text || ''}
                  onChange={e => setEditing({ ...editing, text: e.target.value })}
                  placeholder={'<b>Check this out!</b>\n\nJoin the fun...'}
                />
                <p className="text-xs text-[#666] mt-1">Use HTML: &lt;b&gt;bold&lt;/b&gt;, &lt;i&gt;italic&lt;/i&gt;, &lt;a href=&quot;...&quot;&gt;links&lt;/a&gt;</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-[#888]">Buttons (URL links below the message)</label>
                  <button onClick={addButtonRow} className="text-xs text-[#b31b1b] hover:text-[#d42020]">+ Add Row</button>
                </div>
                {(editing.buttons || []).map((row, ri) => (
                  <div key={ri} className="mb-3 p-3 bg-[#111] rounded-lg border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#666]">Row {ri + 1}</span>
                      <button onClick={() => addButtonToRow(ri)} className="text-xs text-[#b31b1b]">+ Button</button>
                    </div>
                    {row.map((btn, bi) => (
                      <div key={bi} className="flex gap-2 mb-2 items-center">
                        <input
                          className="flex-1 p-2 bg-[#0a0a0a] border border-white/10 rounded text-xs text-white outline-none"
                          value={btn.text}
                          onChange={e => updateButton(ri, bi, 'text', e.target.value)}
                          placeholder="Button text"
                        />
                        <input
                          className="flex-1 p-2 bg-[#0a0a0a] border border-white/10 rounded text-xs text-white outline-none"
                          value={btn.url}
                          onChange={e => updateButton(ri, bi, 'url', e.target.value)}
                          placeholder="https://..."
                        />
                        <button onClick={() => removeButton(ri, bi)} className="text-red-400 text-xs hover:text-red-300 shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                ))}
                {(!editing.buttons || editing.buttons.length === 0) && (
                  <p className="text-xs text-[#666]">No buttons yet. Click "+ Add Row" to add inline buttons.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 border border-white/10 rounded-lg text-sm hover:bg-white/5 transition">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-[#b31b1b] rounded-lg text-sm font-medium hover:bg-[#d42020] transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-16 text-[#888]">
          <p className="text-lg mb-2">No templates yet</p>
          <p className="text-sm">Create templates with your message text and affiliate link buttons</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map(t => (
            <div key={t._id} className="bg-[#111] border border-white/10 rounded-xl p-5 flex flex-col gap-3">
              <h3 className="font-semibold text-sm">{t.name}</h3>
              {t.mediaUrl && (
                <div className="bg-[#0a0a0a] rounded-lg overflow-hidden border border-white/5">
                  {t.mediaType === 'video' ? (
                    <video src={t.mediaUrl} className="w-full max-h-40 object-cover" />
                  ) : (
                    <img src={t.mediaUrl} alt="" className="w-full max-h-40 object-cover" />
                  )}
                </div>
              )}
              {t.mediaFolder && !t.mediaUrl && (
                <div className="mb-2 px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <span className="text-xs text-purple-400">📂 Random from <strong>{t.mediaFolder}/</strong></span>
                </div>
              )}
              <pre className="text-xs text-[#aaa] whitespace-pre-wrap max-h-24 overflow-hidden bg-[#0a0a0a] p-2 rounded">{t.text || '(no text)'}</pre>
              {t.buttons.length > 0 && (
                <div className="space-y-1 mb-3">
                  {t.buttons.map((row, ri) => (
                    <div key={ri} className="flex gap-1">
                      {row.map((btn, bi) => (
                        <span key={bi} className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded truncate max-w-[150px]">{btn.text}</span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-auto">
                <button onClick={() => setEditing(t)} className="px-3 py-1.5 text-xs bg-white/5 rounded-lg hover:bg-white/10 transition">Edit</button>
                <button onClick={() => handleDelete(t._id)} className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Post CTA — A/B Split Test */}
      <div className="mt-10 bg-[#111] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Media Post CTA</h3>
            <p className="text-xs text-[#888] mt-0.5">A/B split test — each variant is shown 50/50 randomly on media posts</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cta.enabled} onChange={e => updateCta({ enabled: e.target.checked })} className="accent-[#b31b1b] w-4 h-4" />
            <span className="text-sm">{cta.enabled ? 'Active' : 'Off'}</span>
          </label>
        </div>

        <div className="space-y-4">
          {/* Frequency */}
          <div>
            <label className="block text-xs text-[#888] mb-1">Frequency</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#888]">Show CTA every</span>
              <select className="p-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm outline-none"
                value={cta.frequency} onChange={e => updateCta({ frequency: Number(e.target.value) })}>
                {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-sm text-[#888]">media posts per group</span>
            </div>
          </div>

          {/* Variant stats bar */}
          {cta.variants.length >= 2 && Object.keys(variantStats).length > 0 && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
              <p className="text-[10px] text-[#666] uppercase tracking-wider font-medium mb-2">30-day split performance</p>
              <div className="flex gap-4">
                {cta.variants.map(v => {
                  const count = variantStats[v.name] || 0;
                  const total = cta.variants.reduce((s, vv) => s + (variantStats[vv.name] || 0), 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={v.name} className="flex-1">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs font-semibold text-white">Variant {v.name}</span>
                        <span className="text-xs tabular-nums text-[#888]">{count} sends ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${v.name === 'A' ? 'bg-blue-500' : v.name === 'B' ? 'bg-purple-500' : 'bg-emerald-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant tabs */}
          {cta.variants.length > 0 && (
            <div className="flex items-center gap-1 border-b border-white/10 pb-0">
              {cta.variants.map((v, i) => (
                <button key={i}
                  onClick={() => setActiveVariant(i)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition border-b-2 -mb-px ${
                    activeVariant === i
                      ? 'text-white border-[#b31b1b] bg-white/5'
                      : 'text-[#666] border-transparent hover:text-[#999]'
                  }`}
                >
                  Variant {v.name}
                  {variantStats[v.name] ? ` (${variantStats[v.name]})` : ''}
                </button>
              ))}
              {cta.variants.length < 4 && (
                <button onClick={addVariant} className="px-3 py-2 text-xs text-[#b31b1b] hover:text-[#d42020] font-medium">
                  + Add variant
                </button>
              )}
            </div>
          )}

          {/* No variants yet */}
          {cta.variants.length === 0 && (
            <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
              <p className="text-[#666] text-sm mb-3">No CTA variants configured</p>
              <button onClick={addVariant} className="px-4 py-2 bg-[#b31b1b] text-white rounded-lg text-sm font-medium hover:bg-[#d42020] transition">
                Create Variant A
              </button>
            </div>
          )}

          {/* Active variant editor */}
          {cta.variants.length > 0 && cta.variants[activeVariant] && (() => {
            const vi = activeVariant;
            const v = cta.variants[vi];
            return (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${vi === 0 ? 'bg-blue-500' : vi === 1 ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                    <span className="text-sm font-medium text-white">Variant {v.name}</span>
                  </div>
                  {cta.variants.length > 1 && (
                    <button onClick={() => removeVariant(vi)} className="text-xs text-red-400 hover:text-red-300 transition">
                      Remove variant
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-[#888] mb-1">Caption (HTML)</label>
                  <textarea
                    className="w-full p-3 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#b31b1b] min-h-[60px] resize-y"
                    value={v.caption} onChange={e => updateVariant(vi, { caption: e.target.value })}
                    placeholder='✨ Want more? Tap below ⬇️'
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-[#888]">Buttons</label>
                    <button onClick={() => vAddRow(vi)} className="text-xs text-[#b31b1b] hover:text-[#d42020]">+ Add row</button>
                  </div>
                  {v.buttons.length === 0 && (
                    <p className="text-xs text-[#555] py-3 text-center border border-dashed border-white/10 rounded-lg">No buttons — add a row</p>
                  )}
                  <div className="space-y-3">
                    {v.buttons.map((row, ri) => (
                      <div key={ri} className="bg-[#0a0a0a] border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-[#555] uppercase tracking-wide">Row {ri + 1}</span>
                          {row.length < 3 && <button onClick={() => vAddBtn(vi, ri)} className="text-[10px] text-blue-400">+ Add button</button>}
                        </div>
                        <div className="space-y-2">
                          {row.map((btn, bi) => (
                            <div key={bi} className="flex gap-2 items-start">
                              <div className="flex-1 space-y-1">
                                <input className="w-full p-2 bg-[#111] border border-white/10 rounded text-white text-xs outline-none"
                                  value={btn.text} onChange={e => vUpdateBtn(vi, ri, bi, 'text', e.target.value)} placeholder="Button text" />
                                <input className="w-full p-2 bg-[#111] border border-white/10 rounded text-white text-xs outline-none font-mono"
                                  value={btn.url} onChange={e => vUpdateBtn(vi, ri, bi, 'url', e.target.value)} placeholder="https://..." />
                              </div>
                              <button onClick={() => vRemoveBtn(vi, ri, bi)} className="px-2 py-1 text-xs text-red-400 hover:text-red-300 mt-1">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {(v.caption || v.buttons.length > 0) && (
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-3 py-1.5 bg-white/5 text-[10px] text-[#666] uppercase tracking-wide">Preview — Variant {v.name}</div>
                    <div className="p-4 bg-[#0a0a0a]">
                      <div className="bg-[#1a2e1a] rounded-xl p-3 max-w-xs">
                        <div className="bg-[#333] rounded-lg h-24 mb-2 flex items-center justify-center text-[#666] text-xs">[ media ]</div>
                        {v.caption && <p className="text-sm text-white whitespace-pre-wrap mb-2">{v.caption.replace(/<[^>]*>/g, '')}</p>}
                        <div className="space-y-1">
                          {v.buttons.map((row, ri) => (
                            <div key={ri} className="flex gap-1">
                              {row.map((btn, bi) => (
                                <span key={bi} className="flex-1 text-center px-2 py-1.5 bg-[#2a4a2a] text-blue-300 text-xs rounded truncate">{btn.text || '(empty)'}</span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={saveCta} disabled={ctaSaving}
            className="flex-1 py-2.5 bg-[#b31b1b] text-white rounded-xl text-sm font-semibold hover:bg-[#d42020] transition disabled:opacity-50">
            {ctaSaving ? 'Saving...' : 'Save CTA'}
          </button>
          {ctaMsg && <span className={`text-sm font-medium ${ctaMsg === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>{ctaMsg === 'Saved' ? '✓ Saved' : ctaMsg}</span>}
        </div>
      </div>
    </div>
  );
}
