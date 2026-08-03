'use client';

import { useState } from 'react';
import Image from 'next/image';
import { EditorialMasthead, EditorialFooter } from '@/app/blog/EditorialChrome';
import ErogramDevilGirlFooter from '@/components/ErogramDevilGirlFooter';
import PartnershipStats from './PartnershipStats';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';

const CREAM = '#F7F4EC';
const NAVY = '#0a1628';
const NAVY_LIGHT = '#1a2d4a';
const PLUM = '#2B1B28';
const INK = '#FDFDFD';
const BODY = 'rgba(247,244,236,0.78)';
const BODY_ON_LIGHT = '#4a4048';
const BORDER = 'rgba(43,27,40,0.12)';
const CARD_BG = 'linear-gradient(165deg, #152238 0%, #0a1628 100%)';
const CARD_BORDER = 'rgba(147,197,253,0.14)';
const ACCENT = '#60a5fa';

/** Horizontal banner badges — native 1024×347 at 160px wide. */
const BANNER_BADGE_WIDTH = 160;
const BANNER_BADGE_HEIGHT = 54;

/** Square icon badges — native 1000×1000 at 160px. */
const ICON_BADGE_SIZE = 160;

const BADGES = [
  {
    id: 'black',
    label: 'Black badge',
    src: '/assets/featured-on-erogram-badge-black.png',
    width: BANNER_BADGE_WIDTH,
    height: BANNER_BADGE_HEIGHT,
    previewBg: CREAM,
  },
  {
    id: 'blue',
    label: 'Blue badge',
    src: '/assets/featured-on-erogram-badge-blue.png',
    width: BANNER_BADGE_WIDTH,
    height: BANNER_BADGE_HEIGHT,
    previewBg: CREAM,
  },
  {
    id: 'icon-light',
    label: 'Icon badge (light)',
    src: '/assets/featured-on-erogram-badge-icon-light.png',
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    previewBg: CREAM,
  },
  {
    id: 'icon-dark',
    label: 'Icon badge (dark)',
    src: '/assets/featured-on-erogram-badge-icon-dark.png',
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    previewBg: CREAM,
  },
] as const;

function buildEmbedCode(src: string, width: number, height: number) {
  const url = `${CANONICAL_BASE}${src}`;
  return `<a href="${CANONICAL_BASE}" target="_blank" rel="noopener noreferrer">
  <img src="${url}" alt="Featured on EROGRAM" width="${width}" height="${height}" style="display:block;border:0;width:${width}px;height:${height}px;" />
</a>`;
}

const BENEFITS = [
  'Permanent BOOST listing in the EROGRAM directory (regular price: $197).',
  "Dofollow backlink to strengthen your website's authority.",
  'Additional mentions across guides, rankings, and category pages whenever relevant.',
  'Exposure to a growing audience actively searching for premium adult products and services.',
] as const;

const APPLICANTS = [
  'Existing EROGRAM clients looking for permanent extra exposure.',
  'AI NSFW platforms and companion apps',
  'Creator economy platforms and subscription services',
  'VR and immersive adult experiences',
  'Adult dating platforms',
  'Adult communities and forums',
  'Adult blogs, review websites, and directories',
  'Established adult technology companies',
] as const;

function SectionCard({
  eyebrow,
  title,
  children,
  className = '',
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 sm:p-8 shadow-[0_24px_60px_-24px_rgba(43,27,40,0.45)] ${className}`}
      style={{ background: CARD_BG, borderColor: CARD_BORDER, color: CREAM }}
    >
      {eyebrow && (
        <div className="text-[10px] font-bold tracking-[0.3em] uppercase mb-3" style={{ color: ACCENT }}>
          {eyebrow}
        </div>
      )}
      <h2 className="font-[family-name:var(--font-baloo)] font-extrabold text-[1.65rem] sm:text-[2rem] leading-tight tracking-tight mb-5" style={{ color: CREAM }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BadgeBlock({
  label,
  src,
  width,
  height,
  previewBg,
}: {
  label: string;
  src: string;
  width: number;
  height: number;
  previewBg: string;
}) {
  const embedCode = buildEmbedCode(src, width, height);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border overflow-hidden flex flex-col min-w-0 h-full" style={{ borderColor: BORDER, backgroundColor: CREAM }}>
      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-1.5 border-b truncate" style={{ color: PLUM, borderColor: BORDER }}>
        {label}
      </p>
      <div className="flex justify-center items-center py-2 px-1.5" style={{ backgroundColor: previewBg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Featured on EROGRAM"
          width={width}
          height={height}
          style={{ display: 'block', width: `${width}px`, height: `${height}px` }}
        />
      </div>
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        <pre
          className="text-[7px] sm:text-[8px] leading-snug overflow-x-auto whitespace-pre-wrap break-all rounded-lg p-2 font-mono max-h-[64px] overflow-y-auto"
          style={{ color: BODY_ON_LIGHT, backgroundColor: INK, border: `1px solid ${BORDER}` }}
        >
          {embedCode}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="w-full inline-flex items-center justify-center text-[8px] sm:text-[9px] font-bold tracking-[0.18em] uppercase rounded-full px-2 py-1.5 transition-opacity hover:opacity-90"
          style={{ color: CREAM, backgroundColor: NAVY }}
        >
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
    </div>
  );
}

export default function PartnershipClient({
  aiNsfwCount,
  groupsAndBotsCount,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
}) {
  return (
    <div className="min-h-screen font-[family-name:var(--font-baloo)]" style={{ backgroundColor: CREAM, color: PLUM }}>
      <EditorialMasthead />

      <main className="max-w-[900px] mx-auto px-6 sm:px-8">
        <section className="pt-6 pb-6">
          <div
            className="w-full overflow-hidden rounded-2xl border bg-black"
            style={{ borderColor: BORDER, boxShadow: '0 30px 80px -30px rgba(43,27,40,0.2)' }}
          >
            <Image
              src="/assets/erogram-discovery-hub-banner.webp"
              alt="EROGRAM Adult Entertainment Discovery Hub"
              width={1024}
              height={225}
              priority
              className="w-full h-auto block"
            />
          </div>
        </section>

        <section
          className="pt-6 pb-8 rounded-2xl border px-6 sm:px-8 py-7 sm:py-8 mb-2"
          style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: '0 24px 60px -24px rgba(43,27,40,0.45)' }}
        >
          <div className="text-[10px] font-bold tracking-[0.32em] uppercase mb-3" style={{ color: ACCENT }}>
            Partnership Program
          </div>
          <h1 className="font-[family-name:var(--font-baloo)] font-extrabold text-[2.6rem] sm:text-[3.4rem] leading-[0.98] tracking-tight mb-6" style={{ color: CREAM }}>
            EROgram Badge.
          </h1>
          <p className="text-[16px] sm:text-[17px] leading-[1.75] max-w-2xl" style={{ color: BODY }}>
            Display a small Featured on EROGRAM badge on your website and unlock free exposure across one of the fastest-growing adult discovery platforms.
          </p>
        </section>

        <PartnershipStats aiNsfwCount={aiNsfwCount} groupsAndBotsCount={groupsAndBotsCount} />

        <SectionCard eyebrow="Benefits" title="What You Get" className="mb-6">
          <ul className="space-y-3">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-[1.65]" style={{ color: BODY }}>
                <span className="mt-[7px] shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard eyebrow="Open to" title="Who Can Apply?" className="mb-6">
          <p className="text-[15px] leading-[1.7] mb-5" style={{ color: BODY }}>
            This program is open to businesses across the adult digital ecosystem, including:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            {APPLICANTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] leading-snug" style={{ color: BODY }}>
                <span
                  className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(96,165,250,0.18)', color: ACCENT }}
                >
                  <CheckIcon />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard eyebrow="Get started" title="How to Apply" className="mb-6">
          <p className="text-[15px] leading-[1.75] mb-8" style={{ color: BODY }}>
            Choose one of the Featured on EROGRAM badges below and add the embedded code to your footer, sidebar, or Partners page (recommended for larger websites). Once it&apos;s live, send us an email at{' '}
            <a href="mailto:isabella@erogram.biz" className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-70" style={{ color: ACCENT }}>
              isabella@erogram.biz
            </a>
            . If approved, we&apos;ll happily return the favor with your free listing or editorial coverage.
          </p>

          <div
            className="overflow-x-auto -mx-1 px-1 pb-1 rounded-xl p-3 sm:p-4"
            style={{ backgroundColor: CREAM, border: `1px solid ${BORDER}` }}
          >
            <div className="grid grid-cols-4 gap-2 sm:gap-3 min-w-[720px]">
              {BADGES.map((badge) => (
                <BadgeBlock key={badge.id} {...badge} />
              ))}
            </div>
          </div>
        </SectionCard>

        <section
          className="rounded-2xl border px-6 py-5 sm:px-8 sm:py-6 mb-16 sm:mb-20"
          style={{ background: CARD_BG, borderColor: CARD_BORDER, boxShadow: '0 24px 60px -24px rgba(43,27,40,0.45)' }}
        >
          <h2 className="font-[family-name:var(--font-baloo)] font-extrabold text-[1.15rem] sm:text-[1.25rem] mb-2" style={{ color: CREAM }}>
            Eligibility
          </h2>
          <p className="text-[14px] sm:text-[15px] leading-[1.7]" style={{ color: BODY }}>
            We reserve the right to decline any application that we believe could negatively impact the EROGRAM brand or our users.
          </p>
        </section>
      </main>

      <ErogramDevilGirlFooter variant="mascot-blended" className="px-0" fadeColor={CREAM} softBlend fullWidth />

      <div style={{ background: 'linear-gradient(to bottom, #3d2538 0%, #2B1B28 100%)' }}>
        <EditorialFooter />
      </div>
    </div>
  );
}
