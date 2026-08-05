'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ErogramDiscoveryBanner from '@/components/ErogramDiscoveryBanner';
import PartnershipStats from './PartnershipStats';
import { CANONICAL_BASE } from '@/lib/seo/socialMeta';

const CTA = '#facc15';
const BORDER = '3px solid #000000';
const SHADOW = '4px 4px 0px #000000';

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
    previewBg: '#ffffff',
  },
  {
    id: 'blue',
    label: 'Blue badge',
    src: '/assets/featured-on-erogram-badge-blue.png',
    width: BANNER_BADGE_WIDTH,
    height: BANNER_BADGE_HEIGHT,
    previewBg: '#ffffff',
  },
  {
    id: 'icon-light',
    label: 'Icon badge (light)',
    src: '/assets/featured-on-erogram-badge-icon-light.png',
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    previewBg: '#ffffff',
  },
  {
    id: 'icon-dark',
    label: 'Icon badge (dark)',
    src: '/assets/featured-on-erogram-badge-icon-dark.png',
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    previewBg: '#1a1a1a',
  },
] as const;

function buildEmbedCode(src: string, width: number, height: number) {
  const url = `${CANONICAL_BASE}${src}`;
  return `<a href="${CANONICAL_BASE}" target="_blank" rel="noopener noreferrer">
  <img src="${url}" alt="Featured on EROGRAM" width="${width}" height="${height}" style="display:block;border:0;width:${width}px;height:${height}px;" />
</a>`;
}

const BENEFITS = [
  'Permanent BOOST listing in the EROGRAM directory (regular price: $147).',
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
    <section className={`bg-[#0a1f12] rounded-2xl border border-[#22c55e]/15 p-5 sm:p-7 mb-6 ${className}`}>
      {eyebrow && (
        <p className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#22c55e] mb-4">{eyebrow}</p>
      )}
      <h2 className="text-2xl sm:text-3xl font-black text-white mb-5">{title}</h2>
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
    <div className="rounded-xl border border-[#22c55e]/15 overflow-hidden flex flex-col min-w-0 h-full bg-[#04140c]">
      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-1.5 border-b border-[#22c55e]/15 text-[#22c55e] truncate">
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
        <pre className="text-[7px] sm:text-[8px] leading-snug overflow-x-auto whitespace-pre-wrap break-all rounded-lg p-2 font-mono max-h-[64px] overflow-y-auto text-white/55 bg-black/30 border border-[#22c55e]/10">
          {embedCode}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="w-full inline-flex items-center justify-center text-[8px] sm:text-[9px] font-black tracking-[0.18em] uppercase px-2 py-1.5 transition-all hover:brightness-105 active:translate-x-[1px] active:translate-y-[1px]"
          style={{ color: '#000', background: CTA, border: BORDER, boxShadow: SHADOW }}
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
  totalUsers,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
}) {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) setUsername(storedUsername);
    }
  }, []);

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar username={username} setUsername={setUsername} />

      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-6xl mx-auto flex items-center text-xs text-gray-500 gap-1.5">
          <Link href="/" className="hover:text-white transition-colors shrink-0">Home</Link>
          <span className="shrink-0">/</span>
          <span className="text-white font-semibold truncate">EROgram Badge</span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 pt-8 sm:pt-10 pb-8">
        <ErogramDiscoveryBanner embedded edgeFade="corners" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] text-xs font-bold uppercase tracking-[2px] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Partnership Program
          </div>
          <h1 className="ainsfw-hero-title text-[44px] sm:text-[64px] md:text-[76px] mb-4">
            EROgram Badge.
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Display a small Featured on EROGRAM badge on your website and unlock free exposure across one of the fastest-growing adult discovery platforms.
          </p>
        </motion.div>

        <PartnershipStats aiNsfwCount={aiNsfwCount} groupsAndBotsCount={groupsAndBotsCount} totalUsers={totalUsers} />

        <SectionCard eyebrow="Benefits" title="What You Get">
          <ul className="space-y-3">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-[1.65] text-white/70">
                <span className="mt-[7px] shrink-0 w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard eyebrow="Open to" title="Who Can Apply?">
          <p className="text-[15px] leading-[1.7] mb-5 text-white/70">
            This program is open to businesses across the adult digital ecosystem, including:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            {APPLICANTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] sm:text-[15px] leading-snug text-white/70">
                <span className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e]/15 text-[#22c55e]">
                  <CheckIcon />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard eyebrow="Get started" title="How to Apply">
          <p className="text-[15px] leading-[1.75] mb-8 text-white/70">
            Choose one of the Featured on EROGRAM badges below and add the embedded code to your footer, sidebar, or Partners page (recommended for larger websites). Once it&apos;s live, send us an email at{' '}
            <a href="mailto:isabella@erogram.biz" className="font-semibold text-[#4ade80] underline underline-offset-2 transition-opacity hover:opacity-70">
              isabella@erogram.biz
            </a>
            . If approved, we&apos;ll happily return the favor with your free listing or editorial coverage.
          </p>

          <div className="overflow-x-auto -mx-1 px-1 pb-1 rounded-xl p-3 sm:p-4 bg-[#04140c] border border-[#22c55e]/15">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 min-w-[720px]">
              {BADGES.map((badge) => (
                <BadgeBlock key={badge.id} {...badge} />
              ))}
            </div>
          </div>
        </SectionCard>

        <section className="bg-[#0a1f12] rounded-2xl border border-[#22c55e]/15 p-5 sm:p-7 mb-16 sm:mb-20">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Eligibility</h2>
          <p className="text-[14px] sm:text-[15px] leading-[1.7] text-white/70">
            We reserve the right to decline any application that we believe could negatively impact the EROGRAM brand or our users.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
