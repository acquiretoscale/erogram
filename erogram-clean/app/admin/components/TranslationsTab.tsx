'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTaskManager } from './TaskManagerContext';
import { isSpamDescription } from '@/lib/utils/spamCleaner';

type Mode = 'translate' | 'rewrite' | 'categorize' | 'cat+translate';
type Lang = 'de' | 'es';
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
const ALLOWED_CATS_SET = new Set(CATEGORIES.map(c => c.toLowerCase()));
function validateCats(raw: string[]): string[] {
  return raw.map(c => CATEGORIES.find(k => k.toLowerCase() === c.trim().toLowerCase())).filter(Boolean) as string[];
}

const EROGRAM_CONTEXT = `Erogram.pro is an adult NSFW Telegram groups & channels directory. The audience is adults looking to discover and join Telegram communities in adult/NSFW niches. Use language appropriate for this space — direct, descriptive, and unapologetic about the adult nature of the content.`;

const TRANSLATE_SYSTEM = (lang: string) => `You are a native ${lang} speaker who writes for Erogram.pro — an adult NSFW Telegram groups & channels directory.

${EROGRAM_CONTEXT}

AVAILABLE CATEGORIES on Erogram: ${CATEGORIES.join(', ')}

Translation rules:
- DO NOT translate word-for-word. Rewrite the description naturally in ${lang} as a native speaker would phrase it
- Use the everyday slang, tone, and vocabulary that ${lang}-speaking adults actually use when talking about adult/NSFW content online
- Write like a real person — casual, direct, sex-positive. This is an adult industry directory, not a corporate website
- Each description must be 200+ characters — expand thin descriptions using niche knowledge, member count, and group context
- NO filler words (no "Join now!", "Best group ever!", "Don't miss out!", "Click here")
- Talk about the NICHE: identify what the group is about and describe it specifically using terms native ${lang} speakers search for
- Preserve brand names: Erogram, Telegram
- If the group name is non-Latin (Chinese, Russian, Arabic, Korean, etc.), keep the original script AND add [English meaning] in brackets
- Prioritize how a ${lang} speaker would naturally search for and describe this type of content
- Return ONLY translations in the requested [N] format, no explanations`;

const TRANSLATE_USER = `Translate these {{count}} group descriptions to {{language}}. Each translation must be 200+ characters, niche-specific, no filler. Return each on its own line in format [N] translated_text:

{{groups}}`;

const REWRITE_SYSTEM = `You are an expert SEO content writer for Erogram.pro — an adult NSFW Telegram groups directory.

${EROGRAM_CONTEXT}

AVAILABLE CATEGORIES on Erogram: ${CATEGORIES.join(', ')}

CRITICAL: You MUST write ALL descriptions in ENGLISH regardless of the source language. If the original description is in Portuguese, Spanish, Russian, or any other language, translate and rewrite it into fluent English.

Rewriting rules:
- ALWAYS output in ENGLISH — never in Portuguese, Spanish, or any other language
- Rewrite each description to be UNIQUE and human-written to avoid duplicate content penalties
- Each description must be 200+ characters minimum
- NO filler words (no "Join now!", "Best group!", "Don't miss!", "Click here!", "Amazing!", "Incredible!")
- Identify the NICHE from the group name, category, member count, and existing description — write about it specifically
- Mention the group name naturally in the text
- If the group name is in a non-Latin script (Chinese 中文, Russian Русский, Arabic عربي, Korean 한국어, etc.), write it in the original script first, then add the English translation in [brackets] — e.g. "色情群组 [Porn Group]"
- Use the member count to add credibility when available (e.g. "a community of 15,000+ members")
- Write as a knowledgeable human who understands adult Telegram communities, not as a generic AI
- Each description must be completely different from others — vary sentence structure, vocabulary, and approach
- Return ONLY the rewritten text in [N] format, no explanations`;

const REWRITE_USER = `Rewrite these {{count}} group descriptions IN ENGLISH for SEO. If the source is in Portuguese, Spanish, or any other language, translate it to English. Each must be 200+ chars, unique, human-like, niche-specific, no filler. Return each on its own line in format [N] rewritten_text:

{{groups}}`;

const CATEGORIZE_SYSTEM = `You are a category classification specialist for Erogram.pro — an adult NSFW Telegram groups directory.

${EROGRAM_CONTEXT}

You MUST assign EXACTLY 2 or 3 categories from this EXACT list (use exact spelling, case-sensitive):
${CATEGORIES.join(', ')}

HOW TO CATEGORIZE:
1. READ THE GROUP NAME CAREFULLY — it's the strongest signal. "Hot Desi Girls" = Asian/India. "Lesbian Paradise" = Lesbian. "Hentai Yuri" = Hentai + Lesbian.
2. READ THE DESCRIPTION — identify the ACTUAL CONTENT TYPE (what kind of adult content: lesbian, amateur, hentai, feet, etc.)
3. DETECT THE COUNTRY — based on the GROUP NAME and the ACTUAL TOPIC, NOT the language of spam/disclaimers mixed in.

CRITICAL COUNTRY RULES:
- Many descriptions contain MIXED LANGUAGES from spam, ads, and disclaimers that are NOT related to the group's actual country.
- A group called "Hot Colombian Girls" with Russian spam in its description is COLOMBIAN, not Russian.
- A group called "Latina Amateur" with Italian disclaimers is LATINA, not Italy.
- Only assign a country category when the GROUP NAME or ACTUAL CONTENT clearly indicates that country.
- Russian/Chinese/Spanish text in disclaimers does NOT mean the group is from that country.
- If the Country field is provided, trust it over language detection from description spam.

Country mappings: Brazilian/Portuguese → "Brazil", Chinese → "China", Japanese → "Japan", Russian → "Russian", German → "Germany", Spanish → "Spain", British → "UK", American → "USA", Colombian → "Colombia", Mexican → "Mexico", French → "France", Italian → "Italy", Filipino → "Philippines", Vietnamese → "Vietnam", Argentine → "Argentina", Ukrainian → "Ukraine"

OTHER RULES:
- MINIMUM 2 categories, MAXIMUM 3. NEVER return only 1.
- Pick SPECIFIC niches first (e.g. "Hentai" over "Adult", "Lesbian" over "Telegram-Porn")
- "Telegram-Porn" or "Amateur" as safe fallbacks for 2nd/3rd slot
- "Adult" only when nothing more specific applies
- Format: [N] Category1 | Category2 | Category3
- Return ONLY categorizations, no explanations`;

const CATEGORIZE_USER = `Categorize these {{count}} Telegram groups. If a group already has categories listed, ADD more specific ones to reach 2-3 total — do NOT remove existing valid categories. NEVER return only 1 category. Detect countries from language/content. Return each on its own line in format [N] Category1 | Category2 | Category3:

{{groups}}`;

interface GroupPreview {
  _id: string;
  name: string;
  category: string;
  description: string;
  memberCount?: number;
  [key: string]: any;
}

export default function TranslationsTab() {
  const [mode, setMode] = useState<Mode>('translate');
  const [targetLang, setTargetLang] = useState<Lang>('de');
  const [aiModel, setAiModel] = useState<AIModel>('qwen');
  const [turbo, setTurbo] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState('');
  const [userTemplate, setUserTemplate] = useState('');
  const [targetField, setTargetField] = useState('description_de');
  const [promptsLoaded, setPromptsLoaded] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

  const [filter, setFilter] = useState<'untranslated' | 'all' | 'translated' | 'uncategorized'>('untranslated');
  const [liveOnly, setLiveOnly] = useState(true);
  const [sinceDate, setSinceDate] = useState('');
  const [groups, setGroups] = useState<GroupPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, step: '' });
  const [results, setResults] = useState<Record<string, string>>({});
  const [catResults, setCatResults] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Array<{ groupId: string; error: string }>>([]);
  const abortRef = useRef(false);
  const { addTask, updateTask, finishTask } = useTaskManager();
  const taskIdRef = useRef('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const langName = targetLang === 'de' ? 'German' : 'Spanish';
  const baseMode = mode === 'cat+translate' ? 'categorize' : mode;

  const PROMPT_STORAGE_KEY = 'erogram_ai_prompts';
  const sysRef = useRef(systemPrompt);
  const usrRef = useRef(userTemplate);

  const storageKey = (mKey: string, lang: string, type: string) => `${mKey}_${lang}_${type}`;

  const readStorage = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(PROMPT_STORAGE_KEY) || '{}'); } catch { return {}; }
  };

  const writeStorage = (key: string, val: string) => {
    try {
      const saved = readStorage();
      saved[key] = val;
      localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(saved));
    } catch { /* ignore */ }
  };

  const getDefaultSystem = (m: Mode, lang: string) => {
    if (m === 'translate') return TRANSLATE_SYSTEM(lang);
    if (m === 'rewrite') return REWRITE_SYSTEM;
    return CATEGORIZE_SYSTEM;
  };

  const getDefaultUser = (m: Mode) => {
    if (m === 'translate') return TRANSLATE_USER;
    if (m === 'rewrite') return REWRITE_USER;
    return CATEGORIZE_USER;
  };

  const applyPrompts = (m: Mode, lang: Lang) => {
    const lName = lang === 'de' ? 'German' : 'Spanish';
    const mKey = m === 'cat+translate' ? 'categorize' : m;
    const saved = readStorage();
    const sys = saved[storageKey(mKey, lang, 'system')];
    const usr = saved[storageKey(mKey, lang, 'user')];
    const sysVal = (sys && sys.length > 10) ? sys : getDefaultSystem(m, lName);
    const usrVal = (usr && usr.length > 5) ? usr : getDefaultUser(m);
    setSystemPrompt(sysVal);
    setUserTemplate(usrVal);
    sysRef.current = sysVal;
    usrRef.current = usrVal;
  };

  useEffect(() => {
    applyPrompts(mode, targetLang);
    setPromptsLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSystemPromptChange = (val: string) => {
    setSystemPrompt(val);
    sysRef.current = val;
    const mKey = mode === 'cat+translate' ? 'categorize' : mode;
    writeStorage(storageKey(mKey, targetLang, 'system'), val);
  };

  const handleUserTemplateChange = (val: string) => {
    setUserTemplate(val);
    usrRef.current = val;
    const mKey = mode === 'cat+translate' ? 'categorize' : mode;
    writeStorage(storageKey(mKey, targetLang, 'user'), val);
  };

  const resetPrompts = () => {
    const lName = targetLang === 'de' ? 'German' : 'Spanish';
    const defSys = getDefaultSystem(mode, lName);
    const defUsr = getDefaultUser(mode);
    setSystemPrompt(defSys);
    setUserTemplate(defUsr);
    sysRef.current = defSys;
    usrRef.current = defUsr;
    const mKey = mode === 'cat+translate' ? 'categorize' : mode;
    writeStorage(storageKey(mKey, targetLang, 'system'), defSys);
    writeStorage(storageKey(mKey, targetLang, 'user'), defUsr);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setResults({});
    setCatResults({});
    setErrors([]);

    if (m === 'translate') {
      setTargetField(`description_${targetLang}`);
      setFilter('untranslated');
    } else if (m === 'rewrite') {
      setTargetField('description');
      setFilter('all');
    } else if (m === 'categorize') {
      setTargetField('category');
      setFilter('uncategorized');
    } else {
      setTargetField('category');
      setFilter('all');
    }
    applyPrompts(m, targetLang);
  };

  const updateLang = (lang: Lang) => {
    setTargetLang(lang);
    if (mode === 'translate') {
      setTargetField(`description_${lang}`);
    } else if (mode === 'cat+translate') {
      setTargetField('category');
    }
    setResults({});
    setCatResults({});
    setErrors([]);
    applyPrompts(mode, lang);
  };

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/groups', { headers: authHeader });
      let all: GroupPreview[] = (res.data.groups || res.data || []);

      if (liveOnly) {
        all = all.filter((g: any) => g.status === 'approved' && !g.premiumOnly);
      }

      if (sinceDate) {
        const since = new Date(sinceDate).getTime();
        all = all.filter((g: any) => g.createdAt && new Date(g.createdAt).getTime() >= since);
      }

      if (filter === 'untranslated') {
        const tf = mode === 'cat+translate' ? `description_${targetLang}` : targetField;
        all = all.filter((g: any) => g.description && (!g[tf] || g[tf].trim() === ''));
      } else if (filter === 'translated') {
        all = all.filter((g: any) => g[targetField] && g[targetField].trim() !== '');
      } else if (filter === 'uncategorized') {
        all = all.filter((g: any) => !g.category || g.category.trim() === '' || g.category === 'Unknown');
      }

      setGroups(all);
      setSelectedIds(new Set(all.map(g => g._id)));
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally { setLoading(false); }
  }, [authHeader, filter, liveOnly, sinceDate, targetField, targetLang, mode]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const runChunked = async (
    ids: string[],
    apiMode: string,
    apiTargetField: string,
    apiTargetLang: string,
    sysPrompt: string,
    usrTemplate: string,
    stepLabel: string,
    onChunkComplete?: (chunkResults: Record<string, string>, apiTargetField: string) => void,
    modelOverride?: AIModel,
  ): Promise<{ results: Record<string, string>; errors: Array<{ groupId: string; error: string }> }> => {
    const CHUNK = 8;
    const model = modelOverride || aiModel;
    const CONCURRENCY = turbo ? (model === 'both' ? 6 : 4) : 2;
    const allResults: Record<string, string> = {};
    const allErrors: Array<{ groupId: string; error: string }> = [];

    const postChunk = async (chunk: string[], chunkModel: 'qwen' | 'deepseek') => {
      const res = await axios.post('/api/admin/translate', {
        groupIds: chunk,
        targetLanguage: apiTargetLang,
        targetField: apiTargetField,
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
        if (model === 'both') {
          m = (chunkIndex + j) % 2 === 0 ? 'qwen' : 'deepseek';
        } else {
          m = model;
        }
        return postChunk(c, m);
      }));
      chunkIndex += chunks.length;

      let doneUpTo = i;
      for (let j = 0; j < settled.length; j++) {
        const s = settled[j];
        if (s.status === 'fulfilled') {
          Object.assign(allResults, s.value.results);
          allErrors.push(...s.value.errors);
          doneUpTo = Math.min(i + (j + 1) * CHUNK, ids.length);
          if (Object.keys(s.value.results).length > 0 && onChunkComplete) {
            onChunkComplete(s.value.results, apiTargetField);
          }
        } else {
          for (const id of chunks[j]) {
            allErrors.push({ groupId: id, error: s.reason?.message || 'Request failed' });
          }
        }
      }
      setProgress({ done: doneUpTo, total: ids.length, step: abortRef.current ? 'Stopped' : stepLabel });
      if (abortRef.current) break;
    }

    return { results: allResults, errors: allErrors };
  };

  const runAction = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { alert('Select groups first.'); return; }

    abortRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: ids.length, step: '' });
    setResults({});
    setCatResults({});
    setErrors([]);

    const tid = `translations_${Date.now()}`;
    taskIdRef.current = tid;
    const taskLabel = mode === 'rewrite' ? 'Rewrite EN' : mode === 'categorize' ? 'Categorize' : mode === 'cat+translate' ? 'Cat+Translate' : `Translate → ${langName}`;
    addTask(tid, `${taskLabel}: ${ids.length} groups`, ids.length);

    let runResults: Record<string, string> = {};
    let runCatResults: Record<string, string> = {};

    const onChunkComplete = (chunkResults: Record<string, string>, field: string) => {
      setResults(prev => {
        const next = { ...prev, ...chunkResults };
        updateTask(taskIdRef.current, Object.keys(next).length);
        return next;
      });
      setGroups(prev => prev.map(g => {
        const val = chunkResults[g._id];
        if (!val) return g;
        const updated = { ...g } as any;
        if (field === 'category') {
          const allCats = validateCats(val.split('|'));
          if (allCats.length === 0) return g;
          updated.category = allCats[0];
          updated.categories = allCats;
        } else {
          updated[field] = val;
        }
        return updated;
      }));
    };

    if (mode === 'cat+translate') {
      const savedCatSys = readStorage()[storageKey('categorize', targetLang, 'system')];
      const savedCatUsr = readStorage()[storageKey('categorize', targetLang, 'user')];
      const catSys = (savedCatSys && savedCatSys.length > 10) ? savedCatSys : CATEGORIZE_SYSTEM;
      const catUsr = (savedCatUsr && savedCatUsr.length > 5) ? savedCatUsr : CATEGORIZE_USER;

      const catRun = await runChunked(ids, 'categorize', 'category', 'en', catSys, catUsr, 'Categorizing', onChunkComplete);
      runCatResults = catRun.results;
      setCatResults({ ...runCatResults });
      setErrors([...catRun.errors]);

      setProgress({ done: 0, total: ids.length, step: 'Translating' });
      const transField = `description_${targetLang}`;
      const savedTrSys = readStorage()[storageKey('translate', targetLang, 'system')];
      const savedTrUsr = readStorage()[storageKey('translate', targetLang, 'user')];
      const trSys = (savedTrSys && savedTrSys.length > 10) ? savedTrSys : TRANSLATE_SYSTEM(langName);
      const trUsr = (savedTrUsr && savedTrUsr.length > 5) ? savedTrUsr : TRANSLATE_USER;

      const transRun = await runChunked(ids, 'translate', transField, targetLang, trSys, trUsr, 'Translating', onChunkComplete);
      runResults = transRun.results;
      setResults({ ...runResults });
      setErrors(prev => [...prev, ...transRun.errors]);
    } else {
      const run = await runChunked(ids, mode, targetField, mode === 'translate' ? targetLang : 'en', sysRef.current, usrRef.current, '', onChunkComplete);
      runResults = run.results;
      setResults({ ...runResults });
      setErrors([...run.errors]);
    }

    setRunning(false);
    const totalDone = Object.keys(runResults).length + Object.keys(runCatResults).length;
    finishTask(taskIdRef.current, abortRef.current ? 'stopped' : totalDone > 0 ? 'done' : 'error');

    setGroups(prev => prev.map(g => {
      const updated = { ...g };
      if (runResults[g._id]) {
        if (mode === 'rewrite') updated.description = runResults[g._id];
        if (mode === 'translate') (updated as any)[targetField] = runResults[g._id];
        if (mode === 'categorize') {
          const allCats = validateCats(runResults[g._id].split('|'));
          if (allCats.length) { updated.category = allCats[0]; (updated as any).categories = allCats; }
        }
      }
      if (runCatResults[g._id]) {
        const allCats = validateCats(runCatResults[g._id].split('|'));
        if (allCats.length) { updated.category = allCats[0]; (updated as any).categories = allCats; }
      }
      if (runResults[g._id] && mode === 'cat+translate') {
        (updated as any)[`description_${targetLang}`] = runResults[g._id];
      }
      return updated;
    }));
  };

  const resultCount = Object.keys(results).length;
  const catResultCount = Object.keys(catResults).length;
  const totalResultCount = resultCount + catResultCount;
  const previewGroups = groups.filter(g => selectedIds.has(g._id));

  useEffect(() => {
    if (totalResultCount > 0 && !running && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [totalResultCount, running]);

  const cleanDescs = async (mode: 'spam' | 'all') => {
    const pool = selectedIds.size > 0 ? groups.filter(g => selectedIds.has(g._id)) : groups;
    const targets = mode === 'all'
      ? pool.filter(g => g.description)
      : pool.filter(g => g.description && isSpamDescription(g.description));
    if (targets.length === 0) { alert(mode === 'all' ? 'No descriptions to clear.' : `No spam detected in ${pool.length} group(s).`); return; }
    const msg = mode === 'all'
      ? `Clear ALL descriptions from ${targets.length} group(s)?\n\nThis wipes every description so AI can rewrite from scratch.`
      : `Found ${targets.length} spam description(s) out of ${pool.length}.\n\nBlank them so AI can rewrite from scratch?`;
    if (!confirm(msg)) return;
    try {
      const ids = targets.map(g => g._id);
      await axios.put('/api/admin/csv-import/dispatch', { groupIds: ids, updates: { description: '' } }, { headers: authHeader });
      setGroups(prev => prev.map(g => ids.includes(g._id) ? { ...g, description: '' } : g));
      alert(`Cleared ${targets.length} description(s). Run Rewrite to generate fresh ones.`);
    } catch { alert('Failed to clean descriptions.'); }
  };

  const modeLabel = mode === 'translate' ? `Translate → ${langName}`
    : mode === 'rewrite' ? 'Rewrite in English'
    : mode === 'categorize' ? 'Categorize'
    : `Categorize + Translate → ${langName}`;

  const modelTag = aiModel === 'both' ? 'Qwen+DS' : aiModel === 'deepseek' ? 'DS' : 'Qwen';
  const turboTag = turbo ? ' ⚡' : '';
  const actionLabel = mode === 'translate'
    ? `Translate ${selectedIds.size} → ${langName} [${modelTag}${turboTag}]`
    : mode === 'rewrite'
    ? `Write ${selectedIds.size} Desc [${modelTag}${turboTag}]`
    : mode === 'categorize'
    ? `Categorize ${selectedIds.size} [${modelTag}${turboTag}]`
    : `Cat+Translate ${selectedIds.size} [${modelTag}${turboTag}]`;

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'translate' as Mode, icon: '🌐', label: 'Translate' },
          { key: 'rewrite' as Mode, icon: '✍️', label: 'Rewrite in English' },
          { key: 'categorize' as Mode, icon: '🏷️', label: 'Categorize' },
          { key: 'cat+translate' as Mode, icon: '🏷️🌐', label: 'Categorize + Translate' },
        ]).map(m => (
          <button
            key={m.key}
            onClick={() => switchMode(m.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === m.key
                ? 'bg-[#b31b1b] text-white shadow-lg shadow-[#b31b1b]/20'
                : 'bg-white/5 text-[#999] hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
      </div>

      {/* Language picker + model switcher + options */}
      <div className="flex flex-wrap items-center gap-4">
        {(mode === 'translate' || mode === 'cat+translate') && (
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            <button
              onClick={() => updateLang('de')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${targetLang === 'de' ? 'bg-[#b31b1b] text-white' : 'bg-white/5 text-[#999] hover:text-white'}`}
            >
              🇩🇪 German
            </button>
            <button
              onClick={() => updateLang('es')}
              className={`px-4 py-2 text-sm font-bold transition-colors ${targetLang === 'es' ? 'bg-[#b31b1b] text-white' : 'bg-white/5 text-[#999] hover:text-white'}`}
            >
              🇪🇸 Spanish
            </button>
          </div>
        )}

        {/* AI Model Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#666] uppercase tracking-wider">Model:</label>
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            {([
              { key: 'qwen' as AIModel, label: 'Qwen', color: 'bg-blue-600' },
              { key: 'deepseek' as AIModel, label: 'DeepSeek', color: 'bg-emerald-600' },
              { key: 'both' as AIModel, label: 'Both', color: 'bg-purple-600' },
            ]).map(m => (
              <button
                key={m.key}
                onClick={() => setAiModel(m.key)}
                className={`px-3 py-2 text-xs font-bold transition-colors ${aiModel === m.key ? `${m.color} text-white` : 'bg-white/5 text-[#999] hover:text-white'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {aiModel === 'both' && !turbo && <span className="text-[10px] text-purple-400">Alternates Qwen & DeepSeek</span>}
        </div>

        {/* Turbo toggle */}
        <button
          onClick={() => setTurbo(t => !t)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${turbo ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-lg shadow-orange-500/10' : 'bg-white/5 border-white/10 text-[#666] hover:text-white'}`}
        >
          {turbo ? '⚡ TURBO ON' : '⚡ Turbo'}
        </button>
        {turbo && (
          <span className="text-[10px] text-orange-400/70">
            {aiModel === 'both' ? '6 parallel (3 Qwen + 3 DeepSeek)' : `4 parallel ${aiModel}`}
          </span>
        )}

        {mode !== 'cat+translate' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#666] uppercase tracking-wider">Target field:</label>
            <input
              value={targetField}
              onChange={(e) => setTargetField(e.target.value)}
              className="px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white font-mono outline-none focus:border-[#b31b1b]/50 w-40"
            />
          </div>
        )}
      </div>

      {/* Prompt Lab */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
          <span className="text-purple-400">⚗</span>
          <span className="text-sm font-bold">Prompt Lab — {modeLabel}</span>
          <span className="text-[10px] text-green-400/60 font-medium ml-2">Auto-saved</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={resetPrompts} className="text-[10px] text-[#555] hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">Reset defaults</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
          <div className="p-5">
            <label className="text-[10px] text-[#666] uppercase tracking-wider mb-2 block">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              rows={12}
              className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white font-mono outline-none focus:border-purple-500/50 resize-y leading-relaxed"
            />
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-[#666] uppercase tracking-wider">User Prompt Template</label>
              <span className="text-[10px] text-[#555]">{'{{groups}} {{language}} {{count}}'}</span>
            </div>
            <textarea
              value={userTemplate}
              onChange={(e) => handleUserTemplateChange(e.target.value)}
              rows={12}
              className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white font-mono outline-none focus:border-purple-500/50 resize-y leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Group filter + load */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          <button
            onClick={() => setLiveOnly(true)}
            className={`px-3 py-2 text-xs font-bold transition-colors ${liveOnly ? 'bg-green-600 text-white' : 'bg-white/5 text-[#999] hover:text-white'}`}
          >
            Live only
          </button>
          <button
            onClick={() => setLiveOnly(false)}
            className={`px-3 py-2 text-xs font-bold transition-colors ${!liveOnly ? 'bg-[#b31b1b] text-white' : 'bg-white/5 text-[#999] hover:text-white'}`}
          >
            All groups
          </button>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-[#b31b1b] appearance-none"
        >
          {(mode === 'categorize' || mode === 'cat+translate') && <option value="uncategorized">Uncategorized only</option>}
          {(mode === 'translate' || mode === 'cat+translate') && <option value="untranslated">Untranslated only</option>}
          {mode === 'translate' && <option value="translated">Already translated</option>}
          <option value="all">All groups</option>
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#666]">Added since:</span>
          <div className="flex gap-1">
            {[
              { label: 'Today', value: new Date(new Date().setHours(0,0,0,0)).toISOString().split('T')[0] },
              { label: '7d', value: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] },
              { label: '30d', value: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] },
              { label: 'All time', value: '' },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => setSinceDate(p.value)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${sinceDate === p.value ? 'bg-[#b31b1b] text-white' : 'bg-white/5 text-[#999] hover:bg-white/10'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={sinceDate}
            onChange={(e) => setSinceDate(e.target.value)}
            className="px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs text-white outline-none w-[130px]"
          />
        </div>
        <button
          onClick={loadGroups}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load Groups'}
        </button>
        {groups.length > 0 && (
          <span className="text-xs text-[#666]">{groups.length} groups loaded · {selectedIds.size} selected</span>
        )}
      </div>

      {/* Groups preview table */}
      {groups.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#111] border-b border-white/5">
              <tr>
                <th className="px-3 py-2 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === groups.length && groups.length > 0}
                    onChange={() => {
                      if (selectedIds.size === groups.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(groups.map(g => g._id)));
                    }}
                    className="accent-[#b31b1b]"
                  />
                </th>
                <th className="px-3 py-2 text-left text-[#666] font-medium">Name</th>
                <th className="px-3 py-2 text-left text-[#666] font-medium">Category</th>
                {baseMode !== 'categorize' && <th className="px-3 py-2 text-left text-[#666] font-medium">Members</th>}
                <th className="px-3 py-2 text-left text-[#666] font-medium">Description</th>
                <th className="px-3 py-2 text-left text-[#666] font-medium">
                  {baseMode === 'categorize' ? 'AI Suggestion' : mode === 'rewrite' ? 'Rewritten' : `description_${targetLang}`}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {groups.slice(0, 100).map(g => (
                <tr key={g._id} className={`transition-colors ${selectedIds.has(g._id) ? 'bg-white/[0.02]' : ''}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selectedIds.has(g._id)} onChange={() => toggleSelect(g._id)} className="accent-[#b31b1b]" />
                  </td>
                  <td className="px-3 py-2 font-medium text-white truncate max-w-[140px]">{g.name}</td>
                  <td className="px-3 py-2 text-[#666]">
                    {catResults[g._id] ? (
                      <div className="flex flex-wrap gap-1">
                        {catResults[g._id].split('|').map((c: string, i: number) => (
                          <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-[#999]'}`}>{c.trim()}</span>
                        ))}
                      </div>
                    ) : (g as any).categories?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {((g as any).categories as string[]).map((c: string, i: number) => (
                          <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-[#999]'}`}>{c}</span>
                        ))}
                      </div>
                    ) : (g.category || '—')}
                  </td>
                  {baseMode !== 'categorize' && <td className="px-3 py-2 text-[#666]">{g.memberCount ? g.memberCount.toLocaleString() : '—'}</td>}
                  <td className="px-3 py-2 text-[#999] truncate max-w-[200px]">{g.description || '—'}</td>
                  <td className="px-3 py-2 truncate max-w-[200px]">
                    {mode === 'cat+translate' ? (
                      results[g._id] ? (
                        <span className="text-green-400">{results[g._id].slice(0, 80)}{results[g._id].length > 80 ? '...' : ''}</span>
                      ) : catResults[g._id] ? (
                        <div className="flex flex-wrap gap-1">
                          {catResults[g._id].split('|').map((cat, i) => (
                            <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-[#999]'}`}>{cat.trim()}</span>
                          ))}
                        </div>
                      ) : <span className="text-[#444]">—</span>
                    ) : results[g._id] ? (
                      <span className={baseMode === 'categorize' ? 'text-blue-400 font-medium' : 'text-green-400'}>
                        {baseMode === 'categorize'
                          ? results[g._id].split('|').map(c => c.trim()).join(' · ')
                          : `${results[g._id].slice(0, 80)}${results[g._id].length > 80 ? '...' : ''}`}
                      </span>
                    ) : g[targetField] ? (
                      <span className="text-[#666]">{String(g[targetField]).slice(0, 80)}...</span>
                    ) : (
                      <span className="text-[#444]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {groups.length > 100 && (
            <div className="px-3 py-2 text-center text-[10px] text-[#666] border-t border-white/5">
              Showing 100 of {groups.length} — select and process in batches
            </div>
          )}
        </div>
      )}

      {/* Action buttons + progress */}
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {!running && (
            <>
              <button
                onClick={runAction}
                disabled={selectedIds.size === 0}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg ${
                  baseMode === 'categorize'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/20'
                    : mode === 'rewrite'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/20'
                    : 'bg-gradient-to-r from-[#b31b1b] to-purple-600 hover:from-[#c42b2b] hover:to-purple-500 shadow-[#b31b1b]/20'
                }`}
              >
                {actionLabel}
              </button>
              <button
                onClick={() => cleanDescs('spam')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors border border-orange-500/20"
              >
                🧹 Clean Spam
              </button>
              <button
                onClick={() => cleanDescs('all')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-400/80 hover:bg-red-500/20 transition-colors border border-red-500/10"
              >
                🗑️ Clear All Desc
              </button>
            </>
          )}

          {running && (
            <div className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span className="text-sm text-white font-bold">
                  {progress.step ? `${progress.step} ` : ''}{progress.done}/{progress.total}
                </span>
                <span className="text-xs text-green-400 font-medium">({resultCount} done)</span>
              </div>
              <button
                onClick={() => { abortRef.current = true; }}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg shadow-red-500/20"
              >
                Stop
              </button>
              <div className="flex-1 max-w-xs">
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      baseMode === 'categorize' ? 'bg-gradient-to-r from-blue-600 to-cyan-600'
                      : mode === 'rewrite' ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                      : 'bg-gradient-to-r from-[#b31b1b] to-purple-600'
                    }`}
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category results (for cat+translate combined mode) */}
      {catResultCount > 0 && mode === 'cat+translate' && (
        <div className="rounded-2xl p-5 border border-blue-500/20 bg-blue-500/[0.02]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-blue-400 font-bold text-sm">🏷️ {catResultCount} categorizations saved</span>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {previewGroups.filter(g => catResults[g._id]).map(g => (
              <div key={g._id} className="flex items-center gap-3 p-2 rounded-xl bg-black/20 border border-white/5">
                <div className="text-xs font-medium text-white truncate flex-1">{g.name}</div>
                <div className="text-[10px] text-[#666]">{g.category || 'None'}</div>
                <div className="text-xs text-[#666]">→</div>
                <div className="flex flex-wrap gap-1">
                  {catResults[g._id].split('|').map((cat, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-[#999]'}`}>{cat.trim()}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main results */}
      <div ref={resultsRef} />
      {resultCount > 0 && (
        <div className={`rounded-2xl p-5 ${
          baseMode === 'categorize' && mode !== 'cat+translate' ? 'border border-blue-500/20 bg-blue-500/[0.02]'
          : mode === 'rewrite' ? 'border border-amber-500/20 bg-amber-500/[0.02]'
          : 'border border-green-500/20 bg-green-500/[0.02]'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`font-bold text-sm ${
              baseMode === 'categorize' && mode !== 'cat+translate' ? 'text-blue-400'
              : mode === 'rewrite' ? 'text-amber-400'
              : 'text-green-400'
            }`}>
              ✓ {resultCount} {mode === 'categorize' ? 'categorizations' : mode === 'rewrite' ? 'rewrites' : 'translations'} {running ? 'so far...' : 'saved'}
            </span>
            {errors.length > 0 && <span className="text-red-400 text-xs">· {errors.length} errors</span>}
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {previewGroups.filter(g => results[g._id]).map(g => (
              <div key={g._id} className="flex gap-3 p-2.5 rounded-xl bg-black/20 border border-white/5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{g.name}</div>
                  {mode === 'categorize' ? (
                    <div className="text-[10px] text-[#666] mt-0.5">Current: {g.category || 'None'}</div>
                  ) : (
                    <div className="text-[10px] text-[#666] truncate mt-0.5">{g.description}</div>
                  )}
                </div>
                <div className="text-xs text-[#666] px-2">→</div>
                <div className="flex-1 min-w-0">
                  {mode === 'categorize' ? (
                    <div className="flex flex-wrap gap-1">
                      {results[g._id].split('|').map((cat, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-[#999]'}`}>{cat.trim()}</span>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-xs ${mode === 'rewrite' ? 'text-amber-400' : 'text-green-400'}`}>{results[g._id]}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-4">
          <div className="text-xs font-bold text-red-400 mb-2">{errors.length} error(s)</div>
          <div className="space-y-1 max-h-[150px] overflow-y-auto">
            {errors.map((e, i) => (
              <div key={i} className="text-[10px] text-red-400/70">{e.groupId}: {e.error}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
