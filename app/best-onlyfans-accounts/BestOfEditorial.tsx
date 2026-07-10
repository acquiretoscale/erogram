'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PLUM = '#2B1B28';
const MUTED = '#6B6568';

/** Inline **bold** for hero intro (single paragraph). */
export function BestOfHeroIntro({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-[15px] leading-[1.75] max-w-2xl" style={{ color: MUTED }}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} style={{ color: PLUM, fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

const heading =
  (Tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6', size: string, mt: string) =>
  ({ children }: { children?: React.ReactNode }) =>
    React.createElement(
      Tag,
      {
        className: `font-[family-name:var(--font-baloo)] font-extrabold tracking-tight ${size} ${mt} mb-2`,
        style: { color: PLUM },
      },
      children,
    );

/** Longform editorial block — H2 through H6, bold keywords, editorial styling. */
export function BestOfEditorialBody({ markdown }: { markdown: string }) {
  return (
    <article
      className="best-of-seo-body prose-like mt-14 pt-12 border-t"
      style={{ borderColor: 'rgba(43,27,40,0.12)' }}
      aria-label="Editorial ranking guide"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: heading('h2', 'text-[1.75rem] sm:text-[2rem]', 'mt-10 first:mt-0'),
          h3: heading('h3', 'text-[1.35rem] sm:text-[1.5rem]', 'mt-8'),
          h4: heading('h4', 'text-[1.15rem] sm:text-[1.25rem]', 'mt-6'),
          h5: heading('h5', 'text-[1rem] sm:text-[1.1rem]', 'mt-5'),
          h6: heading('h6', 'text-[0.95rem]', 'mt-4'),
          p: ({ children }) => (
            <p className="text-[15px] leading-[1.75] mb-4" style={{ color: MUTED }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: PLUM, fontWeight: 700 }}>{children}</strong>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
