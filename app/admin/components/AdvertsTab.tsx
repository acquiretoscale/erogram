'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { compressImage } from '@/lib/utils/compressImage';
import { categories, countries } from '@/app/groups/constants';

// Component for rendering advert row with lazy-loaded image
function AdvertRow({ advert, onEdit, onDelete }: { advert: any; onEdit: (advert: any) => void; onDelete: (id: string) => void }) {
    const [imageSrc, setImageSrc] = useState('/assets/image.jpg');
    const [imageLoaded, setImageLoaded] = useState(false);
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        // Fetch the actual image when component mounts
        if (advert._id && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            axios.get(`/api/adverts/${advert._id}/image`)
                .then(res => {
                    if (res.data?.image && res.data.image !== '/assets/image.jpg') {
                        setImageSrc(res.data.image);
                        setImageLoaded(true);
                    }
                })
                .catch(err => {
                    console.error('Failed to load advert image:', err);
                });
        }
    }, [advert._id]);

    return (
        <tr className="hover:bg-white/5 transition-colors group">
            <td className="px-6 py-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                    <img
                        src={imageSrc}
                        alt={advert.name}
                        className="w-full h-full object-cover"
                        onError={() => setImageSrc('/assets/image.jpg')}
                    />
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="font-semibold text-white">{advert.name}</div>
                {advert.description && (
                    <div className="text-sm text-gray-400 line-clamp-1 truncate mt-1 max-w-xs">
                        {advert.description}
                    </div>
                )}
            </td>
            <td className="px-6 py-4 text-gray-400 text-sm">{advert.category}</td>
            <td className="px-6 py-4 text-gray-400 text-sm">{advert.country}</td>
            <td className="px-6 py-4">
                <a href={advert.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline text-sm truncate block max-w-xs transition-colors">
                    {advert.url}
                </a>
            </td>
            <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${advert.status === 'active'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                    {advert.status || 'inactive'}
                </span>
            </td>
            <td className="px-6 py-4">
                {advert.pinned ? '⭐' : '-'}
            </td>
            <td className="px-6 py-4 text-gray-400 text-sm">{advert.clickCount || 0}</td>
            <td className="px-6 py-4">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(advert)}
                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                        title="Edit"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onDelete(advert._id)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Delete"
                    >
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function AdvertsTab() {
    const [adverts, setAdverts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editingAdvert, setEditingAdvert] = useState<any>(null);
    const [advertData, setAdvertData] = useState({
        name: '',
        category: 'All',
        country: 'All',
        url: '',
        description: '',
        image: '',
        status: 'active' as 'active' | 'inactive',
        pinned: false,
        isPopupAdvert: false,
        buttonText: 'Visit Site',
        redirectTimer: 7,
        button2Enabled: false,
        button2Text: '',
        button2Url: '',
        button3Enabled: false,
        button3Text: '',
        button3Url: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showSiteConfig, setShowSiteConfig] = useState(false);
    const [siteConfig, setSiteConfig] = useState({
        filterBanner1: { enabled: false, title: '', description: '', image: '', url: '', buttonText: 'Visit Site' },
        filterBanner2: { enabled: false, title: '', description: '', image: '', url: '', buttonText: 'Visit Site' },
        filterBanner3: { enabled: false, title: '', description: '', image: '', url: '', buttonText: 'Visit Site' },
    });
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    useEffect(() => {
        fetchAdverts();
        fetchSiteConfig();
    }, []);

    const fetchAdverts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/adverts', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdverts(res.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load adverts');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSiteConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/site-config', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                // Normalize config data (handle backward compatibility)
                const config = { ...siteConfig, ...res.data };
                if (res.data.filterBanner && !res.data.filterBanner1) {
                    config.filterBanner1 = res.data.filterBanner;
                }
                // Remove navbarButton fields if they exist in response
                delete config.navbarButton1;
                delete config.navbarButton2;
                delete config.navbarButton3;

                setSiteConfig(config);
            }
        } catch (err: any) {
            console.error('Failed to fetch site config:', err);
        }
    };

    const handleSaveSiteConfig = async () => {
        setIsSavingConfig(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/admin/site-config', siteConfig, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Site configuration saved successfully!');
            setShowSiteConfig(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save site config');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleBannerImageUpload = (bannerNumber: 1 | 2 | 3) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be less than 10MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        setIsSavingConfig(true); // Reuse config saving state for loading
        try {
            const compressedFile = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedFile);

            const token = localStorage.getItem('token');
            const res = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            const bannerKey = `filterBanner${bannerNumber}` as 'filterBanner1' | 'filterBanner2' | 'filterBanner3';
            setSiteConfig({
                ...siteConfig,
                [bannerKey]: { ...siteConfig[bannerKey], image: res.data.url },
            });
        } catch (err: any) {
            console.error('Upload error:', err);
            alert(err.response?.data?.message || 'Failed to upload image');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleCreate = () => {
        setEditingAdvert(null);
        setAdvertData({
            name: '',
            category: 'All',
            country: 'All',
            url: '',
            description: '',
            image: '',
            status: 'active',
            pinned: false,
            isPopupAdvert: false,
            buttonText: 'Visit Site',
            redirectTimer: 7,
            button2Enabled: false,
            button2Text: '',
            button2Url: '',
            button3Enabled: false,
            button3Text: '',
            button3Url: '',
        });
        setShowEditor(true);
    };

    const handleEdit = async (advert: any) => {
        setEditingAdvert(advert);

        let actualImage = advert.image || '';
        if (advert._id && (advert.image === '/assets/image.jpg' || !advert.image || advert.image === '')) {
            try {
                const imageRes = await axios.get(`/api/adverts/${advert._id}/image`);
                if (imageRes.data?.image && imageRes.data.image !== '/assets/image.jpg') {
                    actualImage = imageRes.data.image;
                } else {
                    actualImage = '/assets/image.jpg';
                }
            } catch (err) {
                console.error('Failed to load advert image:', err);
                actualImage = '/assets/image.jpg';
            }
        } else if (advert.image && advert.image !== '/assets/image.jpg') {
            actualImage = advert.image;
        }

        setAdvertData({
            name: advert.name || '',
            category: advert.category || 'All',
            country: advert.country || 'All',
            url: advert.url || '',
            description: advert.description || '',
            image: actualImage,
            status: advert.status || 'active',
            pinned: advert.pinned || false,
            isPopupAdvert: advert.isPopupAdvert || false,
            buttonText: advert.buttonText || 'Visit Site',
            redirectTimer: advert.redirectTimer || 7,
            button2Enabled: advert.button2Enabled || false,
            button2Text: advert.button2Text || '',
            button2Url: advert.button2Url || '',
            button3Enabled: advert.button3Enabled || false,
            button3Text: advert.button3Text || '',
            button3Url: advert.button3Url || '',
        });
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!advertData.name || !advertData.url) {
            alert('Name and URL are required');
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');

            if (editingAdvert) {
                await axios.put(`/api/admin/adverts/${editingAdvert._id}`, advertData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/admin/adverts', advertData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setShowEditor(false);
            fetchAdverts();
        } catch (err: any) {
            console.error('Save error:', err);
            alert(err.response?.data?.message || 'Failed to save advert');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this advert?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/adverts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAdverts();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete advert');
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be less than 10MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        setIsUploading(true);
        try {
            const compressedFile = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedFile);

            const token = localStorage.getItem('token');
            const res = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            setAdvertData({ ...advertData, image: res.data.url });
        } catch (err: any) {
            console.error('Upload error:', err);
            alert(err.response?.data?.message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const filteredAdverts = adverts.filter((advert) =>
        advert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        advert.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        advert.country.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (showEditor) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-black text-white mb-2">
                        {editingAdvert ? 'Edit Advert' : 'Create Advert'}
                    </h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowEditor(false)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isUploading}
                            className="px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Advert'}
                        </button>
                    </div>
                </div>

                <div className="glass rounded-2xl p-6 border border-white/5">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Name *</label>
                                <input
                                    type="text"
                                    value={advertData.name}
                                    onChange={(e) => setAdvertData({ ...advertData, name: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                    placeholder="Advert name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">URL *</label>
                                <input
                                    type="url"
                                    value={advertData.url}
                                    onChange={(e) => setAdvertData({ ...advertData, url: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[#999] mb-2">Description</label>
                            <textarea
                                value={advertData.description}
                                onChange={(e) => setAdvertData({ ...advertData, description: e.target.value })}
                                className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none resize-none"
                                rows={3}
                                placeholder="Advert description"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Category</label>
                                <select
                                    value={advertData.category}
                                    onChange={(e) => setAdvertData({ ...advertData, category: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                >
                                    <option value="All">All Categories</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Country</label>
                                <select
                                    value={advertData.country}
                                    onChange={(e) => setAdvertData({ ...advertData, country: e.target.value })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                >
                                    <option value="All">All Countries</option>
                                    {countries.map((country) => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Status</label>
                                <select
                                    value={advertData.status}
                                    onChange={(e) => setAdvertData({ ...advertData, status: e.target.value as 'active' | 'inactive' })}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#999] mb-2">Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#b31b1b] file:text-white hover:file:bg-[#c42b2b]"
                                />
                                {advertData.image && (
                                    <div className="mt-2">
                                        <img src={advertData.image} alt="Preview" className="h-20 rounded-lg object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={advertData.pinned}
                                    onChange={(e) => setAdvertData({ ...advertData, pinned: e.target.checked })}
                                    className="w-5 h-5 text-[#b31b1b] rounded focus:ring-[#b31b1b]"
                                />
                                <span className="text-white">Pinned (Featured)</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={advertData.isPopupAdvert}
                                    onChange={(e) => setAdvertData({ ...advertData, isPopupAdvert: e.target.checked })}
                                    className="w-5 h-5 text-[#b31b1b] rounded focus:ring-[#b31b1b]"
                                />
                                <span className="text-white">Is Popup Advert</span>
                            </label>
                        </div>

                        {advertData.isPopupAdvert && (
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                                <h3 className="text-lg font-bold text-white">Popup Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-[#999] mb-2">Button Text</label>
                                        <input
                                            type="text"
                                            value={advertData.buttonText}
                                            onChange={(e) => setAdvertData({ ...advertData, buttonText: e.target.value })}
                                            className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[#999] mb-2">Redirect Timer (seconds)</label>
                                        <input
                                            type="number"
                                            value={advertData.redirectTimer}
                                            onChange={(e) => setAdvertData({ ...advertData, redirectTimer: parseInt(e.target.value) })}
                                            className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (showSiteConfig) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-black text-white mb-2">Site Configuration</h1>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowSiteConfig(false)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSaveSiteConfig}
                            disabled={isSavingConfig}
                            className="px-4 py-2 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isSavingConfig ? 'Saving...' : 'Save Config'}
                        </button>
                    </div>
                </div>

                <div className="glass rounded-2xl p-6 border border-white/5 space-y-8">
                    {/* Filter Banners */}
                    <div>
                        <h2 className="text-xl font-bold text-white mb-4">Filter Banners</h2>
                        <div className="space-y-4">
                            {[1, 2, 3].map((num) => {
                                const key = `filterBanner${num}` as keyof typeof siteConfig;
                                const bannerConfig = siteConfig[key] as any;
                                return (
                                    <div key={key} className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-white">Banner {num}</h3>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bannerConfig.enabled}
                                                    onChange={(e) => setSiteConfig({
                                                        ...siteConfig,
                                                        [key]: { ...bannerConfig, enabled: e.target.checked }
                                                    })}
                                                    className="w-5 h-5 text-[#b31b1b] rounded focus:ring-[#b31b1b]"
                                                />
                                                <span className="text-sm text-gray-400">Enabled</span>
                                            </label>
                                        </div>
                                        {bannerConfig.enabled && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Title"
                                                        value={bannerConfig.title}
                                                        onChange={(e) => setSiteConfig({
                                                            ...siteConfig,
                                                            [key]: { ...bannerConfig, title: e.target.value }
                                                        })}
                                                        className="p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white outline-none focus:border-[#b31b1b]"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Button Text"
                                                        value={bannerConfig.buttonText}
                                                        onChange={(e) => setSiteConfig({
                                                            ...siteConfig,
                                                            [key]: { ...bannerConfig, buttonText: e.target.value }
                                                        })}
                                                        className="p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white outline-none focus:border-[#b31b1b]"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="URL"
                                                    value={bannerConfig.url}
                                                    onChange={(e) => setSiteConfig({
                                                        ...siteConfig,
                                                        [key]: { ...bannerConfig, url: e.target.value }
                                                    })}
                                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white outline-none focus:border-[#b31b1b]"
                                                />
                                                <textarea
                                                    placeholder="Description"
                                                    value={bannerConfig.description}
                                                    onChange={(e) => setSiteConfig({
                                                        ...siteConfig,
                                                        [key]: { ...bannerConfig, description: e.target.value }
                                                    })}
                                                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white outline-none focus:border-[#b31b1b] resize-none"
                                                    rows={2}
                                                />
                                                <div>
                                                    <label className="block text-sm font-semibold text-[#999] mb-2">Banner Image</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleBannerImageUpload(num as 1 | 2 | 3)}
                                                        className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#b31b1b] file:text-white hover:file:bg-[#c42b2b]"
                                                    />
                                                    {bannerConfig.image && (
                                                        <div className="mt-2">
                                                            <img src={bannerConfig.image} alt="Preview" className="h-20 rounded-lg object-cover" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Adverts</h1>
                    <p className="text-[#999] text-sm">Manage {adverts.length} adverts</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowSiteConfig(true)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                    >
                        ⚙️ Site Config
                    </button>
                    <button
                        onClick={handleCreate}
                        className="px-6 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-xl font-bold transition-all shadow-lg shadow-[#b31b1b]/20"
                    >
                        + New Advert
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="glass rounded-2xl p-6 border border-white/5">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                    <input
                        type="text"
                        placeholder="Search adverts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none transition-all"
                    />
                </div>
            </div>

            {/* Adverts Table */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 border-4 border-[#b31b1b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[#999]">Loading adverts...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-red-400">{error}</div>
                ) : adverts.length === 0 ? (
                    <div className="p-12 text-center text-[#999]">No adverts found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Image</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Country</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">URL</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Pinned</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Clicks</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#666] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredAdverts.map((advert) => (
                                    <AdvertRow
                                        key={advert._id}
                                        advert={advert}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
