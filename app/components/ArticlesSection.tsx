'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

interface Article {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  tags: string[];
  publishedAt: string | null;
  views: number;
  author: {
    _id: string;
    username: string;
  };
}

interface ArticlesSectionProps {
  featuredArticles: Article[];
}

const VirtualizedArticleGrid = React.memo(function VirtualizedArticleGrid({ featuredArticles }: { featuredArticles: Article[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {featuredArticles.map((article, index) => (
        <motion.div
          key={article._id}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          whileHover={{ y: -10 }}
          className="glass rounded-2xl overflow-hidden hover-glow h-full"
        >
          <Link href={`/articles/${article.slug}`} className="h-full flex flex-col">
            {article.featuredImage && (
              <div className="aspect-video overflow-hidden relative flex-shrink-0">
                <Image
                  src={article.featuredImage}
                  alt={article.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-6 flex-grow flex flex-col">
              <h3 className="text-xl font-bold mb-3 text-[#f5f5f5] line-clamp-2 flex-grow">
                {article.title}
              </h3>
              <p className="text-[#999] text-sm mb-4 line-clamp-3 flex-grow">
                {article.excerpt}
              </p>
              <div className="flex items-center justify-between text-xs text-[#999] mt-auto">
                <span>By {article.author.username}</span>
                {article.publishedAt && (
                  <span>
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
});

export default function ArticlesSection({ featuredArticles }: ArticlesSectionProps) {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  };

  if (featuredArticles.length === 0) return null;

  return (
    <motion.div
      variants={fadeInUp}
      className="mt-20 sm:mt-40 max-w-7xl mx-auto px-4"
    >
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-12 sm:mb-16 text-[#f5f5f5]">
        Latest <span className="gradient-text">Articles</span>
      </h2>
      <VirtualizedArticleGrid featuredArticles={featuredArticles} />
      <div className="text-center mt-8">
        <Link href="/articles">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-[#b31b1b] hover-glow text-white rounded-lg text-lg font-semibold transition-all"
          >
            View All Articles
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}