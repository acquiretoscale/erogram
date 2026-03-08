'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import OverviewTab from './components/OverviewTab';

type TrendPoint = { date: string; value: number };
type Metric = { last24h?: number; lifetime?: number; trend30d?: TrendPoint[] };
type MonitoringAlert = { level: 'critical' | 'warning' | 'info' | 'ok'; title: string; description: string; actionUrl?: string };
type DashboardData = {
  generatedAt?: string;
  headline?: {
    totalPageviewsLifetime?: number;
    earningsTodayUsd?: number;
    earningsLifetimeUsd?: number;
    starsLifetime?: number;
    starsUsdRate?: number;
    earningsSource?: string;
  };
  kpis?: { paidSubs?: Metric; newUsers?: Metric; newGroups?: Metric; adClicks?: Metric; totalViews?: Metric };
  pending?: { groups: number; bots: number; reviews: number; reports: number; total: number };
  monitoring?: { dbLatencyMs: number; alerts: MonitoringAlert[] };
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch {
      // Keep fallback UI defaults if request fails
    } finally {
      setLoading(false);
    }
  };

  return <OverviewTab data={data} loading={loading} onRefresh={fetchMetrics} />;
}
