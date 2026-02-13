'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';

const FilterBanner: React.FC = () => {
  const [banner, setBanner] = useState<any>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  const fetchBanner = async () => {
    try {
      const res = await axios.get('/api/site-config');
      const config = res.data;

      // Collect all enabled banners
      const enabledBanners: any[] = [];

      // Check filterBanner1, filterBanner2, filterBanner3
      if (config?.filterBanner1?.enabled) {
        enabledBanners.push(config.filterBanner1);
      }
      if (config?.filterBanner2?.enabled) {
        enabledBanners.push(config.filterBanner2);
      }
      if (config?.filterBanner3?.enabled) {
        enabledBanners.push(config.filterBanner3);
      }

      // Backward compatibility: check old filterBanner
      if (enabledBanners.length === 0 && config?.filterBanner?.enabled) {
        enabledBanners.push(config.filterBanner);
      }

      // Randomly pick one of the enabled banners
      if (enabledBanners.length > 0) {
        const randomIndex = Math.floor(Math.random() * enabledBanners.length);
        setBanner(enabledBanners[randomIndex]);
      }
    } catch (err) {
      console.error('Failed to fetch filter banner:', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchBanner();
  }, []);

  // Always reserve space so the sidebar doesn't jump when the banner appears.
  const hasBanner = Boolean(mounted && banner);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 glass rounded-2xl overflow-hidden border border-white/10 min-h-[380px]"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="w-full overflow-hidden">
        {hasBanner && banner?.image ? (
          <img
            src={banner.image}
            alt={banner.title || 'Banner'}
            width={600}
            height={500}
            className="w-full h-auto object-contain"
          />
        ) : (
          <div className="w-full aspect-[6/5] bg-white/5 animate-pulse" />
        )}
      </div>
      <div className="p-6">
        {hasBanner && banner?.title && (
          <h3 className="text-xl font-bold text-[#f5f5f5] mb-2">{banner.title}</h3>
        )}
        {hasBanner && banner?.description && (
          <p className="text-[#999] text-sm mb-4">{banner.description}</p>
        )}
        {hasBanner && banner?.url && (
          <a
            href={banner.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white rounded-lg transition-colors font-semibold"
          >
            {banner.buttonText || 'Visit Site'}
          </a>
        )}
      </div>
    </motion.div>
  );
};

export default FilterBanner;