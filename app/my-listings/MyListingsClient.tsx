'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { getMyListings, updateListingDetails, type ListingItem } from '@/lib/actions/myListings';
import { getMyAINSFWListings, updateMyAINSFWListing } from '@/lib/actions/myAINSFWListings';
import { BOOST_STARS, STAR_RATE, cryptoUsdFromStars, starsToUsd } from '@/lib/boostPricing';

const INSTANT_PRICES = { group: 600, bot: 1500 } as const;
function usd(stars: number) { return `~$${starsToUsd(stars).toFixed(2)}`; }
function cryptoUsd(stars: number) { return `$${cryptoUsdFromStars(stars).toFixed(2)}`; }

async function createInvoice(
  groupId: string,
  type: string,
  entityType: string,
  paymentMethod: 'stars' | 'crypto' = 'stars',
  couponCode?: string,
): Promise<{ url: string | null; freeApproval?: boolean; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/payments/group-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ groupId, type, entityType, paymentMethod, ...(couponCode ? { couponCode } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) return { url: null, error: data.message || 'Payment failed' };
    return { url: data.url || null, freeApproval: data.freeApproval };
  } catch { return { url: null, error: 'Payment failed' }; }
}

function pollBoostExtension(
  id: string,
  entityType: string,
  expiryBefore: Date,
  onSuccess: () => void,
) {
  let attempts = 0;
  const timer = setInterval(async () => {
    attempts += 1;
    try {
      const res = await fetch(`/api/submission-status?id=${id}&entity=${entityType}`);
      const data = await res.json();
      const nextExpiry = data.boostExpiresAt ? new Date(data.boostExpiresAt) : null;
      if (nextExpiry && nextExpiry.getTime() > expiryBefore.getTime()) {
        clearInterval(timer);
        onSuccess();
      }
    } catch { /* retry */ }
    if (attempts >= 40) clearInterval(timer);
  }, 3000);
  return () => clearInterval(timer);
}

function daysLeft(d: Date) { return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000)); }

function StatusDot({ status }: { status: string }) {
  const color: Record<string, string> = { approved: '#22c55e', pending: '#eab308', rejected: '#ef4444', scheduled: '#3b82f6' };
  const label: Record<string, string> = { approved: 'Live', pending: 'In Review', rejected: 'Rejected', scheduled: 'Scheduled' };
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: color[status] || '#eab308' }}>
      <span className="w-2 h-2 rounded-full" style={{ background: color[status] || '#eab308' }} />
      {label[status] || 'Pending'}
    </span>
  );
}

function Check() { return <span className="text-emerald-400">✓</span>; }
function Lock() { return <span className="text-gray-300">✗</span>; }

function UpgradePanel({ listing, onUpdate }: { listing: ListingItem; onUpdate: () => void }) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'stars' | 'crypto'>('stars');
  const isPending = listing.status === 'pending';
  const payType = (listing.type === 'bot' ? 'bot' : 'group') as 'group' | 'bot';
  const instantPrice = INSTANT_PRICES[payType];
  const boost = BOOST_STARS[payType];

  const tiers = [
    {
      name: isPending ? 'Free (Current)' : 'Your Plan',
      price: null,
      perks: { live: !isPending, topPlacement: false, stats: false, editLink: false, linkProtection: false },
      cta: null,
      highlight: false,
    },
    {
      name: 'Instant Approval',
      price: instantPrice,
      perks: { live: true, topPlacement: false, stats: false, editLink: false, linkProtection: false },
      ctaType: isPending ? 'instant_approval' as string : null,
      highlight: false,
    },
    {
      name: 'Boost 1 Week',
      price: boost.week,
      perks: { live: true, topPlacement: true, stats: true, editLink: true, linkProtection: true },
      ctaType: 'boost_week' as string,
      highlight: true,
    },
    {
      name: 'Boost 1 Month',
      price: boost.month,
      perks: { live: true, topPlacement: true, stats: true, editLink: true, linkProtection: true },
      ctaType: 'boost_month' as string,
      highlight: false,
    },
  ];

  const perkLabels: { key: keyof typeof tiers[0]['perks']; label: string }[] = [
    { key: 'live', label: 'Goes live instantly' },
    { key: 'topPlacement', label: 'Top placement · 40× exposure' },
    { key: 'editLink', label: 'Edit link anytime' },
    { key: 'linkProtection', label: 'Telegram ban protection' },
  ];

  return (
    <div>
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-black text-gray-900">
          {isPending ? '⚡ Go Live — Choose Your Plan' : '🚀 Boost Your Listing'}
        </h3>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Telegram bans happen. With Boost, change your link in seconds and keep all your traffic.
        </p>
      </div>

      <div className="px-5 pb-5">
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setPayMethod('stars')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${payMethod === 'stars' ? 'bg-[#00AFF0] text-white border-[#00AFF0]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
          >
            Telegram Stars
          </button>
          <button
            type="button"
            onClick={() => setPayMethod('crypto')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${payMethod === 'crypto' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
          >
            Crypto · 15% OFF
          </button>
        </div>
        {payMethod === 'crypto' && (
          <p className="text-[10px] text-gray-400 mb-3">Crypto discount applies to Boost plans. Instant Approval is Stars only. Secure checkout via NOWPayments.</p>
        )}
        <div className="grid grid-cols-5 gap-0 text-[11px]">
          <div className="p-2" />
          {tiers.map((t) => {
            const isBoostTier = t.ctaType === 'boost_week' || t.ctaType === 'boost_month';
            const showCrypto = payMethod === 'crypto' && isBoostTier && t.price !== null;
            return (
            <div key={t.name} className={`p-2 text-center rounded-t-xl ${t.highlight ? 'bg-[#00AFF0]/10 border border-[#00AFF0]/20 border-b-0' : ''}`}>
              <div className={`font-black text-xs ${t.highlight ? 'text-[#00AFF0]' : 'text-gray-600'}`}>{t.name}</div>
              {t.price !== null ? (
                showCrypto ? (
                  <>
                    <div className="font-black text-base mt-1 text-orange-500">{cryptoUsd(t.price)}</div>
                    <div className="text-[10px] font-bold mt-0.5 text-orange-500/70">15% OFF</div>
                  </>
                ) : (
                  <>
                    <div className={`font-black text-base mt-1 ${t.highlight ? 'text-[#00AFF0]' : 'text-gray-900'}`}>{t.price.toLocaleString()}★</div>
                    <div className={`text-[11px] font-bold mt-0.5 ${t.highlight ? 'text-[#00AFF0]/60' : 'text-gray-400'}`}>{usd(t.price)}</div>
                  </>
                )
              ) : (
                <div className="font-bold text-base mt-1 text-gray-300">Free</div>
              )}
            </div>
            );
          })}

          {perkLabels.map((p, i) => (
            <Fragment key={`row-${p.key}`}>
              <div className={`p-2 text-gray-500 font-semibold flex items-center ${i % 2 === 0 ? 'bg-gray-50' : ''}`}>
                {p.label}
              </div>
              {tiers.map((t) => (
                <div key={`${p.key}-${t.name}`} className={`p-2 text-center flex items-center justify-center ${i % 2 === 0 ? 'bg-gray-50' : ''} ${t.highlight ? 'bg-[#00AFF0]/5' : ''}`}>
                  {t.perks[p.key] ? <Check /> : <Lock />}
                </div>
              ))}
            </Fragment>
          ))}

          <div className="p-2" />
          {tiers.map((t) => (
            <div key={`cta-${t.name}`} className={`p-2 text-center ${t.highlight ? 'bg-[#00AFF0]/10 border border-[#00AFF0]/20 border-t-0 rounded-b-xl' : ''}`}>
              {t.ctaType ? (
                <button
                  disabled={loadingTier === t.ctaType}
                  onClick={async () => {
                    const isBoostTier = t.ctaType === 'boost_week' || t.ctaType === 'boost_month';
                    const method = payMethod === 'crypto' && isBoostTier ? 'crypto' : 'stars';
                    setLoadingTier(t.ctaType!);
                    const result = await createInvoice(listing._id, t.ctaType!, listing.type, method);
                    setLoadingTier(null);
                    if (result.freeApproval) { onUpdate(); return; }
                    if (result.url) window.open(result.url, '_blank', 'noopener,noreferrer');
                  }}
                  className={`w-full py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-50 ${
                    t.highlight
                      ? 'bg-[#00AFF0] hover:bg-[#009dd9] text-white shadow-sm shadow-[#00AFF0]/25'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  }`}>
                  {loadingTier === t.ctaType ? '...' : t.highlight ? 'Get Boost' : 'Select'}
                </button>
              ) : (
                <span className="text-gray-300 text-[10px]">Current</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditLinkRow({ listing, onUpdate }: { listing: ListingItem; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [newLink, setNewLink] = useState(listing.telegramLink);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const save = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    const r = await updateListingDetails(token, listing._id, (listing.type === 'bot' ? 'bot' : 'group'), { telegramLink: newLink });
    setSaving(false);
    if (r.success) { setMsg('Saved'); setEditing(false); onUpdate(); setTimeout(() => setMsg(''), 2000); }
    else setMsg(r.error || 'Failed');
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Telegram Link</span>
        <button onClick={() => setEditing(!editing)} className="text-[11px] font-bold text-[#00AFF0] hover:text-[#00c8ff] transition-colors">
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input type="url" value={newLink} onChange={(e) => setNewLink(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-xs placeholder:text-gray-300 focus:ring-1 focus:ring-[#00AFF0]/50 outline-none"
            placeholder="https://t.me/..." />
          <button onClick={save} disabled={saving || !newLink.startsWith('https://t.me/')}
            className="px-4 py-2 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-xs font-bold rounded-lg disabled:opacity-30 transition-all">
            {saving ? '...' : 'Save'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500 truncate">{listing.telegramLink}</p>
      )}
      {msg && <p className={`text-[10px] mt-1 font-bold ${msg === 'Saved' ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
    </div>
  );
}

function ListingRow({ listing, isSelected, onSelect, onUpdate }: { listing: ListingItem; isSelected: boolean; onSelect: () => void; onUpdate: () => void }) {
  const boostExpiry = listing.boostExpiresAt ? new Date(listing.boostExpiresAt) : null;
  const isBoostActive = !!(boostExpiry && boostExpiry > new Date());
  const days = boostExpiry ? daysLeft(boostExpiry) : 0;
  const isPending = listing.status === 'pending';
  const isAINSFW = listing.type === 'ainsfw';

  // AI NSFW listings are review-only here — payments/boosts run through the crypto flow on /add/ainsfw
  if (isAINSFW) {
    return (
      <div className={`w-full flex items-center gap-3 px-4 py-3 text-left ${isSelected ? 'bg-[#00AFF0]/[0.06]' : ''}`}>
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-gray-100">
          {listing.image && listing.image !== '/assets/image.jpg' && listing.image !== '/assets/placeholder-no-image.png' ? (
            <img src={listing.image} alt={listing.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-purple-500 text-xs font-black bg-purple-500/10">{listing.name.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-gray-900 text-sm truncate block">{listing.name}</span>
          {listing.status === 'approved' && listing.slug && (
            <a href={`/ainsfw/${listing.slug}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-purple-500 hover:text-purple-600 no-underline inline-flex items-center gap-0.5">View live listing ↗</a>
          )}
        </div>
        <span className="text-[9px] font-bold text-purple-500 uppercase px-1.5 py-0.5 rounded bg-purple-500/10">AI NSFW</span>
        {isBoostActive && <span className="text-[11px] font-black text-purple-500">{days}d featured</span>}
        <StatusDot status={listing.status} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${isSelected ? 'bg-[#00AFF0]/[0.06] border-l-2 border-l-[#00AFF0]' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}
    >
      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-gray-100">
        {listing.image && listing.image !== '/assets/image.jpg' && listing.image !== '/assets/placeholder-no-image.png' ? (
          <img src={listing.image} alt={listing.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#00AFF0] text-xs font-black bg-[#00AFF0]/10">
            {listing.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-bold text-gray-900 text-sm truncate block">{listing.name}</span>
        {(listing.status === 'approved') && listing.slug && (
          <a
            href={`/${listing.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] font-bold text-[#00AFF0] hover:text-[#009dd9] no-underline inline-flex items-center gap-0.5"
          >
            View live listing ↗
          </a>
        )}
      </div>

      {/* IN REVIEW — BIG + SKIP THE LINE CTA */}
      {isPending && !listing.paidBoost && (
        <>
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wide animate-pulse">
            IN REVIEW
          </span>
          <span
            onClick={async (e) => {
              e.stopPropagation();
              const r = await createInvoice(listing._id, 'instant_approval', listing.type);
              if (r.freeApproval) onUpdate();
              else if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer');
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-wide cursor-pointer transition-all shadow-sm shadow-emerald-500/30 whitespace-nowrap"
          >
            ⚡ SKIP THE LINE
          </span>
        </>
      )}

      {/* Live status */}
      {listing.status === 'approved' && !isBoostActive && (
        <>
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live
          </span>
          <span
            onClick={async (e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#00AFF0] hover:bg-[#009dd9] text-white text-xs font-black cursor-pointer transition-all whitespace-nowrap"
          >
            🚀 Boost
          </span>
        </>
      )}

      {/* Boosted — show days left + extend */}
      {isBoostActive && (
        <>
          <span className="text-[11px] font-black text-[#00AFF0]">{days}d left</span>
          <span
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="px-3 py-1.5 rounded-lg bg-[#00AFF0]/10 hover:bg-[#00AFF0]/20 text-[#00AFF0] text-xs font-black cursor-pointer transition-all whitespace-nowrap border border-[#00AFF0]/20"
          >
            Extend
          </span>
        </>
      )}

    </button>
  );
}

export default function MyListingsClient() {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renewPayMethod, setRenewPayMethod] = useState<'stars' | 'crypto'>('stars');
  const [renewLoading, setRenewLoading] = useState<string | null>(null);
  const [renewMsg, setRenewMsg] = useState('');
  const [awaitingRenewal, setAwaitingRenewal] = useState(false);

  const fetchData = useCallback(async () => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { setIsLoggedIn(false); setLoading(false); return; }
    const [result, ainsfw] = await Promise.all([
      getMyListings(token),
      getMyAINSFWListings(token).catch(() => ({ listings: [] })),
    ]);
    if (result.error) { setIsLoggedIn(true); setError(result.error); setLoading(false); return; }
    setIsLoggedIn(true);
    // AI NSFW listings are review-only here (boosts use the crypto flow on /add/ainsfw)
    const ainsfwRows: ListingItem[] = (ainsfw.listings || []).map((a) => ({
      _id: a._id,
      type: 'ainsfw' as ListingItem['type'],
      name: a.name,
      slug: a.slug,
      image: a.image,
      telegramLink: a.websiteUrl,
      status: a.status,
      category: a.category,
      views: 0,
      clickCount: 0,
      boosted: a.boosted,
      boostExpiresAt: a.boostExpiresAt,
      boostDuration: null,
      paidBoost: a.submissionTier === 'boost',
      paidBoostStars: null,
      contactTelegram: a.contactTelegram,
      contactEmail: a.contactEmail,
      description: a.description || '',
      createdAt: a.createdAt,
    }));
    const merged = [...result.listings, ...ainsfwRows].sort(
      (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
    );
    setListings(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('renewed') === '1') {
      fetchData();
      setRenewMsg('Boost extended.');
      window.history.replaceState({}, '', '/my-listings');
    }
  }, [fetchData]);

  const selectedListing = listings.find(l => l._id === selectedId && l.type !== 'ainsfw') || null;
  const boostExpiry = selectedListing?.boostExpiresAt ? new Date(selectedListing.boostExpiresAt) : null;
  const isSelectedBoostActive = !!(boostExpiry && boostExpiry > new Date());

  const handleRenew = async (type: 'boost_week' | 'boost_month') => {
    if (!selectedListing || !boostExpiry) return;
    setRenewLoading(type);
    setRenewMsg('');
    const entityType = selectedListing.type === 'bot' ? 'bot' : 'group';
    const expiryBefore = new Date(boostExpiry);
    const result = await createInvoice(selectedListing._id, type, entityType, renewPayMethod);
    setRenewLoading(null);
    if (result.error) {
      setRenewMsg(result.error);
      return;
    }
    if (result.freeApproval) {
      fetchData();
      setRenewMsg('Boost extended.');
      return;
    }
    if (result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
      setAwaitingRenewal(true);
      setRenewMsg('Complete payment in the new tab. This page updates automatically.');
      pollBoostExtension(selectedListing._id, entityType, expiryBefore, () => {
        setAwaitingRenewal(false);
        setRenewMsg('Boost extended.');
        fetchData();
        setTimeout(() => setRenewMsg(''), 3000);
      });
    }
  };

  if (!loading && !isLoggedIn) {
    return (
      <main className="flex-1 bg-white pt-28 pb-20 px-4 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00AFF0]/10 border border-[#00AFF0]/20 mb-6">
            <span className="text-[#00AFF0] text-2xl font-black">E</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Manage Your Campaigns</h1>
          <p className="text-gray-500 text-sm mb-8">Login to manage your listings, track performance, and boost your reach.</p>
          <a href="/join-erogram?redirect=/my-listings"
            className="w-full inline-block py-3.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-[#00AFF0]/20 no-underline">
            Create Account / Login
          </a>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex-1 bg-white pt-28 pb-20 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00AFF0]" />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-white pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Campaigns</h1>
            <p className="text-gray-400 text-sm mt-0.5">{listings.length} listing{listings.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/add" className="px-4 py-2 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition shadow-sm shadow-[#00AFF0]/20 no-underline">
            + Add New
          </Link>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">{error}</div>
        )}

        {/* Compact list */}
        {listings.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 mb-4">
              <span className="text-gray-400 text-2xl">📋</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-1">No campaigns yet</h2>
            <p className="text-gray-500 text-sm mb-6">Submit your first group or bot to reach thousands of users.</p>
            <Link href="/add" className="inline-block px-6 py-3 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition shadow-sm shadow-[#00AFF0]/20 no-underline">
              Add Group or Bot
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
            {listings.map((l) => (
              <ListingRow
                key={l._id}
                listing={l}
                isSelected={selectedId === l._id}
                onSelect={() => setSelectedId(selectedId === l._id ? null : l._id)}
                onUpdate={fetchData}
              />
            ))}
          </div>
        )}

        {/* Selected listing — detail panel with boost extension or comparison table */}
        {selectedListing && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                {selectedListing.image && selectedListing.image !== '/assets/image.jpg' && selectedListing.image !== '/assets/placeholder-no-image.png' ? (
                  <img src={selectedListing.image} alt={selectedListing.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#00AFF0] text-xs font-black bg-[#00AFF0]/10">
                    {selectedListing.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="font-black text-gray-900 text-sm">{selectedListing.name}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase px-1.5 py-0.5 rounded bg-gray-100">{selectedListing.type}</span>
              <span className="text-xs text-gray-400 truncate ml-auto">{selectedListing.telegramLink}</span>
            </div>

            {/* If boost active: edit link + progress + extend */}
            {isSelectedBoostActive && boostExpiry && (
              <div className="px-5 py-4 space-y-4">
                <EditLinkRow listing={selectedListing} onUpdate={fetchData} />
                <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-gray-400">Boost Active</span>
                  <span className="text-xs font-black text-[#00AFF0]">{daysLeft(boostExpiry)}d left</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
                  {(() => {
                    const totalMs = selectedListing.boostDuration === '30d' ? 30 * 86400000 : 7 * 86400000;
                    const pct = Math.min(100, Math.max(0, ((boostExpiry.getTime() - Date.now()) / totalMs) * 100));
                    return <div className="h-full rounded-full bg-[#00AFF0]" style={{ width: `${pct}%` }} />;
                  })()}
                </div>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setRenewPayMethod('stars')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${renewPayMethod === 'stars' ? 'bg-[#00AFF0] text-white border-[#00AFF0]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >
                    Telegram Stars
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenewPayMethod('crypto')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${renewPayMethod === 'crypto' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >
                    Crypto · 15% OFF
                  </button>
                </div>
                <div className="flex gap-2">
                  {(() => {
                    const payType = (selectedListing.type === 'bot' ? 'bot' : 'group') as 'group' | 'bot';
                    const prices = BOOST_STARS[payType];
                    const weekLabel = renewPayMethod === 'stars'
                      ? `+1 Week · ${prices.week.toLocaleString()}★ · ${usd(prices.week)}`
                      : `+1 Week · ${cryptoUsd(prices.week)} · 15% OFF`;
                    const monthLabel = renewPayMethod === 'stars'
                      ? `+1 Month · ${prices.month.toLocaleString()}★ · ${usd(prices.month)}`
                      : `+1 Month · ${cryptoUsd(prices.month)} · 15% OFF`;
                    return (
                      <>
                        <button
                          type="button"
                          disabled={!!renewLoading || awaitingRenewal}
                          onClick={() => handleRenew('boost_week')}
                          className="flex-1 py-2.5 rounded-xl font-bold text-white text-xs transition-all bg-[#00AFF0] hover:bg-[#009dd9] shadow-sm shadow-[#00AFF0]/25 disabled:opacity-50"
                        >
                          {renewLoading === 'boost_week' ? '...' : weekLabel}
                        </button>
                        <button
                          type="button"
                          disabled={!!renewLoading || awaitingRenewal}
                          onClick={() => handleRenew('boost_month')}
                          className="flex-1 py-2.5 rounded-xl font-bold text-gray-700 text-xs transition-all bg-gray-100 hover:bg-gray-200 border border-gray-200 disabled:opacity-50"
                        >
                          {renewLoading === 'boost_month' ? '...' : monthLabel}
                        </button>
                      </>
                    );
                  })()}
                </div>
                {renewMsg && (
                  <p className={`text-[10px] mt-2 font-bold ${renewMsg.includes('failed') || renewMsg.includes('Login') ? 'text-red-400' : 'text-emerald-500'}`}>
                    {renewMsg}
                  </p>
                )}
                {renewPayMethod === 'crypto' && (
                  <p className="text-[10px] mt-2 text-gray-400">Secure checkout via NOWPayments · USDT, BTC, ETH and more</p>
                )}
                </div>
              </div>
            )}

            {/* If not boosted: show comparison table */}
            {!isSelectedBoostActive && (
              <UpgradePanel listing={selectedListing} onUpdate={fetchData} />
            )}
          </div>
        )}

        {/* Support */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-gray-400 hover:text-gray-600 no-underline transition-colors">
            Telegram: @erogramDOTpro
          </a>
          <span className="text-gray-200">·</span>
          <a href="mailto:support@erogram.biz" className="text-[11px] font-bold text-gray-400 hover:text-gray-600 no-underline transition-colors">
            support@erogram.biz
          </a>
        </div>
      </div>
    </main>
  );
}

