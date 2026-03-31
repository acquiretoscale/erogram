'use client';

import { useState, useEffect, useCallback } from 'react';
import { getOFMSettings, updateOFMSettings } from '@/lib/actions/ofmAdmin';

interface ApifyKey {
  _id: string;
  label: string;
  apiKey: string;
  active: boolean;
  burned: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  addedAt: string;
}

interface Settings {
  apifyKeys: ApifyKey[];
  apifyActor: string;
}

export default function OFMSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // New key form
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [actorInput, setActorInput] = useState('');

  const flash = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const data = await getOFMSettings(token || '');
      setSettings(data);
      setActorInput(data.apifyActor || '');
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to load settings', false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const addKey = async () => {
    if (!newKey.trim() || newKey.trim().length < 10) {
      flash('API key must be at least 10 characters', false);
      return;
    }
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      const data = await updateOFMSettings(token || '', 'add_key', {
        label: newLabel.trim() || undefined,
        apiKey: newKey.trim(),
      });
      flash(`Key added (${data.total} total)`, true);
      setNewLabel('');
      setNewKey('');
      fetchSettings();
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Failed', false);
    } finally {
      setSaving(false);
    }
  };

  const toggleKey = async (keyId: string, field: 'active' | 'burned') => {
    const token = localStorage.getItem('token');
    try {
      await updateOFMSettings(token || '', 'toggle_key', { keyId, field });
      fetchSettings();
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to update key', false);
    }
  };

  const removeKey = async (keyId: string) => {
    if (!confirm('Remove this API key?')) return;
    const token = localStorage.getItem('token');
    try {
      await updateOFMSettings(token || '', 'remove_key', { keyId });
      flash('Key removed', true);
      fetchSettings();
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to remove key', false);
    }
  };

  const updateActor = async () => {
    if (!actorInput.trim()) return;
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      await updateOFMSettings(token || '', 'update_actor', { actor: actorInput.trim() });
      flash('Actor updated', true);
      fetchSettings();
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to update actor', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-6 h-6 border-2 border-[#00AFF0]/30 border-t-[#00AFF0] rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = settings?.apifyKeys.filter((k) => k.active && !k.burned).length || 0;
  const burnedCount = settings?.apifyKeys.filter((k) => k.burned).length || 0;

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg border ${
            toast.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-0.5">
          Manage Apify API keys for scraping. Keys rotate automatically — when one is burned, the next active key is used.
        </p>
      </div>

      {/* Stats strip */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-5 py-4">
          <div className="text-2xl font-black text-white">{settings?.apifyKeys.length || 0}</div>
          <div className="text-xs text-white/40 mt-0.5">Total Keys</div>
        </div>
        <div className="flex-1 bg-emerald-500/[0.05] border border-emerald-500/20 rounded-2xl px-5 py-4">
          <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
          <div className="text-xs text-emerald-400/60 mt-0.5">Active</div>
        </div>
        <div className="flex-1 bg-red-500/[0.05] border border-red-500/20 rounded-2xl px-5 py-4">
          <div className="text-2xl font-black text-red-400">{burnedCount}</div>
          <div className="text-xs text-red-400/60 mt-0.5">Burned</div>
        </div>
      </div>

      {/* Add new key */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00AFF0]">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Add New Apify API Key
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (optional, e.g. 'Account #2')"
            className="sm:w-48 px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm placeholder-white/25 outline-none focus:border-[#00AFF0]/40 transition"
          />
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="apify_api_xxxxxxxxxxxxxxxx"
            className="flex-1 px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm font-mono placeholder-white/25 outline-none focus:border-[#00AFF0]/40 transition"
          />
          <button
            onClick={addKey}
            disabled={saving || !newKey.trim()}
            className="px-5 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white font-bold text-sm rounded-xl transition shadow-sm shadow-[#00AFF0]/20 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {saving ? 'Adding…' : 'Add Key'}
          </button>
        </div>
      </div>

      {/* Keys list */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">
          API Keys ({settings?.apifyKeys.length || 0})
        </h2>

        {(!settings?.apifyKeys || settings.apifyKeys.length === 0) ? (
          <div className="text-center py-12 text-white/20">
            No API keys added yet. Add one above to start scraping.
          </div>
        ) : (
          <div className="space-y-2">
            {settings.apifyKeys.map((key, idx) => (
              <div
                key={key._id}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border text-sm ${
                  key.burned
                    ? 'bg-red-500/[0.04] border-red-500/15'
                    : key.active
                    ? 'bg-emerald-500/[0.04] border-emerald-500/15'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                {/* Status dot */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      key.burned ? 'bg-red-400' : key.active ? 'bg-emerald-400' : 'bg-white/20'
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">
                      {key.label || `Key #${idx + 1}`}
                    </span>
                    {key.burned && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-red-500/20 text-red-400 tracking-wider">
                        Burned
                      </span>
                    )}
                    {!key.burned && key.active && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-400 tracking-wider">
                        Active
                      </span>
                    )}
                    {!key.burned && !key.active && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-white/10 text-white/30 tracking-wider">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="text-white/30 text-xs font-mono mt-0.5 truncate">{key.apiKey}</div>
                </div>

                {/* Usage */}
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className="text-white/60 text-xs font-bold">{key.usageCount} uses</div>
                  <div className="text-white/20 text-[10px]">
                    {key.lastUsedAt
                      ? `Last: ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : 'Never used'}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {key.burned ? (
                    <button
                      onClick={() => toggleKey(key._id, 'burned')}
                      title="Unburn (reactivate)"
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleKey(key._id, 'active')}
                      title={key.active ? 'Pause' : 'Activate'}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/10 transition"
                    >
                      {key.active ? 'Pause' : 'Enable'}
                    </button>
                  )}
                  <button
                    onClick={() => removeKey(key._id)}
                    title="Remove key"
                    className="px-2 py-1.5 text-xs rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actor config */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Apify Actor</h2>
        <p className="text-white/30 text-xs">
          Select which Apify actor to use for scraping. Different actors return different data quality.
        </p>

        {/* Preset buttons */}
        <div className="space-y-2">
          {[
            { id: 'hello.datawizards/onlyfans-scraper', label: 'DataWizards', desc: 'Best data — header, photos, videos, location, join date, verified, tips, streams. Use for profile enrichment.' },
            { id: 'sentry/onlyfans-finder-pro', label: 'Sentry Finder Pro', desc: 'Social links (Instagram, Twitter, TikTok, Fansly, Pornhub). Good for discovery + social data.' },
            { id: 'igolaizola/onlyfans-scraper', label: 'Igolaizola', desc: 'Basic scraper — categories, likes, price. Cheapest option for bulk discovery.' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setActorInput(preset.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                actorInput === preset.id
                  ? 'bg-[#00AFF0]/10 border-[#00AFF0]/40 ring-1 ring-[#00AFF0]/30'
                  : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                  actorInput === preset.id ? 'border-[#00AFF0] bg-[#00AFF0]' : 'border-white/30'
                }`}>
                  {actorInput === preset.id && <div className="w-1 h-1 rounded-full bg-white" />}
                </div>
                <span className={`text-sm font-bold ${actorInput === preset.id ? 'text-[#00AFF0]' : 'text-white'}`}>
                  {preset.label}
                </span>
                <code className="text-[10px] text-white/25 font-mono ml-auto">{preset.id}</code>
              </div>
              <p className="text-[11px] text-white/35 mt-1 ml-5">{preset.desc}</p>
            </button>
          ))}
        </div>

        {/* Custom input fallback */}
        <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
          <input
            type="text"
            value={actorInput}
            onChange={(e) => setActorInput(e.target.value)}
            placeholder="or paste custom actor ID"
            className="flex-1 px-3 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm font-mono placeholder-white/25 outline-none focus:border-[#00AFF0]/40 transition"
          />
          <button
            onClick={updateActor}
            disabled={saving || actorInput === settings?.apifyActor}
            className="px-5 py-2.5 bg-[#00AFF0] hover:bg-[#009dd9] text-white font-bold text-sm rounded-xl transition shadow-sm shadow-[#00AFF0]/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Actor'}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[#00AFF0]/[0.06] border border-[#00AFF0]/15 rounded-xl">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00AFF0] flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
        <p className="text-[#00AFF0]/60 text-xs leading-relaxed">
          Keys rotate automatically using round-robin (least recently used first).
          When a key gets a 402/403 from Apify (insufficient funds), it&apos;s auto-marked as <strong>burned</strong> and the next active key is tried.
          You can manually restore burned keys if you top up the Apify account.
        </p>
      </div>
    </div>
  );
}
