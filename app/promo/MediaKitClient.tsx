'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ErogramDiscoveryBanner from '@/components/ErogramDiscoveryBanner';
import ErogramDevilGirlFooter from '@/components/ErogramDevilGirlFooter';
import Footer from '@/components/Footer';
import AdvertiseStats from './AdvertiseStats';
import { ZoomableImage } from './PromoAudienceProof';
import PartnershipStats from '../partnership/PartnershipStats';
import TrustedByLeaders from '../advertise/TrustedByLeaders';
import InFeedAdFormatComparison from '../add/ainsfw/InFeedAdFormatComparison';
import { PROMO_BORDER, PROMO_CTA, PROMO_SHADOW, PROMO_HEADER_BG, PROMO_ACCENT } from './promoTheme';

const ACCENT = '#22c55e';
const BORDER = '3px solid #000000';
const SHADOW = '4px 4px 0px #000000';
const SHADOW_LG = '6px 6px 0px #000000';
const PLAN_HEADER_BG = 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)';
const CTA = '#facc15';

function BrandX() {
  return (
    <>
      <span className="font-black text-white">EROGRAM</span>
      <span className="font-black text-red-500">X</span>
    </>
  );
}

const PROMO_FAQ: { q: ReactNode; a: ReactNode }[] = [
  {
    q: 'Can you list our AI tool for free or in exchange for a high affiliate commission?',
    a: (
      <>
        <p>We receive dozens of requests daily to list AI tools for free in exchange for high affiliate commissions. Unfortunately, we don&apos;t offer commission-based listings.</p>
        <p className="mt-3">To keep <BrandX /> fair and accessible to everyone, we&apos;ve intentionally priced our Basic plan as low as possible so great projects of all sizes can get listed.</p>
        <p className="mt-3">If you&apos;re looking for a free option, we also offer free standard listings for eligible AI tools that display a small{' '}
          <Link href="/partnership" className="text-[#4ade80] hover:underline">&quot;Featured on <BrandX />&quot; badge</Link>
          {' '}on their website&apos;s Footer or sidebar. All submissions are subject to editorial review.</p>
      </>
    ),
  },
  {
    q: <>I&apos;m scaling and need a lot of traffic. What&apos;s the maximum traffic <BrandX /> can deliver?</>,
    a: (
      <>
        <p>If you&apos;re looking to scale aggressively, our custom advertising packages can deliver significantly more traffic than our standard listing plans.</p>
        <p className="mt-3">Campaigns starting at $1,800/month typically begin around 20,000 monthly clicks. Depending on your budget, campaign performance, and available inventory, we can currently scale up to 80,000 clicks per month.</p>
        <p className="mt-3">Traffic is delivered across the <BrandX /> ecosystem, including our website, native placements, banner inventory, and our Telegram network with over 30,000 subscribers.</p>
      </>
    ),
  },
  {
    q: 'How much traffic can I expect?',
    a: (
      <>
        <p>Traffic depends on your package, category, and the quality of your listing.</p>
        <p className="mt-3">Standard listings typically receive ongoing organic traffic from Google and <BrandX /> visitors, while featured placements generate significantly more visibility. Larger advertising campaigns can deliver anywhere from a few thousand monthly visitors to tens of thousands of targeted clicks.</p>
      </>
    ),
  },
  {
    q: 'What happens when my featured campaign ends?',
    a: (
      <>
        <p>Your permanent listing will remain live on <BrandX />.</p>
        <p className="mt-3">Only your featured placements and promotional campaign expire. You can renew or upgrade your campaign at any time through the <Link href="/my-listings" className="text-[#4ade80] hover:underline">My Campaigns</Link> dashboard.</p>
        <p className="mt-3">
          If you need help choosing the right package, contact us at{' '}
          <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:underline">isabella@erogram.biz</a>
          {' '}or message us on Telegram:{' '}
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] hover:underline">@erogramDOTpro</a>.
        </p>
      </>
    ),
  },
  {
    q: 'What are In-Feed Ads?',
    a: (
      <>
        <p>In-Feed Ads are native promotional cards displayed throughout <BrandX />&apos;s highest-traffic pages, including AI Tools, Bots, Groups, and other discovery feeds.</p>
        <p className="mt-3">They blend naturally with our content while giving your project premium visibility.</p>
      </>
    ),
  },
  {
    q: 'What does an editorial blog post look like?',
    a: (
      <>
        <p>You can see an example here:</p>
        <p className="mt-3">
          <Link href="/blog/why-millions-are-switching-to-ai-companionship-lately" className="text-[#4ade80] hover:underline">
            Why Millions Are Switching to AI Companionship Lately
          </Link>
        </p>
      </>
    ),
  },
  {
    q: 'What does a listing with a review look like?',
    a: (
      <>
        <p>Here&apos;s an example of one of our SEO-optimized product reviews:</p>
        <p className="mt-3">
          <Link href="/ainsfw/joi-ai-nude-generator" className="text-[#4ade80] hover:underline">
            Listing with review example
          </Link>
        </p>
      </>
    ),
  },
  {
    q: 'I purchased Boost or Authority. How long before my tool is featured?',
    a: (
      <>
        <p>Your listing is usually approved immediately after submission.</p>
        <p className="mt-3">Featured placements, homepage promotion, editorial reviews, and advertising campaigns are configured manually by our team to maximize visibility and performance. Most campaigns go live within a few hours, and always within 24 hours.</p>
      </>
    ),
  },
  {
    q: 'Can I edit my listing after it\'s published?',
    a: (
      <>
        <p>Yes. You have full control over your listing after it&apos;s published.</p>
        <p className="mt-3">
          You can update your description, links, screenshots, pricing, and other details at any time through your{' '}
          <Link href="/my-listings" className="text-[#4ade80] hover:underline">My Campaigns</Link> dashboard. Or just reach out to us through Telegram and we will be more than happy to assist{' '}
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] hover:underline">@erogramDOTpro</a>
        </p>
      </>
    ),
  },
  {
    q: 'Do you offer custom advertising opportunities?',
    a: (
      <>
        <p>Yes.</p>
        <p className="mt-3">We offer banner advertising, native placements, homepage takeovers, sponsored editorial content, Telegram promotions, video ads, launch campaigns, and fully customized advertising packages for brands looking to scale.</p>
        <p className="mt-3">If you&apos;re planning a product launch or want to maximize exposure, we&apos;d be happy to build a custom campaign around your goals.</p>
      </>
    ),
  },
  {
    q: 'Can I get listed for free?',
    a: (
      <>
        <p>Yes.</p>
        <p className="mt-3">Eligible AI tools can receive a free permanent listing by displaying a small{' '}
          <Link href="/partnership" className="text-[#4ade80] hover:underline">&quot;Featured on <BrandX />&quot; badge</Link>
          {' '}on their website that links back to <BrandX />.</p>
        <p className="mt-3">This helps support our platform while giving your project long-term visibility at no cost. All free submissions are manually reviewed before approval.</p>
        <p className="mt-3">Free listings include a standard listing only. Featured placements, editorial reviews, homepage promotion, and premium advertising are available exclusively through our paid plans.</p>
      </>
    ),
  },
];

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-1">
      <path d="M2.5 8l3.5 3.5L13.5 4" />
    </svg>
  );
}

const MOVED_A_LA_CARTE_ADDONS: { title: string; price: string; description?: string }[] = [
  { title: 'Basic listing (AINSFW / ADULT WEBSITE)', price: '$97 (One time payment)' },
  { title: 'LONG Form Editorial Article', price: '$290', description: 'SEO and conversion-optimized editorial article (2,000–3,000 words).' },
  { title: 'Short Form Article / Review', price: '$190', description: 'SEO and conversion-optimized editorial article (1,000 words).' },
  { title: 'Banner Ad (AINSFW, Groups, or Bots)', price: '$190/M' },
  { title: 'Top Menu Button', price: '$290/M' },
  { title: 'Integrated Ads', price: '(Starts at $197)' },
  { title: 'Featured on AINSFW / OnlyFans / Bots', price: 'Start at $147/Month' },
  { title: 'Telegram Boost', price: '$190/M', description: '30-day promotion across our NSFW Telegram network (9 groups, 30,000+ subscribers), with 3 sponsored posts per week.' },
  { title: 'Pinned Telegram Posts', price: '$290/M', description: 'Keep your promotion pinned for 30 days across our 8 NSFW Telegram groups, ensuring every new member sees your ad first.' },
];

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

export default function MediaKitClient({
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
}: {
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
}) {
  const [username, setUsername] = useState<string | null>(null);
  const [liveAudience, setLiveAudience] = useState<{ pageViews: number; activeVisitors: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) setUsername(storedUsername);
    }
  }, []);

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white overflow-hidden">
        <Navbar username={username} setUsername={setUsername} />
        <div className="pt-[88px] sm:pt-[96px] pb-3 sm:pb-5">
          <div className="flex items-center justify-center gap-3 sm:gap-4 px-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none">
              ADVERTISE ON <BrandX />
            </h1>
            <ErogramDevilGirlFooter half />
          </div>
        </div>

        <div id="audience-stats" className="max-w-5xl mx-auto px-4 sm:px-8 mb-6">
          <div
            className="overflow-hidden rounded-lg"
            style={{
              backgroundColor: '#ffffff',
              border: PROMO_BORDER,
              boxShadow: PROMO_SHADOW,
            }}
          >
            <AdvertiseStats onLiveAudience={setLiveAudience} />
            <PartnershipStats
              aiNsfwCount={aiNsfwCount}
              groupsAndBotsCount={groupsAndBotsCount}
              totalUsers={totalUsers}
              redBrandX
              combineListings
              listingsCount={4800}
              hideUsers
              embedded
              whiteStats
              compact
              liveAudience={liveAudience}
              geo={{
                text: 'TOP GEOS:',
                label: (
                  <span
                    className="text-[17px] leading-none"
                    style={{
                      color: 'black',
                      fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                    }}
                  >
                    🇺🇸 🇩🇪 🇧🇷 🇳🇱 🇪🇸 🇬🇧 🇨🇦
                  </span>
                ),
              }}
            />
            <TrustedByLeaders
              variant="green"
              embedded
              whiteBg
              compact
              titleClassName="text-center text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-[#064e3b] mb-2"
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-8 mb-10 space-y-4 text-center">
          <p className="text-base sm:text-lg text-white/75 leading-relaxed">
            Stop paying for cold traffic. <BrandX /> connects your AI tool / Adult website with users actively searching for premium AI experiences. Get discovered by thousands of high-intent buyers every day while your listing keeps generating visibility through our rapidly growing Google presence.
          </p>
          <div className="pt-2 flex flex-col items-center gap-3">
            <PromoContactBlock id="contact" />
          </div>
        </div>

        {/* ── MOVED FROM /add/ainsfw — organize later ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-10">
          <div className="w-full flex justify-center mt-6 sm:mt-8 mb-8">
            <div
              className="w-full max-w-[1024px] overflow-hidden bg-gray-50 rounded-lg"
              style={{ border: `2px solid ${ACCENT}` }}
            >
              <ZoomableImage
                src="/assets/promo/erogram-analytics-audience.png"
                alt=""
              />
            </div>
          </div>

          <div className="mt-8 mb-5">
            <div className="mb-6 sm:mb-8 text-center px-1 sm:px-2">
              <Image
                src="/assets/erogram-gold-mascot.jpg"
                alt=""
                width={500}
                height={500}
                className="mx-auto mb-4 w-[200px] sm:w-[250px] h-auto mix-blend-screen"
              />
              <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-[2rem] font-black uppercase tracking-tight text-white leading-snug max-w-4xl mx-auto">
                GET LISTED ON THE FASTEST GROWING ADULT ENTRETAINEMENT DISCOVERY HUB.
              </h2>
            </div>
            <p className="text-base sm:text-lg text-white/75 leading-relaxed text-center mb-4 max-w-3xl mx-auto">
              Get featured on one of the fastest-growing AI discovery platforms with 40% month-over-month organic growth.
            </p>
            <div className="overflow-hidden bg-white" style={{ border: BORDER, boxShadow: SHADOW }}>
              <div className="p-4 sm:p-5 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="overflow-hidden bg-gray-50" style={{ border: `2px solid ${ACCENT}` }}>
                    <ZoomableImage src="/assets/promo/erogram1.png" alt="Google Search Console showing Erogram organic traffic growth" />
                  </div>
                  <div className="overflow-hidden bg-gray-50" style={{ border: `2px solid ${ACCENT}` }}>
                    <ZoomableImage src="/assets/promo/erogramx-gsc-growth.png" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PRICING GRID */}
          <div className="mb-5 scroll-mt-24 mt-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white text-center mb-6">
              OUR DIFFERENT OFFERS
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7 items-stretch mb-12">
              {/* À LA CARTE ADD-ONS */}
              <section className="min-w-0 h-full">
                <div className="overflow-hidden bg-white h-full flex flex-col" style={{ border: BORDER, boxShadow: SHADOW_LG, color: '#000' }}>
                  <div className="px-4 py-3.5 sm:px-5" style={{ background: PLAN_HEADER_BG }}>
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-none">À La Carte</h2>
                    <p className="mt-0.5 text-sm sm:text-base font-black uppercase tracking-wide text-white/45">Growth Add-ons</p>
                  </div>
                  <ul className="divide-y divide-black/10 flex-1">
                    {MOVED_A_LA_CARTE_ADDONS.map((addon) => (
                      <li key={addon.title} className="py-3 px-4 sm:px-5">
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <p className="text-sm sm:text-base font-black text-black leading-snug min-w-0">{addon.title}</p>
                          <p className="text-base sm:text-lg font-black text-[#16a34a] leading-none shrink-0 tabular-nums">{addon.price}</p>
                        </div>
                        {addon.description ? (
                          <p className="text-xs sm:text-sm font-semibold text-black/60 leading-snug">{addon.description}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* STARTUP (enterprise) */}
              <div
                className="relative flex flex-col overflow-hidden min-w-0 h-full"
                style={{ background: PLAN_HEADER_BG, border: `3px solid ${ACCENT}`, boxShadow: `6px 6px 0px ${ACCENT}` }}
              >
                <div className="px-6 py-6 sm:px-8 sm:py-8 flex flex-col flex-1 space-y-2 sm:space-y-2.5">
                  <h2 className="font-black uppercase leading-none tracking-tight text-[4rem] sm:text-[4.5rem] lg:text-[5rem] text-white">SCALE</h2>
                  <p className="text-lg sm:text-xl font-black uppercase tracking-wide text-white/50">Maximum Exposure</p>
                  <p className="text-base sm:text-lg text-white/60 leading-snug pt-1">
                    For companies that want the highest visibility across <BrandX />.
                    {' '}You get placements across our highest-traffic pages and placements (Banners, Menu links, Intergrated ads)
                  </p>
                  <div className="pt-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4ade80] mb-2">Top tier packages</p>
                    <div className="space-y-2">
                      <div
                        className="bg-white rounded-md px-3 py-2.5 sm:px-4 flex items-center justify-between gap-3"
                        style={{ border: BORDER, boxShadow: SHADOW }}
                      >
                        <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-black leading-tight min-w-0">
                          20.000 Clicks / Month
                        </p>
                        <p className="text-base sm:text-lg font-black text-[#16a34a] tabular-nums shrink-0 leading-none">$1500</p>
                      </div>
                      <div
                        className="bg-white rounded-md px-3 py-2.5 sm:px-4"
                        style={{ border: BORDER, boxShadow: SHADOW }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-black leading-tight min-w-0">
                            60.000 Clicks / Month
                          </p>
                          <p className="text-base sm:text-lg font-black text-[#16a34a] tabular-nums shrink-0 leading-none">$3000</p>
                        </div>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-black/45 leading-snug mt-1.5">
                          Availability depends on our inventory
                        </p>
                      </div>
                    </div>
                  </div>
                  <ul className="pt-2 space-y-2.5 sm:space-y-3 flex-1">
                    {[
                      'Display banners & video advertising',
                      'Placement across our highest-traffic pages',
                      'A/B testing of headlines, creatives & messaging',
                      'Campaign analytics & reporting',
                      'Custom campaign strategy',
                      'Dedicated account support',
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-base sm:text-sm font-semibold text-white/90">
                        <span style={{ color: '#34d399' }} className="mt-0.5 shrink-0"><CheckMark /></span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-6 pb-6 sm:px-8 sm:pb-8 pt-0 mt-auto">
                  <a
                    href="mailto:isabella@erogram.biz?subject=Startup%20Package%20Inquiry"
                    className="block w-full py-4 text-lg sm:text-base font-black uppercase tracking-widest text-center text-black transition-all hover:opacity-95 active:translate-x-[2px] active:translate-y-[2px]"
                    style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
                  >
                    Contact us for details
                  </a>
                </div>
              </div>
            </div>
          </div>

          <InFeedAdFormatComparison />

          <ErogramDiscoveryBanner embedded />

          <section className="mt-8 mb-10 max-w-3xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black mb-6 text-center text-white">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {PROMO_FAQ.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl overflow-hidden border border-[#22c55e]/15 bg-[#0a1f12]"
                >
                  <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 text-white font-semibold text-base sm:text-base list-none [&::-webkit-details-marker]:hidden">
                    <span>{faq.q}</span>
                    <svg className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 text-white/50 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </summary>
                  <div className="px-5 pb-5 text-white/70 text-base sm:text-sm leading-relaxed">{faq.a}</div>
                </details>
              ))}
            </div>
          </section>
        </div>

        <Footer />
      </div>
  );
}
