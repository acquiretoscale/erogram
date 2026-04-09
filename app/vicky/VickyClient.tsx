'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { chatWithVicky } from '@/lib/actions/vickyAI';

interface CreatorCard {
  name: string;
  username: string;
  avatar: string;
  url: string;
  categories: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  creators?: CreatorCard[];
}

const SUGGESTIONS = [
  'Best MILF creators on OnlyFans',
  'Top Asian Telegram groups',
  'Show me free OnlyFans creators',
  'Best AI undress tools',
  'Hot blonde creators & groups',
  'Top Latina OnlyFans',
];

export default function VickyClient() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setIsPremium(!!data.premium))
      .catch(() => setIsPremium(false));
  }, [router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    const userMsg: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await chatWithVicky(token, updatedMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, creators: res.creators }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again in a moment.' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [messages, loading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  if (isPremium === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1628 50%, #0a1220 100%)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#00aff0] animate-spin" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-dvh flex flex-col relative overflow-hidden" style={{ background: '#0a0f1e' }}>
        <video
          src="https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/tgempire/booty-bazaar/wmremove-transformed.mp4"
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(8px) brightness(0.25)', transform: 'scale(1.1)' }}
        />
        <div className="relative z-10 shrink-0 px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="relative">
            <img src="/assets/vicky-ai-avatar.jpg" alt="Vicky AI" className="w-12 h-12 rounded-full ring-2 ring-white/20" style={{ objectFit: 'cover', objectPosition: '50% 65%' }} />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0f1e]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black text-white leading-tight">Vicky AI</h1>
            <p className="text-[10px] text-white/40 font-medium">Your personal Erogram assistant</p>
          </div>
        </div>
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <img src="/assets/vicky-ai-avatar.jpg" alt="" className="w-32 h-32 rounded-full ring-2 ring-white/20 mb-5 shadow-2xl" style={{ objectFit: 'cover', objectPosition: '50% 60%' }} />
          <h2 className="text-xl font-black text-white mb-2 drop-shadow-lg">Meet Vicky AI</h2>
          <p className="text-[13px] text-white/50 leading-relaxed mb-6 max-w-[280px] drop-shadow-sm">
            Your personal Erogram concierge. She knows the best creators, groups, bots & AI tools.
          </p>
          <a href={typeof window !== 'undefined' && localStorage.getItem('token') ? '/welcome' : '/login?redirect=/welcome'}
            className="px-6 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:brightness-110 shadow-lg"
            style={{ background: '#16a34a', boxShadow: '0 4px 20px rgba(22,163,74,0.4)' }}>
            Upgrade to VIP to unlock
          </a>
          <button onClick={() => router.back()} className="mt-4 text-[12px] text-white/30 hover:text-white/50 font-medium transition-colors">
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1628 50%, #0a1220 100%)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-white/5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div className="relative">
          <img
            src="/assets/vicky-ai-avatar.jpg"
            alt="Vicky AI"
            className="w-12 h-12 rounded-full ring-2 ring-amber-400/30"
            style={{ objectFit: 'cover', objectPosition: '50% 65%' }}
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0f1e]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-black text-white leading-tight">Vicky AI</h1>
          <p className="text-[10px] text-amber-400/50 font-medium">Your personal Erogram assistant</p>
        </div>
        <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,151,58,0.12)', border: '1px solid rgba(201,151,58,0.2)' }}>
          <span className="text-[9px] font-bold text-amber-400/70 uppercase tracking-wider">VIP</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-8 pb-4">
            <img
              src="/assets/vicky-ai-avatar.jpg"
              alt="Vicky"
              className="w-28 h-28 rounded-full ring-2 ring-amber-400/20 mb-4"
              style={{ objectFit: 'cover', objectPosition: '50% 60%' }}
            />
            <h2 className="text-base font-black text-white mb-1">Hey there, handsome</h2>
            <p className="text-[11px] text-white/35 text-center max-w-[260px] mb-6 leading-relaxed">
              I&apos;m Vicky, your personal Erogram concierge. Ask me about the best creators, groups, bots, or AI tools — I know them all.
            </p>
            <div className="w-full space-y-1.5">
              <p className="text-[9px] text-white/20 font-semibold uppercase tracking-wider mb-2 text-center">Try asking</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left px-3 py-2.5 rounded-xl text-[10px] text-white/50 font-medium transition-all hover:text-white/70 hover:bg-white/5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'assistant' && (
              <img
                src="/assets/vicky-ai-avatar.jpg"
                alt=""
                className="w-9 h-9 rounded-full shrink-0 mt-1 ring-1 ring-amber-400/20"
                style={{ objectFit: 'cover', objectPosition: '50% 60%' }}
              />
            )}
            <div className={`max-w-[85%]`}>
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'text-white font-medium rounded-br-sm'
                    : 'text-white/85 rounded-bl-sm'
                }`}
                style={
                  msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, rgba(0,175,240,0.25), rgba(0,175,240,0.15))' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                <VickyMessage content={msg.content} isUser={msg.role === 'user'} />
              </div>
              {msg.creators && msg.creators.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {msg.creators.slice(0, 6).map((c, ci) => (
                    <a key={ci} href={c.url} target="_blank" rel="noopener noreferrer"
                      className="group rounded-xl overflow-hidden transition-all hover:scale-[1.03]"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="aspect-square overflow-hidden">
                        <img src={c.avatar} alt={c.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.png'; }} />
                      </div>
                      <div className="px-2 py-1.5">
                        <div className="text-[10px] font-bold text-white truncate">{c.name}</div>
                        <div className="text-[9px] text-white/30 truncate">@{c.username}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <img
              src="/assets/vicky-ai-avatar.jpg"
              alt=""
              className="w-9 h-9 rounded-full shrink-0 mt-1 ring-1 ring-amber-400/20"
              style={{ objectFit: 'cover', objectPosition: '50% 60%' }}
            />
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-5 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Vicky anything..."
            className="flex-1 bg-white/5 text-white text-[13px] px-4 py-3 rounded-xl outline-none placeholder:text-white/20 focus:ring-1 focus:ring-amber-400/30 transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #c9973a, #f0c96e)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function VickyMessage({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) return <>{content}</>;

  const parts = content.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          return (
            <a
              key={i}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/90 underline underline-offset-2 decoration-amber-400/30 hover:decoration-amber-400/60 transition-colors font-medium"
            >
              {linkMatch[1]}
            </a>
          );
        }
        const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
        if (boldMatch) {
          return <strong key={i} className="font-bold text-white">{boldMatch[1]}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
