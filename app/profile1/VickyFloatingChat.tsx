'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { chatWithVicky } from '@/lib/actions/vickyAI';

interface CreatorCard {
  name: string;
  username: string;
  avatar: string;
  url: string;
  categories: string;
}

function RenderMsg({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) return <>{content}</>;
  const parts = content.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-[#00aff0] underline underline-offset-2 decoration-[#00aff0]/30 font-medium">{link[1]}</a>;
        const bold = part.match(/^\*\*(.*?)\*\*$/);
        if (bold) return <strong key={i} className="font-bold text-white">{bold[1]}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function VickyFloatingChat({ isPremium }: { isPremium: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; creators?: CreatorCard[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const userMsg = { role: 'user' as const, content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    try {
      const res = await chatWithVicky(token, updated);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, creators: res.creators }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    }
    setLoading(false);
  }, [messages, loading]);

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-6" style={{ zIndex: 9998 }}>
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0d1628, #141e33)', border: '2px solid rgba(0,175,240,0.4)', boxShadow: '0 4px 30px rgba(0,175,240,0.3), 0 8px 32px rgba(0,0,0,0.5)' }}>
            <div className="relative shrink-0">
              <img src="/assets/vicky-ai-avatar.jpg" alt="Vicky AI" className="w-14 h-14 rounded-full ring-2 ring-[#00aff0]/40" style={{ objectFit: 'cover', objectPosition: '50% 65%' }} />
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d1628]" />
            </div>
            <div className="text-left">
              <div className="text-[12px] font-bold text-white leading-tight">Ask Vicky</div>
              <div className="text-[9px] text-[#00aff0]/70 font-medium">AI Assistant</div>
            </div>
          </button>
          <style>{`
            @keyframes pulseGlow { 0%, 100% { box-shadow: 0 4px 30px rgba(0,175,240,0.3), 0 8px 32px rgba(0,0,0,0.5); } 50% { box-shadow: 0 4px 40px rgba(0,175,240,0.5), 0 8px 32px rgba(0,0,0,0.5); } }
          `}</style>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] flex flex-col rounded-2xl overflow-hidden"
            style={{ zIndex: 9999, height: 'min(520px, calc(100dvh - 80px))', background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1628 50%, #0a1220 100%)', border: '2px solid rgba(0,175,240,0.25)', boxShadow: '0 12px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,175,240,0.15)' }}>
            <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="relative shrink-0">
                <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-11 h-11 rounded-full ring-2 ring-[#00aff0]/30" style={{ objectFit: 'cover', objectPosition: '50% 65%' }} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0a0f1e]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[13px] font-black text-white leading-tight">Vicky AI</h2>
                <p className="text-[9px] text-white/40 font-medium">Your personal assistant</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {!isPremium ? (
              <div className="flex-1 relative overflow-hidden" style={{ minHeight: '320px' }}>
                <video
                  src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
                  autoPlay muted loop playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: 'blur(6px) brightness(0.25)', transform: 'scale(1.1)' }}
                />
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
                  <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-24 h-24 rounded-full ring-2 ring-white/20 mb-4 shadow-lg" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
                  <h3 className="text-sm font-black text-white mb-1 drop-shadow-md">Meet Vicky AI</h3>
                  <p className="text-[11px] text-white/50 leading-relaxed mb-5 max-w-[220px] drop-shadow-sm">Your personal Erogram concierge. She knows the best creators, groups, bots & AI tools.</p>
                  <a href={typeof window !== 'undefined' && localStorage.getItem('token') ? '/welcome' : '/login?redirect=/welcome'} className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all hover:brightness-110 shadow-lg" style={{ background: '#16a34a', boxShadow: '0 4px 16px rgba(22,163,74,0.4)' }}>Upgrade to VIP to unlock</a>
                </div>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center pt-6 pb-2">
                      <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-20 h-20 rounded-full ring-2 ring-[#00aff0]/15 mb-3" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
                      <p className="text-[11px] text-white/35 text-center max-w-[240px] mb-4 leading-relaxed">Ask me about the best creators, groups, bots, or AI tools.</p>
                      <div className="w-full grid grid-cols-2 gap-1.5">
                        {['Best MILF creators', 'Top Asian groups', 'Free OnlyFans', 'AI undress tools'].map(s => (
                          <button key={s} onClick={() => send(s)}
                            className="text-left px-2.5 py-2 rounded-lg text-[10px] text-white/45 font-medium hover:text-white/70 hover:bg-white/5 transition-all"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-1.5`}>
                      {msg.role === 'assistant' && <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-8 h-8 rounded-full shrink-0 mt-1" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />}
                      <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                        <div className={`px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-white font-medium rounded-br-sm' : 'text-white/85 rounded-bl-sm'}`}
                          style={msg.role === 'user' ? { background: 'rgba(0,175,240,0.2)' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <RenderMsg content={msg.content} isUser={msg.role === 'user'} />
                        </div>
                        {msg.creators && msg.creators.length > 0 && (
                          <div className="grid grid-cols-3 gap-1.5 mt-2">
                            {msg.creators.slice(0, 6).map((c, ci) => (
                              <a key={ci} href={c.url} target="_blank" rel="noopener noreferrer"
                                className="group rounded-xl overflow-hidden transition-all hover:scale-[1.03]"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="aspect-square overflow-hidden">
                                  <img src={c.avatar} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.png'; }} />
                                </div>
                                <div className="px-1.5 py-1.5">
                                  <div className="text-[9px] font-bold text-white truncate">{c.name}</div>
                                  <div className="text-[8px] text-white/30 truncate">@{c.username}</div>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-1.5">
                      <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-8 h-8 rounded-full shrink-0 mt-1" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
                      <div className="px-3 py-2.5 rounded-2xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 px-3 pb-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-1.5">
                    <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                      placeholder="Ask Vicky..." disabled={loading}
                      className="flex-1 bg-white/5 text-white text-[12px] px-3 py-2.5 rounded-xl outline-none placeholder:text-white/20 focus:ring-1 focus:ring-[#00aff0]/30 transition-all"
                      style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                    <button type="submit" disabled={!input.trim() || loading}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                      style={{ background: '#00aff0' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
