'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { EditorialMasthead, EditorialFooter } from '../EditorialChrome';
import NewsletterSignup from '../NewsletterSignup';
import BlogCardItem from '../BlogCard';
import BlogComments from './BlogComments';
import type { ArticleCommentData } from '@/lib/actions/articleComments';
import type { BlogArticleFull, BlogCard } from '@/lib/actions/blog';
import { BLOG_CATEGORY_MAP } from '@/lib/blog/categories';
import { trackArticleClick } from '@/lib/actions/articleTracking';

function fmtFullDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Strategic in-content internal links → flow ranking power to the money hubs.
// First eligible occurrence of each phrase is linked once per article. We skip
// fenced blocks (CTA/video), headings, list/TOC bullets, and lines that already
// contain a link (so advertiser links and the TOC are never touched).
const INTERNAL_LINK_TARGETS: { url: string; re: RegExp }[] = [
  { url: '/ainsfw', re: /\bAI NSFW tools\b|\bAI NSFW\b|\bAI porn generator\b|\bAI girlfriend(?:s| chat| chatbot)?\b|\bAI companion(?:s)?\b/i },
  { url: '/bots', re: /\bNSFW Telegram bots\b|\bTelegram bots\b|\bcompanion bots\b/i },
  { url: '/best-telegram-groups', re: /\bNSFW Telegram groups\b|\bTelegram groups\b/i },
  { url: '/best-onlyfans-accounts', re: /\bOnlyFans (?:creators|accounts)\b/i },
];

function injectInternalLinks(content: string): string {
  const lines = content.split('\n');
  const used = new Set<string>();
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;          // headings
    if (/^[-*]\s/.test(trimmed)) continue;          // list / TOC bullets
    if (line.includes('](')) continue;              // already has a link (incl. advertiser)
    for (const t of INTERNAL_LINK_TARGETS) {
      if (used.has(t.url)) continue;
      const m = t.re.exec(line);
      if (!m) continue;
      lines[i] = line.slice(0, m.index) + `[${m[0]}](${t.url})` + line.slice(m.index + m[0].length);
      used.add(t.url);
      break; // at most one injected link per line
    }
  }
  return lines.join('\n');
}

// Category-aware "Related on Erogram" — keyword-rich internal links to the hubs
// that actually convert. Defaults to the adult-entertainment set.
const RELATED_EROGRAM: Record<string, { label: string; href: string; sub: string }[]> = {
  'ai-nsfw': [
    { label: 'Top AI NSFW Tools', href: '/ainsfw', sub: 'AI girlfriends, generators & undress bots' },
    { label: 'AI NSFW Telegram Groups', href: '/best-telegram-groups/ai nsfw', sub: 'The most active NSFW AI channels' },
    { label: 'NSFW Telegram Bots', href: '/bots', sub: 'AI companion & chat bots' },
  ],
  'telegram-groups-bots': [
    { label: 'Best NSFW Telegram Groups', href: '/best-telegram-groups', sub: 'Curated by category' },
    { label: 'NSFW Telegram Bots', href: '/bots', sub: 'AI & interactive Telegram bots' },
    { label: 'Top AI NSFW Tools', href: '/ainsfw', sub: 'The new wave of AI adult tools' },
  ],
  'onlyfans-creators': [
    { label: 'Best OnlyFans Accounts', href: '/best-onlyfans-accounts', sub: 'Ranked by category' },
    { label: 'OnlyFans Search', href: '/onlyfanssearch', sub: 'Search 1.8M+ creators' },
    { label: 'Top AI NSFW Tools', href: '/ainsfw', sub: 'AI companions & generators' },
  ],
  'adult-entertainment': [
    { label: 'Best NSFW Telegram Groups', href: '/best-telegram-groups', sub: 'Curated by category' },
    { label: 'Top AI NSFW Tools', href: '/ainsfw', sub: 'AI girlfriends & generators' },
    { label: 'Best OnlyFans Accounts', href: '/best-onlyfans-accounts', sub: 'Ranked by category' },
  ],
};

function VideoBlock({ data, articleSlug }: { data: any; articleSlug: string }) {
  if (!data.url) return null;
  const isDirectVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(data.url);
  const ctaLabel = data.linktext || 'Check it out';
  return (
    <div className="not-prose my-10">
      <div className="rounded-[6px] overflow-hidden border border-black/10 shadow-lg mx-auto" style={{ maxWidth: '400px' }}>
        {isDirectVideo ? (
          <video
            src={data.url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full"
            style={{ aspectRatio: '9 / 16', objectFit: 'cover', background: '#000' }}
          />
        ) : (
          <iframe src={data.url} className="w-full aspect-video" allowFullScreen allow="autoplay; encrypted-media" />
        )}
      </div>
      {data.link ? (
        <div className="mt-4 flex justify-center">
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackArticleClick(articleSlug, data.link, 'cta').catch(() => {})}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-b from-[#22c55e] to-[#15803d] border border-[#4ade80]/50 shadow-[0_12px_30px_rgba(21,128,61,0.4)] hover:-translate-y-0.5 transition-all"
          >
            {data.caption && <span className="text-white/80">{data.caption} —</span>}
            <span>{ctaLabel}</span>
          </a>
        </div>
      ) : (
        data.caption && <p className="text-center text-sm text-[#6f6a63] mt-3">{data.caption}</p>
      )}
    </div>
  );
}

function CtaBlock({ data, articleSlug }: { data: any; articleSlug: string }) {
  if (!data.url || !data.text) return null;
  const heading = data.headline || 'Ready to continue?';
  return (
    <div className="not-prose my-14">
      <div className="mx-auto max-w-3xl relative overflow-hidden rounded-[6px] border border-[#b31b1b]/20 bg-gradient-to-br from-[#140909] via-[#0f0f0f] to-[#090909]">
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-[#b31b1b]/15 blur-[110px] pointer-events-none" />
        <div className="relative z-10 px-7 py-10 md:px-12 md:py-12 text-center">
          <h3 className="text-white text-2xl md:text-3xl font-black tracking-tight">{heading}</h3>
          {data.description && <p className="mt-3 text-gray-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">{data.description}</p>}
          <div className="mt-8 flex justify-center">
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackArticleClick(articleSlug, data.url, 'cta').catch(() => {})}
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-black text-base uppercase tracking-[0.1em] text-white bg-gradient-to-b from-[#22c55e] to-[#15803d] border border-[#4ade80]/50 ring-1 ring-white/10 shadow-[0_18px_44px_rgba(21,128,61,0.56)] hover:-translate-y-0.5 hover:scale-[1.02] transition-all"
            >
              {data.text}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
          <p className="mt-3 text-xs text-gray-500">Opens in a new tab</p>
        </div>
      </div>
    </div>
  );
}

// Parse a fenced block body of "key: value" lines into an object.
function parseFence(codeContent: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of codeContent.trim().split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    out[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return out;
}

// Markdown renderer. Inline ```cta and ```video fences become real components
// at the exact spot the editor placed them (between paragraphs).
function buildMarkdownComponents(articleSlug: string, articleTitle: string) {
  return {
    h1: ({ children, id }: any) => <h2 id={id} className="scroll-mt-24 font-sans font-black text-[1.7rem] sm:text-[2.1rem] leading-[1.15] tracking-tight text-[#0f0c0a] mt-16 mb-5">{children}</h2>,
    h2: ({ children, id }: any) => <h2 id={id} className="scroll-mt-24 font-sans font-black text-[1.55rem] sm:text-[1.9rem] leading-[1.15] tracking-tight text-[#0f0c0a] mt-16 mb-5">{children}</h2>,
    h3: ({ children, id }: any) => <h3 id={id} className="scroll-mt-24 font-sans font-bold text-[1.3rem] sm:text-[1.5rem] tracking-tight text-[#0f0c0a] mt-11 mb-4">{children}</h3>,
    p: ({ children }: any) => <p className="text-[18px] sm:text-[20px] leading-[1.8] text-[#2a2622] mb-7">{children}</p>,
    a: ({ href, children }: any) => {
      const h: string = href || '';
      const linkClass = 'text-[#c0392f] underline decoration-[#c0392f]/40 underline-offset-4 hover:decoration-[#c0392f] transition-colors';
      // In-page jump links (Table of Contents) — smooth scroll to the heading.
      if (h.startsWith('#')) {
        return (
          <a
            href={h}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(decodeURIComponent(h.slice(1)));
              if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', h); }
            }}
            className={linkClass}
          >
            {children}
          </a>
        );
      }
      // External links (advertisers etc.) — new tab + tracked.
      if (/^https?:\/\//.test(h)) {
        return (
          <a href={h} target="_blank" rel="noopener noreferrer" onClick={() => trackArticleClick(articleSlug, h, 'cta').catch(() => {})} className={linkClass}>
            {children}
          </a>
        );
      }
      // Internal Erogram links — client-side nav, keeps link equity on-site.
      return <Link href={h} className={linkClass}>{children}</Link>;
    },
    ul: ({ children }: any) => <ul className="list-disc pl-6 space-y-3 mb-7 text-[#2a2622] text-[18px] sm:text-[20px] leading-[1.75]">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-6 space-y-3 mb-7 text-[#2a2622] text-[18px] sm:text-[20px] leading-[1.75]">{children}</ol>,
    blockquote: ({ children }: any) => <blockquote className="border-l-[3px] border-[#c0392f] pl-6 my-10 text-[19px] sm:text-[22px] leading-[1.6] text-[#4a443d] italic">{children}</blockquote>,
    strong: ({ children }: any) => <strong className="text-[#0f0c0a] font-bold">{children}</strong>,
    img: ({ src, alt }: any) => <img src={src} alt={alt?.trim() ? alt : articleTitle} loading="lazy" className="rounded-[4px] my-8 w-full" referrerPolicy="no-referrer" />,
    code: ({ children }: any) => <code className="bg-black/[0.06] text-[#c0392f] px-1.5 py-0.5 rounded font-mono text-[0.9em]">{children}</code>,
    pre: ({ children }: any) => {
      const child = Array.isArray(children) ? children[0] : children;
      const cls = child?.props?.className || '';
      const lang = typeof cls === 'string' ? cls.replace(/^language-/, '') : '';
      const codeContent = String(child?.props?.children ?? '');
      if (lang === 'cta') {
        const d = parseFence(codeContent);
        return <CtaBlock data={{ url: d.url, text: d.text, description: d.description, headline: d.headline || d.title }} articleSlug={articleSlug} />;
      }
      if (lang === 'video') {
        const d = parseFence(codeContent);
        return <VideoBlock data={{ url: d.url, caption: d.caption, link: d.link, linktext: d.linktext }} articleSlug={articleSlug} />;
      }
      return <pre className="bg-black/[0.04] p-5 rounded-[4px] overflow-x-auto my-8 text-sm">{children}</pre>;
    },
  };
}

function AuthorBio({ author }: { author: BlogArticleFull['author'] }) {
  return (
    <div className="not-prose mt-16 pt-10 border-t border-black/[0.08]">
      <div className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#c0392f] mb-6">About the Author</div>
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-7 rounded-[10px] bg-[#0a0807] text-white p-7 sm:p-8 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)]">
        {author.avatar && (
          <img
            src={author.avatar}
            alt={author.name}
            width={96}
            height={96}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shrink-0 ring-2 ring-white/15"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="flex-1">
          <div className="font-sans font-black text-[20px] text-white leading-tight">{author.name}</div>
          {author.role && (
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#ff6b5e] mt-1">{author.role}</div>
          )}
          {author.bio && (
            <p className="text-[15px] leading-[1.7] text-white/65 mt-3">{author.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BlogArticleClient({
  article,
  related,
  initialComments = [],
}: {
  article: BlogArticleFull;
  related: BlogCard[];
  initialComments?: ArticleCommentData[];
}) {
  const cat = BLOG_CATEGORY_MAP[article.blogCategory];

  const components = useMemo(() => buildMarkdownComponents(article.slug, article.title), [article.slug, article.title]);
  const content = useMemo(() => injectInternalLinks(article.content), [article.content]);
  const relatedHubs = RELATED_EROGRAM[article.blogCategory] || RELATED_EROGRAM['adult-entertainment'];

  return (
    <div className="min-h-screen bg-white text-[#0f0c0a]">
      {/* Dark masthead stays dark */}
      <EditorialMasthead />

      <article className="max-w-[720px] mx-auto px-6 sm:px-8 pt-14 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#a09890] mb-10">
          <Link href="/blog" className="hover:text-[#c0392f] transition-colors">Blog</Link>
          {cat && (
            <>
              <span className="text-[#d4cec9]">/</span>
              <Link href={`/blog/category/${cat.slug}`} className="hover:text-[#c0392f] transition-colors">{cat.name}</Link>
            </>
          )}
        </nav>

        {/* Eyebrow + title */}
        <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#c0392f] mb-4">{cat?.eyebrow || 'Feature'}</div>
        <h1 className="font-sans font-black text-[2.2rem] sm:text-[3rem] leading-[1.06] tracking-tight text-[#0f0c0a] mb-7">{article.title}</h1>

        {/* Meta — byline with author avatar */}
        <div className="flex items-center gap-3 pb-9 mb-2 border-b border-black/[0.08]">
          {article.author?.avatar && (
            <img
              src={article.author.avatar}
              alt={article.author.name}
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-black/10"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="flex flex-col gap-0.5">
            <span className="font-sans font-bold text-[14px] text-[#0f0c0a] leading-none">
              By {article.author?.name || article.authorName}
            </span>
            <span className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-[#a09890]">
              {article.author?.role && (
                <>
                  <span>{article.author.role}</span>
                  <span className="text-[#d4cec9]">·</span>
                </>
              )}
              <span>{article.readMinutes} min read</span>
              {article.publishedAt && (
                <>
                  <span className="text-[#d4cec9]">·</span>
                  <span>{fmtFullDate(article.publishedAt)}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Featured image */}
        {article.featuredImage && (
          <div className="my-10 rounded-[4px] overflow-hidden">
            <img src={article.featuredImage} alt={article.title} fetchPriority="high" className="w-full" referrerPolicy="no-referrer" />
          </div>
        )}

        {/* Body — full content rendered in one pass; inline CTA/video fences
            become components exactly where the editor placed them. */}
        <div className="mt-4">
          <ReactMarkdown components={components} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>{content}</ReactMarkdown>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-14 pt-8 border-t border-black/[0.08]">
            {article.tags.map((t) => (
              <span key={t} className="text-[11px] tracking-[0.14em] uppercase text-[#6a6258] px-3 py-1.5 rounded-full border border-black/[0.1]">{t}</span>
            ))}
          </div>
        )}

        {/* Author bio — magazine-style E-E-A-T byline card */}
        {article.author && (
          <AuthorBio author={article.author} />
        )}

        {/* Comments — moderated discussion (engagement signal for Google) */}
        <BlogComments slug={article.slug} initialComments={initialComments} />

        {/* Explore on Erogram — internal links to the hubs that convert (after the conversation) */}
        <div className="not-prose mt-16 pt-10 border-t border-black/[0.08]">
          <div className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#c0392f] mb-5">Explore on Erogram</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {relatedHubs.map((h) => (
              <Link
                key={h.href}
                href={h.href}
                className="group flex flex-col rounded-[6px] border border-black/[0.1] hover:border-[#c0392f]/40 bg-[#faf8f6] hover:bg-white px-5 py-4 transition-colors"
              >
                <span className="font-sans font-bold text-[15px] text-[#0f0c0a] group-hover:text-[#c0392f] transition-colors">{h.label}</span>
                <span className="text-[12px] text-[#6a6258] mt-1">{h.sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </article>

      {/* Related — on a light warm gray strip */}
      {related.length > 0 && (
        <section className="bg-[#f4f1ee] py-20 px-6 sm:px-8">
          <div className="max-w-[1180px] mx-auto">
            <div className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#c0392f] mb-8">Keep Reading</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8">
              {related.map((a, i) => <BlogCardItem key={a._id} article={a} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter — full bleed dark band */}
      <NewsletterSignup source={`article:${article.slug}`} />

      <div style={{ background: 'linear-gradient(to bottom, #1e0808 0%, #0a0807 100%)' }}>
        <EditorialFooter />
      </div>
    </div>
  );
}
