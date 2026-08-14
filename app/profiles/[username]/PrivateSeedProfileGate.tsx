'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPrivateSeedProfile } from '@/lib/actions/seedProfileAdmin';
import SeedProfileAdminPanel from './SeedProfileAdminPanel';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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

const CREAM = '#F7F4EC';
const PLUM = '#2B1B28';
const MUTED = '#6B6568';
const BORDER = 'rgba(43,27,40,0.12)';

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

export default function PrivateSeedProfileGate({
  username,
  redirectPath,
}: {
  username: string;
  redirectPath: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'denied' | 'ok'>('checking');
  const [data, setData] = useState<Loaded | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
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
  }, [username, redirectPath, router]);

  if (status === 'checking') {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center text-sm pt-24 font-[family-name:var(--font-baloo)]" style={{ backgroundColor: CREAM, color: MUTED }}>
          Checking access…
        </main>
        <div style={{ background: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)' }}>
          <Footer />
        </div>
      </>
    );
  }

  if (status === 'denied' || !data) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 pt-24 font-[family-name:var(--font-baloo)]" style={{ backgroundColor: CREAM, color: PLUM }}>
          <p className="text-xl font-extrabold">Profile not found</p>
          <Link href="/community" className="text-sm hover:opacity-70" style={{ color: MUTED }}>
            ← Back to Community
          </Link>
        </main>
        <div style={{ background: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)' }}>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-12 font-[family-name:var(--font-baloo)]" style={{ backgroundColor: CREAM, color: PLUM }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none p-0 m-0 text-[11px] font-semibold" style={{ color: MUTED }}>
              <li>
                <Link href="/" className="hover:opacity-70" style={{ color: MUTED }}>Home</Link>
              </li>
              <li aria-hidden style={{ color: 'rgba(43,27,40,0.28)' }}>/</li>
              <li>
                <Link href="/community" className="hover:opacity-70" style={{ color: MUTED }}>Community</Link>
              </li>
              <li aria-hidden style={{ color: 'rgba(43,27,40,0.28)' }}>/</li>
              <li className="font-bold truncate max-w-[14rem]" style={{ color: PLUM }}>
                {data.firstName || data.username}
              </li>
            </ol>
          </nav>
          <div className="flex justify-end mb-4">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: PLUM }}>Private · admin only</span>
          </div>

          <div
            className="rounded-2xl border overflow-hidden mb-6"
            style={{ backgroundColor: CREAM, borderColor: BORDER, boxShadow: '0 30px 80px -30px rgba(43,27,40,0.2)' }}
          >
            <div className="relative h-28 sm:h-36" style={{ background: 'linear-gradient(135deg, #3a0f1e 0%, #240a14 50%, #0c0508 100%)' }} />
            <div className="px-5 sm:px-8 pb-7 -mt-12 relative">
              <SeedProfileAdminPanel
                userId={data.userId}
                username={data.username}
                firstName={data.firstName}
                sex={data.sex}
                country={null}
                bio={data.bio}
                photoUrl={data.photoUrl}
                joinedAt={data.joinedAt}
              />
            </div>
          </div>

          <div className="rounded-2xl border p-5 sm:p-8" style={{ backgroundColor: CREAM, borderColor: BORDER }}>
            <h2 className="text-lg font-extrabold mb-1" style={{ color: PLUM }}>Recent contributions</h2>
            <p className="text-sm mb-6" style={{ color: MUTED }}>Reviews, comments, and activity on Erogram</p>

            {data.contributions.length === 0 ? (
              <p className="text-sm" style={{ color: MUTED }}>No public contributions yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.contributions.map((item) => (
                  <li key={item.id} className="rounded-xl border p-4" style={{ backgroundColor: 'rgba(43,27,40,0.03)', borderColor: BORDER }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <Link href={item.href} className="text-sm font-bold hover:opacity-70" style={{ color: PLUM }}>
                        {item.label}
                      </Link>
                      <span className="text-xs shrink-0" style={{ color: MUTED }}>{formatWhen(item.createdAt)}</span>
                    </div>
                    {item.rating ? (
                      <p className="text-xs mb-2" style={{ color: PLUM }}>{item.rating}/5 stars</p>
                    ) : null}
                    {item.content ? (
                      <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{snippet(item.content)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <div style={{ background: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)' }}>
        <Footer />
      </div>
    </>
  );
}
