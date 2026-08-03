import Link from 'next/link';
import type { BlogCard } from '@/lib/actions/blog';
import { BLOG_CATEGORY_MAP } from '@/lib/blog/categories';
import { formatDate } from '@/lib/i18n/date';
import type { Locale } from '@/lib/i18n/config';

const PLACEHOLDER_TINTS = [
  'linear-gradient(135deg, #2a0d1a 0%, #1a0710 55%, #0c0508 100%)',
  'linear-gradient(135deg, #2a1606 0%, #1c0e04 55%, #0c0703 100%)',
  'linear-gradient(135deg, #160f2a 0%, #0f0a1c 55%, #07060c 100%)',
  'linear-gradient(135deg, #0d1a22 0%, #081016 55%, #050a0c 100%)',
];

export default function HomeBlogCard({
  article,
  href,
  locale,
  index = 0,
}: {
  article: BlogCard;
  href: string;
  locale: Locale;
  index?: number;
}) {
  const cat = BLOG_CATEGORY_MAP[article.blogCategory];
  const eyebrow = cat?.eyebrow || 'Feature';
  const tint = PLACEHOLDER_TINTS[index % PLACEHOLDER_TINTS.length];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_10px_28px_-14px_rgba(0,0,0,0.55)]">
      <Link href={href} className="flex flex-1 flex-col">
        <div
          className="relative aspect-[16/10] w-full shrink-0 overflow-hidden"
          style={{ background: tint }}
        >
          {article.featuredImage ? (
            <img
              src={article.featuredImage}
              alt={article.title}
              width={640}
              height={400}
              className="absolute inset-0 h-full w-full object-cover"
              loading={index < 3 ? 'eager' : 'lazy'}
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 52%, rgba(0,0,0,0.28) 100%)' }}
          />
        </div>

        <div className="flex flex-1 flex-col px-5 pb-4 pt-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#c0392f]">
            {eyebrow}
          </p>
          <h3 className="mb-3 line-clamp-2 font-sans text-[1.05rem] font-bold leading-[1.3] tracking-tight text-[#0f0c0a]">
            {article.title}
          </h3>
          {article.excerpt ? (
            <p className="line-clamp-3 flex-1 text-[13px] leading-[1.65] text-[#6a6258]">
              {article.excerpt}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 bg-[#16110f] px-5 py-3.5">
          <span className="flex min-w-0 items-center gap-2">
            {article.authorAvatar ? (
              <img
                src={article.authorAvatar}
                alt={article.authorName}
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-white/20"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <span className="truncate text-[10px] uppercase tracking-[0.2em] text-white/85">
              {article.authorName}
            </span>
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-white/45 tabular-nums">
            {article.readMinutes} min
            {article.publishedAt ? ` · ${formatDate(article.publishedAt, locale)}` : ''}
          </span>
        </div>
      </Link>
    </article>
  );
}
