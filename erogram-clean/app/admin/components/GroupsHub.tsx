'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense, lazy } from 'react';

import GroupsTab from './GroupsTab';
import PendingGroupsTab from './PendingGroupsTab';
import CsvImportTab from './CsvImportTab';
import QueueTab from './QueueTab';
import TranslationsTab from './TranslationsTab';

const VaultTab = lazy(() => import('@/app/admin/vault/page'));

type TabKey = 'all' | 'pending' | 'import' | 'queue' | 'vault' | 'translations';

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { key: 'all', label: 'All Groups', icon: '👥' },
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'import', label: 'Import', icon: '📤' },
  { key: 'queue', label: 'Queue', icon: '📅' },
  { key: 'vault', label: 'Vault', icon: '🔐' },
  { key: 'translations', label: 'Translations', icon: '🌐' },
];

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-[#b31b1b] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function GroupsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') || 'all') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(tabParam);
  const [mountedTabs, setMountedTabs] = useState<Set<TabKey>>(new Set([tabParam]));

  useEffect(() => {
    const t = (searchParams.get('tab') || 'all') as TabKey;
    if (TABS.some(tab => tab.key === t)) {
      setActiveTab(t);
      setMountedTabs(prev => new Set(prev).add(t));
    }
  }, [searchParams]);

  const switchTab = (key: TabKey) => {
    setActiveTab(key);
    setMountedTabs(prev => new Set(prev).add(key));
    router.push(`/admin/groups?tab=${key}`, { scroll: false });
  };

  const renderTab = (key: TabKey) => {
    if (!mountedTabs.has(key)) return null;
    const visible = activeTab === key;
    return (
      <div key={key} style={{ display: visible ? 'block' : 'none' }}>
        {key === 'all' && <GroupsTab />}
        {key === 'pending' && <PendingGroupsTab />}
        {key === 'import' && <CsvImportTab />}
        {key === 'queue' && <QueueTab />}
        {key === 'vault' && (
          <Suspense fallback={<TabLoader />}>
            <VaultTab />
          </Suspense>
        )}
        {key === 'translations' && <TranslationsTab />}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Groups Hub</h1>
        <p className="text-[#999] text-sm">Manage, import, schedule, and translate groups from one place</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-[#b31b1b] text-white shadow-lg shadow-[#b31b1b]/20'
                : 'text-[#999] hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {TABS.map(tab => renderTab(tab.key))}
      </div>
    </div>
  );
}
