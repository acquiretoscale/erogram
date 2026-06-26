'use client';

import { useState, useEffect } from 'react';
import { getCoupons, createCoupon, toggleCoupon, deleteCoupon, getCouponUsage } from '@/lib/actions/coupons';

const SERVICES = [
  { id: 'groups', label: 'Groups' },
  { id: 'bots', label: 'Bots' },
  { id: 'premium', label: 'Premium' },
  { id: 'ainsfw', label: 'AI NSFW' },
  { id: 'of_advertising', label: 'OF Advertising' },
];

const STAR_RATE = 0.013;

export default function CouponsTab() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState('');
  const [usageMap, setUsageMap] = useState<Record<string, any[]>>({});
  const [expandedUsage, setExpandedUsage] = useState<string | null>(null);

  // Create form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed_stars'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  const token = () => localStorage.getItem('token') || '';
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    const res = await getCoupons(token());
    if (res.coupons) setCoupons(res.coupons);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!code.trim() || !discountValue) { flash('Code and value required'); return; }
    setSaving(true);
    const res = await createCoupon(token(), {
      code: code.trim(),
      discountType,
      discountValue: Number(discountValue),
      appliesTo: appliesTo.length ? appliesTo : SERVICES.map(s => s.id),
      maxUses: maxUses ? Number(maxUses) : -1,
      expiresAt: expiresAt || null,
    });
    setSaving(false);
    if (res.error) { flash(res.error); return; }
    flash('Coupon created');
    setShowCreate(false);
    setCode(''); setDiscountValue(''); setAppliesTo([]); setMaxUses(''); setExpiresAt('');
    load();
  };

  const handleToggle = async (id: string) => {
    await toggleCoupon(token(), id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await deleteCoupon(token(), id);
    load();
  };

  const loadUsage = async (couponId: string) => {
    if (expandedUsage === couponId) { setExpandedUsage(null); return; }
    const res = await getCouponUsage(token(), couponId);
    if (res.usage) setUsageMap(prev => ({ ...prev, [couponId]: res.usage! }));
    setExpandedUsage(couponId);
  };

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a2a30] border border-[#00AFF0]/30 text-[#00AFF0] text-sm font-semibold rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white">Coupons</h1>
          <p className="text-white/40 text-sm">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition">
          {showCreate ? 'Cancel' : '+ Create Coupon'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Code</label>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="WELCOME50"
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#00AFF0]/40 transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Discount Type</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#00AFF0]/40 transition appearance-none">
                <option value="percent" className="bg-[#0e1419]">Percentage (%)</option>
                <option value="fixed_stars" className="bg-[#0e1419]">Fixed Stars (★)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">
                Value {discountType === 'percent' ? '(%)' : '(★)'}
              </label>
              <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percent' ? '50' : '500'}
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#00AFF0]/40 transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Max Uses (-1 = unlimited)</label>
              <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="-1"
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#00AFF0]/40 transition" />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Expires At (optional)</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#00AFF0]/40 transition" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Applies To (leave empty = all)</label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(s => (
                <button key={s.id} onClick={() => setAppliesTo(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${appliesTo.includes(s.id) ? 'bg-[#00AFF0] text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving}
            className="px-6 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white text-sm font-bold rounded-xl transition disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Coupon'}
          </button>
        </div>
      )}

      {/* Coupons list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#00AFF0]" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <p className="text-white/40">No coupons yet. Create your first one.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {coupons.map(c => (
            <div key={c._id}>
              <div className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-white text-sm font-mono">{c.code}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${c.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                    <span>{c.discountType === 'percent' ? `${c.discountValue}% off` : `${c.discountValue}★ off (~$${(c.discountValue * STAR_RATE).toFixed(2)})`}</span>
                    <span>·</span>
                    <span>{c.maxUses === -1 ? '∞ uses' : `${c.usedCount}/${c.maxUses} used`}</span>
                    <span>·</span>
                    <span>{c.appliesTo.length === 5 ? 'All services' : c.appliesTo.join(', ')}</span>
                    {c.expiresAt && (
                      <>
                        <span>·</span>
                        <span className={new Date(c.expiresAt) < new Date() ? 'text-red-400' : ''}>
                          Expires {new Date(c.expiresAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => loadUsage(c._id)} className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-white/50 text-[11px] font-bold rounded-lg transition">
                    {c.usedCount} uses
                  </button>
                  <button onClick={() => handleToggle(c._id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${c.active ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}>
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => handleDelete(c._id)} className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-bold rounded-lg transition">
                    Delete
                  </button>
                </div>
              </div>
              {expandedUsage === c._id && usageMap[c._id] && (
                <div className="px-5 pb-4">
                  {usageMap[c._id].length === 0 ? (
                    <p className="text-[11px] text-white/30 py-2">No usage yet</p>
                  ) : (
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl overflow-hidden divide-y divide-white/[0.03]">
                      {usageMap[c._id].map((u: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2 text-[11px] text-white/50">
                          <span className="font-bold text-white/70">{u.service}</span>
                          <span>{u.originalStars}★ → {u.discountedStars}★</span>
                          <span className="text-emerald-400">saved {u.savedStars}★</span>
                          <span className="ml-auto text-white/25">{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
