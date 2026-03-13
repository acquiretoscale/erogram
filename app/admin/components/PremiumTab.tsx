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
  starsPlanClicks: number;
  starsInvoices: number;
  starsPayments: number;
  cryptoPlanClicks: number;
  cryptoInvoices: number;
  cryptoPayments: number;
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
  displayName?: string | null;
  telegramUsername?: string;
  telegramId?: number | null;
  premiumPlan?: string;
  premiumSince?: string;
  premiumExpiresAt?: string;
  paymentMethod?: 'stars' | 'crypto' | null;
  daysLeft?: number | null;
  isExpiringSoon?: boolean;
  bookmarks: number;
  folders: number;
}

interface StarsBalanceData {
  ok: true;
  balance: {
    net: number;
    netUsd: number;
    totalReceived: number;
    totalReceivedUsd: number;
    totalWithdrawn: number;
    totalRefunded: number;
    invoicePayments: number;
    transactionCount: number;
  };
  rate: {
    usdtPerStar: number;
    source: string;
    note: string;
  };
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

interface StarsTransactionRow {
  id: string;
  date: number;
  amount: number;
  transactionType: string | null;
  fromUser: { id: number | null; username: string | null; firstName: string | null; lastName: string | null } | null;
  invoicePayload: string | null;
  parsedPayload: any;
}

interface StarsTransactionsData {
  ok: true;
  count: number;
  totalAmount: number;
  transactions: StarsTransactionRow[];
}

interface StarsDailyRow {
  date: string; // YYYY-MM-DD (UTC)
  stars: number;
  payments: number;
  usd: number;
  usdtPerStar: number;
}

interface StarsBuyerRow {
  txId: string;
  date: number;
  amount: number;
  usd?: number;
  fromUser: { id: number | null; username: string | null; firstName: string | null; lastName: string | null } | null;
  plan: string | null;
  siteUserId: string | null;
  siteUsername: string | null;
  displayName: string | null;
  telegramUsername: string | null;
  telegramId: number | null;
  premiumPlan: string | null;
  daysLeft: number | null;
  bookmarks: number;
  folders: number;
}

interface StarsMetricsData {
  ok: true;
  periodDays: number;
  totals: {
    totalStars: number;
    payments: number;
    avgStarsPerPayment: number;
    avgStarsPerDay: number;
    totalUsd: number;
    avgUsdPerDay: number;
    avgUsdPerPayment: number;
    usdtPerStarCurrent: number;
  };
  daily: StarsDailyRow[];
  buyers: StarsBuyerRow[];
}

interface StarsAuditRow {
  ok: boolean;
  tx: { id: string; date: number; amount: number; fromUser: any };
  payload: { userId: string; plan: string };
  user: {
    id: string;
    username: string;
    telegramUsername: string | null;
    premium: boolean;
    premiumPlan: string | null;
    premiumSince: string | null;
    premiumExpiresAt: string | null;
  } | null;
  matched: { hasPaymentEvent: boolean; premiumLooksLikeThisPurchase: boolean };
}

interface StarsAuditData {
  ok: true;
  periodDays: number;
  totals: {
    allTransactions: number;
    invoicePayments: number;
    withValidPayload: number;
    totalStars: number;
  };
  issues: {
    paidButNotProcessedCount: number;
    paidButNotProcessed: StarsAuditRow[];
  };
  note: string;
}


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

function StarsDailyChart({ daily }: { daily: StarsDailyRow[] }) {
  if (!daily || daily.length === 0) {
    return <p className="text-white/30 text-sm text-center py-8">No Stars data yet</p>;
  }

  const maxVal = Math.max(...daily.map((d) => d.stars || 0), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1 min-w-[400px]" style={{ height: 160 }}>
        {daily.map((d) => {
          const h = ((d.stars || 0) / maxVal) * 140;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 min-w-[18px]">
              <div
                className="w-full rounded-t bg-gradient-to-t from-emerald-700 to-emerald-400 cursor-default relative"
                style={{ height: Math.max(4, h) }}
                title={`${d.date}\nStars: ${d.stars}\nUSD: $${(d.usd || 0).toFixed(2)}\nPayments: ${d.payments}\nRate: $${(d.usdtPerStar || 0).toFixed(5)}/★`}
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
  const [tab, setTab] = useState<'dashboard' | 'users' | 'stars' | 'pricing'>('dashboard');

  const [stars, setStars] = useState<StarsTransactionsData | null>(null);
  const [starsLoading, setStarsLoading] = useState(false);
  const [starsError, setStarsError] = useState('');

  const [audit, setAudit] = useState<StarsAuditData | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  const [balance, setBalance] = useState<StarsBalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  const [starsMetrics, setStarsMetrics] = useState<StarsMetricsData | null>(null);
  const [starsMetricsLoading, setStarsMetricsLoading] = useState(false);
  const [starsMetricsError, setStarsMetricsError] = useState('');

  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMsg, setPricingMsg] = useState('');

  const fetchPricing = async () => {
    setPricingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/premium-config', { headers: { Authorization: `Bearer ${token}` } });
      setPricingConfig(res.data);
    } catch { /* use defaults */ }
    finally { setPricingLoading(false); }
  };

  const savePricing = async () => {
    if (!pricingConfig) return;
    setPricingSaving(true); setPricingMsg('');
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/admin/premium-config', pricingConfig, { headers: { Authorization: `Bearer ${token}` } });
      setPricingMsg('Saved successfully');
      setTimeout(() => setPricingMsg(''), 3000);
    } catch (err: any) {
      setPricingMsg(err?.response?.data?.message || 'Failed to save');
    } finally { setPricingSaving(false); }
  };

  const updatePricingField = (path: string, value: any) => {
    setPricingConfig((prev: any) => {
      if (!prev) return prev;
      const parts = path.split('.');
      const next = { ...prev };
      if (parts.length === 1) {
        next[parts[0]] = value;
      } else {
        next[parts[0]] = { ...next[parts[0]], [parts[1]]: value };
      }
      return next;
    });
  };

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

  const fetchStarsMetrics = async (period: number) => {
    try {
      setStarsMetricsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/stars-metrics?days=${period}&maxPages=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStarsMetrics(res.data);
      setStarsMetricsError('');
    } catch (err: any) {
      setStarsMetricsError(err.response?.data?.message || 'Failed to load Stars earnings');
    } finally {
      setStarsMetricsLoading(false);
    }
  };

  const fetchStars = async () => {
    try {
      setStarsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/stars-transactions?limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStars(res.data);
      setStarsError('');
    } catch (err: any) {
      setStarsError(err.response?.data?.message || 'Failed to load Stars transactions');
    } finally {
      setStarsLoading(false);
    }
  };

  const fetchAudit = async () => {
    try {
      setAuditLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/stars-audit?days=365&maxPages=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAudit(res.data);
      setAuditError('');
    } catch (err: any) {
      setAuditError(err.response?.data?.message || 'Failed to audit Stars transactions');
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/stars-balance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(res.data);
      setBalanceError('');
    } catch (err: any) {
      setBalanceError(err.response?.data?.message || 'Failed to fetch Stars balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchData(days);
    fetchStarsMetrics(days);
  }, [days]);

  const conversionRates = useMemo(() => {
    if (!data) return null;
    const f = data.funnel;
    const paymentsReceived = Math.max(f.payments || 0, starsMetrics?.totals?.payments || 0);
    return {
      clickToView: f.pageViews > 0 ? ((f.planClicks / f.pageViews) * 100).toFixed(1) : '0',
      invoiceToClick: f.planClicks > 0 ? ((f.invoicesCreated / f.planClicks) * 100).toFixed(1) : '0',
      paymentToInvoice: f.invoicesCreated > 0 ? ((paymentsReceived / f.invoicesCreated) * 100).toFixed(1) : '0',
      overallConversion: f.pageViews > 0 ? ((paymentsReceived / f.pageViews) * 100).toFixed(2) : '0',
    };
  }, [data, starsMetrics]);

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
  const earnings = starsMetrics?.totals?.totalStars || 0;
  const earningsPerDay = starsMetrics?.totals?.avgStarsPerDay || 0;
  const earningsUsd = starsMetrics?.totals?.totalUsd || 0;
  const earningsUsdPerDay = starsMetrics?.totals?.avgUsdPerDay || 0;
  const paymentsCount = starsMetrics?.totals?.payments || 0;
  const paymentsReceived = Math.max(f.payments || 0, paymentsCount || 0);
  const avgStarsPerPayment = starsMetrics?.totals?.avgStarsPerPayment || 0;
  const avgUsdPerPayment = starsMetrics?.totals?.avgUsdPerPayment || 0;
  const usdPerStar = starsMetrics?.totals?.usdtPerStarCurrent || 0;

  const fmtUsd = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v || 0);

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
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Earnings (USD)</p>
          <p className="text-2xl font-bold text-emerald-300">
            {starsMetricsLoading && !starsMetrics ? '…' : fmtUsd(earningsUsd)}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {starsMetricsError
              ? starsMetricsError
              : `${earnings.toLocaleString()} ★ · rate ${usdPerStar ? `$${usdPerStar.toFixed(5)}` : '$—'}/★`}
          </p>
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5">
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Earnings / Day</p>
          <p className="text-2xl font-bold text-emerald-400">
            {starsMetricsLoading && !starsMetrics ? '…' : fmtUsd(earningsUsdPerDay)}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {Math.round(earningsPerDay).toLocaleString()} ★ / day
          </p>
        </div>
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
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Payments (Total)</p>
          <p className="text-2xl font-bold text-white">
            {starsMetricsLoading && !starsMetrics ? '…' : paymentsReceived.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-amber-400 font-bold">{f.starsPayments || 0} Stars</span>
            <span className="text-[10px] text-white/15">|</span>
            <span className="text-[10px] text-blue-400 font-bold">{f.cryptoPayments || 0} Crypto</span>
          </div>
          {conversionRates && (
            <p className="text-[10px] text-white/30 mt-0.5">
              {conversionRates.overallConversion}% conversion
            </p>
          )}
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5">
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Avg Revenue / Payment</p>
          <p className="text-2xl font-bold text-emerald-200">
            {starsMetricsLoading && !starsMetrics ? '…' : fmtUsd(avgUsdPerPayment)}
          </p>
          <p className="text-[10px] text-white/30 mt-0.5">
            {Math.round(avgStarsPerPayment).toLocaleString()} ★ per payment
          </p>
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5">
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Invoices Created</p>
          <p className="text-2xl font-bold text-green-400">{f.invoicesCreated.toLocaleString()}</p>
          {conversionRates && (
            <p className="text-[10px] text-white/30 mt-0.5">{conversionRates.invoiceToClick}% of clicks</p>
          )}
        </div>
        <div className="glass p-5 rounded-2xl border border-white/5">
          <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Payments (Processed)</p>
          <p className="text-2xl font-bold text-emerald-400">{f.payments.toLocaleString()}</p>
          <p className="text-[10px] text-white/30 mt-0.5">
            received {paymentsReceived.toLocaleString()} · ledger {paymentsCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {(['dashboard', 'users', 'stars', 'pricing'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'pricing' && !pricingConfig) fetchPricing(); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              tab === t
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t === 'dashboard' ? 'Dashboard' : t === 'users' ? 'Premium Users' : t === 'stars' ? 'Stars / Audit' : 'Pricing & Offer'}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">

          {/* Buyers list — right below KPIs */}
          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Buyers</h3>
                <p className="text-[#666] text-xs mt-0.5">Stars invoice payments · last {days} days</p>
              </div>
              <button
                onClick={() => fetchStarsMetrics(days)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                {starsMetricsLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Method</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Bookmarks</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Folders</th>
                  </tr>
                </thead>
                <tbody>
                  {(starsMetrics?.buyers || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-white/30 text-sm">
                        No buyers found for this period.
                      </td>
                    </tr>
                  ) : (
                    (starsMetrics?.buyers || []).map((b) => {
                      const when = new Date((b.date || 0) * 1000);
                      // Best identity: displayName → Telegram first/last → @handle → id
                      const name =
                        b.displayName ||
                        (b.fromUser?.firstName
                          ? `${b.fromUser.firstName}${b.fromUser.lastName ? ` ${b.fromUser.lastName}` : ''}`
                          : null);
                      const handle =
                        b.telegramUsername
                          ? `@${b.telegramUsername}`
                          : b.fromUser?.username
                            ? `@${b.fromUser.username}`
                            : null;
                      const id = b.telegramId || b.fromUser?.id;
                      const siteUser = b.siteUsername;

                      const isLifetime = b.premiumPlan === 'lifetime';
                      const expired = b.daysLeft !== null && b.daysLeft !== undefined && b.daysLeft <= 0;
                      const expiringSoon = b.daysLeft !== null && b.daysLeft !== undefined && b.daysLeft > 0 && b.daysLeft <= 7;

                      return (
                        <tr key={b.txId} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-[11px] text-white/40 whitespace-nowrap">
                            {when.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-emerald-300">
                              {typeof b.usd === 'number' ? fmtUsd(b.usd) : '—'}
                            </div>
                            <div className="text-[10px] text-white/25">{Number(b.amount || 0).toLocaleString()} ★</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                              Stars
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/60 capitalize whitespace-nowrap">{b.plan || '—'}</td>
                          <td className="px-4 py-3">
                            {name && <div className="text-sm text-white font-medium">{name}</div>}
                            {siteUser && (
                              <div className={`${name ? 'text-[10px] text-white/40' : 'text-xs text-white/60'}`}>{siteUser}</div>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {handle && <span className="text-[10px] text-white/30">{handle}</span>}
                              {id && <span className="text-[10px] text-white/20 font-mono">#{id}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {!b.siteUserId ? (
                              <span className="text-[10px] text-white/20">—</span>
                            ) : isLifetime ? (
                              <span className="text-[10px] font-bold text-purple-400">♾ Lifetime</span>
                            ) : expired ? (
                              <span className="text-[10px] font-bold text-red-400">Expired</span>
                            ) : expiringSoon ? (
                              <span className="text-[10px] font-bold text-orange-400">⚠ {b.daysLeft}d</span>
                            ) : b.daysLeft !== null && b.daysLeft !== undefined ? (
                              <span className="text-[10px] font-bold text-emerald-400">✓ {b.daysLeft}d left</span>
                            ) : (
                              <span className="text-[10px] text-white/20">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">
                            <span className={(b.bookmarks || 0) > 0 ? 'text-white' : 'text-white/20'}>
                              {(b.bookmarks || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">
                            <span className={(b.folders || 0) > 0 ? 'text-white' : 'text-white/20'}>
                              {(b.folders || 0).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Funnel + Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass p-6 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Sales Funnel</h3>
                <button
                  onClick={() => { fetchData(days); fetchStarsMetrics(days); }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  Refresh KPIs
                </button>
              </div>
              <div className="space-y-2">
                <FunnelBar label="Page / Modal Views" value={f.pageViews} max={maxFunnel} color="bg-blue-500" />
                <FunnelBar label="Plan Clicks" value={f.planClicks} max={maxFunnel} color="bg-amber-500" />
                <FunnelBar label="Invoices Created" value={f.invoicesCreated} max={maxFunnel} color="bg-green-500" />
                <FunnelBar label="Pre-Checkouts" value={f.preCheckouts} max={maxFunnel} color="bg-cyan-500" />
                <FunnelBar label="Payments (Received)" value={paymentsReceived} max={maxFunnel} color="bg-emerald-500" />
              </div>
              {/* Payment Method Breakdown */}
              <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-2">By Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-2.5" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                    <p className="text-[9px] text-amber-400/60 uppercase font-bold tracking-wider mb-1">Stars</p>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[11px]"><span className="text-white/40">Clicks</span><span className="text-amber-400 font-bold">{f.starsPlanClicks || 0}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-white/40">Invoices</span><span className="text-amber-400 font-bold">{f.starsInvoices || 0}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-white/40">Payments</span><span className="text-amber-400 font-bold">{f.starsPayments || 0}</span></div>
                    </div>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)' }}>
                    <p className="text-[9px] text-blue-400/60 uppercase font-bold tracking-wider mb-1">Crypto</p>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[11px]"><span className="text-white/40">Clicks</span><span className="text-blue-400 font-bold">{f.cryptoPlanClicks || 0}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-white/40">Invoices</span><span className="text-blue-400 font-bold">{f.cryptoInvoices || 0}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-white/40">Payments</span><span className="text-blue-400 font-bold">{f.cryptoPayments || 0}</span></div>
                    </div>
                  </div>
                </div>
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

            <div className="space-y-6">
              <div className="glass p-6 rounded-2xl border border-white/5">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Daily Stars (Earnings)</h3>
                {starsMetricsError ? (
                  <p className="text-red-400 text-sm text-center py-6">{starsMetricsError}</p>
                ) : (
                  <StarsDailyChart daily={starsMetrics?.daily || []} />
                )}
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
                            <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white drop-shadow">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="glass p-6 rounded-2xl border border-white/5">
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Daily Funnel Activity</h3>
                <DailyChart daily={data.daily} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PREMIUM USERS TAB ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Premium Members</h3>
              <p className="text-[#666] text-xs mt-0.5">{data.premiumUsers.length} active premium user{data.premiumUsers.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => fetchData(days)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {/* Payment method summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass p-4 rounded-2xl border border-white/5">
              <p className="text-[#666] text-[10px] uppercase font-bold tracking-wider mb-1">Total Members</p>
              <p className="text-xl font-bold text-white">{data.premiumUsers.length}</p>
            </div>
            <div className="glass p-4 rounded-2xl border border-amber-500/10">
              <p className="text-amber-400/60 text-[10px] uppercase font-bold tracking-wider mb-1">Paid with Stars</p>
              <p className="text-xl font-bold text-amber-400">
                {data.premiumUsers.filter(u => u.paymentMethod === 'stars').length}
              </p>
            </div>
            <div className="glass p-4 rounded-2xl border border-blue-500/10">
              <p className="text-blue-400/60 text-[10px] uppercase font-bold tracking-wider mb-1">Paid with Crypto</p>
              <p className="text-xl font-bold text-blue-400">
                {data.premiumUsers.filter(u => u.paymentMethod === 'crypto').length}
              </p>
            </div>
          </div>

          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Since</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Bookmarks</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Folders</th>
                  </tr>
                </thead>
                <tbody>
                  {data.premiumUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-white/30 text-sm">
                        No premium users found.
                      </td>
                    </tr>
                  ) : (
                    data.premiumUsers.map((u) => {
                      const isLifetime = u.premiumPlan === 'lifetime';
                      const expired = u.daysLeft !== null && u.daysLeft !== undefined && u.daysLeft <= 0;

                      return (
                        <tr key={u._id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            {u.displayName && <div className="text-sm text-white font-medium">{u.displayName}</div>}
                            <div className={`${u.displayName ? 'text-[10px] text-white/40' : 'text-xs text-white/60'}`}>{u.username}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {u.telegramUsername && <span className="text-[10px] text-white/30">@{u.telegramUsername}</span>}
                              {u.telegramId && <span className="text-[10px] text-white/20 font-mono">#{u.telegramId}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/60 capitalize whitespace-nowrap">{u.premiumPlan || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.paymentMethod === 'stars' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/></svg>
                                Stars
                              </span>
                            ) : u.paymentMethod === 'crypto' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/></svg>
                                Crypto
                              </span>
                            ) : (
                              <span className="text-[10px] text-white/20">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-white/40 whitespace-nowrap">
                            {u.premiumSince
                              ? new Date(u.premiumSince).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isLifetime ? (
                              <span className="text-[10px] font-bold text-purple-400">Lifetime</span>
                            ) : expired ? (
                              <span className="text-[10px] font-bold text-red-400">Expired</span>
                            ) : u.isExpiringSoon ? (
                              <span className="text-[10px] font-bold text-orange-400">{u.daysLeft}d left</span>
                            ) : u.daysLeft !== null && u.daysLeft !== undefined ? (
                              <span className="text-[10px] font-bold text-emerald-400">{u.daysLeft}d left</span>
                            ) : (
                              <span className="text-[10px] text-white/20">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">
                            <span className={(u.bookmarks || 0) > 0 ? 'text-white' : 'text-white/20'}>
                              {(u.bookmarks || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold">
                            <span className={(u.folders || 0) > 0 ? 'text-white' : 'text-white/20'}>
                              {(u.folders || 0).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'stars' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Stars Ledger (Raw) + Audit</h3>
              <p className="text-[#666] text-xs mt-1">
                Raw transaction list from Telegram + audit for “paid but not processed”.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={fetchBalance}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-all"
              >
                {balanceLoading ? 'Loading…' : '★ Live Balance'}
              </button>
              <button
                onClick={fetchStars}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                {starsLoading ? 'Refreshing…' : 'Ledger'}
              </button>
              <button
                onClick={fetchAudit}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-all"
              >
                {auditLoading ? 'Auditing…' : 'Run Audit'}
              </button>
            </div>
          </div>

          {starsError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {starsError}
            </div>
          )}

          {auditError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {auditError}
            </div>
          )}

          {balanceError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {balanceError}
            </div>
          )}

          {balance && (
            <div className="glass rounded-2xl border border-emerald-500/20 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Bot Stars Balance (Live)</h4>
                  <p className="text-[#666] text-xs mt-0.5">
                    Rate: ${balance.rate.usdtPerStar.toFixed(5)}/★ · {balance.rate.source}
                  </p>
                </div>
                <span className="text-[10px] text-white/20">{balance.balance.transactionCount} txs scanned</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
                {/* Net balance — most prominent */}
                <div className="px-5 py-5 md:col-span-2 bg-emerald-500/[0.04]">
                  <p className="text-[#666] text-[10px] uppercase font-bold tracking-wider mb-1">Current Balance</p>
                  <p className="text-3xl font-black text-emerald-300">
                    {balance.balance.net.toLocaleString()} ★
                  </p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">
                    {fmtUsd(balance.balance.netUsd)}
                  </p>
                  <p className="text-[10px] text-white/25 mt-1">
                    Net = received − withdrawals − refunds
                  </p>
                </div>
                <div className="px-4 py-5">
                  <p className="text-[#666] text-[10px] uppercase font-bold tracking-wider mb-1">Total Received</p>
                  <p className="text-xl font-bold text-white">{balance.balance.totalReceived.toLocaleString()} ★</p>
                  <p className="text-sm text-white/40">{fmtUsd(balance.balance.totalReceivedUsd)}</p>
                  <p className="text-[10px] text-white/25 mt-1">{balance.balance.invoicePayments} payments</p>
                </div>
                <div className="px-4 py-5">
                  <p className="text-[#666] text-[10px] uppercase font-bold tracking-wider mb-1">Withdrawn / Refunded</p>
                  <p className="text-xl font-bold text-white/50">
                    {balance.balance.totalWithdrawn.toLocaleString()} ★
                  </p>
                  <p className="text-sm text-white/30">{balance.balance.totalRefunded.toLocaleString()} ★ refunded</p>
                  <p className="text-[10px] text-white/25 mt-1">
                    {balance.balance.totalWithdrawn === 0 && balance.balance.totalRefunded === 0
                      ? 'Nothing withdrawn yet'
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!stars && !starsLoading && !starsError && (
            <div className="p-6 glass rounded-2xl border border-white/5 text-center text-white/40 text-sm">
              Click “Refresh” to load the latest bot Stars transactions.
            </div>
          )}

          {audit && (
            <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white/60 uppercase tracking-wider">Audit Result (last {audit.periodDays} days)</h4>
                  <p className="text-[#666] text-xs mt-1">
                    Checks for Stars payments that did not result in a recorded `payment_success` event or a matching premium activation.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white/40">Stars: <span className="text-white/70 font-bold">{audit.totals.totalStars.toLocaleString()}</span></span>
                  <span className="text-white/40">Payments: <span className="text-white/70 font-bold">{audit.totals.invoicePayments.toLocaleString()}</span></span>
                  <span className="text-white/40">Issues: <span className="text-red-400 font-bold">{audit.issues.paidButNotProcessedCount.toLocaleString()}</span></span>
                </div>
              </div>

              {audit.issues.paidButNotProcessedCount === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                  No “paid but not processed” transactions found in the selected period.
                </div>
              ) : (
                <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Time</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Plan</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.issues.paidButNotProcessed.map((r) => {
                          const when = new Date((r.tx.date || 0) * 1000);
                          const label = r.user?.telegramUsername ? `@${r.user.telegramUsername}` : r.user?.username || r.payload.userId;
                          const matchText = [
                            r.matched.hasPaymentEvent ? 'event' : null,
                            r.matched.premiumLooksLikeThisPurchase ? 'premium' : null,
                          ].filter(Boolean).join('+') || 'none';
                          return (
                            <tr key={r.tx.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="px-4 py-3 text-[11px] text-white/40 whitespace-nowrap">
                                {when.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-amber-400 whitespace-nowrap">
                                {Number(r.tx.amount || 0).toLocaleString()} ★
                              </td>
                              <td className="px-4 py-3 text-xs text-white/60 capitalize">{r.payload.plan}</td>
                              <td className="px-4 py-3 text-xs text-white/60">{label}</td>
                              <td className="px-4 py-3 text-xs text-red-400 font-bold">{matchText}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {stars && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="glass p-5 rounded-2xl border border-white/5">
                  <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Transactions (loaded)</p>
                  <p className="text-2xl font-bold text-white">{stars.count.toLocaleString()}</p>
                </div>
                <div className="glass p-5 rounded-2xl border border-white/5">
                  <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Total Stars (loaded)</p>
                  <p className="text-2xl font-bold text-amber-400">{stars.totalAmount.toLocaleString()}</p>
                </div>
                <div className="glass p-5 rounded-2xl border border-white/5">
                  <p className="text-[#666] text-xs uppercase font-bold tracking-wider mb-1">Note</p>
                  <p className="text-xs text-white/40">
                    Withdraw UI is controlled by Telegram (min threshold / eligibility).
                  </p>
                </div>
              </div>

              <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">From</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Payload</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-[#666] uppercase tracking-wider">Tx ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stars.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-white/30 text-sm">
                            No transactions returned by Telegram.
                          </td>
                        </tr>
                      ) : (
                        stars.transactions.map((t) => {
                          const when = new Date((t.date || 0) * 1000);
                          const fromLabel =
                            t.fromUser?.username
                              ? `@${t.fromUser.username}`
                              : t.fromUser?.firstName
                                ? `${t.fromUser.firstName}${t.fromUser.lastName ? ` ${t.fromUser.lastName}` : ''}`
                                : t.fromUser?.id
                                  ? `user:${t.fromUser.id}`
                                  : '—';
                          const plan = t.parsedPayload?.plan || null;
                          const userId = t.parsedPayload?.userId || null;

                          return (
                            <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="px-4 py-3 text-[11px] text-white/40 whitespace-nowrap">
                                {when.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-amber-400 whitespace-nowrap">
                                {Number(t.amount || 0).toLocaleString()} ★
                              </td>
                              <td className="px-4 py-3 text-xs text-white/60 whitespace-nowrap">{fromLabel}</td>
                              <td className="px-4 py-3 text-xs text-white/30 max-w-[260px] truncate">
                                {plan || userId ? (
                                  <>
                                    {plan ? <span className="text-white/50">plan={String(plan)}</span> : null}
                                    {plan && userId ? <span className="text-white/20"> · </span> : null}
                                    {userId ? <span className="text-white/40">userId={String(userId)}</span> : null}
                                  </>
                                ) : (
                                  t.invoicePayload || '—'
                                )}
                              </td>
                              <td className="px-4 py-3 text-[11px] text-white/20 max-w-[300px] truncate">{t.id}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PRICING & OFFER TAB ── */}
      {tab === 'pricing' && (
        <div className="space-y-6">
          {pricingLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
            </div>
          ) : !pricingConfig ? (
            <div className="p-6 text-center text-white/40">
              <button onClick={fetchPricing} className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:text-white transition-all">
                Load Pricing Config
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Pricing & Offer Editor</h3>
                  <p className="text-[#666] text-xs mt-1">Changes apply immediately to the premium page and payment flows.</p>
                </div>
                <div className="flex items-center gap-3">
                  {pricingMsg && (
                    <span className={`text-xs font-bold ${pricingMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pricingMsg}
                    </span>
                  )}
                  <button
                    onClick={savePricing}
                    disabled={pricingSaving}
                    className="px-5 py-2.5 rounded-lg font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-all"
                  >
                    {pricingSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Offer Banner */}
              <div className="glass p-6 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Offer Banner</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1.5">Badge Text</label>
                    <input
                      type="text"
                      value={pricingConfig.offerBadge || ''}
                      onChange={e => updatePricingField('offerBadge', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-all"
                      placeholder="e.g. 80% OFF"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1.5">Subtext</label>
                    <input
                      type="text"
                      value={pricingConfig.offerText || ''}
                      onChange={e => updatePricingField('offerText', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-all"
                      placeholder="e.g. Launch price ends soon"
                    />
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5">
                  <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-2">Preview</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-wide bg-red-600 text-white">{pricingConfig.offerBadge || '—'}</span>
                    <span className="text-[11px] font-bold text-white/60">{pricingConfig.offerText || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Plan editor — reusable block */}
              {(['monthly', 'quarterly', 'yearly'] as const).map(planKey => {
                const titles: Record<string, string> = { monthly: '1 Month Plan', quarterly: '3 Months Plan', yearly: '1 Year Plan' };
                return (
                <div key={planKey} className="glass p-6 rounded-2xl border border-white/5">
                  <h4 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">{titles[planKey]}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1.5">Price (USD)</label>
                      <input type="number" step="0.01" value={pricingConfig[planKey]?.priceUsd ?? ''} onChange={e => updatePricingField(`${planKey}.priceUsd`, parseFloat(e.target.value) || 0)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1.5">Duration (days)</label>
                      <input type="number" value={pricingConfig[planKey]?.days ?? ''} onChange={e => updatePricingField(`${planKey}.days`, parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1.5">Label</label>
                      <input type="text" value={pricingConfig[planKey]?.label ?? ''} onChange={e => updatePricingField(`${planKey}.label`, e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-all" />
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider block mb-1.5">Description</label>
                      <input type="text" value={pricingConfig[planKey]?.description ?? ''} onChange={e => updatePricingField(`${planKey}.description`, e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-amber-500/50 focus:outline-none transition-all" />
                    </div>
                  </div>
                </div>
                );
              })}

              {/* Quick Reference */}
              <div className="glass p-5 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Quick Reference</h4>
                <p className="text-[10px] text-white/30 mb-3">Stars amounts are computed live from the USD price using Telegram&apos;s current Stars rate.</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {(['monthly', 'quarterly', 'yearly'] as const).map(k => {
                    const labels: Record<string, string> = { monthly: '1 Month', quarterly: '3 Months', yearly: '1 Year' };
                    return (
                      <div key={k}>
                        <p className="text-[10px] text-white/30 uppercase font-bold mb-1">{labels[k]}</p>
                        <p className="text-lg font-bold text-white">${pricingConfig[k]?.priceUsd}</p>
                        <p className="text-[10px] text-white/20">{pricingConfig[k]?.days} days</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
