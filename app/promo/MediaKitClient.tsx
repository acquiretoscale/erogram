'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import ErogramDiscoveryBanner from '@/components/ErogramDiscoveryBanner';
import ErogramDevilGirlFooter from '@/components/ErogramDevilGirlFooter';
import Footer from '@/components/Footer';
import AdvertiseStats from './AdvertiseStats';
import PartnershipStats from '../partnership/PartnershipStats';
import TrustedByLeaders, { type TrustedSponsor } from '../advertise/TrustedByLeaders';
import BasicBoostedListingComparison from './BasicBoostedListingComparison';
import MediaKitSeoAudienceOverview from './MediaKitSeoAudienceOverview';
import { PROMO_BORDER, PROMO_CTA, PROMO_SHADOW, PROMO_HEADER_BG, PROMO_ACCENT } from './promoTheme';
import type { MediaKitContent } from '@/lib/mediakit/types';
import MediaKitEditProvider from '@/components/mediakit/MediaKitEditProvider';
import EditableText from '@/components/mediakit/EditableText';
import { FaqPlainAnswer, SubmitFaqItems } from '@/app/add/ainsfw/submitFaq';
import { useMediaKitEdit } from '@/components/mediakit/MediaKitEditProvider';

const ACCENT = '#22c55e';
const BORDER = '3px solid #000000';
const SHADOW = '4px 4px 0px #000000';
const PLAN_HEADER_BG = 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)';
const CTA = '#facc15';

const MEDIKIT_TRUSTED_SPONSORS: TrustedSponsor[] = [
  { name: 'Candy AI', logo: '/assets/sponsors/candy-ai.webp', width: 170, height: 36, colored: true, slug: 'candy-ai-ai-girlfriend' },
  { name: 'Golove', logo: '/assets/sponsors/golove-dark.svg', width: 150, height: 40, colored: true },
  { name: 'Lovescape', logo: '/assets/sponsors/lovescape.webp', width: 119, height: 36, colored: true, slug: 'lovescape-ai-girlfriend' },
];

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-1">
      <path d="M2.5 8l3.5 3.5L13.5 4" />
    </svg>
  );
}

function PerformancePackValueBlock({
  packIndex,
  price,
  footerLines,
}: {
  packIndex: number;
  price: string;
  footerLines: string[];
}) {
  const discountLine = footerLines[0];

  return (
    <div
      className="mx-6 sm:mx-8 mb-4 mt-auto rounded-md border-2 border-black/10 bg-[#f0fdf4] px-4 py-3 sm:px-5 text-center space-y-1"
    >
      <p className="text-base sm:text-lg font-black tabular-nums text-[#15803d]">
        <EditableText path={`performancePacks.${packIndex}.price`} fallback={price} />
      </p>
      {discountLine ? (
        <p className="text-xs font-medium text-black/55">
          <EditableText
            path={`performancePacks.${packIndex}.footerLines.0`}
            fallback={discountLine}
            className="block w-full"
          />
        </p>
      ) : null}
    </div>
  );
}

function PromoContactBlock({ id }: { id?: string }) {
  return (
    <section id={id} className="scroll-mt-28 max-w-2xl mx-auto w-full">
      <div
        className="rounded-lg px-4 py-4 sm:px-5 sm:py-4 text-center"
        style={{
          background: PROMO_HEADER_BG,
          border: `3px solid ${PROMO_ACCENT}`,
          boxShadow: `6px 6px 0px ${PROMO_ACCENT}`,
        }}
      >
        <p className="text-sm text-white/70 leading-snug mb-3">
          Need help? Have a question? Don&apos;t hesitate to get in touch:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href="mailto:isabella@erogram.biz"
            className="flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2.5 text-center transition-transform hover:-translate-y-0.5"
            style={{ border: PROMO_BORDER, boxShadow: PROMO_SHADOW }}
          >
            <span className="text-base leading-none" aria-hidden="true">✉️</span>
            <span className="text-sm font-black text-black break-all">isabella@erogram.biz</span>
          </a>
          <a
            href="https://t.me/erogramDOTpro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-center text-black transition-transform hover:-translate-y-0.5"
            style={{ background: PROMO_CTA, border: PROMO_BORDER, boxShadow: PROMO_SHADOW }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            <span className="text-sm font-black text-black">@erogramDOTpro</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function MediaKitBody({
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
}) {
  const { content } = useMediaKitEdit();
  const [username, setUsername] = useState<string | null>(null);
  const [liveAudience, setLiveAudience] = useState<{ pageViews: number; activeVisitors: number } | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) return;
    const id = window.setTimeout(() => setUsername(storedUsername), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white overflow-hidden">
        <Navbar username={username} setUsername={setUsername} />
        <div className="pt-[88px] sm:pt-[96px] pb-3 sm:pb-5">
          <div className="flex items-center justify-center gap-3 sm:gap-4 px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none">
              MEDIA KIT
            </h1>
            <ErogramDevilGirlFooter half />
          </div>
        </div>

        <section className="max-w-2xl mx-auto px-4 sm:px-8 mb-6 text-center text-white/85">
          <p className="text-lg sm:text-xl font-black text-white leading-snug">
            Hey there, welcome to EROGRAMX! 👋
          </p>
          <p className="mt-3 text-base sm:text-lg font-semibold text-white/90">Thanks for stopping by!</p>
          <p className="mt-4 text-base sm:text-lg text-white/75 leading-relaxed">
            If you&apos;ve built an AI tool for adults, you&apos;re in the right place. Every month, hundreds of thousands of people find us on Google while looking for their next AI girlfriend, image generator or spicy chat app. They&apos;re curious, they&apos;re ready to sign up, and I&apos;d love to send them your way.
          </p>
          <p className="mt-6 text-base font-semibold text-white/90">Team</p>
          <p className="mt-1 text-base font-semibold text-white/90">erogram.pro</p>
          <p className="mt-1 text-base text-white/75">To your success!</p>
          <hr className="mt-6 border-white/15" />
        </section>

        <div id="audience-stats" className="max-w-md mx-auto px-4 sm:px-5 mb-6">
          <div
            className="overflow-hidden rounded-lg"
            style={{
              backgroundColor: '#ffffff',
              border: PROMO_BORDER,
              boxShadow: PROMO_SHADOW,
            }}
          >
            <AdvertiseStats onLiveAudience={setLiveAudience} promoStacked />
            <PartnershipStats
              aiNsfwCount={aiNsfwCount}
              groupsAndBotsCount={groupsAndBotsCount}
              totalUsers={totalUsers}
              redBrandX
              aiNsfwOnlyListings
              hideGeos
              hideUsers
              embedded
              whiteStats
              stackedRows
              compact
              hideReachLabel
              monthlyVisitsText="180K+"
              emphasizeMonthlyVisits
              hideTelegramSubscribers
              liveAudience={liveAudience}
              discoveryBannerTitle
            />
          </div>
        </div>

        <nav aria-label="Page sections" className="mx-auto mb-14 mt-10 max-w-md px-4 sm:mb-16 sm:mt-14">
          <ul className="flex flex-col items-center gap-3 text-base sm:text-lg">
            {[
              ['#listing-offers-title', 'Our Listing offers'],
              ['#advertising-offers-title', 'Our Advertising Offers'],
              ['#audience-overview', 'Audience overview'],
              ['#performance-offers-title', 'Our Performance Offers'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="font-black text-[#4ade80] underline decoration-2 underline-offset-4">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── MOVED FROM /add/ainsfw — organize later ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-10">
          <BasicBoostedListingComparison />

          <div className="max-w-3xl mx-auto px-4 sm:px-8 mb-10 text-center">
            <PromoContactBlock id="contact" />
          </div>
        </div>

        <MediaKitSeoAudienceOverview />

        <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-10">
          <section id="performance-offers" className="mb-5 scroll-mt-28 mt-10 sm:mt-14 mb-12" aria-labelledby="performance-offers-title">
            <div className="mx-auto mb-4 w-36 sm:w-44">
              <Image
                src="/assets/erogram-gold-mascot.webp"
                alt=""
                width={530}
                height={502}
                className="h-auto w-full"
              />
            </div>
            <h2
              id="performance-offers-title"
              className="mb-5 scroll-mt-28 text-center text-xl font-black uppercase tracking-tight text-white sm:mb-6 sm:text-2xl md:text-3xl"
            >
              Our Performance Offers
            </h2>
            <p
              className="mb-6 px-6 py-5 text-center text-sm font-semibold text-black/80 sm:px-8 sm:py-6 sm:text-base"
              style={{ background: '#ffffff', border: `3px solid ${ACCENT}`, boxShadow: `6px 6px 0px ${ACCENT}` }}
            >
              If performance is your highest priority
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7 items-stretch">
              {content.performancePacks.map((pack, packIndex) => (
                <div
                  key={pack.title}
                  className="relative flex flex-col overflow-hidden min-w-0 h-full"
                  style={{ background: '#ffffff', border: `3px solid ${ACCENT}`, boxShadow: `6px 6px 0px ${ACCENT}` }}
                >
                  <div className="px-6 py-6 sm:px-8 sm:py-8 flex flex-col flex-1 space-y-2 sm:space-y-2.5">
                    <h2 className="font-black uppercase leading-none tracking-tight text-xl sm:text-2xl text-black flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <EditableText path={`performancePacks.${packIndex}.title`} fallback={pack.title} />
                      <span className="text-[11px] sm:text-xs font-black tracking-[0.16em] text-[#dc2626]">
                        <EditableText path={`performancePacks.${packIndex}.slots`} fallback={pack.slots} />
                      </span>
                    </h2>
                    <p className="text-sm sm:text-base font-black tracking-[0.12em] text-[#15803d]">
                      {pack.title.includes('LITE') ? '8K VISITS · $0.13 CPC' : '25K VISITS · $0.07 CPC'}
                    </p>
                    {pack.intro.trim() ? (
                      <p className="pt-2 text-sm sm:text-base font-semibold text-black/80 leading-relaxed">
                        <EditableText
                          path={`performancePacks.${packIndex}.intro`}
                          fallback={pack.intro}
                          multiline
                          className="block w-full"
                        />
                      </p>
                    ) : null}
                    <ul className="pt-2 space-y-2.5 sm:space-y-3 flex-1">
                      {pack.bullets.map((f, i) => (
                        <li key={`${packIndex}-${i}`} className="flex items-start gap-2.5 text-base sm:text-sm font-semibold text-black/90">
                          <span style={{ color: '#16a34a' }} className="mt-0.5 shrink-0"><CheckMark /></span>
                          <EditableText path={`performancePacks.${packIndex}.bullets.${i}`} fallback={f} className="min-w-0 flex-1" />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <PerformancePackValueBlock
                    packIndex={packIndex}
                    price={pack.price}
                    footerLines={pack.footerLines}
                  />
                  <div className="px-6 pb-6 sm:px-8 sm:pb-8 pt-0 mt-auto">
                    <a
                      href="mailto:isabella@erogram.biz?subject=Performance%20Package%20Inquiry"
                      className="block w-full py-4 text-lg sm:text-base font-black uppercase tracking-widest text-center text-black transition-all hover:opacity-95 active:translate-x-[2px] active:translate-y-[2px]"
                      style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
                    >
                      Contact us for details
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 overflow-hidden rounded-lg bg-white" style={{ border: `3px solid ${ACCENT}`, boxShadow: `6px 6px 0px ${ACCENT}` }}>
              <TrustedByLeaders
                variant="green"
                embedded
                whiteBg
                compact
                sponsors={MEDIKIT_TRUSTED_SPONSORS}
                titleClassName="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#064e3b] mb-2"
              />
            </div>
          </section>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-10">
          <ErogramDiscoveryBanner embedded />

          <section className="mt-8 mb-10 max-w-3xl mx-auto">
            <h2 className="mb-6 text-center text-xl font-black uppercase tracking-tight text-white sm:text-2xl md:text-3xl">Frequently asked questions</h2>
            <div className="space-y-3">
              <SubmitFaqItems borderClass="border border-[#22c55e]/15 bg-[#0a1f12]" />
              {content.faq.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl overflow-hidden border border-[#22c55e]/15 bg-[#0a1f12]"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 text-white font-semibold text-base sm:text-base list-none [&::-webkit-details-marker]:hidden">
                    <EditableText path={`faq.${i}.q`} fallback={faq.q} className="text-left" />
                    <svg className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 text-white/50 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </summary>
                  <div className="px-5 pb-5 text-white/70 text-base sm:text-sm leading-relaxed whitespace-pre-line">
                    {faq.a.includes('checkout page') ? (
                      <FaqPlainAnswer text={faq.a} linkClassName="font-black text-[#4ade80] underline" />
                    ) : (
                      <EditableText path={`faq.${i}.a`} fallback={faq.a} multiline className="block w-full text-white/70" />
                    )}
                    {faq.q.includes('SEO benefits from Erogram') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/assets/promo/mediakit-ga4-rebrand-impact.png?hq=3"
                        alt="Google Analytics trend of event count after Erogram migration"
                        width={807}
                        height={1024}
                        className="mt-4 block h-auto w-full max-w-md rounded-md"
                      />
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>

        <Footer />
      </div>
  );
}

export default function MediaKitClient({
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
  mediaKitContent,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
  mediaKitContent: MediaKitContent;
}) {
  return (
    <MediaKitEditProvider initialContent={mediaKitContent}>
      <MediaKitBody
        aiNsfwCount={aiNsfwCount}
        groupsAndBotsCount={groupsAndBotsCount}
        totalUsers={totalUsers}
      />
    </MediaKitEditProvider>
  );
}
