'use client';

import { motion, AnimatePresence, useScroll, useSpring, useTransform } from 'framer-motion';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navbar from '@/components/Navbar';
import HeaderBanner from '@/components/HeaderBanner';
import Footer from '@/components/Footer';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';
import { trackArticleClick } from '@/lib/actions/articleTracking';
import { updateArticle, getArticleBlocks } from '@/lib/actions/adminArticles';
import ArticleEditor from '@/app/admin/components/ArticleEditor';

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
  videoBlocks?: { url: string; caption?: string; link?: string; linktext?: string; position: string }[];
  ctaBlocks?: { url: string; text: string; headline?: string; description?: string; position: string }[];
}

function VideoBlock({ data, onCtaClick }: { data: any; onCtaClick: (url: string) => void }) {
  if (!data.url) return null;
  const isDirectVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(data.url);
  return (
    <div className="not-prose my-10">
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-black">
        {isDirectVideo ? (
          <video src={data.url} controls playsInline className="w-full" preload="metadata" />
        ) : (
          <iframe src={data.url} className="w-full aspect-video" allowFullScreen allow="autoplay; encrypted-media" />
        )}
      </div>
      {data.caption && <p className="text-center text-sm text-gray-500 mt-3">{data.caption}</p>}
      {data.link && data.linktext && (
        <div className="mt-4 flex justify-center">
          <a href={data.link} target="_blank" rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); onCtaClick(data.link); }}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-b from-[#22c55e] to-[#15803d] border border-[#4ade80]/50 shadow-[0_12px_30px_rgba(21,128,61,0.4)] hover:shadow-[0_16px_40px_rgba(21,128,61,0.55)] hover:-translate-y-0.5 transition-all duration-200">
            {data.linktext}
          </a>
        </div>
      )}
    </div>
  );
}

function CtaBlock({ data, onCtaClick }: { data: any; onCtaClick: (url: string) => void }) {
  if (!data.url || !data.text) return null;
  const heading = data.headline || 'Ready to continue?';
  return (
    <div className="not-prose my-12">
      <div className="mx-auto max-w-3xl relative overflow-hidden rounded-3xl border border-[#b31b1b]/20 bg-gradient-to-br from-[#140909] via-[#0f0f0f] to-[#090909]">
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-[#b31b1b]/15 blur-[110px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-[#b31b1b]/10 blur-[95px] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4d4d]/40 to-transparent" />
        <div className="relative z-10 px-7 py-10 md:px-12 md:py-12 text-center">
          <h3 className="text-white text-2xl md:text-3xl font-black tracking-tight">{heading}</h3>
          {data.description && (
            <p className="mt-3 text-gray-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">{data.description}</p>
          )}
          <div className="mt-8 flex justify-center">
            <a href={data.url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); onCtaClick(data.url); }}
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-black text-base uppercase tracking-[0.1em] text-white bg-gradient-to-b from-[#22c55e] to-[#15803d] border border-[#4ade80]/50 ring-1 ring-white/10 shadow-[0_18px_44px_rgba(21,128,61,0.56)] hover:shadow-[0_24px_54px_rgba(21,128,61,0.68)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.985] transition-all duration-200">
              {data.text}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
          <p className="mt-3 text-xs text-gray-500">Opens in a new tab</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b31b1b]/30 to-transparent" />
      </div>
    </div>
  );
}

function ArticleMediaBlocks({ videoBlocks, ctaBlocks }: { videoBlocks: any[]; ctaBlocks: any[] }) {
  if (videoBlocks.length === 0 && ctaBlocks.length === 0) return null;

  let html = '';

  for (const v of videoBlocks) {
    if (!v.url) continue;
    const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(v.url);
    html += '<div style="margin:2.5rem 0">';
    html += '<div style="border-radius:1rem;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 10px 15px -3px rgba(0,0,0,.1);background:#000">';
    if (isVideo) {
      html += `<video src="${v.url}" controls playsinline style="width:100%" preload="metadata"></video>`;
    } else {
      html += `<iframe src="${v.url}" style="width:100%;aspect-ratio:16/9;border:none" allowfullscreen allow="autoplay;encrypted-media"></iframe>`;
    }
    html += '</div>';
    if (v.caption) html += `<p style="text-align:center;font-size:.875rem;color:#6b7280;margin-top:.75rem">${v.caption}</p>`;
    if (v.link && v.linktext) {
      html += `<div style="margin-top:1rem;display:flex;justify-content:center"><a href="${v.link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 2rem;border-radius:.75rem;font-weight:700;font-size:.875rem;color:#fff;background:linear-gradient(to bottom,#22c55e,#15803d);border:1px solid rgba(74,222,128,.5);text-decoration:none;box-shadow:0 12px 30px rgba(21,128,61,.4)">${v.linktext}</a></div>`;
    }
    html += '</div>';
  }

  for (const c of ctaBlocks) {
    if (!c.url || !c.text) continue;
    const h = c.headline || 'Ready to continue?';
    html += '<div style="margin:3rem 0">';
    html += '<div style="max-width:48rem;margin:0 auto;position:relative;overflow:hidden;border-radius:1.5rem;border:1px solid rgba(179,27,27,.2);background:linear-gradient(to bottom right,#140909,#0f0f0f,#090909)">';
    html += '<div style="position:relative;z-index:10;padding:2.5rem 1.75rem;text-align:center">';
    html += `<h3 style="color:#fff;font-size:1.5rem;font-weight:900;letter-spacing:-.025em">${h}</h3>`;
    if (c.description) html += `<p style="margin-top:.75rem;color:#d1d5db;font-size:1rem;line-height:1.625;max-width:42rem;margin-left:auto;margin-right:auto">${c.description}</p>`;
    html += `<div style="margin-top:2rem;display:flex;justify-content:center"><a href="${c.url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;gap:.75rem;padding:1.25rem 2.5rem;border-radius:1rem;font-weight:900;font-size:1rem;text-transform:uppercase;letter-spacing:.1em;color:#fff;background:linear-gradient(to bottom,#22c55e,#15803d);border:1px solid rgba(74,222,128,.5);text-decoration:none;box-shadow:0 18px 44px rgba(21,128,61,.56)">${c.text}</a></div>`;
    html += '<p style="margin-top:.75rem;font-size:.75rem;color:#6b7280">Opens in a new tab</p>';
    html += '</div></div></div>';
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
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

interface TopBannerCampaign {
  _id: string;
  creative: string;
  destinationUrl: string;
  slot: string;
}

interface ArticleClientProps {
  article: Article;
  relatedArticles?: RelatedArticle[];
  topGroups?: TopGroup[];
  topBannerCampaigns?: TopBannerCampaign[];
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

// Top Groups Widget (sidebar - SEO + internal links to groups)
function TopGroupsWidget({ groups }: { groups: TopGroup[] }) {
  if (!groups || groups.length === 0) return null;

  return (
    <div className="rounded-2xl p-6 mb-8 border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-[#b31b1b]">🔥</span> Trending Groups
        </h3>
        <Link href="/groups" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
          View All
        </Link>
      </div>
      <div className="space-y-4">
        {groups.map((group, idx) => (
          <Link
            key={group._id}
            href={`/${group.slug}`}
            className="flex items-center gap-3 group p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
              <img
                src={(group.image && typeof group.image === 'string' && group.image.startsWith('https://')) ? group.image : PLACEHOLDER_IMAGE_URL}
                alt={group.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL; }}
              />
              <div className="absolute top-0 left-0 bg-[#b31b1b] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg">
                #{idx + 1}
              </div>
            </div>
            <div className="flex-grow min-w-0">
              <h4 className="text-sm font-semibold text-gray-700 group-hover:text-[#b31b1b] transition-colors truncate">
                {group.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-400">
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

export default function ArticleClient({ article, relatedArticles = [], topGroups = [], topBannerCampaigns = [] }: ArticleClientProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [tableOfContents, setTableOfContents] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1]);

  // Admin inline edit state
  const [showEdit, setShowEdit] = useState(false);
  const [editContent, setEditContent] = useState(article.content);
  const [editSaving, setEditSaving] = useState(false);
  const [liveContent, setLiveContent] = useState(article.content);
  const [editVideoBlocks, setEditVideoBlocks] = useState(article.videoBlocks || []);
  const [editCtaBlocks, setEditCtaBlocks] = useState(article.ctaBlocks || []);

  useEffect(() => {
    setIsHydrated(true);
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) setUsername(storedUsername);
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    }
  }, []);

  const openEditModal = async () => {
    setShowEdit(true);
    const fresh = await getArticleBlocks(article._id);
    setEditContent(fresh.content);
    setEditVideoBlocks(fresh.videoBlocks);
    setEditCtaBlocks(fresh.ctaBlocks);
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      const token = localStorage.getItem('token') || '';
      await updateArticle(token, article._id, {
        title: article.title,
        content: editContent,
        status: article.status,
        featuredImage: article.featuredImage,
        excerpt: article.excerpt,
        tags: article.tags,
        videoBlocks: editVideoBlocks,
        ctaBlocks: editCtaBlocks,
      });
      setLiveContent(editContent);
      setShowEdit(false);
    } catch { alert('Failed to save'); }
    finally { setEditSaving(false); }
  };

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
  }, [liveContent]);

  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const onLinkClick = useCallback((href: string) => {
    if (href && /^https?:\/\//.test(href)) {
      trackArticleClick(article.slug, href, 'link');
    }
  }, [article.slug]);

  const onCtaClick = useCallback((href: string) => {
    trackArticleClick(article.slug, href, 'cta');
  }, [article.slug]);

  const markdownComponents = useMemo(() => ({
    h1: ({ children }: any) => <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-12 mb-6">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-4">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-xl md:text-2xl font-bold text-gray-900 mt-8 mb-4">{children}</h3>,
    p: ({ children }: any) => <p className="text-gray-700 leading-relaxed mb-6">{children}</p>,
    a: ({ href, children }: any) => (
      <a
        href={href}
        target={href && /^https?:\/\//.test(href) ? '_blank' : undefined}
        rel={href && /^https?:\/\//.test(href) ? 'noopener noreferrer' : undefined}
        className="text-[#b31b1b] hover:text-[#d42020] underline decoration-2 underline-offset-4 transition-colors font-medium"
        onClick={() => onLinkClick(href || '')}
      >
        {children}
      </a>
    ),
    ul: ({ children }: any) => <ul className="list-disc list-outside ml-6 mb-6 text-gray-700 space-y-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-outside ml-6 mb-6 text-gray-700 space-y-2">{children}</ol>,
    li: ({ children }: any) => <li className="pl-2">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="bg-gray-50 border-l-4 border-[#b31b1b] p-6 rounded-r-xl italic text-gray-600 my-8">
        {children}
      </blockquote>
    ),
    img: ({ src, alt }: any) => (
      <div className="my-8 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
        <img src={src} alt={alt as string} className="w-full h-auto" />
        {alt && <p className="text-center text-sm text-gray-500 mt-2 p-2">{alt}</p>}
      </div>
    ),
    code: ({ children }: any) => (
      <code className="bg-gray-100 text-[#b31b1b] px-1.5 py-0.5 rounded font-mono text-sm">{children}</code>
    ),
    pre: ({ children }: any) => {
      const child = Array.isArray(children) ? children[0] : children;
      const cls = child?.props?.className || '';
      const lang = typeof cls === 'string' ? cls.replace(/^language-/, '') : '';
      const codeContent = String(child?.props?.children ?? '');

      if (lang === 'cta') {
        const lines = codeContent.trim().split('\n');
        let url = '', text = '', description = '', headline = '';
        for (const line of lines) {
          const idx = line.indexOf(':');
          if (idx === -1) continue;
          const key = line.slice(0, idx).trim().toLowerCase();
          const val = line.slice(idx + 1).trim();
          if (key === 'url') url = val;
          else if (key === 'text') text = val;
          else if (key === 'description') description = val;
          else if (key === 'headline' || key === 'title') headline = val;
        }
        if (!url || !text) return null;
        const heading = headline || 'Ready to continue?';
        return (
          <div className="not-prose my-12">
            <div className="mx-auto max-w-3xl relative overflow-hidden rounded-3xl border border-[#b31b1b]/20 bg-gradient-to-br from-[#140909] via-[#0f0f0f] to-[#090909]">
              <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-[#b31b1b]/15 blur-[110px] pointer-events-none" />
              <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-[#b31b1b]/10 blur-[95px] pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4d4d]/40 to-transparent" />

              <div className="relative z-10 px-7 py-10 md:px-12 md:py-12 text-center">
                <h3 className="text-white text-2xl md:text-3xl font-black tracking-tight">
                  {heading}
                </h3>

                {description && (
                  <p className="mt-3 text-gray-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                    {description}
                  </p>
                )}

                <div className="mt-8 flex justify-center">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); onCtaClick(url); }}
                    style={{ textDecoration: 'none', pointerEvents: 'auto', cursor: 'pointer' }}
                    className="group inline-flex w-full sm:w-auto sm:min-w-[340px] max-w-[520px] items-center justify-center gap-3 px-10 py-5 rounded-2xl font-black text-base uppercase tracking-[0.1em] text-white
                      bg-gradient-to-b from-[#22c55e] to-[#15803d]
                      border border-[#4ade80]/50
                      ring-1 ring-white/10
                      hover:from-[#16a34a] hover:to-[#166534]
                      shadow-[0_18px_44px_rgba(21,128,61,0.56),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_24px_54px_rgba(21,128,61,0.68),inset_0_1px_0_rgba(255,255,255,0.3)]
                      transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.985]"
                  >
                    {text}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </a>
                </div>

                <p className="mt-3 text-xs text-gray-500">Opens in a new tab</p>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b31b1b]/30 to-transparent" />
            </div>
          </div>
        );
      }

      if (lang === 'video') {
        const lines = codeContent.trim().split('\n');
        let url = '', caption = '', link = '', linktext = '';
        for (const line of lines) {
          const idx = line.indexOf(':');
          if (idx === -1) continue;
          const key = line.slice(0, idx).trim().toLowerCase();
          const val = line.slice(idx + 1).trim();
          if (key === 'url') url = val;
          else if (key === 'caption') caption = val;
          else if (key === 'link') link = val;
          else if (key === 'linktext') linktext = val;
        }
        if (!url) return null;
        const ctaLabel = linktext || 'Check it out';
        return (
          <div className="not-prose my-8">
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg" style={{ maxWidth: '400px', margin: '0 auto' }}>
              <video
                src={url}
                autoPlay muted loop playsInline
                preload="metadata"
                className="w-full"
                style={{ aspectRatio: '9/16', objectFit: 'cover', background: '#000' }}
              />
            </div>
            {link && (
              <div className="flex justify-center mt-4">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onCtaClick(link)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-b from-[#22c55e] to-[#15803d] border border-[#4ade80]/50 hover:from-[#16a34a] hover:to-[#166534] shadow-[0_12px_30px_rgba(21,128,61,0.4)] hover:shadow-[0_16px_36px_rgba(21,128,61,0.5)] transition-all duration-200"
                >
                  {caption && <span className="text-white/80">{caption} —</span>}
                  <span>{ctaLabel}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 opacity-60"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </a>
              </div>
            )}
            {caption && !link && (
              <p className="text-center text-sm text-gray-500 mt-3">{caption}</p>
            )}
          </div>
        );
      }

      return <pre className="bg-gray-50 p-6 rounded-xl overflow-x-auto my-8 border border-gray-200 text-gray-800">{children}</pre>;
    },
  }), [onLinkClick, onCtaClick]);

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-[#b31b1b] selection:text-white">
      <ReadingProgress />
      {isHydrated ? (
        <Navbar username={username} setUsername={setUsername} />
      ) : (
        <div className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0d0d0d]/95 backdrop-blur-md h-[73px]" />
      )}

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
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-400" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
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
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-gray-900 drop-shadow-sm">
                {article.title}
              </h1>
              <div className="flex items-center gap-6 text-gray-500 text-sm md:text-base">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#b31b1b] flex items-center justify-center text-white font-bold">
                    {((article.author?.username || '').toLowerCase() === 'erogram' ? 'Enzo Gonsalves' : (article.author?.username || 'Enzo Gonsalves'))[0]?.toUpperCase() || 'E'}
                  </div>
                  <span className="font-medium text-gray-700">{(article.author?.username || '').toLowerCase() === 'erogram' ? 'Enzo Gonsalves' : (article.author?.username || 'Enzo Gonsalves')}</span>
                </div>
                <span>•</span>
                <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span>•</span>
                <span>{Math.ceil(liveContent.length / 1000)} min read</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Top banner: same size as Groups/Bots, minimal spacing */}
        <div className="w-full mb-3">
          <HeaderBanner campaigns={topBannerCampaigns} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Main Content */}
          <div className="lg:col-span-8">
            <div className="prose prose-lg md:prose-xl max-w-none">
              {/* Excerpt */}
              {article.excerpt && (
                <p className="lead text-2xl md:text-3xl text-gray-500 font-light mb-12 border-l-4 border-[#b31b1b] pl-6 italic">
                  {article.excerpt}
                </p>
              )}

              {/* Dedicated article media/CTA blocks — after_intro position */}
              {/* Content */}
              <div ref={contentRef}>
                <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                  {liveContent}
                </ReactMarkdown>
              </div>

            </div>

            {/* In-Content CTA (Bottom) */}
            <JoinCTABanner />

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-20 pt-12 border-t border-gray-200">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Read Next</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {relatedArticles.map((item) => (
                    <Link key={item._id} href={`/articles/${item.slug}`} className="group">
                      <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-4 relative">
                        <img
                          src={item.featuredImage || PLACEHOLDER_IMAGE_URL}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#b31b1b] transition-colors mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2">{item.excerpt}</p>
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
                <div className="rounded-2xl p-6 border border-gray-200 bg-gray-50 hidden lg:block">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Table of Contents</h3>
                  <nav className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {tableOfContents.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-all duration-200 ${activeHeading === item.id
                          ? 'bg-[#b31b1b]/10 text-[#b31b1b] font-medium border-l-2 border-[#b31b1b]'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                          } ${item.level === 3 ? 'ml-4' : ''}`}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* Top Groups Widget (sidebar - SEO + internal links) */}
              <TopGroupsWidget groups={topGroups} />

              {/* Newsletter / Join Community Widget */}
              <div className="rounded-2xl p-8 text-center border border-gray-200 bg-gradient-to-b from-[#b31b1b]/5 to-white">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Join the Community</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Get access to exclusive groups and premium content.
                </p>
                <Link
                  href="/login"
                  className="block w-full py-3 bg-[#b31b1b] text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                >
                  Sign Up Now
                </Link>
              </div>

            </div>
          </aside>
        </div>
      </main>

      <Footer />

      {isAdmin && (
        <button
          onClick={openEditModal}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-[#b31b1b] hover:bg-[#c42b2b] text-white text-sm font-bold rounded-xl shadow-xl shadow-[#b31b1b]/30 transition-all hover:scale-105"
        >
          ✏ Edit Article
        </button>
      )}

      {/* ── Admin Inline Edit Modal ── */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowEdit(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                <h3 className="text-gray-900 font-bold text-lg">Edit Article</h3>
                <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-900 text-xl leading-none">&times;</button>
              </div>

              <div className="flex-1 overflow-auto">
                {/* Video & CTA blocks — FIRST thing you see */}
                <div className="px-6 py-4 border-b border-gray-200 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">Media & CTAs ({editVideoBlocks.length + editCtaBlocks.length})</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditVideoBlocks(prev => [...prev, { url: '', caption: '', link: '', linktext: '', position: 'after_intro' }])}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg font-bold">+ Video</button>
                      <button type="button" onClick={() => setEditCtaBlocks(prev => [...prev, { url: '', text: '', headline: '', description: '', position: 'after_intro' }])}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg font-bold">+ CTA</button>
                    </div>
                  </div>

                  {editVideoBlocks.map((v: any, i: number) => (
                    <div key={`v-${i}`} className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600">🎬 Video {i + 1} — <span className="uppercase">{v.position === 'after_intro' ? 'Top' : v.position === 'middle' ? 'Mid' : 'Bottom'}</span></span>
                        <button type="button" onClick={() => setEditVideoBlocks(prev => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-500 font-bold">✕ Delete</button>
                      </div>
                      {v.url && /\.(mp4|webm|ogg)(\?|$)/i.test(v.url) && (
                        <video src={v.url} className="w-full max-h-[120px] rounded-lg bg-black object-contain" preload="metadata" />
                      )}
                      <input placeholder="Video URL *" value={v.url} onChange={e => { const b = [...editVideoBlocks]; b[i] = { ...b[i], url: e.target.value }; setEditVideoBlocks(b); }}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs outline-none" />
                      <div className="flex gap-2">
                        <input placeholder="CTA link" value={v.link || ''} onChange={e => { const b = [...editVideoBlocks]; b[i] = { ...b[i], link: e.target.value }; setEditVideoBlocks(b); }}
                          className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs outline-none" />
                        <input placeholder="Button text" value={v.linktext || ''} onChange={e => { const b = [...editVideoBlocks]; b[i] = { ...b[i], linktext: e.target.value }; setEditVideoBlocks(b); }}
                          className="w-32 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs outline-none" />
                        <select value={v.position} onChange={e => { const b = [...editVideoBlocks]; b[i] = { ...b[i], position: e.target.value }; setEditVideoBlocks(b); }}
                          className="p-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs outline-none">
                          <option value="after_intro">Top</option><option value="middle">Middle</option><option value="end">Bottom</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  {editCtaBlocks.map((c: any, i: number) => (
                    <div key={`c-${i}`} className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-green-600">🔗 CTA {i + 1} — <span className="uppercase">{c.position === 'after_intro' ? 'Top' : c.position === 'middle' ? 'Mid' : 'Bottom'}</span></span>
                        <button type="button" onClick={() => setEditCtaBlocks(prev => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-500 font-bold">✕ Delete</button>
                      </div>
                      {c.text && (
                        <div className="bg-gradient-to-br from-[#140909] to-[#090909] rounded-lg p-3 text-center">
                          <p className="text-white text-xs font-bold">{c.headline || 'Ready to continue?'}</p>
                          <span className="inline-block mt-1 px-3 py-1 rounded text-[10px] font-bold text-white bg-green-600">{c.text}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input placeholder="URL *" value={c.url} onChange={e => { const b = [...editCtaBlocks]; b[i] = { ...b[i], url: e.target.value }; setEditCtaBlocks(b); }}
                          className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs outline-none" />
                        <input placeholder="Button text *" value={c.text} onChange={e => { const b = [...editCtaBlocks]; b[i] = { ...b[i], text: e.target.value }; setEditCtaBlocks(b); }}
                          className="w-32 p-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs outline-none" />
                        <select value={c.position} onChange={e => { const b = [...editCtaBlocks]; b[i] = { ...b[i], position: e.target.value }; setEditCtaBlocks(b); }}
                          className="p-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs outline-none">
                          <option value="after_intro">Top</option><option value="middle">Middle</option><option value="end">Bottom</option>
                        </select>
                      </div>
                      <input placeholder="Headline" value={c.headline || ''} onChange={e => { const b = [...editCtaBlocks]; b[i] = { ...b[i], headline: e.target.value }; setEditCtaBlocks(b); }}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs outline-none" />
                    </div>
                  ))}
                </div>

                <ArticleEditor
                  content={editContent}
                  onChange={setEditContent}
                />
              </div>

              <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
                <button
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="px-5 py-2.5 bg-[#b31b1b] hover:bg-[#c42b2b] text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
