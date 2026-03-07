'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import OverviewTab from './components/OverviewTab';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState({
    userCount: 0,
    groupCount: 0,
    approvedGroupCount: 0,
    pendingGroupCount: 0,
    pendingBotCount: 0,
    pendingReviewCount: 0,
    pendingReportCount: 0,
    totalViews: 0,
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMetrics(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
      }
    }
  };

  return <OverviewTab metrics={metrics} />;
}
