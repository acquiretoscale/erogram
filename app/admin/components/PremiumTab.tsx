'use client';

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

interface FunnelData {
  pageViews: number;
  planClicks: number;
  invoicesCreated: number;
  invoiceErrors: number;
  preCheckouts: number;
  payments: number;
  slotsFull: number;
  alreadyPremium: number;
}

interface DailyRow {
  date: string;
  page_view?: number;
  modal_open?: number;
  plan_click?: number;
  invoice_created?: number;
  payment_success?: number;
  [key: string]: any;
}

interface PremiumUser {
  _id: string;
  username: string;
  telegramUsername?: string;
  premiumPlan?: string;
  premiumSince?: string;
  premiumExpiresAt?: string;
}

interface RecentEvent {
  _id: string;
  event: string;
  username?: string;
  plan?: string;
  source?: string;
  reason?: string;
  errorMessage?: string;
  createdAt: string;
}

interface AnalyticsData {
  funnel: FunnelData;
  daily: DailyRow[];
  plans: Record<string, number>;
  recentEvents: RecentEvent[];
  premiumUsers: PremiumUser[];
  period: number;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  page_view: { label: 'Page View', color: 'bg-blue-500' },
  modal_open: { label: 'Modal Open', color: 'bg-indigo-500' },
  plan_click: { label: 'Plan Click', color: 'bg-amber-500' },
  invoice_created: { label: 'Invoice Created', color: 'bg-green-500' },
  invoice_error: { label: 'Invoice Error', color: 'bg-red-500' },
  pre_checkout: { label: 'Pre-Checkout', color: 'bg-cyan-500' },
  payment_success: { label: 'Payment Success', color: 'bg-emerald-500' },
  already_premium: { label: 'Already Premium', color: 'bg-orange-500' },
  slots_full: { label: 'Slots Full', color: 'bg-red-400' },
};

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/50 text-xs w-32 text-right shrink-0">{label}</span>
      <div className="flex-1 h-7 bg-white/5 rounded-lg overflow-hidden relative">
        <div
          className={`h-full ${color} rounded-lg transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white drop-shadow">
          {value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function DailyChart({ daily }: { daily: DailyRow[] }) {
  if (daily.length === 0) {
    return <p className="text-white/30 text-sm text-center py-8">No data yet</p>;
  }

  const maxVal = Math.max(
    ...daily.map(d =>
      (d.page_view || 0) + (d.modal_open || 0) + (d.plan_click || 0) + (d.invoice_created || 0) + (d.payment_success || 0)
    ),
    1
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 min-w-[400px]" style={{ height: 160 }}>
        {daily.map((d) => {
          const views = (d.page_view || 0) + (d.modal_open || 0);
          const clicks = d.plan_click || 0;
          const invoices = d.invoice_created || 0;
          const payments = d.payment_success || 0;
          const total = views + clicks + invoices + payments;
          const h = (total / maxVal) * 140;

          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative min-w-[18px]">
              <div
                className="w-full rounded-t bg-gradient-to-t from-amber-600 to-amber-400 cursor-default relative"
                style={{ height: Math.max(4, h) }}
                title={`${d.date}\nViews: ${views}\nClicks: ${clicks}\nInvoices: ${invoices}\nPayments: ${payments}`}
              />
              <span className="text-[8px] text-white/20 truncate w-full text-center">
                {d.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PremiumTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<'funnel' | 'events' | 'users'>('funnel');

  const fetchData = async (period: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/premium-analytics?days=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load premium analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(days);
  }, [days]);

  const conversionRates = useMemo(() => {
    if (!data) return null;
    const f = data.funnel;
    return {
      clickToView: f.pageViews > 0 ? ((f.planClicks / f.pageViews) * 100).toFixed(1) : '0',
      invoiceToClick: f.planClicks > 0 ? ((f.invoicesCreated / f.planClicks) * 100).toFixed(1) : '0',
      paymentToInvoice: f.invoicesCreated > 0 ? ((f.payments / f.invoicesCreated) * 100).toFixed(1) : '0',
      overallConversion: f.pageViews > 0 ? ((f.payments / f.pageViews) * 100).toFixed(2) : '0',
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const f = data.funnel;
  const maxFunnel = Math.max(f.pageViews, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Premium Analytics</h2>
          <p className="text-[#666] text-sm mt-1">Track the subscription funnel &amp; conversions</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                days === d
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-white/5 text-white/40 hover:text-white/70'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl border border-white/5">
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Page Views</p>
          <p className="text-2xl font-bold text-white">{f.pageViews.toLocaleString()}</p>
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5">
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Plan Clicks</p>
          <p className="text-2xl font-bold text-amber-400">{f.planClicks.toLocaleString()}</p>
          {conversionRates && (
            <p className="text-[10px] text-white/30 mt-0.5">{conversionRates.clickToView}% of views</p>
          )}
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5">
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Invoices Created</p>
          <p className="text-2xl font-bold text-green-400">{f.invoicesCreated.toLocaleString()}</p>
          {conversionRates && (
            <p className="text-[10px] text-white/30 mt-0.5">{conversionRates.invoiceToClick}% of clicks</p>
          )}
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5">
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Payments</p>
          <p className="text-2xl font-bold text-emerald-400">{f.payments.toLocaleString()}</p>
          {conversionRates && (
            <p className="text-[10px] text-white/30 mt-0.5">{conversionRates.overallConversion}% overall</p>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {(['funnel', 'events', 'users'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              tab === t
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t === 'funnel' ? 'Funnel & Chart' : t === 'events' ? 'Recent Events' : 'Premium Users'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'funnel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel */}
          <div className="glass p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Conversion Funnel</h3>
            <div className="space-y-2">
              <FunnelBar label="Page / Modal Views" value={f.pageViews} max={maxFunnel} color="bg-blue-500" />
              <FunnelBar label="Plan Clicks" value={f.planClicks} max={maxFunnel} color="bg-amber-500" />
              <FunnelBar label="Invoices Created" value={f.invoicesCreated} max={maxFunnel} color="bg-green-500" />
              <FunnelBar label="Pre-Checkouts" value={f.preCheckouts} max={maxFunnel} color="bg-cyan-500" />
              <FunnelBar label="Payments" value={f.payments} max={maxFunnel} color="bg-emerald-500" />
            </div>
            {(f.invoiceErrors > 0 || f.slotsFull > 0 || f.alreadyPremium > 0) && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-2">Drop-offs</p>
                {f.invoiceErrors > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400">Invoice Errors</span>
                    <span className="text-red-400 font-bold">{f.invoiceErrors}</span>
                  </div>
                )}
                {f.slotsFull > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-orange-400">Slots Full</span>
                    <span className="text-orange-400 font-bold">{f.slotsFull}</span>
                  </div>
                )}
                {f.alreadyPremium > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Already Premium</span>
                    <span className="text-white/40 font-bold">{f.alreadyPremium}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Daily Chart + Plan Breakdown */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Daily Activity</h3>
              <DailyChart daily={data.daily} />
            </div>

            <div className="glass p-6 rounded-2xl border border-white/5">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Clicks by Plan</h3>
              {Object.keys(data.plans).length === 0 ? (
                <p className="text-white/30 text-sm text-center py-4">No clicks yet</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.plans).map(([plan, count]) => {
                    const maxPlan = Math.max(...Object.values(data.plans), 1);
                    const colors: Record<string, string> = { monthly: 'bg-amber-500', yearly: 'bg-amber-400', lifetime: 'bg-purple-500' };
                    return (
                      <div key={plan} className="flex items-center gap-3">
                        <span className="text-white/50 text-xs w-20 text-right capitalize shrink-0">{plan}</span>
                        <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden relative">
                          <div
                            className={`h-full ${colors[plan] || 'bg-white/20'} rounded-lg transition-all duration-700`}
                            style={{ width: `${Math.max(5, (count / maxPlan) * 100)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white drop-shadow">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Plan</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-white/30 text-sm">
                      No events recorded yet. Events will appear here as users interact with the premium page.
                    </td>
                  </tr>
                ) : (
                  data.recentEvents.map((ev) => {
                    const evInfo = EVENT_LABELS[ev.event] || { label: ev.event, color: 'bg-gray-500' };
                    return (
                      <tr key={ev._id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-[11px] text-white/40 whitespace-nowrap">
                          {new Date(ev.createdAt).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${evInfo.color}/15 text-white border border-white/10`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${evInfo.color}`} />
                            {evInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/60">{ev.username || '—'}</td>
                        <td className="px-4 py-3 text-xs text-white/60 capitalize">{ev.plan || '—'}</td>
                        <td className="px-4 py-3 text-xs text-white/40">{ev.source || '—'}</td>
                        <td className="px-4 py-3 text-xs text-white/30 max-w-[200px] truncate">
                          {ev.reason || ev.errorMessage || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Telegram</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Plan</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Since</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Expires</th>
                </tr>
              </thead>
              <tbody>
                {data.premiumUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-white/30 text-sm">
                      No premium users yet.
                    </td>
                  </tr>
                ) : (
                  data.premiumUsers.map((u) => (
                    <tr key={u._id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-white font-medium">{u.username}</td>
                      <td className="px-4 py-3 text-xs text-white/50">
                        {u.telegramUsername ? `@${u.telegramUsername}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 capitalize">
                          {u.premiumPlan || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">
                        {u.premiumSince ? new Date(u.premiumSince).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-white/40">
                        {u.premiumExpiresAt ? new Date(u.premiumExpiresAt).toLocaleDateString() : 'Lifetime'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
