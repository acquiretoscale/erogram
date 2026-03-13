'use client';

import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useTaskManager } from './TaskManagerContext';
import { isSpamDescription } from '@/lib/utils/spamCleaner';

type AIModel = 'qwen' | 'deepseek' | 'both';

const CATEGORIES = [
  'Adult', 'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
  'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
  'Brazil', 'Brunette', 'China', 'Colombia', 'Cosplay', 'Creampie',
  'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use',
  'Germany', 'Hardcore', 'Italy',
  'Japan', 'Latina', 'Lesbian', 'Masturbation', 'Mexico', 'MILF',
  'NSFW-Telegram', 'Onlyfans', 'Onlyfans Leaks', 'Petite', 'Philippines', 'Privacy', 'Public', 'Red Hair', 'Russian',
  'Spain', 'Telegram-Porn', 'Threesome', 'UK', 'Ukraine', 'USA', 'Vietnam',
];

function validateCats(raw: string[]): string[] {
  return raw.map(c => CATEGORIES.find(k => k.toLowerCase() === c.trim().toLowerCase())).filter(Boolean) as string[];
}

const EROGRAM_CTX = `Erogram.pro is an adult NSFW Telegram groups & channels directory. The audience is adults looking to discover and join Telegram communities in adult/NSFW niches.`;

const REWRITE_SYS = `You are an expert SEO content writer for Erogram.pro — an adult NSFW Telegram groups directory.\n\n${EROGRAM_CTX}\n\nAVAILABLE CATEGORIES: ${CATEGORIES.join(', ')}\n\nCRITICAL: You MUST write ALL descriptions in ENGLISH regardless of the source language. If the original is in Portuguese, Spanish, Russian, or any other language, translate and rewrite it into fluent English.\n\nRules:\n- ALWAYS output in ENGLISH — never in Portuguese, Spanish, or any other language\n- Rewrite each description to be UNIQUE, human-written, 200+ characters\n- NO filler words (no "Join now!", "Best group!", "Don't miss!")\n- Identify the NICHE from name/category/members/description — write about it specifically\n- Mention group name naturally\n- Non-Latin names: keep original script + [English meaning]\n- Use member count for credibility when available\n- Write as a knowledgeable human, not generic AI\n- Vary sentence structure across descriptions\n- Return ONLY [N] rewritten_text format`;

const REWRITE_USR = `Rewrite these {{count}} group descriptions IN ENGLISH for SEO. If the source is in Portuguese, Spanish, or any other language, translate it to English. Each must be 200+ chars, unique, human-like, niche-specific, no filler. Return each on its own line in format [N] rewritten_text:\n\n{{groups}}`;

const CAT_SYS = `You are a category specialist for Erogram.pro — an adult NSFW Telegram groups directory.\n\n${EROGRAM_CTX}\n\nAssign EXACTLY 2 or 3 categories from this list (exact spelling): ${CATEGORIES.join(', ')}\n\nRules:\n1. Read GROUP NAME — strongest signal\n2. Read DESCRIPTION — identify actual content type\n3. Detect COUNTRY from name/topic, NOT spam language\n- Mixed languages in spam ≠ group's country\n- Trust the Country field if provided\n- MINIMUM 2 categories, MAXIMUM 3\n- Pick specific niches first (e.g. "Lesbian" over "Telegram-Porn")\n- "Telegram-Porn" or "Amateur" as fallbacks\n- Format: [N] Cat1 | Cat2 | Cat3\n- Return ONLY categorizations`;

const CAT_USR = `Categorize these {{count}} Telegram groups. Add specific categories to reach 2-3 total. NEVER return only 1. Return each on its own line in format [N] Category1 | Category2 | Category3:\n\n{{groups}}`;

const TR_SYS = (lang: string) => `You are a native ${lang} speaker writing for Erogram.pro — an adult NSFW Telegram directory.\n\n${EROGRAM_CTX}\n\nTranslation rules:\n- Rewrite naturally in ${lang} as a native speaker\n- Use everyday slang/vocabulary for adult content\n- 200+ characters, expand thin descriptions\n- NO filler words\n- Talk about the NICHE specifically\n- Preserve brand names\n- Non-Latin names: keep original + [English meaning]\n- Return ONLY [N] translated_text format`;

const TR_USR = `Translate these {{count}} group descriptions to {{language}}. Each 200+ chars, niche-specific, no filler. Return each on its own line in format [N] translated_text:\n\n{{groups}}`;

export interface AiGroup {
  _id: string;
  name: string;
  description: string;
  category?: string;
  categories?: string[];
  country?: string;
  memberCount?: number;
  description_de?: string;
  description_es?: string;
}

interface Props {
  selectedIds: Set<string>;
  groups: AiGroup[];
  onGroupsUpdated: (updates: Array<{ _id: string; changes: Record<string, any> }>) => void;
  compact?: boolean;
}

export default function AiBulkActions({ selectedIds, groups, onGroupsUpdated, compact }: Props) {
  const [aiModel, setAiModel] = useState<AIModel>('qwen');
  const [turbo, setTurbo] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, step: '' });
  const [showReplace, setShowReplace] = useState(false);
  const [replaceFrom, setReplaceFrom] = useState('');
  const [replaceTo, setReplaceTo] = useState('');
  const abortRef = useRef(false);
  const { addTask, updateTask, finishTask } = useTaskManager();

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = { Authorization: `Bearer ${token}` };

  const getSelected = useCallback((): AiGroup[] => {
    if (selectedIds.size === 0) return [];
    return groups.filter(g => selectedIds.has(g._id));
  }, [selectedIds, groups]);

  const runChunked = async (
    ids: string[],
    apiMode: string,
    apiField: string,
    apiLang: string,
    sysPrompt: string,
    usrTemplate: string,
    stepLabel: string,
  ): Promise<{ results: Record<string, string>; errors: Array<{ groupId: string; error: string }> }> => {
    const CHUNK = 8;
    const model = aiModel;
    const CONCURRENCY = turbo ? (model === 'both' ? 6 : 4) : 2;
    const allResults: Record<string, string> = {};
    const allErrors: Array<{ groupId: string; error: string }> = [];

    const postChunk = async (chunk: string[], chunkModel: 'qwen' | 'deepseek') => {
      const res = await axios.post('/api/admin/translate', {
        groupIds: chunk,
        targetLanguage: apiLang,
        targetField: apiField,
        systemPrompt: sysPrompt,
        userPromptTemplate: usrTemplate,
        mode: apiMode,
        dryRun: false,
        aiModel: chunkModel,
      }, { headers: authHeader });
      return { results: res.data.results || {}, errors: res.data.errors || [] };
    };

    let chunkIndex = 0;
    for (let i = 0; i < ids.length; i += CHUNK * CONCURRENCY) {
      if (abortRef.current) break;
      const chunks: string[][] = [];
      for (let j = 0; j < CONCURRENCY && i + j * CHUNK < ids.length; j++) {
        chunks.push(ids.slice(i + j * CHUNK, i + (j + 1) * CHUNK));
      }

      const settled = await Promise.allSettled(chunks.map((c, j) => {
        let m: 'qwen' | 'deepseek';
        if (model === 'both') m = (chunkIndex + j) % 2 === 0 ? 'qwen' : 'deepseek';
        else m = model;
        return postChunk(c, m);
      }));
      chunkIndex += chunks.length;

      for (const s of settled) {
        if (s.status === 'fulfilled') {
          Object.assign(allResults, s.value.results);
          allErrors.push(...s.value.errors);
        } else {
          allErrors.push({ groupId: 'unknown', error: s.reason?.message || 'Request failed' });
        }
      }
      const doneCount = Math.min(i + chunks.length * CHUNK, ids.length);
      setProgress({ done: doneCount, total: ids.length, step: abortRef.current ? 'Stopped' : stepLabel });
      if (abortRef.current) break;
    }

    return { results: allResults, errors: allErrors };
  };

  const runAction = async (action: 'categorize' | 'rewrite' | 'de' | 'es') => {
    const sel = getSelected();
    if (sel.length === 0) { alert('Select groups first.'); return; }

    const ids = sel.map(g => g._id);
    abortRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: ids.length, step: '' });

    const taskId = `ai-${action}-${Date.now()}`;
    const labels: Record<string, string> = { categorize: 'Categorizing', rewrite: 'Writing Descriptions', de: 'Translating DE', es: 'Translating ES' };
    addTask(taskId, labels[action] || action, ids.length);

    try {
      let run: { results: Record<string, string>; errors: Array<{ groupId: string; error: string }> };

      if (action === 'categorize') {
        run = await runChunked(ids, 'categorize', 'category', 'en', CAT_SYS, CAT_USR, 'Categorizing');
        const updates = Object.entries(run.results).map(([id, val]) => {
          const cats = validateCats(val.split('|').map((c: string) => c.trim()).filter(Boolean));
          const existing = groups.find(g => g._id === id);
          const oldCats = validateCats((existing?.categories?.length ? existing.categories : [existing?.category]).filter(Boolean) as string[]);
          const merged = [...new Set([...oldCats, ...cats])].slice(0, 3);
          return { _id: id, changes: { categories: merged } };
        });
        onGroupsUpdated(updates);
      } else if (action === 'rewrite') {
        run = await runChunked(ids, 'rewrite', 'description', 'en', REWRITE_SYS, REWRITE_USR, 'Writing Descriptions');
        const updates = Object.entries(run.results).map(([id, val]) => ({ _id: id, changes: { description: val } }));
        onGroupsUpdated(updates);
      } else {
        const lang = action === 'de' ? 'German' : 'Spanish';
        const field = `description_${action}`;
        run = await runChunked(ids, 'translate', field, lang, TR_SYS(lang), TR_USR, `Translating ${action.toUpperCase()}`);
        const updates = Object.entries(run.results).map(([id, val]) => ({ _id: id, changes: { [field]: val } }));
        onGroupsUpdated(updates);
      }

      updateTask(taskId, ids.length);
      finishTask(taskId);

      const errCount = run.errors.length;
      const okCount = Object.keys(run.results).length;
      if (errCount > 0) alert(`Done: ${okCount} OK, ${errCount} errors`);
    } catch (err: any) {
      finishTask(taskId, err.message);
      alert('Action failed: ' + (err.message || 'Unknown error'));
    } finally {
      setRunning(false);
    }
  };

  const cleanSpam = async (mode: 'spam' | 'all') => {
    const sel = getSelected();
    const target = sel.length > 0 ? sel : groups;
    const updates: Array<{ _id: string; changes: Record<string, any> }> = [];

    for (const g of target) {
      if (mode === 'all') {
        if (g.description) updates.push({ _id: g._id, changes: { description: '' } });
      } else {
        if (g.description && isSpamDescription(g.description)) {
          updates.push({ _id: g._id, changes: { description: '' } });
        }
      }
    }

    if (updates.length === 0) {
      alert(mode === 'spam'
        ? `No spam detected in ${target.length} group(s). Try "Clear Desc" to wipe all descriptions.`
        : 'No descriptions to clear.');
      return;
    }

    if (!confirm(`${mode === 'spam' ? 'Clean spam from' : 'Clear ALL descriptions for'} ${updates.length} group(s)?`)) return;

    setRunning(true);
    setProgress({ done: 0, total: updates.length, step: 'Cleaning descriptions' });
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < updates.length; i++) {
      try {
        await axios.put(`/api/admin/groups/${updates[i]._id}`, { description: '' }, { headers: authHeader });
        ok++;
      } catch {
        fail++;
      }
      setProgress({ done: i + 1, total: updates.length, step: 'Cleaning descriptions' });
    }

    onGroupsUpdated(updates);
    setRunning(false);
    alert(`Cleared ${ok} description(s).${fail > 0 ? ` ${fail} failed.` : ''}`);
  };

  const sendToVault = async () => {
    const sel = getSelected();
    if (sel.length === 0) { alert('Select groups first.'); return; }
    if (!confirm(`Move ${sel.length} group(s) to vault?`)) return;

    try {
      await Promise.all(sel.map(g =>
        axios.put(`/api/admin/groups/${g._id}`, { premiumOnly: true }, { headers: authHeader })
      ));
      alert(`${sel.length} group(s) moved to vault.`);
    } catch {
      alert('Failed to move some groups.');
    }
  };

  const replaceCategory = async () => {
    if (!replaceFrom || !replaceTo || replaceFrom === replaceTo) {
      alert('Please select both "From" and "To" categories (must be different).');
      return;
    }
    const sel = getSelected();
    const target = sel.length > 0 ? sel : groups;
    const affected = target.filter(g => {
      const cats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
      return cats.some(c => c?.toLowerCase() === replaceFrom.toLowerCase());
    });

    if (affected.length === 0) {
      alert(`No ${sel.length > 0 ? 'selected ' : ''}groups found with category "${replaceFrom}".`);
      return;
    }
    if (!confirm(`Replace "${replaceFrom}" → "${replaceTo}" in ${affected.length} group(s)?`)) return;

    setRunning(true);
    setProgress({ done: 0, total: affected.length, step: 'Replacing categories' });

    const updates: Array<{ _id: string; changes: Record<string, any> }> = [];
    let errors = 0;

    for (let i = 0; i < affected.length; i++) {
      const g = affected[i];
      const oldCats = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
      const newCats = [...new Set(oldCats.map(c => c?.toLowerCase() === replaceFrom.toLowerCase() ? replaceTo : c))].slice(0, 3);
      try {
        await axios.put(`/api/admin/groups/${g._id}`, { categories: newCats, category: newCats[0] || g.category }, { headers: authHeader });
        updates.push({ _id: g._id, changes: { categories: newCats, category: newCats[0] || g.category } });
      } catch (err: any) {
        errors++;
        console.error(`Failed to update ${g.name}:`, err.message);
      }
      setProgress({ done: i + 1, total: affected.length, step: 'Replacing categories' });
    }

    onGroupsUpdated(updates);
    setRunning(false);
    alert(`Done! Replaced in ${updates.length} group(s).${errors > 0 ? ` ${errors} failed.` : ''}`);
    setShowReplace(false);
    setReplaceFrom('');
    setReplaceTo('');
  };

  const btnBase = compact
    ? 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40'
    : 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Model switcher */}
      <div className="flex rounded-lg overflow-hidden border border-white/10 mr-1">
        {(['qwen', 'deepseek', 'both'] as AIModel[]).map(m => (
          <button
            key={m}
            onClick={() => setAiModel(m)}
            className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors ${aiModel === m ? 'bg-[#b31b1b] text-white' : 'text-[#666] hover:text-white'}`}
          >{m === 'both' ? 'Both' : m === 'qwen' ? 'Qwen' : 'DS'}</button>
        ))}
      </div>

      {/* Turbo */}
      <button
        onClick={() => setTurbo(!turbo)}
        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors mr-1 ${turbo ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-white/10 text-[#666]'}`}
      >{turbo ? '⚡ Turbo' : '⚡'}</button>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* AI Actions */}
      <button onClick={() => runAction('categorize')} disabled={running} className={`${btnBase} bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20`}>
        🏷️ Categorize
      </button>
      <button onClick={() => runAction('rewrite')} disabled={running} className={`${btnBase} bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20`}>
        ✍️ Rewrite EN
      </button>
      <button onClick={() => runAction('de')} disabled={running} className={`${btnBase} bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20`}>
        🇩🇪 DE
      </button>
      <button onClick={() => runAction('es')} disabled={running} className={`${btnBase} bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20`}>
        🇪🇸 ES
      </button>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      <button onClick={() => cleanSpam('spam')} disabled={running} className={`${btnBase} bg-white/5 border border-white/10 text-[#999] hover:text-white`}>
        🧹 Clean Spam
      </button>
      <button onClick={() => cleanSpam('all')} disabled={running} className={`${btnBase} bg-white/5 border border-white/10 text-[#999] hover:text-white`}>
        🗑️ Clear Desc
      </button>
      <button onClick={sendToVault} disabled={running} className={`${btnBase} bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20`}>
        🔒 Vault
      </button>

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* Replace Category */}
      <button
        onClick={() => setShowReplace(!showReplace)}
        className={`${btnBase} ${showReplace ? 'bg-pink-500/20 border border-pink-500/30 text-pink-400' : 'bg-white/5 border border-white/10 text-[#999] hover:text-white'}`}
      >
        🔄 Replace Cat
      </button>

      {showReplace && (
        <div className="flex items-center gap-1.5 ml-1">
          <select
            value={replaceFrom}
            onChange={e => setReplaceFrom(e.target.value)}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#111] border border-white/10 text-white outline-none"
          >
            <option value="">From...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-[10px] text-[#666]">→</span>
          <select
            value={replaceTo}
            onChange={e => setReplaceTo(e.target.value)}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#111] border border-white/10 text-white outline-none"
          >
            <option value="">To...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={replaceCategory}
            disabled={!replaceFrom || !replaceTo || replaceFrom === replaceTo}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 disabled:opacity-30 transition-colors"
          >Apply</button>
        </div>
      )}

      {/* Progress / Stop */}
      {running && (
        <div className="flex items-center gap-2 ml-2">
          <div className="text-xs text-[#999]">
            {progress.step} {progress.done}/{progress.total}
          </div>
          <button
            onClick={() => { abortRef.current = true; }}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
          >Stop</button>
        </div>
      )}
    </div>
  );
}
