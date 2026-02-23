'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import axios from 'axios';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';

interface AddGroupModalProps {
  categories: string[];
  countries: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddGroupModal({ categories, countries, onClose, onSuccess }: AddGroupModalProps) {
  const [groupData, setGroupData] = useState({
    name: '',
    category: 'All',
    country: 'All',
    telegramLink: '',
    description: '',
    imageFile: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Convert uploaded image to WebP format for better compression
  const convertToWebP = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image to canvas
        ctx?.drawImage(img, 0, 0);

        // Convert to WebP blob
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Failed to convert to WebP'));
          }
        }, 'image/webp', 0.8); // 80% quality for good compression vs quality balance
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupData({ ...groupData, imageFile: file });
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login first');
        setIsSubmitting(false);
        return;
      }

      // Validation (country optional)
      if (!groupData.name || !groupData.category || !groupData.telegramLink || !groupData.description) {
        setError('Name, category, Telegram link and description are required');
        setIsSubmitting(false);
        return;
      }

      if (groupData.description.length < 30) {
        setError('Description must be at least 30 characters');
        setIsSubmitting(false);
        return;
      }

      if (!groupData.telegramLink.startsWith('https://t.me/')) {
        setError('Telegram link must start with https://t.me/');
        setIsSubmitting(false);
        return;
      }

      // Convert image to WebP base64 if uploaded
      let imageUrl = null;
      if (groupData.imageFile) {
        try {
          imageUrl = await convertToWebP(groupData.imageFile);
          console.log('[Group Create] Image converted to WebP base64, length:', imageUrl?.length || 0);
        } catch (error) {
          console.error('[Group Create] WebP conversion failed, falling back to original format:', error);
          // Fallback to original format if WebP conversion fails
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(groupData.imageFile!);
          });
          console.log('[Group Create] Fallback: Image converted to base64, length:', imageUrl?.length || 0);
        }
      }

      // Submit group - exclude imageFile from the payload
      const { imageFile, ...groupPayload } = groupData;
      const res = await axios.post('/api/groups', {
        ...groupPayload,
        image: imageUrl || PLACEHOLDER_IMAGE_URL
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[Group Create] Group created, response:', res.data?._id);

      if (res.data) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-5 rounded-3xl"></div>

        <div className="relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-200 text-3xl font-bold transition hover:scale-110 z-10">
            ✕
          </button>

          <div className="text-center mb-8">
            <h2 className="text-4xl font-black gradient-text mb-2">
              ✨ Create New Group
            </h2>
            <p className="text-[#999] text-lg">Share your amazing community with the world!</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Group Image Upload */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">📸</span>
                Group Image
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full p-4 border-2 border-dashed border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] cursor-pointer"
                />
              </div>
              {imagePreview && (
                <div className="mt-4">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                </div>
              )}
            </div>

            {/* Group Name */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">🏷️</span>
                Group Name *
              </label>
              <input
                type="text"
                value={groupData.name}
                onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
                className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                placeholder="Enter an amazing group name..."
              />
            </div>

            {/* Category and Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 border border-white/10">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2">📂</span>
                  Category *
                </label>
                <select
                  value={groupData.category}
                  onChange={(e) => setGroupData({ ...groupData, category: e.target.value })}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="glass rounded-2xl p-6 border border-white/10">
                <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                  <span className="mr-2">🌍</span>
                  Country/Language (optional)
                </label>
                <select
                  value={groupData.country}
                  onChange={(e) => setGroupData({ ...groupData, country: e.target.value })}
                  className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                >
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Telegram Link */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">📱</span>
                Telegram Link *
              </label>
              <input
                type="url"
                value={groupData.telegramLink}
                onChange={(e) => setGroupData({ ...groupData, telegramLink: e.target.value })}
                className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
                placeholder="https://t.me/yourgroup"
              />
            </div>

            {/* Description */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <label className="block text-sm font-bold text-[#f5f5f5] mb-3 flex items-center">
                <span className="mr-2">📝</span>
                Description * (min 30 chars)
              </label>
              <textarea
                value={groupData.description}
                onChange={(e) => setGroupData({ ...groupData, description: e.target.value })}
                className="w-full p-4 border border-white/20 rounded-xl bg-white/5 text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none resize-none"
                placeholder="Tell us about your amazing group..."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-2">{groupData.description.length}/30 characters</p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed hover-glow"
              >
                {isSubmitting ? '⏳ Submitting...' : '✨ Create Amazing Group ✨'}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}