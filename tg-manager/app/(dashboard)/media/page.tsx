'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface FileItem { key: string; url: string; size: number; }
interface FolderWithCount { name: string; count: number; }
interface GifResult {
  id: string;
  importUrl: string;
  thumbnail: string;
  views: number;
  likes: number;
}

function StatsBadge({ views, likes }: { views: number; likes: number }) {
  if (views < 1000 && likes < 10) return null;
  const v = views >= 1_000_000 ? `${(views / 1_000_000).toFixed(1)}M` : views >= 1000 ? `${(views / 1_000).toFixed(0)}K` : '';
  const l = likes >= 1000 ? `${(likes / 1_000).toFixed(1)}K` : likes > 0 ? String(likes) : '';
  return (
    <div className="absolute bottom-1 left-1 flex gap-1">
      {v && <span className="text-[9px] bg-black/70 text-yellow-400 px-1 rounded font-semibold">{v}</span>}
      {l && <span className="text-[9px] bg-black/70 text-pink-400 px-1 rounded font-semibold">♥{l}</span>}
    </div>
  );
}

export default function MediaPage() {
  const [folders, setFolders] = useState<FolderWithCount[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newFolder, setNewFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Importer
  const [showImporter, setShowImporter] = useState(false);
  const [importMode, setImportMode] = useState<'niche' | 'url'>('niche');
  const [nicheInput, setNicheInput] = useState('');
  const [fetchCount, setFetchCount] = useState(40);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Saved niche links
  const [savedLinks, setSavedLinks] = useState<{ _id: string; url: string; label: string }[]>([]);

  // Existing file management
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [postedKeys, setPostedKeys] = useState<Set<string>>(new Set());
  const [showArchive, setShowArchive] = useState(false);

  // Lightbox preview
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Drag-and-drop reorder
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);

  // Queue health
  const [queueStats, setQueueStats] = useState<{ folder: string; total: number; queued: number; archived: number }[]>([]);

  const loadFolders = useCallback(async () => {
    const res = await fetch('/api/media?withCounts=1');
    const data = await res.json();
    const raw = data.folders || [];
    setFolders(Array.isArray(raw) && raw[0]?.name != null ? raw : raw.map((f: string) => ({ name: f, count: 0 })));
    setLoading(false);
  }, []);

  async function loadFiles(folderName: string) {
    setActiveFolder(folderName);
    setFiles([]);
    setSelectedFiles(new Set());
    setOrderDirty(false);
    setShowArchive(false);

    const data = await fetch(`/api/media/folder-data?folder=${encodeURIComponent(folderName)}`).then(r => r.json());
    setSavedLinks(data.links || []);

    const rawFiles: FileItem[] = data.files || [];
    const savedOrder: string[] = data.order || [];
    setPostedKeys(new Set(data.postedKeys || []));

    if (savedOrder.length > 0) {
      const fileMap = new Map(rawFiles.map(f => [f.key, f]));
      const ordered: FileItem[] = [];
      for (const key of savedOrder) {
        const f = fileMap.get(key);
        if (f) { ordered.push(f); fileMap.delete(key); }
      }
      fileMap.forEach(f => ordered.push(f));
      setFiles(ordered);
    } else {
      setFiles(rawFiles);
    }
  }

  const loadQueueStats = useCallback(async () => {
    try {
      const data = await fetch('/api/media/queue-stats').then(r => r.json());
      setQueueStats(data.stats || []);
    } catch {}
  }, []);

  useEffect(() => { loadFolders(); loadQueueStats(); }, [loadFolders, loadQueueStats]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || !activeFolder) return;
    setUploading(true);
    for (let i = 0; i < fileList.length; i++) {
      const fd = new FormData();
      fd.append('folder', activeFolder);
      fd.append('file', fileList[i]);
      await fetch('/api/media/upload', { method: 'POST', body: fd });
    }
    setUploading(false);
    await loadFiles(activeFolder);
    await loadFolders();
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleCreateFolder() {
    const name = newFolder.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!name) return;
    if (!folders.some(f => f.name === name)) setFolders([...folders, { name, count: 0 }]);
    setActiveFolder(name);
    setFiles([]);
    setNewFolder('');
    setShowNewFolder(false);
  }

  // ── Delete files ──────────────────────────────────────────────
  async function handleDeleteFiles(keys: string[]) {
    if (keys.length === 0) return;
    if (!confirm(`Delete ${keys.length} file${keys.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch('/api/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys }),
    });
    setDeleting(false);
    setSelectedFiles(new Set());
    if (activeFolder) {
      await loadFiles(activeFolder);
      await loadFolders();
    }
  }

  function toggleFileSelect(key: string) {
    setSelectedFiles(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  // ── Drag-and-drop reorder ───────────────────────────────────
  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }
  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    setFiles(prev => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setOrderDirty(true);
    setDragIdx(null);
    setDragOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null); }

  async function saveOrder() {
    if (!activeFolder) return;
    const orderedKeys = files.map(f => f.key);
    await fetch('/api/media/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: activeFolder, keys: orderedKeys }),
    });
    setOrderDirty(false);
  }

  // ── Saved niche links ────────────────────────────────────────
  async function saveNicheLink(url: string) {
    if (!activeFolder || !url.trim()) return;
    try {
      const res = await fetch('/api/media/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: activeFolder, url: url.trim() }),
      });
      const data = await res.json();
      if (data.link && !data.duplicate) {
        setSavedLinks(prev => [data.link, ...prev]);
      } else if (data.link && data.duplicate) {
        // already saved — no-op
      }
    } catch (err) {
      console.error('Failed to save niche link:', err);
    }
  }

  async function deleteNicheLink(id: string) {
    await fetch('/api/media/niches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setSavedLinks(prev => prev.filter(l => l._id !== id));
  }

  // ── Niche fetch ───────────────────────────────────────────────
  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!nicheInput.trim()) return;
    setSearching(true);
    setSearchError('');
    setResults([]);
    setImportResult(null);
    const res = await fetch(`/api/media/import/search?niche=${encodeURIComponent(nicheInput.trim())}&count=${fetchCount}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      setSearchError(data.error || 'Failed to fetch');
    } else {
      setResults(data.results || []);
      saveNicheLink(nicheInput.trim());
    }
    setSearching(false);
  }

  function removeResult(id: string) {
    setResults(prev => prev.filter(g => g.id !== id));
  }

  // ── Import (batched to avoid Vercel timeout) ────────────────
  const BATCH_SIZE = 10;

  async function handleImport() {
    if (!activeFolder) return;
    setImporting(true);
    setImportResult(null);
    setImportProgress(null);

    let gifs: { id: string; importUrl: string }[];
    if (importMode === 'niche') {
      gifs = results.map(g => ({ id: g.id, importUrl: g.importUrl }));
    } else {
      gifs = urlInput.split(/[\n,\s]+/).map(u => u.trim()).filter(u => u.startsWith('http'))
        .map((url, i) => ({ id: `url_${i}`, importUrl: url }));
    }
    if (gifs.length === 0) { setImporting(false); return; }

    let totalSucceeded = 0;
    let totalFailed = 0;

    for (let i = 0; i < gifs.length; i += BATCH_SIZE) {
      const batch = gifs.slice(i, i + BATCH_SIZE);
      setImportProgress({ done: i, total: gifs.length });

      try {
        const res = await fetch('/api/media/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: activeFolder, gifs: batch }),
        });
        const data = await res.json();
        totalSucceeded += data.succeeded || 0;
        totalFailed += data.failed || 0;
      } catch {
        totalFailed += batch.length;
      }
    }

    setImportProgress(null);
    setImportResult({ succeeded: totalSucceeded, failed: totalFailed });
    setImporting(false);
    if (totalSucceeded > 0) {
      if (importMode === 'url') setUrlInput('');
      await loadFiles(activeFolder);
      await loadFolders();
    }
  }

  const urlCount = urlInput.split(/[\n,\s]+/).map(u => u.trim()).filter(u => u.startsWith('http')).length;

  if (loading) return <p className="text-[#888]">Loading...</p>;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Media Library</h2>

      <div className="bg-[#111] border border-white/10 rounded-xl p-4 mb-6 text-sm text-[#999]">
        <p className="font-semibold text-white text-xs uppercase tracking-wide mb-2">How media folders work</p>
        <ul className="space-y-1 text-xs leading-relaxed list-disc list-inside">
          <li>Create one folder per niche (e.g. <span className="text-white">"booty"</span>, <span className="text-white">"cumslut"</span>)</li>
          <li>Use <span className="text-purple-400 font-medium">Batch Import</span> to pull 20–80 videos from a RedGifs niche page</li>
          <li>Assign folders to groups in <strong className="text-white">Groups</strong> — schedules post from the <span className="text-emerald-400 font-medium">queue</span> first, then recycle from <span className="text-[#888] font-medium">archive</span></li>
        </ul>
      </div>

      {/* Queue Health */}
      {queueStats.length > 0 && (
        <div className="bg-[#111] border border-white/10 rounded-xl p-4 mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#888] mb-3">Queue Health</h3>
          <div className="space-y-3">
            {queueStats.map(q => {
              const pct = q.total > 0 ? Math.round((q.queued / q.total) * 100) : 0;
              const isEmpty = q.queued === 0 && q.total > 0;
              return (
                <div key={q.folder}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{q.folder}/</span>
                    <span className="text-xs text-[#888]">
                      <span className={isEmpty ? 'text-yellow-400 font-semibold' : 'text-emerald-400'}>{q.queued} queued</span>
                      {' · '}{q.archived} archived · {q.total} total
                    </span>
                  </div>
                  <div className="w-full bg-[#222] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isEmpty ? 'bg-yellow-500' : pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-blue-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  {isEmpty && <p className="text-[10px] text-yellow-500/70 mt-0.5">Queue empty — archive content will be reused</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Folder list */}
      <div className="space-y-2 mb-6">
        {folders.map(f => (
          <button key={f.name} onClick={() => loadFiles(f.name)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition border ${
              activeFolder === f.name ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-[#0d1117] border-white/10 text-[#c9d1d9] hover:border-emerald-500/30 hover:bg-emerald-500/5'}`}>
            <span className="font-medium">{f.name}/</span>
            <span className={`text-sm tabular-nums ${activeFolder === f.name ? 'text-emerald-400' : 'text-[#8b949e]'}`}>
              {f.count} {f.count === 1 ? 'file' : 'files'}
            </span>
          </button>
        ))}
        {showNewFolder ? (
          <div className="flex gap-2 pt-2">
            <input className="flex-1 px-3 py-2.5 bg-[#111] border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
              value={newFolder} onChange={e => setNewFolder(e.target.value)} placeholder="folder-name" autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
            <button onClick={handleCreateFolder} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-500 transition">Create</button>
            <button onClick={() => setShowNewFolder(false)} className="px-4 py-2.5 border border-white/10 rounded-xl text-sm text-[#888] hover:bg-white/5 transition">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowNewFolder(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/20 text-[#8b949e] hover:text-white hover:border-emerald-500/30 hover:bg-emerald-500/5 transition">
            + New Folder
          </button>
        )}
      </div>

      {activeFolder && (
        <div>
          {/* Action bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold">
              {activeFolder} <span className="text-[#888] text-sm font-normal">({files.length} files)</span>
            </h3>
            <div className="flex gap-2 items-center flex-wrap">
              {uploading && <span className="text-xs text-[#888]">Uploading...</span>}
              <button onClick={() => { setShowImporter(v => !v); setImportResult(null); setResults([]); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${showImporter
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-purple-900/30 border-purple-700/40 text-purple-300 hover:bg-purple-700/40'}`}>
                Batch Import
              </button>
              <label className="px-4 py-2 bg-[#b31b1b] text-white rounded-lg text-sm font-medium hover:bg-[#d42020] transition cursor-pointer">
                Upload Files
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Floating bulk delete bar — shows when files are selected */}
          {selectedFiles.size > 0 && (
            <div className="sticky top-0 z-20 flex items-center justify-between bg-red-900/30 backdrop-blur-md border border-red-700/30 rounded-xl px-4 py-2.5 mb-4">
              <div className="flex gap-3 items-center">
                <span className="text-sm text-[#ccc]">
                  <span className="text-white font-semibold">{selectedFiles.size}</span> selected
                </span>
                <button onClick={() => setSelectedFiles(new Set(files.map(f => f.key)))}
                  className="text-xs px-2 py-1 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">Select All</button>
                <button onClick={() => setSelectedFiles(new Set())}
                  className="text-xs px-2 py-1 bg-white/10 text-[#888] rounded-lg hover:bg-white/20 transition">Deselect All</button>
              </div>
              <button onClick={() => handleDeleteFiles(Array.from(selectedFiles))}
                disabled={deleting}
                className="px-4 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-500 transition disabled:opacity-50">
                {deleting ? 'Deleting...' : `Delete ${selectedFiles.size}`}
              </button>
            </div>
          )}

          {/* Batch Importer Panel */}
          {showImporter && (
            <div className="bg-[#0d1117] border border-purple-700/30 rounded-2xl p-5 mb-6">
              <div className="flex gap-1 mb-4 bg-black/30 p-1 rounded-xl w-fit">
                {(['niche', 'url'] as const).map(mode => (
                  <button key={mode} onClick={() => { setImportMode(mode); setImportResult(null); setResults([]); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${importMode === mode ? 'bg-purple-600 text-white' : 'text-[#888] hover:text-white'}`}>
                    {mode === 'niche' ? 'From RedGifs Niche' : 'Paste URLs'}
                  </button>
                ))}
              </div>

              {/* Niche mode */}
              {importMode === 'niche' && (
                <>
                  <p className="text-xs text-[#666] mb-3">
                    Find a niche on <a href="https://www.redgifs.com/niches" target="_blank" rel="noreferrer" className="text-purple-400 underline">redgifs.com/niches</a> and paste the URL or slug.
                  </p>

                  {savedLinks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[10px] text-[#555] self-center mr-1">Saved:</span>
                      {savedLinks.map(link => (
                        <div key={link._id} className="group/link flex items-center gap-0.5">
                          <button
                            onClick={() => { setNicheInput(link.url); }}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                              nicheInput === link.url
                                ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                                : 'bg-white/5 border-white/10 text-[#999] hover:text-white hover:border-purple-500/30'
                            }`}>
                            {link.label}
                          </button>
                          <button
                            onClick={() => deleteNicheLink(link._id)}
                            className="w-4 h-4 flex items-center justify-center text-[#555] hover:text-red-400 opacity-0 group-hover/link:opacity-100 transition-opacity"
                            title="Remove saved link">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleFetch} className="flex flex-wrap gap-2 mb-4">
                    <input type="text" value={nicheInput} onChange={e => setNicheInput(e.target.value)}
                      placeholder="https://www.redgifs.com/niches/booty-shorts  or  booty-shorts"
                      className="flex-1 min-w-[260px] px-3 py-2.5 bg-[#111] border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50" />
                    <select value={fetchCount} onChange={e => setFetchCount(Number(e.target.value))}
                      className="px-3 py-2.5 bg-[#111] border border-white/10 rounded-xl text-sm text-white outline-none">
                      {[10, 20, 40, 60, 80].map(n => <option key={n} value={n}>{n} videos</option>)}
                    </select>
                    <button type="submit" disabled={searching || !nicheInput.trim()}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
                      {searching ? 'Fetching...' : 'Fetch'}
                    </button>
                  </form>

                  {searchError && <p className="text-red-400 text-sm mb-3">{searchError}</p>}

                  {results.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-[#888]">
                          <span className="text-white font-semibold">{results.length}</span> videos ready
                          <span className="text-[#555] ml-2">— hover to preview, click X to remove unwanted</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 mb-4 max-h-[420px] overflow-y-auto pr-1">
                        {results.map(gif => (
                          <div key={gif.id} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group"
                            onMouseEnter={() => setHoveredId(gif.id)}
                            onMouseLeave={() => setHoveredId(null)}>
                            {hoveredId === gif.id && gif.importUrl.endsWith('.mp4') ? (
                              <video src={gif.importUrl} autoPlay loop muted playsInline
                                className="w-full h-full object-cover" />
                            ) : (
                              <img src={`/api/media/import/proxy?url=${encodeURIComponent(gif.thumbnail)}`}
                                alt="" className="w-full h-full object-cover" loading="lazy" />
                            )}
                            {/* Remove button */}
                            <button onClick={() => removeResult(gif.id)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <StatsBadge views={gif.views} likes={gif.likes} />
                          </div>
                        ))}
                      </div>

                      <button onClick={handleImport} disabled={importing || results.length === 0}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50">
                        {importing && importProgress
                          ? `Importing... ${importProgress.done}/${importProgress.total}`
                          : importing
                          ? 'Starting import...'
                          : `Import ${results.length} into "${activeFolder}"`}
                      </button>
                      {importing && importProgress && (
                        <div className="w-full bg-black/30 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }} />
                        </div>
                      )}
                    </>
                  )}
                  {searching && <div className="text-center py-8 text-[#666] text-sm">Fetching from RedGifs...</div>}
                </>
              )}

              {/* URL paste mode */}
              {importMode === 'url' && (
                <>
                  <p className="text-xs text-[#666] mb-3">Paste direct file URLs — one per line.</p>
                  <textarea value={urlInput} onChange={e => setUrlInput(e.target.value)}
                    placeholder={`https://media.redgifs.com/SomeName.mp4\nhttps://media.redgifs.com/AnotherName.mp4`}
                    rows={5}
                    className="w-full px-3 py-2.5 bg-[#111] border border-white/10 rounded-xl text-sm text-white font-mono outline-none focus:ring-2 focus:ring-purple-500/50 mb-3 resize-y" />
                  <button onClick={handleImport} disabled={importing || urlCount === 0}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50">
                    {importing && importProgress
                      ? `Importing... ${importProgress.done}/${importProgress.total}`
                      : importing
                      ? 'Starting import...'
                      : `Import ${urlCount} file${urlCount !== 1 ? 's' : ''} into "${activeFolder}"`}
                  </button>
                  {importing && importProgress && (
                    <div className="w-full bg-black/30 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }} />
                    </div>
                  )}
                </>
              )}

              {importResult && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${importResult.succeeded > 0 ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-red-900/20 border border-red-700/30'}`}>
                  {importResult.succeeded > 0 && <p className="text-emerald-400 font-semibold">{importResult.succeeded} file{importResult.succeeded > 1 ? 's' : ''} imported into {activeFolder}/</p>}
                  {importResult.failed > 0 && <p className="text-red-400">{importResult.failed} failed</p>}
                </div>
              )}
            </div>
          )}

          {/* File grid — split into Queue and Archive */}
          {(() => {
            const queueFiles = files.filter(f => !postedKeys.has(f.key));
            const archiveFiles = files.filter(f => postedKeys.has(f.key));
            const allFiles = [...queueFiles, ...archiveFiles];

            if (files.length === 0) return (
              <div className="text-center py-16 text-[#888] bg-[#111] rounded-xl border border-dashed border-white/10">
                <p className="mb-2">No files yet</p>
                <p className="text-sm">Use Batch Import or Upload Files above</p>
              </div>
            );

            const renderGrid = (items: FileItem[], startNum: number, draggable: boolean) => (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {items.map((f) => {
                  const globalIdx = files.findIndex(x => x.key === f.key);
                  const isSelected = selectedFiles.has(f.key);
                  const isVideo = /\.(mp4|webm|mov|gif)$/i.test(f.key);
                  const isDragTarget = draggable && dragOverIdx === globalIdx && dragIdx !== globalIdx;
                  return (
                    <div key={f.key}
                      className={`relative group ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${dragIdx === globalIdx ? 'opacity-30' : ''} ${isDragTarget ? 'scale-105' : ''} transition-transform`}
                      draggable={draggable}
                      onDragStart={draggable ? () => handleDragStart(globalIdx) : undefined}
                      onDragOver={draggable ? (e) => handleDragOver(e, globalIdx) : undefined}
                      onDrop={draggable ? () => handleDrop(globalIdx) : undefined}
                      onDragEnd={draggable ? handleDragEnd : undefined}>
                      <div
                        className={`aspect-square bg-[#111] rounded-lg overflow-hidden border transition ${
                          isDragTarget ? 'border-emerald-400 ring-2 ring-emerald-400/30' :
                          isSelected ? 'border-red-500 ring-2 ring-red-500/30' : 'border-white/5 hover:border-white/20'}`}
                        onClick={() => setPreviewFile(f)}>
                        {isVideo
                          ? <video src={f.url} className="w-full h-full object-cover" />
                          : <img src={f.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <div className="absolute bottom-7 right-1.5 text-[9px] bg-black/70 text-white/60 px-1 rounded tabular-nums">
                        #{startNum + items.indexOf(f) + 1}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFileSelect(f.key); }}
                        className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-red-500 border-red-500'
                            : 'border-white/30 bg-black/50 opacity-0 group-hover:opacity-100'}`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <p className="text-xs text-[#888] mt-1 truncate">{f.key.split('/').pop()}</p>
                    </div>
                  );
                })}
              </div>
            );

            return (
              <>
                {/* Queue section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-emerald-400">Queue</h4>
                      <span className="text-xs text-[#666]">{queueFiles.length} pending</span>
                      {queueFiles.length > 0 && <span className="text-[10px] text-[#555]">— drag to reorder</span>}
                    </div>
                    <div className="flex gap-2">
                      {queueFiles.length > 1 && (
                        <button onClick={() => {
                          setFiles(prev => {
                            const queue = prev.filter(f => !postedKeys.has(f.key));
                            const archive = prev.filter(f => postedKeys.has(f.key));
                            for (let i = queue.length - 1; i > 0; i--) {
                              const j = Math.floor(Math.random() * (i + 1));
                              [queue[i], queue[j]] = [queue[j], queue[i]];
                            }
                            return [...queue, ...archive];
                          });
                          setOrderDirty(true);
                        }}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition">
                          Shuffle
                        </button>
                      )}
                      {orderDirty && (
                        <button onClick={saveOrder}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition animate-pulse">
                          Save Order
                        </button>
                      )}
                    </div>
                  </div>
                  {queueFiles.length === 0 ? (
                    <div className="text-center py-8 bg-[#111] rounded-xl border border-dashed border-yellow-700/30 text-sm">
                      <p className="text-yellow-500/80 font-medium mb-1">Queue empty</p>
                      <p className="text-[#666] text-xs">All files have been posted. Archive content will be reused until you import new media.</p>
                    </div>
                  ) : (
                    renderGrid(queueFiles, 0, true)
                  )}
                </div>

                {/* Archive section */}
                {archiveFiles.length > 0 && (
                  <div>
                    <button onClick={() => setShowArchive(v => !v)}
                      className="flex items-center gap-2 mb-2 group">
                      <svg className={`w-3 h-3 text-[#666] transition-transform ${showArchive ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h4 className="text-sm font-semibold text-[#666] group-hover:text-[#999] transition">Archive</h4>
                      <span className="text-xs text-[#555]">{archiveFiles.length} posted</span>
                      <span className="text-[10px] text-[#444]">— will reuse when queue is empty</span>
                    </button>
                    {showArchive && renderGrid(archiveFiles, queueFiles.length, false)}
                  </div>
                )}
              </>
            );
          })()}

          {/* Lightbox preview modal with navigation */}
          {previewFile && (() => {
            const currentIdx = files.findIndex(f => f.key === previewFile.key);
            const hasPrev = currentIdx > 0;
            const hasNext = currentIdx < files.length - 1;
            const goTo = (idx: number) => { if (idx >= 0 && idx < files.length) setPreviewFile(files[idx]); };

            return (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={() => setPreviewFile(null)}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft' && hasPrev) goTo(currentIdx - 1);
                  else if (e.key === 'ArrowRight' && hasNext) goTo(currentIdx + 1);
                  else if (e.key === 'Escape') setPreviewFile(null);
                }}
                tabIndex={0}
                ref={el => el?.focus()}>

                {/* Previous arrow */}
                {hasPrev && (
                  <button onClick={e => { e.stopPropagation(); goTo(currentIdx - 1); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-white/20 rounded-full text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                {/* Next arrow */}
                {hasNext && (
                  <button onClick={e => { e.stopPropagation(); goTo(currentIdx + 1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-white/20 rounded-full text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                <div className="relative max-w-3xl max-h-[85vh] w-full mx-16" onClick={e => e.stopPropagation()}>
                  {/\.(mp4|webm|mov)$/i.test(previewFile.key) ? (
                    <video key={previewFile.key} src={previewFile.url} autoPlay loop controls playsInline
                      className="w-full max-h-[80vh] rounded-xl object-contain bg-black" />
                  ) : (
                    <img src={previewFile.url} alt="" className="w-full max-h-[80vh] rounded-xl object-contain" />
                  )}
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <button onClick={() => {
                      const nextFile = hasNext ? files[currentIdx + 1] : hasPrev ? files[currentIdx - 1] : null;
                      handleDeleteFiles([previewFile.key]);
                      setPreviewFile(nextFile);
                    }} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition">
                      Delete
                    </button>
                    <button onClick={() => setPreviewFile(null)}
                      className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition">
                      Close
                    </button>
                  </div>
                  <p className="text-center text-xs text-[#666] mt-2">
                    <span className="text-white/40">{currentIdx + 1}/{files.length}</span>
                    {' '}{previewFile.key.split('/').pop()}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {!activeFolder && folders.length > 0 && <div className="text-center py-16 text-[#888]"><p>Select a folder to view or import media</p></div>}
      {!activeFolder && folders.length === 0 && (
        <div className="text-center py-16 text-[#888]">
          <p className="text-lg mb-2">No media folders yet</p>
          <p className="text-sm">Create a folder for each niche and batch import from RedGifs</p>
        </div>
      )}
    </div>
  );
}
