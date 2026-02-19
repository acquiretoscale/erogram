'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';

interface Article {
  _id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt: string;
  featuredImage: string;
  author: {
    _id: string;
    username: string;
  } | null;
  status: string;
  publishedAt: string;
  views: number;
  tags: string[];
  createdAt: string;
}

interface TopBannerCampaign {
  _id: string;
  creative: string;
  destinationUrl: string;
  slot: string;
}

interface ArticlesClientProps {
  initialArticles: Article[];
  topBannerCampaigns?: TopBannerCampaign[];
}

export default function ArticlesClient({ initialArticles, topBannerCampaigns = [] }: ArticlesClientProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [articlesLoading, setArticlesLoading] = useState(initialArticles.length === 0);

  // Get username from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setUsername(storedUsername);
      }
    }
  }, []);

  // Fetch articles from API so live site always shows list (same API that works for /api/debug/articles-count)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/articles')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) setArticles(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setArticlesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredArticles = articles.filter((article) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      (article.content && article.content.toLowerCase().includes(query)) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Sort articles by publishedAt descending (newest first)
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return dateB - dateA;
  });

  const fadeInUp = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.15, ease: 'easeOut' },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.02,
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#111111] overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b31b1b] rounded-full blur-3xl opacity-10"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Navigation */}
      <Navbar username={username} setUsername={setUsername} />

      {/* Main Content */}
      <motion.main
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-20"
      >
        {/* Top banner: same size as Groups/Bots, minimal spacing */}
        <div className="w-full mb-3">
          <HeaderBanner campaigns={topBannerCampaigns} />
        </div>
        {/* Header */}
        <motion.div
          variants={fadeInUp}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight">
            <span className="gradient-text">Articles</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-[#999] max-w-2xl mx-auto px-4">
            Discover insights, guides, and stories about NSFW Telegram groups
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          variants={fadeInUp}
          className="mb-8 px-4"
        >
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-[#1a1a1a] border border-[#333] rounded-xl text-[#f5f5f5] placeholder-[#666] focus:outline-none focus:border-[#b31b1b] focus:ring-2 focus:ring-[#b31b1b]/50 transition-all text-base"
            />
            <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-xl sm:text-2xl">🔍</span>
          </div>
        </motion.div>

        {/* Articles Grid */}
        {sortedArticles.length === 0 ? (
          <motion.div
            variants={fadeInUp}
            className="glass rounded-2xl p-8 sm:p-12 text-center hover-glow mx-4"
          >
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">📝</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-4 text-[#f5f5f5]">
              {articlesLoading && !searchQuery ? 'Loading articles...' : searchQuery ? 'No articles found' : 'No articles yet'}
            </h3>
            <p className="text-base sm:text-lg text-[#999] max-w-md mx-auto">
              {articlesLoading && !searchQuery
                ? 'Fetching from the server.'
                : searchQuery
                ? 'Try adjusting your search query.'
                : 'Check back soon for insightful articles about NSFW Telegram groups, community insights, and helpful guides.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 px-4">
            {sortedArticles.map((article, idx) => (
              <motion.div
                key={article._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: idx * 0.01 }}
                whileHover={{ y: -8 }}
                className="glass rounded-2xl overflow-hidden hover-glow cursor-pointer group"
              >
                <Link href={`/articles/${article.slug}`}>
                  {/* Featured Image */}
                  {article.featuredImage && (
                    <div className="relative w-full h-48 overflow-hidden bg-[#1a1a1a]">
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Article Content */}
                  <div className="p-6">
                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {article.tags.slice(0, 3).map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className="px-2 py-1 bg-[#b31b1b]/20 text-[#b31b1b] text-xs rounded-lg"
                          >
                            {tag}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="px-2 py-1 bg-[#333] text-[#999] text-xs rounded-lg">
                            +{article.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-xl font-bold mb-3 text-[#f5f5f5] group-hover:text-[#b31b1b] transition-colors line-clamp-2">
                      {article.title}
                    </h3>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-[#999] text-sm mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-sm text-[#666] pt-4 border-t border-[#333]">
                      <div className="flex items-center gap-2">
                        {article.author && (
                          <>
                            <span>👤</span>
                            <span>{article.author.username}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {article.publishedAt && (
                          <span>
                            {new Date(article.publishedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Features Section */}
        <motion.div
          variants={fadeInUp}
          className="mt-16 sm:mt-20 px-4"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-[#f5f5f5]">
            What You'll Find Here
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: '📚',
                title: 'Guides & Tutorials',
                description: 'Learn how to find and join the best NSFW Telegram groups',
              },
              {
                icon: '💡',
                title: 'Insights & Tips',
                description: 'Discover community insights and best practices',
              },
              {
                icon: '📰',
                title: 'News & Updates',
                description: 'Stay updated with the latest trends and announcements',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                whileHover={{ y: -10 }}
                className="glass rounded-2xl p-6 sm:p-8 hover-glow"
              >
                <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{feature.icon}</div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3 text-[#f5f5f5]">
                  {feature.title}
                </h3>
                <p className="text-[#999] text-sm sm:text-base">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <motion.footer
        variants={fadeInUp}
        className="relative z-10 border-t border-[#333] mt-32 py-12"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-[#999] text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} erogram. All rights reserved.
            </div>
            <div className="text-sm text-[#999]">
              Site managed by{' '}
              <a
                href="https://eroverse.space"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#b31b1b] hover:text-[#c42b2b] underline transition-colors"
              >
                eroverse.space
              </a>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

