'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import OverviewTab from './components/OverviewTab';

type DashboardData = {
  generatedAt?: string;
  kpis?: unknown;
  pending?: unknown;
  monitoring?: unknown;
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
