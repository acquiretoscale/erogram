'use client';

import { useState, useMemo } from 'react';
import axios from 'axios';

interface GroupForEnrich {
  _id: string;
  name: string;
  category: string;
  memberCount: number;
  description: string;
  image: string;
}

interface AiEnrichModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupForEnrich[];
  onSaved: (results: Record<string, string>) => void;
}

function generatePrompt(groups: GroupForEnrich[]): string {
  const context = `You are writing for Erogram.pro, a directory of Telegram groups and channels focused on adult content, adult entertainment, and NSFW material. The audience is adults looking to discover and join Telegram groups in this niche.`;

  if (groups.length === 1) {
    const g = groups[0];
    return `${context}

Write a unique, SEO-friendly description for this Telegram group.

Group name: ${g.name}
Category: ${g.category || 'Unknown'}
Members: ${g.memberCount > 0 ? g.memberCount.toLocaleString() : 'Unknown'}
Current description: ${g.description || 'None'}

Rules:
- Write 2-3 sentences (150-200 characters total) that are UNIQUE to this group
- Mention the group name naturally
- Reference the niche/category and what members can expect to find
- If the current description is in a non-English language, translate it to English and append the original in parentheses
- If the group name is in a non-Latin script (Russian, Chinese, Arabic, etc.), include an English translation in [brackets] after the name
- Do NOT use generic filler like "Join now" or "Best group ever"
- Do NOT duplicate phrasing from other descriptions
- Keep it factual and descriptive for search engines
- Output ONLY the description, nothing else`;
  }

  let prompt = `${context}

Write unique, SEO-friendly descriptions for these ${groups.length} Telegram groups. Each must be distinct — no shared phrasing between groups.

For each group, output a line in this exact format:
[NUMBER]. DESCRIPTION_TEXT

Rules for ALL descriptions:
- 2-3 sentences, 150-200 characters each
- Mention the group name naturally
- Reference the niche/category and what members can expect
- If the current description is in a non-English language, translate it and append the original in parentheses
- If a group name is in a non-Latin script, add an English translation in [brackets]
- No generic filler, keep it factual and SEO-friendly
- Each description MUST be unique — no copy-paste between groups

Groups:\n\n`;

  groups.forEach((g, i) => {
    prompt += `${i + 1}. Name: ${g.name}\n   Category: ${g.category || 'Unknown'} | Members: ${g.memberCount > 0 ? g.memberCount.toLocaleString() : 'Unknown'}\n   Current: ${g.description || 'None'}\n\n`;
  });

  return prompt;
}

export default function AiEnrichModal({ isOpen, onClose, groups, onSaved }: AiEnrichModalProps) {
  const [results, setResults] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  if (!isOpen || groups.length === 0) return null;

  const prompt = generatePrompt(groups);

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const autoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await axios.post('/api/admin/csv-import/ai-enrich', {
        groupIds: groups.map(g => g._id),
      }, { headers: authHeader });
      setResults(res.data.results || {});
    } catch (err: any) {
      alert(err.response?.data?.message || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const parseManualResults = (text: string) => {
    if (groups.length === 1) {
      setResults({ [groups[0]._id]: text.trim() });
      return;
    }
    const lines = text.split('\n').filter(l => l.trim());
    const parsed: Record<string, string> = {};
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.+)$/);
      if (match) {
        const idx = parseInt(match[1]) - 1;
        if (idx >= 0 && idx < groups.length) {
          parsed[groups[idx]._id] = match[2].trim();
        }
      }
    }
    setResults(parsed);
  };

  const save = async () => {
    const enrichments = Object.entries(results)
      .filter(([, desc]) => desc.trim())
      .map(([groupId, description]) => ({ groupId, description }));
    if (enrichments.length === 0) return;

    setSaving(true);
    try {
      await axios.post('/api/admin/csv-import/ai-enrich', { enrichments }, { headers: authHeader });
      onSaved(results);
      onClose();
    } catch {
      alert('Failed to save enrichments.');
    } finally {
      setSaving(false);
    }
  };

  const resultCount = Object.keys(results).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-[90vw] max-w-[900px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-purple-400">✦</span> AI Description Enrichment
            </h3>
            <p className="text-xs text-[#666] mt-1">{groups.length} group{groups.length !== 1 ? 's' : ''} selected</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={autoGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20"
            >
              {generating ? (
                <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</span>
              ) : (
                <span className="flex items-center gap-2">✦ Auto-Generate (Deepseek)</span>
              )}
            </button>
            <button onClick={onClose} className="text-[#666] hover:text-white transition-colors text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {resultCount > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-xs font-bold text-green-400 uppercase tracking-wider">
                  Generated: {resultCount}/{groups.length} descriptions
                </div>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {groups.map(g => (
                  <div key={g._id} className={`p-3 rounded-xl border ${results[g._id] ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {g.image && g.image !== '/assets/image.jpg' && (
                        <img src={g.image} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10" />
                      )}
                      <span className="text-sm font-medium text-white">{g.name}</span>
                      <span className="text-[10px] text-[#666]">{g.category}</span>
                    </div>
                    {results[g._id] ? (
                      <textarea
                        value={results[g._id]}
                        onChange={(e) => setResults(prev => ({ ...prev, [g._id]: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-xs text-green-300 outline-none focus:border-green-500/50 resize-y"
                      />
                    ) : (
                      <span className="text-xs text-red-400/60">(no result)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#999] uppercase tracking-wider">Prompt Preview</label>
                  <button onClick={copyPrompt} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${promptCopied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-[#999] hover:bg-white/10 hover:text-white'}`}>
                    {promptCopied ? '✓ Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <pre className="flex-1 min-h-[200px] p-4 rounded-xl bg-[#0a0a0a] border border-white/5 text-xs text-[#ccc] whitespace-pre-wrap overflow-y-auto font-mono leading-relaxed select-all">
                  {prompt}
                </pre>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Or Paste Manually</label>
                <textarea
                  className="flex-1 min-h-[200px] p-4 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-white outline-none focus:border-purple-500/50 resize-none font-mono leading-relaxed"
                  placeholder={groups.length === 1 ? 'Paste the enriched description here...' : 'Paste the numbered list here...\n\n1. Description for first group...\n2. Description for second group...'}
                  onChange={(e) => parseManualResults(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-white/5">
          <div className="text-xs text-[#555]">
            {resultCount > 0 ? 'Review and edit results above, then save' : 'Click Auto-Generate or copy prompt for manual use'}
          </div>
          <div className="flex gap-3">
            {resultCount > 0 && (
              <button onClick={() => setResults({})} className="px-4 py-2 rounded-xl text-sm text-[#999] bg-white/5 hover:bg-white/10 transition-colors">Clear Results</button>
            )}
            <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm text-[#999] bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
            <button
              onClick={save}
              disabled={resultCount === 0 || saving}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : `Save ${resultCount} Enrichment${resultCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
