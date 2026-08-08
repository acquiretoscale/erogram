'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPrivateSeedProfile } from '@/lib/actions/seedProfileAdmin';
import SeedProfileAdminPanel from './SeedProfileAdminPanel';

type Contribution = {
  id: string;
  href: string;
  label: string;
  createdAt: string;
  rating?: number | null;
  content?: string | null;
};

type Loaded = {
  userId: string;
  username: string;
  firstName: string | null;
  sex: string | null;
  bio: string | null;
  photoUrl: string | null;
  joinedAt: string;
  contributions: Contribution[];
};

function formatWhen(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function snippet(text: string, max = 140) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

export default function PrivateSeedProfileGate({ username }: { username: string }) {
  const [status, setStatus] = useState<'checking' | 'denied' | 'ok'>('checking');
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    if (!token) {
      setStatus('denied');
      return;
    }
    getPrivateSeedProfile(token, username)
      .then((res) => {
        if (!res.ok) {
          setStatus('denied');
          return;
        }
        setData({
          ...res.user,
          contributions: res.contributions,
        });
        setStatus('ok');
      })
      .catch(() => setStatus('denied'));
  }, [username]);

  if (status === 'checking') {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-500 flex items-center justify-center text-sm">
        Checking access…
      </main>
    );
  }

  if (status === 'denied' || !data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-xl font-semibold">Profile not found</p>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          ← Back to Erogram
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
            ← Back to Erogram
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Private · admin only</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          <SeedProfileAdminPanel
            userId={data.userId}
            username={data.username}
            firstName={data.firstName}
            sex={data.sex}
            bio={data.bio}
            photoUrl={data.photoUrl}
            joinedAt={data.joinedAt}
          />
        </div>

        <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-8">
          <h2 className="text-lg font-bold text-white mb-1">Recent contributions</h2>
          <p className="text-sm text-slate-400 mb-6">Reviews, comments, and activity on Erogram</p>

          {data.contributions.length === 0 ? (
            <p className="text-sm text-slate-500">No public contributions yet.</p>
          ) : (
            <ul className="space-y-4">
              {data.contributions.map((item) => (
                <li key={item.id} className="border border-slate-700 rounded-lg p-4 bg-slate-900/40">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Link href={item.href} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                      {item.label}
                    </Link>
                    <span className="text-xs text-slate-500 shrink-0">{formatWhen(item.createdAt)}</span>
                  </div>
                  {item.rating ? (
                    <p className="text-xs text-amber-400 mb-2">{item.rating}/5 stars</p>
                  ) : null}
                  {item.content ? (
                    <p className="text-sm text-slate-300 leading-relaxed">{snippet(item.content)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
