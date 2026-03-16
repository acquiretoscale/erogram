'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Papa from 'papaparse';
import { filterCategories, filterCountries } from '@/app/groups/constants';
import { estimateScheduleDays } from '@/lib/utils/scheduleGenerator';
import { useTaskManager } from './TaskManagerContext';
import { isSpamDescription } from '@/lib/utils/spamCleaner';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface CsvRow {
  name: string;
  telegramLink: string;
  description: string;
  profilePictureUrl: string;
  totalUsers: string;
  category: string;
  country: string;
}

interface ParsedRow extends CsvRow {
  index: number;
  errors: string[];
  isDuplicate: boolean;
  isDbDuplicate: boolean;
  selected: boolean;
}

interface ImportedGroup {
  _id: string;
  name: string;
  slug: string;
  category: string;
  categories?: string[];
  country: string;
  telegramLink: string;
  description: string;
  description_de?: string;
  description_es?: string;
  memberCount: number;
  image: string;
  sourceImageUrl: string | null;
  premiumOnly: boolean;
  status: string;
  scheduledPublishAt?: string;
  importBatchId?: string;
}

interface ImageResult {
  id: string;
  status: 'success' | 'failed' | 'skipped';
}

interface BatchInfo {
  batchId: string;
  count: number;
  date: string;
}

type Phase = 'upload' | 'importing' | 'dispatch' | 'schedule' | 'queue';

// ──────────────────────────────────────
// Column mapping
// ──────────────────────────────────────

function mapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lower = headers.map(h => h.toLowerCase().trim());

  // Exact matches first (highest priority), then substring fallbacks
  const exactPatterns: Record<string, string[]> = {
    telegramLink: ['telegramlink', 'telegram_link', 'telegram link', 'invite_link', 'invite link', 'telegram_url'],
    name: ['name', 'group_name', 'group name', 'title'],
    description: ['description', 'desc', 'about', 'bio'],
    profilePictureUrl: ['profilepictureurl', 'profile_picture_url', 'profile_picture', 'profile picture', 'image', 'picture', 'photo', 'avatar'],
    totalUsers: ['totalusers', 'total_users', 'total users', 'member_count', 'member count', 'members', 'users', 'subscribers'],
    category: ['category', 'cat', 'niche', 'genre', 'type'],
    country: ['country', 'region', 'location', 'geo'],
  };

  // Pass 1: exact match on full header
  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    for (const [field, fieldPatterns] of Object.entries(exactPatterns)) {
      if (!mapping[field] && fieldPatterns.includes(h)) {
        mapping[field] = headers[i];
      }
    }
  }

  // Pass 2: substring fallback for anything still unmapped (skip ambiguous short patterns)
  const substringPatterns: Record<string, string[]> = {
    telegramLink: ['telegram', 'invite'],
    name: ['name', 'title', 'channel'],
    description: ['description', 'desc'],
    profilePictureUrl: ['image', 'picture', 'photo', 'avatar'],
    totalUsers: ['member', 'subscriber', 'users'],
    category: ['category', 'niche'],
    country: ['country', 'region'],
  };

  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    for (const [field, pats] of Object.entries(substringPatterns)) {
      if (!mapping[field] && pats.some(p => h.includes(p))) {
        mapping[field] = headers[i];
      }
    }
  }

  // Pass 3: last resort — match generic 'link' or 'url' for telegramLink only
  if (!mapping.telegramLink) {
    for (let i = 0; i < lower.length; i++) {
      const h = lower[i];
      if ((h === 'link' || h === 'url' || h === 'href') && !Object.values(mapping).includes(headers[i])) {
        mapping.telegramLink = headers[i];
        break;
      }
    }
  }

  return mapping;
}

// ──────────────────────────────────────
// Main Component
// ──────────────────────────────────────

export default function CsvImportTab() {
  const [phase, setPhase] = useState<Phase>('upload');

  // Phase 1: Upload
  const [dragActive, setDragActive] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Importing transition
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [imageProgress, setImageProgress] = useState({ total: 0, done: 0, failed: 0 });
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  // Phase 2: Dispatch
  const [dispatchGroups, setDispatchGroups] = useState<ImportedGroup[]>([]);
  const [dispatchSelected, setDispatchSelected] = useState<Set<string>>(new Set());
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [dispatchPerPage, setDispatchPerPage] = useState(50);
  const [dispatchPage, setDispatchPage] = useState(0);
  const [memberFilter, setMemberFilter] = useState<'all' | '0' | '<50' | '<500' | '500+' | '1k+' | '5k+'>('all');
  const [bulkCountry, setBulkCountry] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [batchId, setBatchId] = useState<string | null>(null);

  // Batch history
  const [recentBatches, setRecentBatches] = useState<BatchInfo[]>([]);

  // Phase 3: Schedule
  const [pendingGroups, setPendingGroups] = useState<ImportedGroup[]>([]);
  const [publishMin, setPublishMin] = useState(3);
  const [publishMax, setPublishMax] = useState(6);
  const [isScheduling, setIsScheduling] = useState(false);

  // Queue
  const [scheduledGroups, setScheduledGroups] = useState<ImportedGroup[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueStats, setQueueStats] = useState({ totalScheduled: 0, nextPublish: '', pendingImages: 0 });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // ──────────────────────────────────────
  // Load batch history on mount
  // ──────────────────────────────────────

  const loadBatchHistory = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/csv-import/schedule?status=pending', { headers: authHeader });
      const groups: ImportedGroup[] = res.data.groups || [];
      const batchMap = new Map<string, { count: number; date: string }>();
      for (const g of groups) {
        const bid = g.importBatchId || 'unknown';
        if (!batchMap.has(bid)) {
          batchMap.set(bid, { count: 0, date: '' });
        }
        const entry = batchMap.get(bid)!;
        entry.count++;
      }
      setRecentBatches(
        Array.from(batchMap.entries()).map(([id, info]) => ({
          batchId: id,
          count: info.count,
          date: info.date,
        }))
      );
    } catch {
      // ignore
    }
  }, [authHeader]);

  useEffect(() => {
    loadBatchHistory();
  }, [loadBatchHistory]);

  // ──────────────────────────────────────
  // Phase 1: File upload + parse
  // ──────────────────────────────────────

  const processRawRows = useCallback(async (rawRows: Record<string, string>[], mapping: Record<string, string>) => {
    const rows: ParsedRow[] = rawRows.map((raw, index) => {
      const name = (raw[mapping.name] || '').trim();
      let telegramLink = (raw[mapping.telegramLink] || '').trim();
      const rawDesc = mapping.description ? (raw[mapping.description] || '').trim() : '';
      const description = isSpamDescription(rawDesc) ? '' : rawDesc;
      const profilePictureUrl = mapping.profilePictureUrl ? (raw[mapping.profilePictureUrl] || '').trim() : '';
      const totalUsers = mapping.totalUsers ? (raw[mapping.totalUsers] || '').trim() : '0';
      let category = mapping.category ? (raw[mapping.category] || '').trim() : '';
      const country = mapping.country ? (raw[mapping.country] || '').trim() : '';

      const catLower = category.toLowerCase();
      if (catLower === 'porn' || catLower === 'porn-telegram' || catLower === 'telegram porn' || catLower === 'porn telegram') {
        category = 'Telegram-Porn';
      }

      if (telegramLink) {
        // tg://resolve?domain=username → https://t.me/username
        const tgResolve = telegramLink.match(/^tg:\/\/resolve\?domain=([a-zA-Z0-9_]+)/);
        if (tgResolve) { telegramLink = `https://t.me/${tgResolve[1]}`; }
        // tg://join?invite=HASH → https://t.me/+HASH  (private invite links)
        const tgJoin = telegramLink.match(/^tg:\/\/join\?invite=(.+)/);
        if (tgJoin) { telegramLink = `https://t.me/+${tgJoin[1]}`; }
        // tg://openmessage?user_id=... or other tg:// schemes → strip (unsupported)
        if (telegramLink.startsWith('tg://') && !telegramLink.startsWith('https://')) {
          const domainMatch = telegramLink.match(/domain=([a-zA-Z0-9_]+)/);
          telegramLink = domainMatch ? `https://t.me/${domainMatch[1]}` : '';
        }
        // telegram.me/username → https://t.me/username
        const telegramMe = telegramLink.match(/^https?:\/\/telegram\.me\/(.+)/);
        if (telegramMe) { telegramLink = `https://t.me/${telegramMe[1]}`; }
        // telegram.dog/username → https://t.me/username
        const telegramDog = telegramLink.match(/^https?:\/\/telegram\.dog\/(.+)/);
        if (telegramDog) { telegramLink = `https://t.me/${telegramDog[1]}`; }
        // t.me without protocol
        if (telegramLink.startsWith('t.me/')) telegramLink = `https://${telegramLink}`;
        // http → https
        if (telegramLink.startsWith('http://t.me/')) telegramLink = telegramLink.replace('http://', 'https://');
        // bare username (no protocol, no domain)
        if (telegramLink && !telegramLink.includes('://') && !telegramLink.startsWith('https://')) {
          telegramLink = `https://t.me/${telegramLink.replace(/^@/, '')}`;
        }
      }

      const errors: string[] = [];
      if (!name) errors.push('Missing name');
      if (!telegramLink) errors.push('Missing link');
      else if (!/^https:\/\/t\.me\/.+$/.test(telegramLink)) errors.push('Invalid link');

      return { index, name, telegramLink, description, profilePictureUrl, totalUsers, category, country, errors, isDuplicate: false, isDbDuplicate: false, selected: errors.length === 0 };
    });

    const linkSeen = new Map<string, number>();
    for (const row of rows) {
      if (!row.telegramLink) continue;
      if (linkSeen.has(row.telegramLink)) { row.isDuplicate = true; row.selected = false; }
      else linkSeen.set(row.telegramLink, row.index);
    }

    setParsedRows(rows);

    setCheckingDuplicates(true);
    try {
      const links = rows.filter(r => r.telegramLink && !r.isDuplicate).map(r => r.telegramLink);
      if (links.length > 0) {
        const res = await axios.post('/api/admin/csv-import/check-duplicates', { telegramLinks: links }, { headers: authHeader });
        const dbDupes = new Set(res.data.duplicates.map((d: any) => d.telegramLink));
        setParsedRows(prev => prev.map(r => ({ ...r, isDbDuplicate: dbDupes.has(r.telegramLink), selected: r.selected && !dbDupes.has(r.telegramLink) })));
      }
    } catch { /* ignore */ } finally { setCheckingDuplicates(false); }
  }, [authHeader]);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let data = JSON.parse(e.target?.result as string);

          if (!Array.isArray(data)) {
            const possibleArrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
            if (possibleArrayKey) data = data[possibleArrayKey];
            else { alert('JSON must contain an array of groups (or an object with an array property).'); return; }
          }

          if (data.length === 0) { alert('JSON array is empty.'); return; }

          const sampleKeys = Object.keys(data[0]);
          const mapping = mapColumns(sampleKeys);
          setColumnMapping(mapping);

          if (!mapping.name || !mapping.telegramLink) {
            alert(`Could not auto-detect required fields.\n\nDetected keys: ${sampleKeys.join(', ')}\n\nNeed at least: name/title and link/url fields.`);
            return;
          }

          const rawRows: Record<string, string>[] = data.map((item: any) => {
            const row: Record<string, string> = {};
            for (const key of sampleKeys) {
              row[key] = item[key] != null ? String(item[key]) : '';
            }
            return row;
          });

          await processRawRows(rawRows, mapping);
        } catch (err: any) {
          alert(`JSON parse error: ${err.message}`);
        }
      };
      reader.readAsText(file);
      return;
    }

    if (ext !== 'csv') {
      alert('Please upload a .csv or .json file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields || [];
        const mapping = mapColumns(headers);
        setColumnMapping(mapping);

        if (!mapping.name || !mapping.telegramLink) {
          alert(`Could not auto-detect required columns.\n\nDetected headers: ${headers.join(', ')}\n\nNeed at least: name/title and link/url columns.`);
          return;
        }

        await processRawRows(results.data as Record<string, string>[], mapping);
      },
      error: (err) => alert(`CSV parse error: ${err.message}`),
    });
  }, [processRawRows]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const validRows = parsedRows.filter(r => r.selected && r.errors.length === 0 && !r.isDuplicate && !r.isDbDuplicate);
  const dupeCount = parsedRows.filter(r => r.isDuplicate || r.isDbDuplicate).length;
  const errorCount = parsedRows.filter(r => r.errors.length > 0).length;

  const deleteRow = (index: number) => setParsedRows(prev => prev.filter(r => r.index !== index));
  const deleteAllDuplicates = () => setParsedRows(prev => prev.filter(r => !r.isDuplicate && !r.isDbDuplicate));
  const toggleRow = (index: number) => setParsedRows(prev => prev.map(r => r.index === index ? { ...r, selected: !r.selected } : r));
  const selectAll = () => setParsedRows(prev => prev.map(r => ({ ...r, selected: r.errors.length === 0 && !r.isDuplicate && !r.isDbDuplicate })));
  const deselectAll = () => setParsedRows(prev => prev.map(r => ({ ...r, selected: false })));

  // ──────────────────────────────────────
  // Import → then load dispatch from DB
  // ──────────────────────────────────────

  const loadDispatchFromDB = async (bid: string) => {
    setDispatchLoading(true);
    try {
      const res = await axios.get(`/api/admin/csv-import/schedule?status=pending&batchId=${bid}`, { headers: authHeader });
      const groups: ImportedGroup[] = res.data.groups || [];
      // Also load approved/vault groups from this batch to show full picture
      const res2 = await axios.get(`/api/admin/csv-import/schedule?status=approved&batchId=${bid}`, { headers: authHeader });
      const approved: ImportedGroup[] = res2.data.groups || [];
      setDispatchGroups([...groups, ...approved]);
    } catch (err) {
      console.error('Failed to load batch groups:', err);
    } finally {
      setDispatchLoading(false);
    }
  };

  const openBatch = async (bid: string) => {
    setBatchId(bid);
    setPhase('dispatch');
    await loadDispatchFromDB(bid);
  };

  const startImport = async () => {
    setPhase('importing');
    setIsImporting(true);
    setImportError('');

    try {
      const rowsToImport = parsedRows
        .filter(r => r.selected && r.errors.length === 0)
        .map(r => ({ name: r.name, telegramLink: r.telegramLink, description: r.description, profilePictureUrl: r.profilePictureUrl, totalUsers: r.totalUsers, category: r.category, country: r.country }));

      const res = await axios.post('/api/admin/csv-import', { rows: rowsToImport }, { headers: authHeader });
      const data = res.data;
      setIsImporting(false);

      if (data.imported === 0) {
        setImportError(`Nothing imported — ${data.csvDuplicates} CSV duplicates, ${data.dbDuplicates} already in database.`);
        return;
      }

      const newBatchId = data.batchId;
      setBatchId(newBatchId);

      // Process images in background
      const groupsWithImages = (data.groups || []).filter((g: any) => g.sourceImageUrl);
      if (groupsWithImages.length > 0) {
        setIsProcessingImages(true);
        setImageProgress({ total: groupsWithImages.length, done: 0, failed: 0 });
        for (let i = 0; i < groupsWithImages.length; i += 5) {
          const batch = groupsWithImages.slice(i, i + 5);
          try {
            const imgRes = await axios.post('/api/admin/csv-import/process-images', { groupIds: batch.map((g: any) => g._id) }, { headers: authHeader });
            const results: ImageResult[] = imgRes.data.results;
            setImageProgress(prev => ({ ...prev, done: prev.done + results.filter(r => r.status === 'success').length, failed: prev.failed + results.filter(r => r.status === 'failed').length }));
          } catch { setImageProgress(prev => ({ ...prev, failed: prev.failed + batch.length })); }
        }
        setIsProcessingImages(false);
      }

      // Load dispatch from DB (reliable source of truth)
      setPhase('dispatch');
      await loadDispatchFromDB(newBatchId);
      loadBatchHistory();
    } catch (err: any) {
      setImportError(err.response?.data?.message || err.message || 'Import failed');
      setIsImporting(false);
    }
  };

  // ──────────────────────────────────────
  // Phase 2: Dispatch actions
  // ──────────────────────────────────────

  const toggleDispatchSelect = (id: string) => {
    setDispatchSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const filteredDispatch = useMemo(() => {
    if (memberFilter === 'all') return dispatchGroups;
    return dispatchGroups.filter(g => {
      const m = g.memberCount || 0;
      switch (memberFilter) {
        case '0': return m === 0;
        case '<50': return m < 50;
        case '<500': return m < 500;
        case '500+': return m >= 500;
        case '1k+': return m >= 1000;
        case '5k+': return m >= 5000;
        default: return true;
      }
    });
  }, [dispatchGroups, memberFilter]);
  const pagedDispatch = filteredDispatch.slice(dispatchPage * dispatchPerPage, (dispatchPage + 1) * dispatchPerPage);
  const dispatchTotalPages = Math.max(1, Math.ceil(filteredDispatch.length / dispatchPerPage));
  const selectAllDispatch = () => setDispatchSelected(new Set(dispatchGroups.map(g => g._id)));
  const selectPageDispatch = () => setDispatchSelected(prev => { const next = new Set(prev); pagedDispatch.forEach(g => next.add(g._id)); return next; });
  const deselectAllDispatch = () => setDispatchSelected(new Set());

  const dispatchBulkAction = async (action: 'vault' | 'unvault' | 'approve' | 'delete' | 'category') => {
    const ids = Array.from(dispatchSelected);
    if (ids.length === 0) return;
    setDispatchLoading(true);
    try {
      if (action === 'delete') {
        await axios.delete('/api/admin/csv-import/dispatch', { headers: authHeader, data: { groupIds: ids } });
        setDispatchGroups(prev => prev.filter(g => !dispatchSelected.has(g._id)));
      } else if (action === 'vault') {
        await axios.put('/api/admin/csv-import/dispatch', { groupIds: ids, updates: { premiumOnly: true, status: 'approved' } }, { headers: authHeader });
        setDispatchGroups(prev => prev.map(g => dispatchSelected.has(g._id) ? { ...g, premiumOnly: true, status: 'approved' } : g));
      } else if (action === 'unvault') {
        await axios.put('/api/admin/csv-import/dispatch', { groupIds: ids, updates: { premiumOnly: false } }, { headers: authHeader });
        setDispatchGroups(prev => prev.map(g => dispatchSelected.has(g._id) ? { ...g, premiumOnly: false } : g));
      } else if (action === 'approve') {
        await axios.put('/api/admin/csv-import/dispatch', { groupIds: ids, updates: { status: 'approved' } }, { headers: authHeader });
        setDispatchGroups(prev => prev.map(g => dispatchSelected.has(g._id) ? { ...g, status: 'approved' } : g));
      } else if (action === 'category' && bulkCategory) {
        await axios.put('/api/admin/csv-import/dispatch', { groupIds: ids, updates: { addCategory: bulkCategory } }, { headers: authHeader });
        setDispatchGroups(prev => prev.map(g => {
          if (!dispatchSelected.has(g._id)) return g;
          const cats = g.categories || [g.category].filter(Boolean);
          if (cats.includes(bulkCategory) || cats.length >= 3) return g;
          return { ...g, categories: [...cats, bulkCategory] };
        }));
        setBulkCategory('');
      }
      setDispatchSelected(new Set());
    } catch (err) {
      console.error('Dispatch action failed:', err);
      alert('Action failed.');
    } finally { setDispatchLoading(false); }
  };

  const cleanDescs = async (mode: 'spam' | 'all') => {
    const pool = dispatchSelected.size > 0
      ? dispatchGroups.filter(g => dispatchSelected.has(g._id))
      : dispatchGroups;
    const targets = mode === 'all'
      ? pool.filter(g => g.description)
      : pool.filter(g => g.description && isSpamDescription(g.description));
    if (targets.length === 0) { alert(mode === 'all' ? 'No descriptions to clear.' : `No spam detected in ${pool.length} group(s).\nSpam is auto-cleaned on import. Use "Clear All Desc" to wipe remaining.`); return; }
    const msg = mode === 'all'
      ? `Clear ALL descriptions from ${targets.length} group(s)?\n\nThis wipes every description so AI can rewrite from scratch.`
      : `Found ${targets.length} spam description(s) out of ${pool.length}.\n\nClear them so AI can rewrite from scratch?`;
    if (!confirm(msg)) return;
    setDispatchLoading(true);
    try {
      const groupIds = targets.map(g => g._id);
      await axios.put('/api/admin/csv-import/dispatch', { groupIds, updates: { description: '' } }, { headers: authHeader });
      setDispatchGroups(prev => prev.map(g => groupIds.includes(g._id) ? { ...g, description: '' } : g));
      alert(`Cleared ${targets.length} description(s). Run AI Rewrite to generate fresh ones.`);
    } catch { alert('Failed to clean descriptions.'); }
    finally { setDispatchLoading(false); }
  };

  const saveInlineEdit = async (groupId: string) => {
    const group = dispatchGroups.find(g => g._id === groupId);
    if (!group) { setEditingGroup(null); return; }
    const updates: Record<string, string> = {};
    if (editValues.name !== undefined && editValues.name !== group.name) updates.name = editValues.name;
    if (editValues.category && editValues.category !== group.category) updates.category = editValues.category;
    if (editValues.country && editValues.country !== group.country) updates.country = editValues.country;
    if (editValues.description !== undefined && editValues.description !== group.description) updates.description = editValues.description;
    if (Object.keys(updates).length === 0) { setEditingGroup(null); setEditValues({}); return; }
    try {
      await axios.put('/api/admin/csv-import/dispatch', { groupIds: [groupId], updates }, { headers: authHeader });
      setDispatchGroups(prev => prev.map(g => g._id === groupId ? { ...g, ...updates } : g));
    } catch { /* ignore */ }
    setEditingGroup(null);
    setEditValues({});
  };

  const schedulableGroups = dispatchGroups.filter(g => g.status !== 'scheduled');
  const schedulableFeed = schedulableGroups.filter(g => !g.premiumOnly);
  const schedulableVault = schedulableGroups.filter(g => g.premiumOnly);

  const deleteEntireBatch = async (bid: string) => {
    if (!confirm(`DELETE entire batch (${bid.slice(0, 8)}...)? This removes ALL groups from this import permanently.`)) return;
    setDispatchLoading(true);
    try {
      // Get all group IDs in this batch (any status)
      const [pendingRes, approvedRes, scheduledRes] = await Promise.all([
        axios.get(`/api/admin/csv-import/schedule?status=pending&batchId=${bid}`, { headers: authHeader }),
        axios.get(`/api/admin/csv-import/schedule?status=approved&batchId=${bid}`, { headers: authHeader }),
        axios.get(`/api/admin/csv-import/schedule?status=scheduled&batchId=${bid}`, { headers: authHeader }),
      ]);
      const allIds = [
        ...(pendingRes.data.groups || []).map((g: any) => g._id),
        ...(approvedRes.data.groups || []).map((g: any) => g._id),
        ...(scheduledRes.data.groups || []).map((g: any) => g._id),
      ];
      if (allIds.length === 0) { alert('No groups found in this batch.'); setDispatchLoading(false); return; }
      await axios.delete('/api/admin/csv-import/dispatch', { headers: authHeader, data: { groupIds: allIds } });
      setDispatchGroups([]);
      setBatchId(null);
      setPhase('upload');
      loadBatchHistory();
      alert(`Deleted ${allIds.length} groups from batch.`);
    } catch (err) {
      console.error('Delete batch failed:', err);
      alert('Failed to delete batch.');
    } finally { setDispatchLoading(false); }
  };

  // Fetch Telegram profile photos for groups missing images
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const [photoProgress, setPhotoProgress] = useState({ total: 0, done: 0, failed: 0 });

  // Fetch member counts from Telegram
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [usersProgress, setUsersProgress] = useState({ total: 0, done: 0, success: 0 });

  const fetchTelegramPhotos = async () => {
    const missingImage = dispatchGroups.filter(g => !g.image || g.image === '/assets/image.jpg' || g.image === '/assets/placeholder-no-image.png');
    if (missingImage.length === 0) { alert('All groups already have images.'); return; }

    setFetchingPhotos(true);
    setPhotoProgress({ total: missingImage.length, done: 0, failed: 0 });

    const failedNames: string[] = [];
    const skippedNames: string[] = [];

    for (let i = 0; i < missingImage.length; i += 5) {
      const batch = missingImage.slice(i, i + 5);
      try {
        const res = await axios.post('/api/admin/csv-import/fetch-photos', { groupIds: batch.map(g => g._id), force: false }, { headers: authHeader });
        const results = res.data.results || [];
        let ok = 0, fail = 0;
        for (const r of results) {
          if (r.status === 'success' && r.url) {
            ok++;
            setDispatchGroups(prev => prev.map(g => g._id === r.id ? { ...g, image: r.url } : g));
          } else if (r.status === 'failed') {
            fail++;
            const grp = batch.find(g => g._id === r.id);
            failedNames.push(`${grp?.name || r.id}: ${r.error}`);
          } else if (r.status === 'skipped') {
            const grp = batch.find(g => g._id === r.id);
            skippedNames.push(`${grp?.name || r.id}: ${r.error}`);
          }
        }
        setPhotoProgress(prev => ({ ...prev, done: prev.done + ok, failed: prev.failed + fail }));
      } catch {
        setPhotoProgress(prev => ({ ...prev, failed: prev.failed + batch.length }));
      }
      if (i + 5 < missingImage.length) await new Promise(r => setTimeout(r, 3000));
    }
    setFetchingPhotos(false);

    if (failedNames.length > 0 || skippedNames.length > 0) {
      const msg = [
        failedNames.length > 0 ? `Failed (${failedNames.length}):\n${failedNames.slice(0, 15).join('\n')}${failedNames.length > 15 ? `\n...and ${failedNames.length - 15} more` : ''}` : '',
        skippedNames.length > 0 ? `Skipped (${skippedNames.length}):\n${skippedNames.slice(0, 10).join('\n')}` : '',
      ].filter(Boolean).join('\n\n');
      alert(msg);
    }
  };

  const fetchTelegramUsers = async () => {
    const target = dispatchSelected.size > 0
      ? dispatchGroups.filter(g => dispatchSelected.has(g._id) && (g.memberCount || 0) === 0)
      : dispatchGroups.filter(g => (g.memberCount || 0) === 0);

    if (target.length === 0) { alert('All groups already have member counts.'); return; }

    setFetchingUsers(true);
    setUsersProgress({ total: target.length, done: 0, success: 0 });
    let totalSuccess = 0;

    for (let i = 0; i < target.length; i += 10) {
      const batch = target.slice(i, i + 10);
      try {
        const res = await axios.post('/api/admin/csv-import/fetch-users', { groupIds: batch.map(g => g._id) }, { headers: authHeader });
        const results = res.data.results || [];
        for (const r of results) {
          if (r.status === 'success' && r.memberCount) {
            totalSuccess++;
            setDispatchGroups(prev => prev.map(g => g._id === r.id ? { ...g, memberCount: r.memberCount } : g));
          }
        }
      } catch { /* continue */ }
      setUsersProgress({ total: target.length, done: Math.min(i + 10, target.length), success: totalSuccess });
      if (i + 10 < target.length) await new Promise(r => setTimeout(r, 1500));
    }

    setFetchingUsers(false);
    alert(`Done! Fetched member counts for ${totalSuccess} of ${target.length} groups.`);
  };

  // ──────────────────────────────────────
  // AI Enrichment (legacy state for modal — removed, using Rewrite action instead)
  // ──────────────────────────────────────

  // ──────────────────────────────────────
  // AI Actions (Qwen/DeepSeek via /api/admin/translate)
  // ──────────────────────────────────────

  const [aiActionRunning, setAiActionRunning] = useState(false);
  const [aiActionLabel, setAiActionLabel] = useState('');
  const [aiDone, setAiDone] = useState<Record<string, Set<string>>>({});
  const aiAbortRef = useRef(false);
  const [importAiModel, setImportAiModel] = useState<'qwen' | 'deepseek' | 'both'>('qwen');
  const { addTask, updateTask, finishTask } = useTaskManager();
  const importTaskIdRef = useRef('');

  const AI_CATEGORIZE_SYSTEM = `You are a category classification specialist for Erogram.pro, an adult NSFW Telegram groups directory.

You MUST assign EXACTLY 2 or 3 categories from this EXACT list (use exact spelling, case-sensitive):
${filterCategories.filter(c => c !== 'All').join(', ')}

HOW TO CATEGORIZE:
1. READ THE GROUP NAME — strongest signal. "Hot Desi Girls" = Asian. "Lesbian Paradise" = Lesbian.
2. READ THE DESCRIPTION — identify the ACTUAL content type.
3. DETECT COUNTRY from the group name and topic, NOT from spam/disclaimers in the description.

CRITICAL: Many descriptions contain MIXED LANGUAGES from spam and ads unrelated to the group. A "Colombian Girls" group with Russian disclaimers is Colombian, NOT Russian. Only assign a country when the GROUP NAME or ACTUAL TOPIC clearly indicates it.

Country mappings: Brazilian/Portuguese → "Brazil", Chinese → "China", Japanese → "Japan", Russian → "Russian", German → "Germany", Spanish → "Spain", British → "UK", American → "USA", Colombian → "Colombia", Mexican → "Mexico", French → "France", Italian → "Italy", Filipino → "Philippines", Vietnamese → "Vietnam", Argentine → "Argentina", Ukrainian → "Ukraine"

- MINIMUM 2 categories, MAXIMUM 3. NEVER return only 1.
- Pick SPECIFIC niches first. "Telegram-Porn" or "Amateur" as fallbacks.
- Format: [N] Category1 | Category2 | Category3
- Return ONLY categorizations, no explanations.`;

  const AI_REWRITE_SYSTEM = `You are an expert SEO content writer for Erogram.pro, a Telegram groups directory.

CRITICAL: You MUST write ALL descriptions in ENGLISH regardless of the source language. If the original description is in Portuguese, Spanish, Russian, or any other language, translate and rewrite it into fluent English.

Rules:
- ALWAYS output in ENGLISH — never in Portuguese, Spanish, or any other language
- Rewrite each description to be UNIQUE and human-written to avoid duplicate content penalties
- Each description must be 200+ characters minimum
- NO filler words (no "Join now!", "Best group!", "Don't miss!", "Click here!", "Amazing!")
- Identify the NICHE from the group name, category, members, and description — write about it specifically
- Mention the group name naturally. If non-Latin script (Chinese, Russian, Arabic, Korean), keep original + [English meaning]
- Use member count for credibility when available
- Each description MUST be unique — vary structure, vocabulary, approach
- Format: [0], [1], [2]... (zero-based indices matching input order) followed by the rewritten text
- Return ONLY lines in [N] rewritten_text format, no explanations`;

  const AI_TRANSLATE_SYSTEM = (lang: string) => `You are a native ${lang} speaker writing for Erogram.pro — an adult NSFW Telegram groups directory.

Rules:
- DO NOT translate word-for-word. Rewrite naturally in ${lang} as a native speaker would phrase it
- Use everyday slang, tone, and vocabulary that ${lang}-speaking adults use when discussing NSFW content online
- Write like a real person — casual, direct, sex-positive. Adult industry directory, not corporate
- Each description must be 200+ characters — expand thin descriptions using niche knowledge
- NO filler words. Talk about the NICHE specifically using terms native ${lang} speakers search for
- Preserve brand names: Erogram, Telegram
- If group name is non-Latin, keep original script AND add [English meaning]
- Prioritize how a ${lang} speaker would naturally search for and describe this content
- Format: [N] translated_text
- Return ONLY translations in [N] format, no explanations`;

  const runAiAction = async (actionMode: 'categorize' | 'rewrite' | 'translate_de' | 'translate_es') => {
    const ids = Array.from(dispatchSelected);
    if (ids.length === 0) { alert('Select groups first.'); return; }

    const mode = actionMode.startsWith('translate') ? 'translate' : actionMode;
    const targetLang = actionMode === 'translate_de' ? 'de' : actionMode === 'translate_es' ? 'es' : 'en';
    const targetField = mode === 'categorize' ? 'category' : mode === 'rewrite' ? 'description' : `description_${targetLang}`;
    const langName = targetLang === 'de' ? 'German' : targetLang === 'es' ? 'Spanish' : 'English';

    const systemPrompt = mode === 'categorize' ? AI_CATEGORIZE_SYSTEM
      : mode === 'rewrite' ? AI_REWRITE_SYSTEM
      : AI_TRANSLATE_SYSTEM(langName);

    const userPromptTemplate = mode === 'categorize'
      ? `Classify these {{count}} groups into categories. If a group already has categories listed, ADD more specific ones to reach 2-3 total — do NOT remove existing valid categories. NEVER return only 1 category. Return [N] Category1 | Category2 | Category3:\n\n{{groups}}`
      : mode === 'rewrite'
      ? `Rewrite these {{count}} group descriptions IN ENGLISH for SEO. If the source is in Portuguese, Spanish, or any other language, translate it to English. Each must be 200+ chars, unique, human-like, niche-specific. Use [0], [1], [2]... (zero-based) matching the input. Return each on its own line:\n\n{{groups}}`
      : `Translate these {{count}} group descriptions to {{language}}. Each 200+ characters, niche-specific. Return [N] translated_text:\n\n{{groups}}`;

    const label = mode === 'categorize' ? 'Categorizing' : mode === 'rewrite' ? 'Rewriting' : `Translating → ${langName}`;
    aiAbortRef.current = false;
    setAiActionRunning(true);
    setAiActionLabel(label);

    const tid = `import_ai_${Date.now()}`;
    importTaskIdRef.current = tid;
    addTask(tid, `Import ${label}: ${ids.length} groups`, ids.length);

    let totalProcessed = 0;
    let totalErrors = 0;

    try {
      const CHUNK = 5;
      let chunkIdx = 0;
      for (let i = 0; i < ids.length; i += CHUNK) {
        if (aiAbortRef.current) break;
        const chunk = ids.slice(i, i + CHUNK);
        const chunkModel: 'qwen' | 'deepseek' = importAiModel === 'both'
          ? (chunkIdx % 2 === 0 ? 'qwen' : 'deepseek')
          : importAiModel;
        chunkIdx++;
        try {
          const res = await axios.post('/api/admin/translate', {
            groupIds: chunk,
            targetLanguage: targetLang,
            targetField,
            systemPrompt,
            userPromptTemplate,
            mode,
            dryRun: false,
            aiModel: chunkModel,
          }, { headers: authHeader });

          const results = res.data.results || {};
          const count = Object.keys(results).length;
          totalProcessed += count;

          console.log(`[AI Action] Chunk response:`, { processed: res.data.processed, saved: res.data.saved, errors: res.data.errors, resultCount: count, sampleKeys: Object.keys(results).slice(0, 3) });
          if (count === 0) {
            console.warn(`[AI Action] Empty results for chunk. Full response:`, res.data);
          }

          const doneIds = Object.keys(results);
          if (doneIds.length > 0) {
            setAiDone(prev => {
              const next = { ...prev };
              for (const id of doneIds) {
                if (!next[id]) next[id] = new Set();
                next[id] = new Set([...next[id], actionMode]);
              }
              return next;
            });
          }

          if (mode === 'categorize' && count > 0) {
            const validSet = new Set(filterCategories.map(c => c.toLowerCase()));
            setDispatchGroups(prev => prev.map(g => {
              const raw = results[g._id];
              if (!raw) return g;
              const allCats = raw.split('|').map((c: string) => c.trim()).filter(Boolean)
                .filter((c: string) => validSet.has(c.toLowerCase()));
              return { ...g, category: allCats[0] || g.category, categories: allCats.length ? allCats : g.categories };
            }));
          } else if ((mode === 'rewrite' || mode === 'translate') && count > 0) {
            setDispatchGroups(prev => prev.map(g => {
              const val = results[g._id];
              if (!val) return g;
              if (mode === 'rewrite') return { ...g, description: val };
              if (actionMode === 'translate_de') return { ...g, description_de: val };
              if (actionMode === 'translate_es') return { ...g, description_es: val };
              return g;
            }));
          }
        } catch (err: any) {
          console.error(`AI chunk failed:`, err);
          totalErrors += chunk.length;
        }

        const processed = Math.min(i + CHUNK, ids.length);
        setAiActionLabel(`${aiAbortRef.current ? 'Stopped' : label} ${processed}/${ids.length}`);
        updateTask(importTaskIdRef.current, totalProcessed);
      }

      if (batchId && totalProcessed > 0) {
        await loadDispatchFromDB(batchId);
      }

      const stopped = aiAbortRef.current;
      finishTask(importTaskIdRef.current, stopped ? 'stopped' : totalProcessed > 0 ? 'done' : 'error',
        totalErrors > 0 ? `${totalErrors} errors` : undefined);

      const msg = stopped
        ? `Stopped. ${totalProcessed} groups saved so far.`
        : totalErrors > 0
        ? `${label} done: ${totalProcessed} processed, ${totalErrors} errors.`
        : totalProcessed === 0
        ? `${label} finished but 0 results parsed. Check server logs (F12).`
        : `${label} complete: ${totalProcessed} groups updated.`;
      alert(msg);
    } catch (err: any) {
      finishTask(importTaskIdRef.current, 'error', err.message);
      alert(`AI action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setAiActionRunning(false);
      setAiActionLabel('');
    }
  };

  // ──────────────────────────────────────
  // Phase 3: Schedule
  // ──────────────────────────────────────

  const [scheduleType, setScheduleType] = useState<'feed' | 'vault' | 'all'>('all');

  const goToSchedule = async (type: 'feed' | 'vault' | 'all' | 'selected' = 'all') => {
    setScheduleType(type === 'selected' ? 'all' : type);
    let groups: ImportedGroup[];

    if (type === 'selected') {
      groups = dispatchGroups.filter(g => dispatchSelected.has(g._id) && g.status !== 'scheduled');
    } else if (type === 'feed') {
      groups = schedulableFeed;
    } else if (type === 'vault') {
      groups = schedulableVault;
    } else {
      groups = schedulableGroups;
    }

    if (groups.length === 0 && batchId) {
      try {
        const [r1, r2] = await Promise.all([
          axios.get(`/api/admin/csv-import/schedule?status=pending&batchId=${batchId}`, { headers: authHeader }),
          axios.get(`/api/admin/csv-import/schedule?status=approved&batchId=${batchId}`, { headers: authHeader }),
        ]);
        const dbGroups: ImportedGroup[] = [...(r1.data.groups || []), ...(r2.data.groups || [])];
        if (type === 'feed') groups = dbGroups.filter(g => !g.premiumOnly);
        else if (type === 'vault') groups = dbGroups.filter(g => g.premiumOnly);
        else groups = dbGroups;
      } catch { /* use empty */ }
    }

    setPendingGroups(groups);
    setPhase('schedule');
  };

  const startScheduling = async () => {
    if (pendingGroups.length === 0) return;
    setIsScheduling(true);
    try {
      await axios.post('/api/admin/csv-import/start-schedule', { groupIds: pendingGroups.map(g => g._id), publishRate: { min: publishMin, max: publishMax } }, { headers: authHeader });
      const scheduledIds = new Set(pendingGroups.map(g => g._id));
      setDispatchGroups(prev => prev.map(g => scheduledIds.has(g._id) ? { ...g, status: 'scheduled' } : g));
      setPendingGroups([]);
      setPhase('queue');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Scheduling failed');
    } finally { setIsScheduling(false); }
  };

  const scheduleNow = async (groupIds: string[]) => {
    if (groupIds.length === 0) { alert('No groups to schedule.'); return; }
    setDispatchLoading(true);
    try {
      const res = await axios.post('/api/admin/csv-import/start-schedule', {
        groupIds,
        publishRate: { min: publishMin, max: publishMax },
      }, { headers: authHeader });
      const ids = new Set(groupIds);
      setDispatchGroups(prev => prev.map(g => ids.has(g._id) ? { ...g, status: 'scheduled' } : g));
      setDispatchSelected(new Set());
      alert(`Scheduled ${res.data.scheduled} groups (${publishMin}-${publishMax}/day). First: ${res.data.firstDate ? new Date(res.data.firstDate).toLocaleDateString() : '—'}, Last: ${res.data.lastDate ? new Date(res.data.lastDate).toLocaleDateString() : '—'}`);
      setPhase('queue');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Scheduling failed');
    } finally { setDispatchLoading(false); }
  };

  // ──────────────────────────────────────
  // Queue
  // ──────────────────────────────────────

  const loadQueue = async () => {
    setLoadingQueue(true);
    try {
      const res = await axios.get('/api/admin/csv-import/schedule', { headers: authHeader });
      setScheduledGroups(res.data.groups || []);
      setQueueStats({ totalScheduled: res.data.totalScheduled, nextPublish: res.data.nextPublish, pendingImages: res.data.pendingImages });
    } catch { /* ignore */ } finally { setLoadingQueue(false); }
  };

  const publishNow = async (groupId: string) => {
    try {
      await axios.put(`/api/admin/groups/${groupId}`, { status: 'approved' }, { headers: authHeader });
      setScheduledGroups(prev => prev.filter(g => g._id !== groupId));
      setQueueStats(prev => ({ ...prev, totalScheduled: prev.totalScheduled - 1 }));
    } catch { alert('Failed to publish.'); }
  };

  const cancelGroup = async (groupId: string) => {
    if (!confirm('Remove from schedule?')) return;
    try {
      await axios.delete('/api/admin/csv-import/schedule', { headers: authHeader, data: { groupId } });
      setScheduledGroups(prev => prev.filter(g => g._id !== groupId));
      setQueueStats(prev => ({ ...prev, totalScheduled: prev.totalScheduled - 1 }));
    } catch { /* ignore */ }
  };

  const cancelBatch = async (bid: string) => {
    if (!confirm('Cancel ALL groups from this batch?')) return;
    try {
      await axios.delete('/api/admin/csv-import/schedule', { headers: authHeader, data: { batchId: bid } });
      loadQueue();
    } catch { /* ignore */ }
  };

  const [reschedulingGroup, setReschedulingGroup] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState('');
  const [queueEditingGroup, setQueueEditingGroup] = useState<string | null>(null);
  const [queueEditValues, setQueueEditValues] = useState<Record<string, string>>({});
  const [queueSelected, setQueueSelected] = useState<Set<string>>(new Set());

  const toggleQueueSelect = (id: string) => {
    setQueueSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const saveQueueEdit = async (groupId: string) => {
    const group = scheduledGroups.find(g => g._id === groupId);
    if (!group) { setQueueEditingGroup(null); return; }
    const updates: Record<string, string> = {};
    if (queueEditValues.name !== undefined && queueEditValues.name !== group.name) updates.name = queueEditValues.name;
    if (queueEditValues.category && queueEditValues.category !== group.category) updates.category = queueEditValues.category;
    if (queueEditValues.country && queueEditValues.country !== group.country) updates.country = queueEditValues.country;
    if (queueEditValues.description !== undefined && queueEditValues.description !== group.description) updates.description = queueEditValues.description;
    if (Object.keys(updates).length === 0) { setQueueEditingGroup(null); setQueueEditValues({}); return; }
    try {
      await axios.put('/api/admin/csv-import/dispatch', { groupIds: [groupId], updates }, { headers: authHeader });
      setScheduledGroups(prev => prev.map(g => g._id === groupId ? { ...g, ...updates } : g));
    } catch { alert('Save failed.'); }
    setQueueEditingGroup(null);
    setQueueEditValues({});
  };

  const queueBulkVault = async () => {
    const ids = Array.from(queueSelected);
    if (ids.length === 0) return;
    try {
      await axios.put('/api/admin/csv-import/dispatch', { groupIds: ids, updates: { premiumOnly: true, status: 'approved' } }, { headers: authHeader });
      setScheduledGroups(prev => prev.filter(g => !queueSelected.has(g._id)));
      setQueueSelected(new Set());
      alert(`${ids.length} group(s) moved to Premium Vault and published instantly.`);
    } catch { alert('Failed.'); }
  };

  const rescheduleGroup = async (groupId: string) => {
    if (!rescheduleValue) return;
    try {
      await axios.put('/api/admin/csv-import/reschedule', { groupId, scheduledPublishAt: new Date(rescheduleValue).toISOString() }, { headers: authHeader });
      setScheduledGroups(prev => {
        const updated = prev.map(g => g._id === groupId ? { ...g, scheduledPublishAt: new Date(rescheduleValue).toISOString() } : g);
        return updated.sort((a, b) => new Date(a.scheduledPublishAt || 0).getTime() - new Date(b.scheduledPublishAt || 0).getTime());
      });
      setReschedulingGroup(null);
      setRescheduleValue('');
    } catch {
      alert('Failed to reschedule.');
    }
  };

  useEffect(() => { if (phase === 'queue') loadQueue(); }, [phase]);

  // ──────────────────────────────────────
  // Render
  // ──────────────────────────────────────

  const phaseLabels: { key: Phase; label: string }[] = [
    { key: 'upload', label: '1. Import' },
    { key: 'dispatch', label: '2. Review & Dispatch' },
    { key: 'schedule', label: '3. Schedule' },
  ];
  const currentPhaseIndex = phaseLabels.findIndex(p => p.key === phase);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[#666] mt-1">Import → Review & Dispatch → Schedule</p>
        </div>
        <div className="flex gap-3">
          {phase !== 'queue' && (phase !== 'upload' || parsedRows.length > 0 || dispatchGroups.length > 0) && (
            <button onClick={() => { setPhase('upload'); setParsedRows([]); setDispatchGroups([]); setBatchId(null); setImportError(''); setColumnMapping({}); }} className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 transition-colors">
              New Import
            </button>
          )}
          <button onClick={() => setPhase(phase === 'queue' ? 'upload' : 'queue')} className="px-4 py-2 rounded-xl text-sm font-medium bg-[#b31b1b] hover:bg-[#c42b2b] text-white transition-colors">
            {phase === 'queue' ? 'Import' : 'Scheduled Queue'}
          </button>
        </div>
      </div>

      {/* Phase indicator */}
      {phase !== 'queue' && phase !== 'importing' && (
        <div className="flex items-center gap-2 mb-6">
          {phaseLabels.map((p, i) => (
            <div key={p.key} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${phase === p.key ? 'bg-[#b31b1b] text-white' : currentPhaseIndex > i ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-[#666]'}`}>
                {currentPhaseIndex > i ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${phase === p.key ? 'text-white' : 'text-[#666]'}`}>{p.label}</span>
              {i < phaseLabels.length - 1 && <div className="w-8 h-px bg-white/10" />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ─── PHASE 1: Upload ─── */}
        {phase === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {parsedRows.length === 0 ? (
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer ${dragActive ? 'border-[#b31b1b] bg-[#b31b1b]/5' : 'border-white/10 hover:border-white/20'}`}
                  onClick={() => document.getElementById('csv-file-input')?.click()}
                >
                  <div className="text-5xl mb-4">📄</div>
                  <h3 className="text-xl font-bold mb-2">Upload CSV or JSON</h3>
                  <p className="text-[#666] mb-4">Drag and drop or click to browse</p>
                  <div className="flex justify-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">.csv</span>
                    <span className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">.json</span>
                  </div>
                  <p className="text-xs text-[#444]">Fields: name/title, link/url, description, category, country, image, members</p>
                  <input id="csv-file-input" type="file" accept=".csv,.json" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>

                {/* Recent batches */}
                {recentBatches.length > 0 && (
                  <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/5">
                    <h4 className="text-sm font-bold text-[#999] mb-3">Recent Imports (pending dispatch)</h4>
                    <div className="space-y-2">
                      {recentBatches.map(b => (
                        <div key={b.batchId} className="flex items-center gap-2">
                          <button
                            onClick={() => openBatch(b.batchId)}
                            className="flex-1 flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors text-left"
                          >
                            <div>
                              <span className="text-sm font-medium text-white">{b.count} groups pending</span>
                              <span className="text-xs text-[#666] ml-2">Batch: {b.batchId.slice(0, 8)}...</span>
                            </div>
                            <span className="text-xs text-[#b31b1b] font-medium">Open →</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteEntireBatch(b.batchId); }}
                            className="px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
                            title="Delete entire batch"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Stats */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">✓ {validRows.length} valid</div>
                  {dupeCount > 0 && <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">⚠ {dupeCount} duplicates</div>}
                  {errorCount > 0 && <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">✕ {errorCount} errors</div>}
                  {checkingDuplicates && <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm animate-pulse">Checking database...</div>}
                </div>

                {/* Column mapping */}
                <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-[#666]">
                  <span className="font-bold text-[#999]">Detected:</span>{' '}
                  {Object.entries(columnMapping).map(([f, h]) => <span key={f} className="mr-3">{f} → <span className="text-white">{h}</span></span>)}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mb-4">
                  <button onClick={() => { setParsedRows([]); setColumnMapping({}); setImportError(''); }} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors font-medium">← Start Over</button>
                  <button onClick={selectAll} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Select All Valid</button>
                  <button onClick={deselectAll} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Deselect All</button>
                  {dupeCount > 0 && <button onClick={deleteAllDuplicates} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">Delete {dupeCount} Duplicates</button>}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="p-3 text-left w-10">✓</th>
                        <th className="p-3 text-left">#</th>
                        <th className="p-3 text-left w-12">Pic</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Link</th>
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-left">Description</th>
                        <th className="p-3 text-left">Users</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 200).map((row) => (
                        <tr key={row.index} className={`border-t border-white/5 transition-colors ${row.isDuplicate || row.isDbDuplicate ? 'bg-yellow-500/5' : row.errors.length > 0 ? 'bg-red-500/5' : row.selected ? 'bg-white/[0.02]' : 'opacity-40'}`}>
                          <td className="p-3"><input type="checkbox" checked={row.selected} onChange={() => toggleRow(row.index)} className="accent-[#b31b1b]" /></td>
                          <td className="p-3 text-[#666]">{row.index + 1}</td>
                          <td className="p-3">
                            {row.profilePictureUrl ? (
                              <img src={row.profilePictureUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-[#444]">?</div>
                            )}
                          </td>
                          <td className="p-3 font-medium max-w-[150px] truncate">{row.name}</td>
                          <td className="p-3 text-blue-400 max-w-[150px] truncate text-xs">{row.telegramLink}</td>
                          <td className="p-3 text-xs">
                            {row.category ? <span className="text-emerald-400">{row.category}</span> : <span className="text-yellow-500/60">—</span>}
                            
                          </td>
                          <td className="p-3 text-[#666] max-w-[180px] truncate text-xs">{row.description || '—'}</td>
                          <td className="p-3">
                            {(() => {
                              const n = parseInt(row.totalUsers) || 0;
                              return n > 0
                                ? <span className={`font-medium tabular-nums ${n < 50 ? 'text-red-400' : n < 500 ? 'text-yellow-400' : 'text-green-400'}`}>{n.toLocaleString()}</span>
                                : <span className="text-red-400/60">—</span>;
                            })()}
                          </td>
                          <td className="p-3">
                            {row.errors.length > 0 && <span className="text-red-400 text-xs">{row.errors.join(', ')}</span>}
                            {row.isDuplicate && <span className="text-yellow-400 text-xs">CSV dupe</span>}
                            {row.isDbDuplicate && <span className="text-yellow-400 text-xs">In DB</span>}
                            {row.errors.length === 0 && !row.isDuplicate && !row.isDbDuplicate && <span className="text-green-400 text-xs">OK</span>}
                          </td>
                          <td className="p-3"><button onClick={() => deleteRow(row.index)} className="text-[#666] hover:text-red-400 transition-colors text-xs" title="Delete row">✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 200 && <div className="p-3 text-center text-[#666] text-xs bg-white/5">Showing first 200 of {parsedRows.length} rows</div>}
                </div>

                <div className="flex justify-end mt-6">
                  <button onClick={startImport} disabled={validRows.length === 0} className="px-8 py-3 rounded-xl font-bold bg-[#b31b1b] hover:bg-[#c42b2b] text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#b31b1b]/20">
                    Import {validRows.length} Groups →
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ─── IMPORTING ─── */}
        {phase === 'importing' && (
          <motion.div key="importing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-16">
            {isImporting && (
              <>
                <div className="text-5xl mb-4 animate-bounce">📤</div>
                <h3 className="text-xl font-bold mb-2">Importing groups...</h3>
                <p className="text-[#666]">Saving to database as pending</p>
              </>
            )}
            {!isImporting && isProcessingImages && (
              <>
                <div className="text-5xl mb-4">🖼️</div>
                <h3 className="text-xl font-bold mb-2">Processing images...</h3>
                <p className="text-[#666] mb-6">{imageProgress.done} / {imageProgress.total} uploaded{imageProgress.failed > 0 && <span className="text-red-400"> ({imageProgress.failed} failed)</span>}</p>
                <div className="max-w-md mx-auto h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#b31b1b] rounded-full transition-all duration-300" style={{ width: `${imageProgress.total > 0 ? ((imageProgress.done + imageProgress.failed) / imageProgress.total) * 100 : 0}%` }} />
                </div>
              </>
            )}
            {importError && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 max-w-md mx-auto">
                {importError}
                <button onClick={() => { setPhase('upload'); setImportError(''); setParsedRows([]); }} className="mt-3 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white block mx-auto">Go Back</button>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── PHASE 2: Review & Dispatch ─── */}
        {phase === 'dispatch' && (
          <motion.div key="dispatch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {dispatchLoading && dispatchGroups.length === 0 ? (
              <div className="text-center py-16 text-[#666]">Loading batch groups...</div>
            ) : dispatchGroups.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-bold text-[#666]">No groups in this batch</h3>
                <button onClick={() => setPhase('upload')} className="mt-4 px-6 py-3 rounded-xl font-medium bg-white/5 hover:bg-white/10 transition-colors">← Back to Import</button>
              </div>
            ) : (
              <>
                {/* Batch info */}
                <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <span className="text-sm text-[#999]">Batch <span className="text-white font-mono">{batchId?.slice(0, 8)}...</span> — {dispatchGroups.length} groups</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => batchId && loadDispatchFromDB(batchId)} disabled={dispatchLoading} className="text-xs text-[#666] hover:text-white transition-colors">↻ Refresh</button>
                    <button onClick={() => batchId && deleteEntireBatch(batchId)} disabled={dispatchLoading} className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors">Delete Entire Batch</button>
                  </div>
                </div>

                {/* Bulk action bar */}
                {dispatchSelected.size > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-bold text-white">{dispatchSelected.size} selected</span>
                    <div className="h-4 w-px bg-white/10" />
                    <button onClick={() => dispatchBulkAction('vault')} disabled={dispatchLoading} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 disabled:opacity-50 transition-colors">→ Premium Vault</button>
                    <button onClick={() => dispatchBulkAction('unvault')} disabled={dispatchLoading} className="px-3 py-1.5 bg-white/5 text-[#999] rounded-lg text-xs font-medium hover:bg-white/10 disabled:opacity-50 transition-colors">→ Feed</button>
                    <button onClick={() => dispatchBulkAction('approve')} disabled={dispatchLoading} className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 disabled:opacity-50 transition-colors">Approve Now (skip schedule)</button>
                    <div className="flex items-center gap-1">
                      <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className="px-2 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none">
                        <option value="">+ Add Category...</option>
                        {filterCategories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      {bulkCategory && (
                        <button onClick={() => dispatchBulkAction('category')} disabled={dispatchLoading} className="px-2 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors">+ Add</button>
                      )}
                    </div>
                    <button onClick={() => dispatchBulkAction('delete')} disabled={dispatchLoading} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors">Delete</button>
                    <button onClick={() => cleanDescs('spam')} disabled={dispatchLoading} className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 disabled:opacity-50 transition-colors">🧹 Clean Spam</button>
                    <button onClick={() => cleanDescs('all')} disabled={dispatchLoading} className="px-3 py-1.5 bg-red-500/10 text-red-400/80 rounded-lg text-xs font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors">🗑️ Clear All Desc</button>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex rounded-lg overflow-hidden border border-white/10">
                      {([{ k: 'qwen', l: 'Q' }, { k: 'deepseek', l: 'DS' }, { k: 'both', l: 'Both' }] as { k: 'qwen' | 'deepseek' | 'both'; l: string }[]).map(m => (
                        <button key={m.k} onClick={() => setImportAiModel(m.k)} className={`px-2 py-1 text-[10px] font-bold transition-colors ${importAiModel === m.k ? (m.k === 'qwen' ? 'bg-blue-600 text-white' : m.k === 'deepseek' ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white') : 'bg-white/5 text-[#666] hover:text-white'}`}>{m.l}</button>
                      ))}
                    </div>
                    <button onClick={() => runAiAction('categorize')} disabled={aiActionRunning} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors">🏷️ Categorize</button>
                    <button onClick={() => runAiAction('rewrite')} disabled={aiActionRunning} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 disabled:opacity-50 transition-colors">✍️ Rewrite in English</button>
                    <button onClick={() => runAiAction('translate_de')} disabled={aiActionRunning} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-colors">🇩🇪 DE</button>
                    <button onClick={() => runAiAction('translate_es')} disabled={aiActionRunning} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-colors">🇪🇸 ES</button>
                    <div className="h-4 w-px bg-white/10" />
                    <button onClick={() => scheduleNow(Array.from(dispatchSelected))} disabled={dispatchLoading} className="px-3 py-1.5 bg-[#b31b1b] text-white rounded-lg text-xs font-bold hover:bg-[#c42b2b] disabled:opacity-50 transition-colors">
                      {dispatchLoading ? 'Scheduling...' : `Schedule ${dispatchSelected.size} Now`}
                    </button>
                  </div>
                )}

                {/* AI action progress */}
                {aiActionRunning && (
                  <div className="mb-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin shrink-0" />
                    <span className="text-sm text-blue-400 font-medium flex-1">{aiActionLabel || 'AI processing...'}</span>
                    <button
                      onClick={() => { aiAbortRef.current = true; }}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {/* Fetch photos bar */}
                {(() => {
                  const missingCount = dispatchGroups.filter(g => !g.image || g.image === '/assets/image.jpg' || g.image === '/assets/placeholder-no-image.png').length;
                  if (missingCount === 0 && !fetchingPhotos) return null;
                  return (
                    <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-3">
                      {fetchingPhotos ? (
                        <>
                          <span className="text-sm text-purple-400 animate-pulse">Fetching photos from Telegram...</span>
                          <span className="text-xs text-[#666]">{photoProgress.done}/{photoProgress.total} done{photoProgress.failed > 0 && <span className="text-red-400"> ({photoProgress.failed} failed)</span>}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-purple-300">{missingCount} groups missing images</span>
                          <button onClick={fetchTelegramPhotos} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors">
                            Fetch from Telegram
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Fetch users (member counts) bar */}
                {(() => {
                  const zeroCount = dispatchGroups.filter(g => (g.memberCount || 0) === 0).length;
                  if (zeroCount === 0 && !fetchingUsers) return null;
                  return (
                    <div className="mb-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center gap-3">
                      {fetchingUsers ? (
                        <>
                          <span className="text-sm text-cyan-400 animate-pulse">Fetching member counts...</span>
                          <span className="text-xs text-[#666]">{usersProgress.done}/{usersProgress.total} done — {usersProgress.success} fetched</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-cyan-300">{zeroCount} groups with 0 members</span>
                          <button onClick={fetchTelegramUsers} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors">
                            Fetch Users
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Member filter */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] text-[#666] uppercase tracking-wider">Members:</span>
                  {([
                    ['all', 'All', '', dispatchGroups.length],
                    ['0', '0', 'red', dispatchGroups.filter(g => (g.memberCount || 0) === 0).length],
                    ['<50', '<50', 'red', dispatchGroups.filter(g => (g.memberCount || 0) > 0 && (g.memberCount || 0) < 50).length],
                    ['<500', '<500', 'yellow', dispatchGroups.filter(g => (g.memberCount || 0) > 0 && (g.memberCount || 0) < 500).length],
                    ['500+', '500+', 'green', dispatchGroups.filter(g => (g.memberCount || 0) >= 500).length],
                    ['1k+', '1K+', 'green', dispatchGroups.filter(g => (g.memberCount || 0) >= 1000).length],
                    ['5k+', '5K+', 'emerald', dispatchGroups.filter(g => (g.memberCount || 0) >= 5000).length],
                  ] as [string, string, string, number][]).map(([val, label, color, count]) => (
                    <button
                      key={val}
                      onClick={() => { setMemberFilter(val as any); setDispatchPage(0); }}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${memberFilter === val
                        ? 'bg-[#b31b1b] text-white'
                        : color === 'red' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : color === 'yellow' ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                        : color === 'green' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-white/5 text-[#999] hover:text-white'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  ))}
                  {memberFilter !== 'all' && (
                    <button
                      onClick={() => { const ids = filteredDispatch.map(g => g._id); setDispatchSelected(new Set(ids)); }}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-white/10 text-white hover:bg-white/15 transition-colors"
                    >
                      Select filtered ({filteredDispatch.length})
                    </button>
                  )}
                </div>

                {/* Selection controls + pagination + stats */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button onClick={selectPageDispatch} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Select Page</button>
                  <button onClick={selectAllDispatch} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Select All ({dispatchGroups.length})</button>
                  <button onClick={deselectAllDispatch} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 transition-colors">Deselect All</button>
                  <div className="h-4 w-px bg-white/10" />
                  <span className="text-[10px] text-[#666] uppercase tracking-wider">Quick select:</span>
                  <button onClick={() => { const ids = dispatchGroups.filter(g => !g.description).map(g => g._id); setDispatchSelected(new Set(ids)); }} className="px-2 py-1 text-[10px] font-medium rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors">No Desc ({dispatchGroups.filter(g => !g.description).length})</button>
                  <button onClick={() => { const ids = dispatchGroups.filter(g => !g.categories || g.categories.length < 2).map(g => g._id); setDispatchSelected(new Set(ids)); }} className="px-2 py-1 text-[10px] font-medium rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">&lt;2 Cats ({dispatchGroups.filter(g => !g.categories || g.categories.length < 2).length})</button>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#666] uppercase tracking-wider mr-1">Show:</span>
                    {[10, 50, 100].map(n => (
                      <button key={n} onClick={() => { setDispatchPerPage(n); setDispatchPage(0); }} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dispatchPerPage === n ? 'bg-[#b31b1b] text-white' : 'bg-white/5 text-[#666] hover:text-white'}`}>{n}</button>
                    ))}
                    <button onClick={() => { setDispatchPerPage(999999); setDispatchPage(0); }} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dispatchPerPage >= 999999 ? 'bg-[#b31b1b] text-white' : 'bg-white/5 text-[#666] hover:text-white'}`}>All</button>
                  </div>
                  <div className="flex-1" />
                  <div className="text-xs text-[#666] flex items-center gap-3">
                    <span className="text-white font-bold">{dispatchSelected.size} selected</span>
                    <span className="text-amber-400">{schedulableVault.length} vault</span>
                    <span className="text-white">{schedulableFeed.length} feed</span>
                    <span className="text-blue-400">{dispatchGroups.filter(g => g.status === 'scheduled').length} scheduled</span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="p-3 text-left w-10">
                          <input type="checkbox" checked={pagedDispatch.length > 0 && pagedDispatch.every(g => dispatchSelected.has(g._id))} onChange={() => pagedDispatch.every(g => dispatchSelected.has(g._id)) ? setDispatchSelected(prev => { const next = new Set(prev); pagedDispatch.forEach(g => next.delete(g._id)); return next; }) : selectPageDispatch()} className="accent-[#b31b1b]" />
                        </th>
                        <th className="p-3 text-left w-12">Pic</th>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Categories</th>
                        <th className="p-3 text-left">Description</th>
                        <th className="p-3 text-left">Members</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left w-16">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDispatch.map((g) => (
                        <React.Fragment key={g._id}>
                          <tr className={`border-t border-white/5 transition-colors ${g.premiumOnly ? 'bg-amber-500/5' : g.status === 'approved' ? 'bg-green-500/5' : !g.category || g.category === 'Adult' ? 'bg-yellow-500/[0.03]' : 'bg-white/[0.02]'}`}>
                            <td className="p-3"><input type="checkbox" checked={dispatchSelected.has(g._id)} onChange={() => toggleDispatchSelect(g._id)} className="accent-[#b31b1b]" /></td>
                            <td className="p-3">
                              {g.image && g.image !== '/assets/image.jpg' ? (
                                <img src={g.image} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-[#444]">?</div>
                              )}
                            </td>
                            <td className="p-3 font-medium max-w-[180px] truncate">
                              {g.name}
                              {g.premiumOnly && <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">VAULT</span>}
                            </td>
                            <td className="p-3 text-xs">
                              {g.categories && g.categories.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {g.categories.map((cat, ci) => (
                                    <span key={ci} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ci === 0 ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-[#999]'}`}>{cat}</span>
                                  ))}
                                </div>
                              ) : (
                                <span className={!g.category || g.category === 'Adult' ? 'text-yellow-400' : 'text-white'}>{g.category || '—'}</span>
                              )}
                            </td>
                            <td className="p-3 text-xs text-[#666] max-w-[200px] truncate">{g.description || '—'}</td>
                            <td className="p-3">
                              <span className={`text-xs font-medium tabular-nums ${(g.memberCount || 0) === 0 ? 'text-red-400/60' : (g.memberCount || 0) < 50 ? 'text-red-400' : (g.memberCount || 0) < 500 ? 'text-yellow-400' : 'text-green-400'}`}>
                                {(g.memberCount || 0) > 0 ? (g.memberCount || 0).toLocaleString() : '—'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                {g.premiumOnly ? <span className="text-xs text-amber-400 font-medium">Vault</span>
                                  : g.status === 'approved' ? <span className="text-xs text-green-400 font-medium">Approved</span>
                                  : <span className="text-xs text-white/50">Pending</span>}
                                <div className="flex flex-wrap gap-0.5">
                                  {(g.categories && g.categories.length >= 2) || aiDone[g._id]?.has('categorize')
                                    ? <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">✓ Cat</span>
                                    : <span className="text-[9px] bg-white/5 text-[#555] px-1 py-0.5 rounded">○ Cat</span>}
                                  {(aiDone[g._id]?.has('rewrite') || (g.description && g.description.length >= 200 && (g.description.match(/🔞/g)?.length ?? 0) < 2 && (g.description.match(/⚠️/g)?.length ?? 0) < 2))
                                    ? <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded">✓ Rw</span>
                                    : <span className="text-[9px] bg-white/5 text-[#555] px-1 py-0.5 rounded">○ Rw</span>}
                                  {g.description_de || aiDone[g._id]?.has('translate_de')
                                    ? <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">✓ DE</span>
                                    : <span className="text-[9px] bg-white/5 text-[#555] px-1 py-0.5 rounded">○ DE</span>}
                                  {g.description_es || aiDone[g._id]?.has('translate_es')
                                    ? <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">✓ ES</span>
                                    : <span className="text-[9px] bg-white/5 text-[#555] px-1 py-0.5 rounded">○ ES</span>}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1.5">
                                <button onClick={() => { if (editingGroup === g._id) { setEditingGroup(null); setEditValues({}); } else { setEditingGroup(g._id); setEditValues({ name: g.name, category: g.category, country: g.country, description: g.description }); }}} className={`transition-colors text-xs ${editingGroup === g._id ? 'text-[#b31b1b]' : 'text-[#666] hover:text-white'}`}>
                                  {editingGroup === g._id ? '▼' : '✎'}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {editingGroup === g._id && (
                            <tr className="border-t border-white/5 bg-white/[0.03]">
                              <td colSpan={8} className="p-4">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Name</label>
                                    <input value={editValues.name ?? g.name} onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-sm text-white outline-none focus:border-[#b31b1b]/50" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Category</label>
                                      <select value={editValues.category || g.category} onChange={(e) => setEditValues(prev => ({ ...prev, category: e.target.value }))} className="w-full px-2 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#b31b1b]/50">
                                        <option value="">Category...</option>
                                        {filterCategories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <label className="text-[10px] text-[#666] uppercase tracking-wider mb-1 block">Description</label>
                                  <textarea value={editValues.description ?? g.description} onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#b31b1b]/50 resize-y" placeholder="Group description..." />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => { setEditingGroup(null); setEditValues({}); }} className="px-4 py-1.5 rounded-lg text-xs text-[#999] bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                                  <button onClick={() => saveInlineEdit(g._id)} className="px-4 py-1.5 rounded-lg text-xs text-white bg-[#b31b1b] hover:bg-[#c42b2b] transition-colors font-medium">Save Changes</button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {dispatchTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-[#666]">
                      Showing {dispatchPage * dispatchPerPage + 1}–{Math.min((dispatchPage + 1) * dispatchPerPage, filteredDispatch.length)} of {filteredDispatch.length}{memberFilter !== 'all' ? ` (filtered from ${dispatchGroups.length})` : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <button disabled={dispatchPage === 0} onClick={() => setDispatchPage(0)} className="px-2 py-1 text-[10px] rounded-md bg-white/5 text-[#999] hover:text-white disabled:opacity-30 transition-all">««</button>
                      <button disabled={dispatchPage === 0} onClick={() => setDispatchPage(p => p - 1)} className="px-2 py-1 text-[10px] rounded-md bg-white/5 text-[#999] hover:text-white disabled:opacity-30 transition-all">‹</button>
                      <span className="px-3 py-1 text-[10px] font-bold text-white">{dispatchPage + 1} / {dispatchTotalPages}</span>
                      <button disabled={dispatchPage >= dispatchTotalPages - 1} onClick={() => setDispatchPage(p => p + 1)} className="px-2 py-1 text-[10px] rounded-md bg-white/5 text-[#999] hover:text-white disabled:opacity-30 transition-all">›</button>
                      <button disabled={dispatchPage >= dispatchTotalPages - 1} onClick={() => setDispatchPage(dispatchTotalPages - 1)} className="px-2 py-1 text-[10px] rounded-md bg-white/5 text-[#999] hover:text-white disabled:opacity-30 transition-all">»»</button>
                    </div>
                  </div>
                )}

                {/* Summary + Schedule buttons */}
                {(() => {
                  const total = schedulableGroups.length;
                  return (
                    <div className="mt-6">
                      {total > 0 && (
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-wrap items-center gap-4 text-sm mb-4">
                          <span className="text-[#666]">Ready to schedule:</span>
                          {schedulableFeed.length > 0 && <span className="text-white">{schedulableFeed.length} → Feed</span>}
                          {schedulableVault.length > 0 && <span className="text-amber-400">{schedulableVault.length} → Vault</span>}
                          <div className="h-4 w-px bg-white/10" />
                          <span className="text-[#666]">Rate:</span>
                          <input type="number" min={1} max={publishMax} value={publishMin} onChange={(e) => setPublishMin(Math.max(1, Math.min(parseInt(e.target.value) || 1, publishMax)))} className="w-12 px-2 py-1 rounded bg-[#1a1a1a] border border-white/10 text-white text-xs outline-none text-center" />
                          <span className="text-[#555]">to</span>
                          <input type="number" min={publishMin} max={20} value={publishMax} onChange={(e) => setPublishMax(Math.max(publishMin, parseInt(e.target.value) || publishMin))} className="w-12 px-2 py-1 rounded bg-[#1a1a1a] border border-white/10 text-white text-xs outline-none text-center" />
                          <span className="text-[#666]">/day</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <button onClick={() => { setPhase('upload'); setParsedRows([]); }} className="px-6 py-3 rounded-xl font-medium bg-white/5 hover:bg-white/10 transition-colors">← New Import</button>
                        <div className="flex gap-3">
                          {schedulableVault.length > 0 && schedulableFeed.length > 0 && (
                            <>
                              <button onClick={() => scheduleNow(schedulableFeed.map(g => g._id))} disabled={dispatchLoading} className="px-5 py-3 rounded-xl font-medium bg-white/5 hover:bg-white/10 text-white transition-colors text-sm disabled:opacity-30">
                                Schedule Feed ({schedulableFeed.length})
                              </button>
                              <button onClick={() => scheduleNow(schedulableVault.map(g => g._id))} disabled={dispatchLoading} className="px-5 py-3 rounded-xl font-medium bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 transition-colors text-sm disabled:opacity-30">
                                Schedule Vault ({schedulableVault.length})
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => scheduleNow(schedulableGroups.map(g => g._id))}
                            disabled={total === 0 || dispatchLoading}
                            className="px-8 py-3 rounded-xl font-bold bg-[#b31b1b] hover:bg-[#c42b2b] text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#b31b1b]/20"
                          >
                            {dispatchLoading ? 'Scheduling...' : total === 0 ? 'All groups scheduled ✓' : `Schedule All ${total} Groups`}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </motion.div>
        )}

        {/* ─── PHASE 3: Schedule ─── */}
        {phase === 'schedule' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {pendingGroups.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-bold text-[#666] mb-2">No pending groups to schedule</h3>
                <p className="text-sm text-[#555] mb-6">All groups may have been approved already, or moved to a different status.</p>
                <button onClick={() => setPhase('dispatch')} className="px-6 py-3 rounded-xl font-medium bg-white/5 hover:bg-white/10 transition-colors">← Back to Dispatch</button>
              </div>
            ) : (
              <>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 mb-6">
                  <h3 className="text-lg font-bold mb-2">Publishing Schedule</h3>
                  {(() => {
                    const vaultCount = pendingGroups.filter(g => g.premiumOnly).length;
                    const feedCount = pendingGroups.length - vaultCount;
                    return (
                      <div className="flex gap-3 mb-4 text-sm">
                        {feedCount > 0 && <span className="px-3 py-1 rounded-lg bg-[#b31b1b]/10 text-[#b31b1b]">{feedCount} → Public Feed</span>}
                        {vaultCount > 0 && <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400">{vaultCount} → Premium Vault</span>}
                      </div>
                    );
                  })()}
                  <p className="text-sm text-[#666] mb-4">{pendingGroups.length} groups will be published at random times.</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <label className="text-xs text-[#999] mb-1 block">Min per day</label>
                      <input type="number" min={1} max={publishMax} value={publishMin} onChange={(e) => setPublishMin(Math.max(1, Math.min(parseInt(e.target.value) || 1, publishMax)))} className="w-full p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:ring-2 focus:ring-[#b31b1b] outline-none" />
                    </div>
                    <span className="text-[#666] mt-5">to</span>
                    <div className="flex-1">
                      <label className="text-xs text-[#999] mb-1 block">Max per day</label>
                      <input type="number" min={publishMin} max={20} value={publishMax} onChange={(e) => setPublishMax(Math.max(publishMin, parseInt(e.target.value) || publishMin))} className="w-full p-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:ring-2 focus:ring-[#b31b1b] outline-none" />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#b31b1b]/5 border border-[#b31b1b]/20">
                    <p className="text-sm"><span className="text-[#b31b1b] font-bold">{pendingGroups.length}</span> groups over ~<span className="text-[#b31b1b] font-bold">{estimateScheduleDays(pendingGroups.length, { minPerDay: publishMin, maxPerDay: publishMax })}</span> days (7AM-11PM, fewer on weekends).</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-bold text-[#999] mb-3">Groups to schedule ({pendingGroups.length})</h4>
                  <div className="max-h-[300px] overflow-y-auto rounded-xl border border-white/5">
                    {pendingGroups.map(g => (
                      <div key={g._id} className={`flex items-center gap-3 p-3 border-b border-white/5 last:border-0 ${g.premiumOnly ? 'bg-amber-500/5' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {g.name}
                            {g.premiumOnly && <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">VAULT</span>}
                          </div>
                          <div className="text-xs text-[#666]">{(g.categories?.length ? g.categories : [g.category]).filter(Boolean).join(' · ')}</div>
                        </div>
                        <div className="text-xs text-[#666]">{g.memberCount > 0 ? `${g.memberCount.toLocaleString()} members` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setPhase('dispatch')} className="px-6 py-3 rounded-xl font-medium bg-white/5 hover:bg-white/10 transition-colors">← Back to Dispatch</button>
                  <button onClick={startScheduling} disabled={isScheduling} className="px-8 py-3 rounded-xl font-bold bg-[#b31b1b] hover:bg-[#c42b2b] text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#b31b1b]/20">
                    {isScheduling ? 'Scheduling...' : `Start Scheduling (${pendingGroups.length} groups)`}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ─── QUEUE ─── */}
        {phase === 'queue' && (
          <motion.div key="queue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-2xl font-black">{queueStats.totalScheduled}</div>
                <div className="text-xs text-[#666]">Total Scheduled</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-2xl font-black text-amber-400">{scheduledGroups.filter(g => g.premiumOnly).length}</div>
                <div className="text-xs text-[#666]">→ Premium Vault</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-sm font-bold text-[#b31b1b]">{queueStats.nextPublish ? new Date(queueStats.nextPublish).toLocaleString() : 'None'}</div>
                <div className="text-xs text-[#666]">Next Publish</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-2xl font-black text-yellow-400">{queueStats.pendingImages}</div>
                <div className="text-xs text-[#666]">Pending Images</div>
              </div>
            </div>

            {/* Queue bulk actions bar */}
            {queueSelected.size > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold text-white">{queueSelected.size} selected</span>
                <div className="h-4 w-px bg-white/10" />
                <button onClick={queueBulkVault} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors">→ Premium Vault</button>
                <button onClick={() => setQueueSelected(new Set())} className="px-3 py-1.5 bg-white/5 text-[#999] rounded-lg text-xs font-medium hover:bg-white/10 transition-colors">Deselect</button>
              </div>
            )}

            {loadingQueue ? (
              <div className="text-center py-16 text-[#666]">Loading queue...</div>
            ) : scheduledGroups.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-bold text-[#666]">No scheduled groups</h3>
              </div>
            ) : (
              <>
                {(() => {
                  const grouped: Record<string, ImportedGroup[]> = {};
                  for (const g of scheduledGroups) {
                    const dateKey = g.scheduledPublishAt ? new Date(g.scheduledPublishAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unscheduled';
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(g);
                  }
                  return Object.entries(grouped).map(([date, groups]) => (
                    <div key={date} className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-[#999]">{date} — {groups.length} group{groups.length !== 1 ? 's' : ''}</h3>
                        {(groups[0] as any)?.importBatchId && <button onClick={() => cancelBatch((groups[0] as any).importBatchId)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Cancel batch</button>}
                      </div>
                      <div className="space-y-2">
                        {groups.map(g => (
                          <div key={g._id} className={`rounded-xl border transition-colors ${g.premiumOnly ? 'bg-amber-500/[0.03] border-amber-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                            {/* Main row */}
                            <div className="flex items-center gap-2.5 p-3">
                              <input type="checkbox" checked={queueSelected.has(g._id)} onChange={() => toggleQueueSelect(g._id)} className="accent-[#b31b1b] shrink-0" />
                              <button
                                onClick={() => {
                                  if (reschedulingGroup === g._id) { setReschedulingGroup(null); setRescheduleValue(''); }
                                  else {
                                    setReschedulingGroup(g._id);
                                    const d = g.scheduledPublishAt ? new Date(g.scheduledPublishAt) : new Date();
                                    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    setRescheduleValue(local);
                                  }
                                }}
                                className={`text-xs font-mono min-w-[52px] transition-colors ${reschedulingGroup === g._id ? 'text-purple-400' : 'text-[#b31b1b] hover:text-white cursor-pointer'}`}
                                title="Click to reschedule"
                              >
                                {g.scheduledPublishAt ? new Date(g.scheduledPublishAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </button>
                              {g.image && g.image !== '/assets/image.jpg' ? (
                                <img src={g.image} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-[#444] shrink-0">?</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {g.name}
                                  {g.premiumOnly && <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">VAULT</span>}
                                </div>
                                <div className="text-xs text-[#666] truncate">{g.category} · {g.memberCount > 0 ? `${g.memberCount.toLocaleString()} members` : 'No data'}{g.description ? ` — ${g.description.slice(0, 60)}${g.description.length > 60 ? '...' : ''}` : ''}</div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {g.telegramLink && (
                                  <a href={g.telegramLink} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-medium hover:bg-blue-500/20 transition-colors" title={g.telegramLink}>↗</a>
                                )}
                                <button onClick={() => { if (queueEditingGroup === g._id) { setQueueEditingGroup(null); setQueueEditValues({}); } else { setQueueEditingGroup(g._id); setQueueEditValues({ name: g.name, category: g.category, country: g.country, description: g.description }); }}} className={`px-2 py-1 text-[10px] rounded-lg transition-colors ${queueEditingGroup === g._id ? 'text-[#b31b1b] bg-[#b31b1b]/10' : 'text-[#666] bg-white/5 hover:bg-white/10 hover:text-white'}`} title="Edit">✎</button>
                                <button onClick={() => publishNow(g._id)} className="px-2.5 py-1 bg-green-500/15 text-green-400 rounded-lg text-[10px] font-medium hover:bg-green-500/25 transition-colors">Publish</button>
                                <button onClick={() => cancelGroup(g._id)} className="text-[10px] text-[#666] hover:text-red-400 transition-colors px-1.5 py-1">✕</button>
                              </div>
                            </div>

                            {/* Reschedule inline */}
                            {reschedulingGroup === g._id && (
                              <div className="px-3 pb-3 flex items-center gap-2 border-t border-white/5 pt-2">
                                <span className="text-[10px] text-[#666] uppercase tracking-wider">Reschedule to:</span>
                                <input
                                  type="datetime-local"
                                  value={rescheduleValue}
                                  onChange={(e) => setRescheduleValue(e.target.value)}
                                  className="px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-purple-500/50 [color-scheme:dark]"
                                />
                                <button onClick={() => rescheduleGroup(g._id)} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors">Save</button>
                                <button onClick={() => { setReschedulingGroup(null); setRescheduleValue(''); }} className="text-xs text-[#666] hover:text-white transition-colors">Cancel</button>
                              </div>
                            )}

                            {/* Edit panel inline */}
                            {queueEditingGroup === g._id && (
                              <div className="px-3 pb-3 border-t border-white/5 pt-3">
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5 block">Name</label>
                                    <input value={queueEditValues.name ?? g.name} onChange={(e) => setQueueEditValues(prev => ({ ...prev, name: e.target.value }))} className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#b31b1b]/50" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5 block">Category</label>
                                    <select value={queueEditValues.category || g.category} onChange={(e) => setQueueEditValues(prev => ({ ...prev, category: e.target.value }))} className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#b31b1b]/50">
                                      <option value="">Category...</option>
                                      {filterCategories.filter(c => c !== 'All').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div className="mb-2">
                                  <label className="text-[10px] text-[#666] uppercase tracking-wider mb-0.5 block">Description</label>
                                  <textarea value={queueEditValues.description ?? g.description} onChange={(e) => setQueueEditValues(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-2 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#b31b1b]/50 resize-y" />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => { setQueueEditingGroup(null); setQueueEditValues({}); }} className="px-3 py-1 rounded-lg text-xs text-[#999] bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                                  <button onClick={() => saveQueueEdit(g._id)} className="px-3 py-1 rounded-lg text-xs text-white bg-[#b31b1b] hover:bg-[#c42b2b] transition-colors font-medium">Save</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </>
            )}

            <div className="flex justify-center mt-6">
              <button onClick={loadQueue} className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 transition-colors">↻ Refresh Queue</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
