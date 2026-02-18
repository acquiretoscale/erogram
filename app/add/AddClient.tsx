'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { motion } from 'framer-motion';

const TELEGRAM_BLUE = '#0088cc';

interface AddClientProps {
  categories: string[];
  countries: string[];
}

export default function AddClient({ categories, countries }: AddClientProps) {
  const [tab, setTab] = useState<'group' | 'bot'>('group');
  const [groupData, setGroupData] = useState({
    name: '',
    category: 'All',
    country: 'All',
    telegramLink: '',
    description: '',
    imageFile: null as File | null,
  });
  const [botData, setBotData] = useState({
    name: '',
    category: 'All',
    country: 'All',
    telegramLink: '',
    description: '',
    imageFile: null as File | null,
  });
  const [groupPreview, setGroupPreview] = useState<string | null>(null);
  const [botPreview, setBotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<'group' | 'bot' | null>(null);

  const convertToWebP = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else reject(new Error('Failed to convert'));
        }, 'image/webp', 0.8);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleGroupImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupData((d) => ({ ...d, imageFile: file }));
      const reader = new FileReader();
      reader.onload = (ev) => setGroupPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBotImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBotData((d) => ({ ...d, imageFile: file }));
      const reader = new FileReader();
      reader.onload = (ev) => setBotPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submitGroup = async () => {
    setError('');
    if (!groupData.name || !groupData.category || !groupData.telegramLink || !groupData.description) {
      setError('Name, category, Telegram link and description are required');
      return;
    }
    if (groupData.description.length < 30) {
      setError('Description must be at least 30 characters');
      return;
    }
    if (!groupData.telegramLink.startsWith('https://t.me/')) {
      setError('Telegram link must start with https://t.me/');
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (groupData.imageFile) {
        try {
          imageUrl = await convertToWebP(groupData.imageFile);
        } catch {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(groupData.imageFile!);
          });
        }
      }
      await axios.post('/api/groups', {
        name: groupData.name,
        category: groupData.category,
        country: groupData.country,
        telegramLink: groupData.telegramLink,
        description: groupData.description,
        image: imageUrl || '/assets/image.jpg',
      });
      setSuccess('group');
      setGroupData({ name: '', category: 'All', country: 'All', telegramLink: '', description: '', imageFile: null });
      setGroupPreview(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBot = async () => {
    setError('');
    if (!botData.name || !botData.category || !botData.telegramLink || !botData.description) {
      setError('Name, category, Telegram link and description are required');
      return;
    }
    if (botData.description.length < 30) {
      setError('Description must be at least 30 characters');
      return;
    }
    if (!botData.telegramLink.startsWith('https://t.me/')) {
      setError('Telegram link must start with https://t.me/');
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (botData.imageFile) {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(botData.imageFile!);
        });
      }
      await axios.post('/api/bots', {
        name: botData.name,
        category: botData.category,
        country: botData.country,
        telegramLink: botData.telegramLink,
        description: botData.description,
        image: imageUrl || '/assets/image.jpg',
      });
      setSuccess('bot');
      setBotData({ name: '', category: 'All', country: 'All', telegramLink: '', description: '', imageFile: null });
      setBotPreview(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit bot');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
          Add Group or Bot
        </h1>
        <p className="text-[#999]">
          No login required. Your submission will be reviewed by moderators.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-full bg-white/5 border border-white/10 p-1 mb-8">
        <button
          type="button"
          onClick={() => { setTab('group'); setError(''); setSuccess(null); }}
          className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${tab === 'group' ? 'text-white' : 'text-[#999] hover:text-white'}`}
          style={tab === 'group' ? { backgroundColor: TELEGRAM_BLUE } : {}}
        >
          👥 Group
        </button>
        <button
          type="button"
          onClick={() => { setTab('bot'); setError(''); setSuccess(null); }}
          className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${tab === 'bot' ? 'text-white' : 'text-[#999] hover:text-white'}`}
          style={tab === 'bot' ? { backgroundColor: TELEGRAM_BLUE } : {}}
        >
          🤖 Bot
        </button>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 text-center"
        >
          ✓ Submitted for moderation. We&apos;ll review your {success} shortly.
        </motion.div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      {tab === 'group' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-semibold text-[#ccc] mb-1">Group image</label>
            <input type="file" accept="image/*" onChange={handleGroupImage} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#ccc] text-sm" />
            {groupPreview && <img src={groupPreview} alt="Preview" className="mt-2 h-32 object-cover rounded-xl" />}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#ccc] mb-1">Name *</label>
            <input
              type="text"
              value={groupData.name}
              onChange={(e) => setGroupData((d) => ({ ...d, name: e.target.value }))}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
              placeholder="Group name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#ccc] mb-1">Category *</label>
              <select
                value={groupData.category}
                onChange={(e) => setGroupData((d) => ({ ...d, category: e.target.value }))}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#ccc] mb-1">Country (optional)</label>
              <select
                value={groupData.country}
                onChange={(e) => setGroupData((d) => ({ ...d, country: e.target.value }))}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#ccc] mb-1">Telegram link *</label>
            <input
              type="url"
              value={groupData.telegramLink}
              onChange={(e) => setGroupData((d) => ({ ...d, telegramLink: e.target.value }))}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
              placeholder="https://t.me/yourgroup"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#ccc] mb-1">Description * (min 30 characters)</label>
            <textarea
              value={groupData.description}
              onChange={(e) => setGroupData((d) => ({ ...d, description: e.target.value }))}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 resize-none"
              placeholder="Describe your group..."
              rows={4}
            />
            <p className="text-xs text-[#666] mt-1">{groupData.description.length}/30</p>
          </div>
          <button
            type="button"
            onClick={submitGroup}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-full font-bold text-white disabled:opacity-50 transition-all"
            style={{ backgroundColor: TELEGRAM_BLUE }}
          >
            {isSubmitting ? 'Submitting…' : 'Submit for moderation'}
          </button>
        </motion.div>
      )}

      {tab === 'bot' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-semibold text-[#ccc] mb-1">Bot image</label>
            <input type="file" accept="image/*" onChange={handleBotImage} className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[#ccc] text-sm" />
            {botPreview && <img src={botPreview} alt="Preview" className="mt-2 h-32 object-cover rounded-xl" />}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#ccc] mb-1">Name *</label>
            <input
              type="text"
              value={botData.name}
              onChange={(e) => setBotData((d) => ({ ...d, name: e.target.value }))}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
              placeholder="Bot name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#ccc] mb-1">Category *</label>
              <select
                value={botData.category}
                onChange={(e) => setBotData((d) => ({ ...d, category: e.target.value }))}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#ccc] mb-1">Country (optional)</label>
              <select
                value={botData.country}
                onChange={(e) => setBotData((d) => ({ ...d, country: e.target.value }))}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white"
              >
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#ccc] mb-1">Telegram link *</label>
            <input
              type="url"
              value={botData.telegramLink}
              onChange={(e) => setBotData((d) => ({ ...d, telegramLink: e.target.value }))}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
              placeholder="https://t.me/yourbot"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#ccc] mb-1">Description * (min 30 characters)</label>
            <textarea
              value={botData.description}
              onChange={(e) => setBotData((d) => ({ ...d, description: e.target.value }))}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 resize-none"
              placeholder="Describe your bot..."
              rows={4}
            />
            <p className="text-xs text-[#666] mt-1">{botData.description.length}/30</p>
          </div>
          <button
            type="button"
            onClick={submitBot}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-full font-bold text-white disabled:opacity-50 transition-all"
            style={{ backgroundColor: TELEGRAM_BLUE }}
          >
            {isSubmitting ? 'Submitting…' : 'Submit for moderation'}
          </button>
        </motion.div>
      )}

      <p className="mt-8 text-center text-[#666] text-sm">
        <Link href="/groups" className="text-[#0088cc] hover:underline">Browse groups</Link>
        {' · '}
        <Link href="/bots" className="text-[#0088cc] hover:underline">Browse bots</Link>
      </p>
    </main>
  );
}
