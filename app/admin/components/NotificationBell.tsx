'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, Bot, MessageSquareWarning, Flag, Users, Star, User, Layers, X, Check,
} from 'lucide-react';

type NotifType = 'pending_group' | 'pending_bot' | 'pending_review' | 'pending_report' | 'new_user' | 'new_sale' | 'new_bot';

type Notif = {
  id: string;
  type: NotifType;
  title: string;
  subtitle: string;
  href: string;
  color: string;
  icon: string;
  createdAt: string;
  urgent: boolean;
};

const ICON_MAP: Record<string, any> = {
  layers: Layers,
  bot: Bot,
  message: MessageSquareWarning,
  flag: Flag,
  star: Star,
  user: User,
  users: Users,
};

const fmtAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TYPE_LABEL: Record<NotifType, string> = {
  pending_group:  'Pending',
  pending_bot:    'Pending',
  pending_review: 'Review',
  pending_report: 'Report',
  new_user:       'New User',
  new_sale:       'Sale',
  new_bot:        'Bot',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchNotifs = useCallback(async (silent = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const incoming: Notif[] = data.notifications || [];
      setNotifs(incoming);
      setUrgentCount(data.urgentCount || 0);

      // Compute unread = items not in seenIds
      setSeenIds(prev => {
        const newUnseen = incoming.filter(n => !prev.has(n.id)).length;
        setUnread(newUnseen);
        return prev;
      });
    } catch {}
    if (!silent) setLoading(false);
  }, []);

  // Initial load + poll every 60s
  useEffect(() => {
    fetchNotifs();
    const id = setInterval(() => fetchNotifs(true), 60_000);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => {
      if (!o) {
        // Mark all as seen
        setSeenIds(new Set(notifs.map(n => n.id)));
        setUnread(0);
      }
      return !o;
    });
  };

  const badgeCount = unread > 0 ? unread : urgentCount;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={handleOpen}
        className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
          open ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.07]'
        }`}
        aria-label="Notifications"
      >
        <Bell size={17} strokeWidth={open ? 2.2 : 1.8} />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none border-2 border-[#0a0a0a]">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-12 w-[260px] max-h-[440px] bg-[#141414] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 z-[200] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-white">Notifications</span>
              {urgentCount > 0 && (
                <span className="text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-600/30 rounded-full px-2 py-0.5">
                  {urgentCount} urgent
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-red-500 animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-1.5">
                <Check size={16} className="text-white/20" />
                <p className="text-[11px] text-white/25">All caught up!</p>
              </div>
            ) : (
              notifs.map((n) => {
                const isUnseen = !seenIds.has(n.id);
                const label = TYPE_LABEL[n.type];
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 transition-colors hover:bg-white/[0.04] border-b border-white/[0.03] last:border-0 ${
                      n.urgent ? 'bg-red-500/[0.03]' : ''
                    }`}
                  >
                    {/* Color dot */}
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: n.color }} />

                    {/* Tag badge */}
                    <span
                      className="text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 shrink-0"
                      style={{ background: `${n.color}18`, color: n.color }}
                    >
                      {label}
                    </span>

                    {/* Title + subtitle inline */}
                    <p className={`text-[11px] flex-1 min-w-0 truncate ${isUnseen ? 'text-white font-semibold' : 'text-white/55'}`}>
                      {n.title}
                      {n.subtitle && <span className="text-white/30 font-normal"> · {n.subtitle}</span>}
                    </p>

                    {/* Time */}
                    <span className="text-[10px] text-white/25 shrink-0">{fmtAgo(n.createdAt)}</span>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-3 py-2 border-t border-white/[0.06] shrink-0">
              <Link
                href="/admin/pending-actions"
                onClick={() => setOpen(false)}
                className="block text-center text-[10px] font-semibold text-white/30 hover:text-white transition-colors"
              >
                View all pending actions →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
