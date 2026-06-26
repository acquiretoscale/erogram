'use client';

import Link from 'next/link';
import type { BlogCard as BlogCardData } from '@/lib/actions/blog';
import { BLOG_CATEGORY_MAP } from '@/lib/blog/categories';

const PLACEHOLDER_TINTS = [
  'linear-gradient(135deg, #2a0d1a 0%, #1a0710 55%, #0c0508 100%)',
  'linear-gradient(135deg, #2a1606 0%, #1c0e04 55%, #0c0703 100%)',
  'linear-gradient(135deg, #160f2a 0%, #0f0a1c 55%, #07060c 100%)',
  'linear-gradient(135deg, #0d1a22 0%, #081016 55%, #050a0c 100%)',
];

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

export default function BlogCardItem({ article, index = 0 }: { article: BlogCardData; index?: number }) {
  const cat = BLOG_CATEGORY_MAP[article.blogCategory];
  const eyebrow = cat?.eyebrow || 'Feature';
  const tint = PLACEHOLDER_TINTS[index % PLACEHOLDER_TINTS.length];

  return (
    <article className="group flex flex-col rounded-[10px] overflow-hidden bg-white border border-black/[0.08] hover:border-[#c0392f]/30 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] transition-all duration-300">
      <Link href={`/blog/${article.slug}`} className="flex flex-col flex-1">
        {/* Image */}
        <div
          className="relative w-full aspect-[16/10] overflow-hidden shrink-0"
          style={{ background: tint }}
        >
          {article.featuredImage ? (
            <img
              src={article.featuredImage}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3) 100%)' }} />
        </div>

        {/* Text card */}
        <div className="flex-1 flex flex-col px-5 pt-5 pb-0 bg-white">
          {/* Eyebrow */}
          <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#c0392f] mb-3">
            {eyebrow}
          </div>

          {/* Title — bold sans, modern */}
          <h3 className="font-sans font-bold text-[1.05rem] leading-[1.3] tracking-tight text-[#0f0c0a] mb-3 transition-colors group-hover:text-[#c0392f]">
            {article.title}
          </h3>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-[13px] leading-[1.65] text-[#6a6258] mb-5 line-clamp-2 flex-1">
              {article.excerpt}
            </p>
          )}
        </div>

        {/* Dark author/meta bar — anchors the byline against the white card */}
        <div className="mt-auto flex items-center justify-between gap-2 px-5 py-3.5 bg-[#16110f]">
          <span className="flex items-center gap-2 min-w-0">
            {article.authorAvatar && (
              <img
                src={article.authorAvatar}
                alt={article.authorName}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-white/20"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/85 truncate">
              {article.authorName}
            </span>
          </span>
          <span className="flex items-center gap-2.5 text-[10px] tracking-[0.2em] uppercase text-white/45 tabular-nums shrink-0">
            {article.commentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[#ff6b5e]" title={`${article.commentCount} comments`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {article.commentCount}
              </span>
            )}
            <span>{article.readMinutes} MIN · {fmtDate(article.publishedAt)}</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
