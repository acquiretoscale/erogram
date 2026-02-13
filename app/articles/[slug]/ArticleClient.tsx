'use client';

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/Navbar';

interface Article {
  _id: string;
  title: string;
  slug: string;
  content: string;
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

interface RelatedArticle {
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
  } | null;
}

interface TopGroup {
  _id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  views: number;
  description: string;
}

interface ArticleClientProps {
  article: Article;
  relatedArticles?: RelatedArticle[];
  topGroups?: TopGroup[];
}

// Reading Progress Bar Component
function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#b31b1b] to-[#ff4d4d] origin-left z-[100]"
      style={{ scaleX }}
    />
  );
}

// Top Groups Widget
function TopGroupsWidget({ groups }: { groups: TopGroup[] }) {
  if (!groups || groups.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-6 mb-8 border border-white/5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-[#b31b1b]">🔥</span> Trending Groups
        </h3>
        <Link href="/groups" className="text-xs text-[#999] hover:text-white transition-colors">
          View All
        </Link>
      </div>
      <div className="space-y-4">
        {groups.map((group, idx) => (
          <Link
            key={group._id}
            href={`/${group.slug}`}
            className="flex items-center gap-3 group p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
              <img
                src={group.image || '/assets/image.jpg'}
                alt={group.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute top-0 left-0 bg-[#b31b1b] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg">
                #{idx + 1}
              </div>
            </div>
            <div className="flex-grow min-w-0">
              <h4 className="text-sm font-semibold text-gray-200 group-hover:text-[#b31b1b] transition-colors truncate">
                {group.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{group.category}</span>
                <span>•</span>
                <span>{group.views.toLocaleString()} views</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/groups"
        className="block w-full mt-6 py-3 bg-[#b31b1b]/10 hover:bg-[#b31b1b] text-[#b31b1b] hover:text-white text-center rounded-xl text-sm font-bold transition-all duration-300 border border-[#b31b1b]/20"
      >
        Explore More Groups
      </Link>
    </div>
  );
}

// Join CTA Banner (Bottom)
function JoinCTABanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-12 relative overflow-hidden rounded-3xl"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#b31b1b] to-[#800000] opacity-90 z-0" />
      <div className="absolute inset-0 bg-[url('/assets/pattern.png')] opacity-10 z-0" />
      <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
            Looking for the Best Telegram Groups?
          </h3>
          <p className="text-white/80 text-lg">
            Join thousands of active communities on Erogram today.
          </p>
        </div>
        <Link
          href="/groups"
          className="px-8 py-4 bg-white text-[#b31b1b] font-bold rounded-xl shadow-xl hover:scale-105 transition-transform whitespace-nowrap"
        >
          Browse Groups 🚀
        </Link>
      </div>
    </motion.div>
  );
}

// Mid Article Ad
function MidArticleAd() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-12 relative overflow-hidden rounded-2xl border border-[#b31b1b]/20 bg-[#0f0f0f]"
    >
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#b31b1b] rounded-full blur-3xl opacity-10" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-[#b31b1b] rounded-full blur-3xl opacity-10" />

      <div className="relative z-10 p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-[#b31b1b]/10 flex items-center justify-center text-3xl border border-[#b31b1b]/20">
          🔞
        </div>

        <div className="flex-grow text-center md:text-left">
          <h3 className="text-xl font-bold text-white mb-2">
            Find NSFW Telegram Groups
          </h3>
          <p className="text-gray-400 text-sm">
            Browse our curated list of the best adult communities. Verified & active.
          </p>
        </div>

        <div className="flex-shrink-0">
          <Link
            href="/groups"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#b31b1b] hover:bg-[#d42020] text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg shadow-[#b31b1b]/20 text-sm"
          >
            Find Groups
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function ArticleClient({ article, relatedArticles = [], topGroups = [] }: ArticleClientProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [tableOfContents, setTableOfContents] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) setUsername(storedUsername);
    }
  }, []);

  // Generate TOC and setup intersection observer for active heading
  useEffect(() => {
    if (contentRef.current) {
      const headings = contentRef.current.querySelectorAll('h1, h2, h3');
      const toc = Array.from(headings).map((heading, index) => {
        const id = heading.id || `heading-${index}`;
        heading.id = id;
        return {
          id,
          text: heading.textContent || '',
          level: parseInt(heading.tagName.charAt(1))
        };
      });
      setTableOfContents(toc);

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveHeading(entry.target.id);
            }
          });
        },
        { rootMargin: '-100px 0px -66% 0px' }
      );

      headings.forEach((heading) => observer.observe(heading));
      return () => observer.disconnect();
    }
  }, [article.content]);

  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // Memoize markdown components
  const markdownComponents = useMemo(() => ({
    h1: ({ children }: any) => <h1 className="text-3xl md:text-4xl font-bold text-white mt-12 mb-6">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6 border-b border-white/10 pb-4">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">{children}</h3>,
    p: ({ children }: any) => <p className="text-gray-300 leading-relaxed mb-6">{children}</p>,
    a: ({ href, children }: any) => (
      <a href={href} className="text-[#b31b1b] hover:text-[#ff4d4d] underline decoration-2 underline-offset-4 transition-colors font-medium">
        {children}
      </a>
    ),
    ul: ({ children }: any) => <ul className="list-disc list-outside ml-6 mb-6 text-gray-300 space-y-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-outside ml-6 mb-6 text-gray-300 space-y-2">{children}</ol>,
    li: ({ children }: any) => <li className="pl-2">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="bg-white/5 border-l-4 border-[#b31b1b] p-6 rounded-r-xl italic text-gray-300 my-8">
        {children}
      </blockquote>
    ),
    img: ({ src, alt }: any) => (
      <div className="my-8 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <img src={src} alt={alt as string} className="w-full h-auto" />
        {alt && <p className="text-center text-sm text-gray-500 mt-2 p-2">{alt}</p>}
      </div>
    ),
    code: ({ children }: any) => <code className="bg-white/10 text-[#ff4d4d] px-1.5 py-0.5 rounded font-mono text-sm">{children}</code>,
    pre: ({ children }: any) => <pre className="bg-[#111] p-6 rounded-xl overflow-x-auto my-8 border border-white/10">{children}</pre>,
  }), []);

  // Split content logic
  const { part1, part2 } = useMemo(() => {
    if (!article.content) return { part1: '', part2: '' };
    const paragraphs = article.content.split('\n\n');
    if (paragraphs.length < 6) return { part1: article.content, part2: '' };
    const middle = Math.floor(paragraphs.length / 2);
    return {
      part1: paragraphs.slice(0, middle).join('\n\n'),
      part2: paragraphs.slice(middle).join('\n\n')
    };
  }, [article.content]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] selection:bg-[#b31b1b] selection:text-white">
      <ReadingProgress />
      <Navbar username={username} setUsername={setUsername} />

      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          {article.featuredImage ? (
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#000]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        </motion.div>

        <div className="absolute inset-0 z-10 flex items-end pb-20">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl"
            >
              <div className="flex flex-wrap gap-3 mb-6">
                {article.tags?.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-[#b31b1b] text-white text-sm font-bold rounded-full uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-white drop-shadow-2xl">
                {article.title}
              </h1>
              <div className="flex items-center gap-6 text-gray-300 text-sm md:text-base">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#b31b1b] flex items-center justify-center text-white font-bold">
                    {article.author?.username?.[0]?.toUpperCase() || 'E'}
                  </div>
                  <span className="font-medium text-white">{article.author?.username || 'Erogram Team'}</span>
                </div>
                <span>•</span>
                <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span>•</span>
                <span>{Math.ceil(article.content.length / 1000)} min read</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Main Content */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="prose prose-invert prose-lg md:prose-xl max-w-none"
            >
              {/* Excerpt */}
              {article.excerpt && (
                <p className="lead text-2xl md:text-3xl text-gray-300 font-light mb-12 border-l-4 border-[#b31b1b] pl-6 italic">
                  {article.excerpt}
                </p>
              )}

              {/* Content */}
              <div ref={contentRef}>
                <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                  {part1}
                </ReactMarkdown>

                {part2 && (
                  <>
                    <MidArticleAd />
                    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                      {part2}
                    </ReactMarkdown>
                  </>
                )}
              </div>
            </motion.div>

            {/* In-Content CTA (Bottom) */}
            <JoinCTABanner />

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-20 pt-12 border-t border-white/10">
                <h2 className="text-3xl font-bold text-white mb-8">Read Next</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {relatedArticles.map((item) => (
                    <Link key={item._id} href={`/articles/${item.slug}`} className="group">
                      <div className="aspect-video rounded-2xl overflow-hidden bg-[#1a1a1a] mb-4 relative">
                        <img
                          src={item.featuredImage || '/assets/image.jpg'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-[#b31b1b] transition-colors mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-400 text-sm line-clamp-2">{item.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            {/* Sticky Container */}
            <div className="sticky top-24 space-y-8">

              {/* Table of Contents */}
              {tableOfContents.length > 0 && (
                <div className="glass rounded-2xl p-6 border border-white/5 hidden lg:block">
                  <h3 className="text-lg font-bold text-white mb-4">Table of Contents</h3>
                  <nav className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {tableOfContents.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-all duration-200 ${activeHeading === item.id
                          ? 'bg-[#b31b1b]/10 text-[#b31b1b] font-medium border-l-2 border-[#b31b1b]'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                          } ${item.level === 3 ? 'ml-4' : ''}`}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* Top Groups Widget */}
              <TopGroupsWidget groups={topGroups} />

              {/* Newsletter / Join Community Widget */}
              <div className="glass rounded-2xl p-8 text-center border border-white/5 bg-gradient-to-b from-[#b31b1b]/20 to-transparent">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-bold text-white mb-2">Join the Community</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Get access to exclusive groups and premium content.
                </p>
                <Link
                  href="/login"
                  className="block w-full py-3 bg-white text-[#b31b1b] font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                  Sign Up Now
                </Link>
              </div>

            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050505] py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-500">
            © {new Date().getFullYear()} Erogram. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
