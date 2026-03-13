'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useTaskManager } from './TaskManagerContext';

type AIModel = 'qwen' | 'deepseek';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionResult[];
  timestamp: Date;
}

interface ActionResult {
  action: string;
  groupName?: string;
  groupId?: string;
  success: boolean;
  detail: string;
}

const MEMORY_KEY = 'erogram_ai_memory';
const SESSION_KEY = 'erogram_ai_chat_session';

function loadMemory(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}'); } catch { return {}; }
}

function saveMemoryToStorage(mem: Record<string, string>) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

function loadSession(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return []; }
}

function saveSession(msgs: ChatMessage[]) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs)); } catch { /* quota */ }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ok */ }
}

const ACTION_ICONS: Record<string, string> = {
  search_groups: '🔍', update_description: '✏️', rewrite_description: '✍️',
  update_description_de: '🇩🇪', update_description_es: '🇪🇸',
  update_categories: '🏷️', add_categories: '🏷️',
  move_to_vault: '🔐', remove_from_vault: '🌐', approve: '✅', delete: '🗑️',
  update_name: '✏️', count_groups: '📊', bulk_update: '⚡',
  save_memory: '🧠', delete_memory: '🧠',
};

function getPageContext(pathname: string, tab: string | null): string {
  if (pathname.includes('/admin/groups')) {
    const t = tab || 'all';
    const labels: Record<string, string> = {
      all: 'All Groups (browse, edit, approve, vault, delete)',
      pending: 'Pending Groups (review & approve/delete new submissions)',
      import: 'Import (CSV/JSON upload, AI categorize, rewrite, translate)',
      queue: 'Drip-Feed Queue (scheduled publishing)',
      vault: 'Premium Vault (premium-only groups)',
      translations: 'Translations (AI translate/rewrite/categorize in bulk)',
    };
    return `Groups Hub > ${labels[t] || t}`;
  }
  if (pathname.includes('/admin/bots')) return 'Bots Management';
  if (pathname.includes('/admin/articles')) return 'Articles Management';
  if (pathname.includes('/admin/analytics')) return 'Analytics Dashboard';
  if (pathname.includes('/admin/stories')) return 'Stories Management';
  if (pathname.includes('/admin/settings')) return 'Site Settings';
  return 'Admin Dashboard';
}

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiModel, setAiModel] = useState<AIModel>('qwen');
  const [unread, setUnread] = useState(0);
  const [memory, setMemory] = useState<Record<string, string>>({});
  const [showMemory, setShowMemory] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const { addTask, updateTask, finishTask } = useTaskManager();

  const pageContext = getPageContext(pathname, tab);

  useEffect(() => {
    setMemory(loadMemory());
    const saved = loadSession();
    if (saved.length > 0) setMessages(saved);
    setSessionLoaded(true);
  }, []);

  useEffect(() => {
    if (sessionLoaded) saveSession(messages);
  }, [messages, sessionLoaded]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 80);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (open) { setUnread(0); inputRef.current?.focus(); } }, [open]);

  const applyMemoryActions = (actions: ActionResult[]) => {
    let updated = { ...memory };
    let changed = false;
    for (const a of actions) {
      if (a.action === 'save_memory' && a.success) {
        try {
          const { key, value } = JSON.parse(a.detail);
          if (key && value) { updated[key] = value; changed = true; }
        } catch { /* skip */ }
      }
      if (a.action === 'delete_memory' && a.success) {
        try {
          const { key } = JSON.parse(a.detail);
          if (key && updated[key]) { delete updated[key]; changed = true; }
        } catch { /* skip */ }
      }
    }
    if (changed) {
      setMemory(updated);
      saveMemoryToStorage(updated);
    }
  };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const taskId = `chat_${Date.now()}`;
    addTask(taskId, 'AI Chat: processing...', 1);

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const { data } = await axios.post('/api/admin/ai-chat', {
        messages: apiMessages,
        aiModel,
        pageContext,
        memory,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const allActions = data.actions || [];
      applyMemoryActions(allActions);

      const visibleActions = allActions.filter((a: ActionResult) => a.action !== 'search_groups');
      const dbActions = visibleActions.filter((a: ActionResult) => !['save_memory', 'delete_memory'].includes(a.action));
      const succeeded = dbActions.filter((a: ActionResult) => a.success).length;
      const failed = dbActions.filter((a: ActionResult) => !a.success).length;

      if (dbActions.length > 0) {
        updateTask(taskId, succeeded, `AI Chat: ${succeeded} action${succeeded !== 1 ? 's' : ''} done`);
      }
      finishTask(taskId, failed > 0 && succeeded === 0 ? 'error' : 'done',
        failed > 0 ? `${failed} failed` : undefined);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'No response',
        actions: visibleActions,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (!open) setUnread(prev => prev + 1);
    } catch (err: any) {
      finishTask(taskId, 'error', (err as Error).message);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `Error: ${err.response?.data?.message || err.message}`, timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const deleteMemoryItem = (key: string) => {
    const updated = { ...memory };
    delete updated[key];
    setMemory(updated);
    saveMemoryToStorage(updated);
  };

  const memCount = Object.keys(memory).length;

  const hasSession = messages.length > 0;
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <>
      {/* Minimized bar (active session) or floating button (no session) */}
      {!open && (
        hasSession ? (
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl bg-[#151515] border border-white/10 shadow-2xl shadow-black/60 hover:border-[#b31b1b]/40 transition-all group cursor-pointer max-w-[320px]"
          >
            <span className="text-lg shrink-0">🤖</span>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[10px] text-[#666] font-bold uppercase tracking-wider leading-none mb-0.5">
                AI Chat · {messages.length} msgs
                {loading && <span className="text-[#b31b1b] ml-1 animate-pulse">thinking...</span>}
              </div>
              {lastMsg && (
                <div className="text-[11px] text-[#999] truncate group-hover:text-white transition-colors">
                  {lastMsg.role === 'user' ? 'You: ' : 'AI: '}{lastMsg.content.slice(0, 60)}{lastMsg.content.length > 60 ? '...' : ''}
                </div>
              )}
            </div>
            {unread > 0 && (
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#b31b1b] text-[10px] text-white font-black flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#b31b1b] hover:bg-[#d42020] text-white shadow-2xl shadow-[#b31b1b]/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <span className="text-2xl">🤖</span>
          </button>
        )
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-24px)] h-[600px] max-h-[calc(100vh-100px)] flex flex-col rounded-2xl bg-[#111] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0d0d0d] shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🤖</span>
              <div>
                <div className="text-sm font-bold text-white leading-tight">AI Assistant</div>
                <div className="text-[10px] text-[#b31b1b] font-medium truncate max-w-[200px]">{pageContext}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {([{ k: 'qwen' as AIModel, l: 'Q' }, { k: 'deepseek' as AIModel, l: 'DS' }]).map(m => (
                  <button
                    key={m.k}
                    onClick={() => setAiModel(m.k)}
                    className={`px-2 py-1 text-[10px] font-bold transition-all ${
                      aiModel === m.k ? 'bg-[#b31b1b] text-white' : 'bg-white/5 text-[#666] hover:text-white'
                    }`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowMemory(v => !v)}
                className={`p-1.5 transition-all relative ${showMemory ? 'text-[#b31b1b]' : 'text-[#666] hover:text-white'}`}
                title={`Memory (${memCount})`}
              >
                <span className="text-sm">🧠</span>
                {memCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#b31b1b] text-[8px] text-white font-bold flex items-center justify-center">
                    {memCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setMessages([]); setShowMemory(false); clearSession(); }}
                className="p-1.5 text-[#666] hover:text-red-400 transition-all" title="End session (clear chat)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-[#666] hover:text-white transition-all" title="Minimize"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6 6-6-6" /></svg>
              </button>
            </div>
          </div>

          {/* Memory panel (collapsible) */}
          {showMemory && (
            <div className="border-b border-white/10 bg-[#0a0a0a] px-3 py-2 max-h-[180px] overflow-y-auto shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#666] font-bold">Memory ({memCount})</span>
                <span className="text-[9px] text-[#555]">Tell the AI &quot;remember X&quot; to save</span>
              </div>
              {memCount === 0 ? (
                <p className="text-[11px] text-[#555] italic">No memories yet. Say &quot;remember that...&quot; or &quot;from now on always...&quot;</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(memory).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-1.5 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-[#b31b1b]">{key}</span>
                        <p className="text-[11px] text-[#ccc] leading-tight">{value}</p>
                      </div>
                      <button
                        onClick={() => deleteMemoryItem(key)}
                        className="shrink-0 p-0.5 text-[#555] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
                <div className="text-4xl">🤖</div>
                <div>
                  <p className="text-xs text-white font-bold mb-1">Ask me anything about your groups</p>
                  <p className="text-[10px] text-[#999] max-w-[280px]">
                    I know you&apos;re on <span className="text-[#b31b1b] font-bold">{pageContext}</span>. Try:
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    'How many pending groups?',
                    'Show groups with 1 category',
                    'Find groups missing DE translation',
                    'Remember: always assign 2-3 categories',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="px-2.5 py-1 rounded-lg text-[10px] bg-white/5 border border-white/10 text-[#ccc] hover:bg-[#b31b1b]/20 hover:text-white transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-[#b31b1b] text-white'
                    : 'bg-white/[0.04] border border-white/10 text-[#ddd]'
                }`}>
                  <div className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                      {msg.actions.map((a, i) => (
                        <div key={i} className={`flex items-start gap-1.5 text-[11px] rounded-md px-2 py-1 ${
                          a.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          <span className="shrink-0">{ACTION_ICONS[a.action] || '⚙️'}</span>
                          <span>
                            <b>{a.action}</b>
                            {a.groupName && <span className="opacity-70"> {a.groupName}</span>}
                            {a.action === 'save_memory' && (() => {
                              try { const d = JSON.parse(a.detail); return <span className="opacity-70"> {d.key}: {d.value}</span>; } catch { return null; }
                            })()}
                            {a.action === 'delete_memory' && (() => {
                              try { const d = JSON.parse(a.detail); return <span className="opacity-70"> forgot: {d.key}</span>; } catch { return null; }
                            })()}
                            {a.action !== 'save_memory' && a.action !== 'delete_memory' && (
                              <span className="opacity-70"> — {a.detail}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-[#999]">
                  <div className="flex gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b31b1b] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b31b1b] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#b31b1b] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 pt-0 shrink-0">
            <div className="flex gap-1.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Enter to send)"
                rows={1}
                disabled={loading}
                className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-[13px] text-white placeholder:text-[#555] outline-none focus:border-[#b31b1b]/50 resize-none disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-[#b31b1b] hover:bg-[#d42020] text-white rounded-xl font-bold text-xs transition-all disabled:opacity-30 shrink-0"
              >
                {loading ? '...' : '→'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
