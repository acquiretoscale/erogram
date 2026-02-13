'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SettingsTab() {
    const [config, setConfig] = useState<any>({
        siteName: 'Erogram',
        contactEmail: 'eroverse.8r62k@4wrd.cc',
        maintenanceMode: false,
        telegramLink: 'https://t.me/erogram',
        twitterLink: '',
        metaTitleSuffix: ' | Erogram',
        metaDescription: 'The best Telegram groups and bots directory.',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/site-config', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.generalSettings) {
                setConfig((prev: any) => ({
                    ...prev,
                    ...res.data.generalSettings
                }));
            }
            setError('');
        } catch (err: any) {
            console.error('Error fetching settings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        setSuccess(false);

        try {
            const token = localStorage.getItem('token');
            // Fetch current config first to avoid overwriting other settings
            const currentConfigRes = await axios.get('/api/admin/site-config', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newConfig = {
                ...currentConfigRes.data,
                generalSettings: config
            };

            await axios.put('/api/admin/site-config', newConfig, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="text-center py-20">
                    <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[#999]">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-white mb-1">Settings</h1>
                <p className="text-[#999] text-sm">Configure general site settings</p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                    ✅ Settings saved successfully!
                </div>
            )}

            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5">
                    <h2 className="text-xl font-bold text-white">General Configuration</h2>
                    <p className="text-sm text-[#999] mt-1">Manage core site details and metadata</p>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-[#999] mb-2">Site Name</label>
                            <input
                                type="text"
                                value={config.siteName}
                                onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
                                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#999] mb-2">Contact Email</label>
                            <input
                                type="email"
                                value={config.contactEmail}
                                onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-[#999] mb-2">Telegram Link</label>
                            <input
                                type="url"
                                value={config.telegramLink}
                                onChange={(e) => setConfig({ ...config, telegramLink: e.target.value })}
                                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#999] mb-2">Twitter/X Link</label>
                            <input
                                type="url"
                                value={config.twitterLink}
                                onChange={(e) => setConfig({ ...config, twitterLink: e.target.value })}
                                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-6">
                        <h3 className="text-sm font-bold text-white mb-4">SEO Defaults</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-[#999] mb-2">Meta Title Suffix</label>
                                <input
                                    type="text"
                                    value={config.metaTitleSuffix}
                                    onChange={(e) => setConfig({ ...config, metaTitleSuffix: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#999] mb-2">Default Meta Description</label>
                                <textarea
                                    value={config.metaDescription}
                                    onChange={(e) => setConfig({ ...config, metaDescription: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-6">
                        <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                            <div>
                                <h3 className="text-white font-bold">Maintenance Mode</h3>
                                <p className="text-sm text-[#999]">Enable to show a maintenance page to all non-admin users.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.maintenanceMode}
                                    onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b31b1b]"></div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#b31b1b]/20 disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
