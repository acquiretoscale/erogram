'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getMyAINSFWListings, type AINSFWListingItem } from '@/lib/actions/myAINSFWListings';

const ACCENT = '#0ea5e9';
const BORDER = '3px solid #000000';
const SHADOW = '4px 4px 0px #000000';

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string }) {
  if (status === 'approved') {
    return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white bg-emerald-500" style={{ border: BORDER }}>Live</span>;
  }
  if (status === 'rejected') {
    return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white bg-red-600" style={{ border: BORDER }}>Rejected</span>;
  }
  return <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black bg-amber-400 animate-pulse" style={{ border: BORDER }}>In Review</span>;
}

export default function AINSFWListingsClient() {
  const [username, setUsername] = useState<string | null>(null);
  const [listings, setListings] = useState<AINSFWListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { setIsLoggedIn(false); setLoading(false); return; }
    const res = await getMyAINSFWListings(token);
    if (res.error) { setIsLoggedIn(false); setLoading(false); return; }
    setIsLoggedIn(true);
    setListings(res.listings);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar username={username} setUsername={setUsername} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-24 pb-16">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-white/30 mb-6 uppercase tracking-widest">
          <Link href="/add/ainsfw" className="hover:text-white/60 transition-colors">AI NSFW</Link>
          <span className="text-white/20">/</span>
          <span style={{ color: ACCENT }}>My Listings</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="inline-block px-3 py-1 mb-3 text-[10px] font-black uppercase tracking-widest text-white" style={{ background: ACCENT, border: BORDER }}>
              🔞 AI NSFW Listings
            </span>
            <h1 className="text-3xl font-black tracking-tighter text-white">My AI NSFW Listings</h1>
          </div>
          <Link href="/add/ainsfw" className="px-5 py-2.5 text-sm font-black uppercase tracking-wider text-white" style={{ background: ACCENT, border: BORDER, boxShadow: SHADOW }}>
            + Add Tool
          </Link>
        </div>

        {!loading && !isLoggedIn && (
          <div className="bg-white/[0.03] p-10 text-center" style={{ border: BORDER, boxShadow: SHADOW }}>
            <h2 className="text-xl font-black text-white mb-2">Login to manage your listings</h2>
            <p className="text-white/50 text-sm mb-6">Track your AI NSFW tool submissions and their status.</p>
            <a href="/join-erogram?redirect=/ai-nsfw-listings" className="inline-block px-6 py-3 text-sm font-black uppercase tracking-wider text-white no-underline" style={{ background: ACCENT, border: BORDER, boxShadow: SHADOW }}>
              Login / Sign up
            </a>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: ACCENT }} />
          </div>
        )}

        {!loading && isLoggedIn && listings.length === 0 && (
          <div className="bg-white/[0.03] p-10 text-center" style={{ border: BORDER, boxShadow: SHADOW }}>
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-xl font-black text-white mb-2">No AI NSFW listings yet</h2>
            <p className="text-white/50 text-sm mb-6">List your AI tool and reach 140K+ monthly visitors.</p>
            <Link href="/add/ainsfw" className="inline-block px-6 py-3 text-sm font-black uppercase tracking-wider text-white no-underline" style={{ background: ACCENT, border: BORDER, boxShadow: SHADOW }}>
              List Your Tool
            </Link>
          </div>
        )}

        {!loading && isLoggedIn && listings.length > 0 && (
          <div className="space-y-4">
            {listings.map((l) => (
              <div key={l._id} className="bg-white/[0.03] p-4 flex items-center gap-4" style={{ border: BORDER, boxShadow: SHADOW }}>
                {/* Logo */}
                <div className="w-12 h-12 shrink-0 overflow-hidden bg-white/[0.06]" style={{ border: '2px solid #000' }}>
                  {l.image && l.image !== '/assets/image.jpg' && l.image !== '/assets/placeholder-no-image.png' ? (
                    <img src={l.image} alt={l.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-black" style={{ color: ACCENT }}>
                      {l.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name + category */}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white text-sm truncate">{l.name}</div>
                  <div className="text-[11px] font-bold text-white/40 uppercase tracking-wide">{l.category}</div>
                  {l.status === 'approved' && l.slug && (
                    <a href={`/${l.slug}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-black no-underline inline-flex items-center gap-0.5 mt-0.5" style={{ color: ACCENT }}>
                      View live listing ↗
                    </a>
                  )}
                </div>

                {/* Boosted flag */}
                {l.boosted && (
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-fuchsia-600 to-violet-600 hidden sm:inline" style={{ border: BORDER }}>
                    ⚡ Boosted
                  </span>
                )}

                {/* Status */}
                <StatusBadge status={l.status} paymentStatus={l.paymentStatus} />
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
