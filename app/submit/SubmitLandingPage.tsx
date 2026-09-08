'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SubmitErogramReachBlock from '@/app/submit/SubmitErogramReachBlock';
import SubmitPromoAudienceProof from '@/app/submit/SubmitPromoAudienceProof';
import SubmitContactBlock from '@/app/submit/SubmitContactBlock';
import SubmitHowItWorks from '@/app/submit/SubmitHowItWorks';
import OfmAgenciesPricingSection from '@/app/ofm-agencies/OfmAgenciesPricingSection';
import TrustedByLeaders, { TRUSTED_SPONSORS } from '@/app/advertise/TrustedByLeaders';
import { saveSubmitCreatorPlan } from '@/lib/submitCreatorDraft';

const ONLYFANS_TRUSTED_SPONSORS = [
  ...TRUSTED_SPONSORS,
  { name: 'JOI AI', logo: '/assets/sponsors/joi-ai.webp', width: 200, height: 118, slug: 'joi-ai-nude-generator' },
  { name: 'Clothoff', logo: '/assets/sponsors/clothoff.webp', width: 400, height: 89, slug: 'clothoff-undress-ai' },
];

const OF_DARK = '#009AD6';
const OF_DARKER = '#0077B3';

const primaryCta =
  'inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-[2px]';

const submitHeroCta =
  'inline-flex items-center justify-center gap-2 px-10 sm:px-12 py-5 sm:py-6 rounded-xl font-black text-lg sm:text-xl tracking-wide text-white transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-[2px]';

const submitCta =
  'inline-flex items-center justify-center gap-2 px-16 py-8 rounded-2xl font-black text-2xl sm:text-[1.75rem] uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-[2px]';

const primaryCtaStyle = {
  background: `linear-gradient(135deg, ${OF_DARK} 0%, ${OF_DARKER} 100%)`,
  border: `2px solid ${OF_DARKER}`,
  boxShadow: '0 6px 20px -6px rgba(0,119,179,0.45)',
} as const;

const sectionLabel = 'text-[10px] font-black uppercase tracking-[0.2em] text-[#009AD6] mb-3';
const h2Class = 'text-2xl sm:text-3xl font-black text-gray-900 mb-4 tracking-tight';
const bodyClass = 'text-[15px] sm:text-base leading-relaxed text-gray-600';
const cardClass = 'rounded-2xl border border-[#00AFF0]/20 bg-white p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(0,175,240,0.18)]';
const agencyHeaderBg = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';
const mainSectionTitleClass =
  'text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-[0.08em] text-center mb-6 sm:mb-8 leading-tight';

const outlineCtaStyle = {
  background: '#fff',
  border: `2px solid ${OF_DARKER}`,
} as const;

function AudienceSwitchCtas() {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-2xl mx-auto">
      <Link
        href="/ofm-agencies"
        className={`${submitHeroCta} w-full sm:flex-1`}
        style={primaryCtaStyle}
      >
        For agencies
      </Link>
      <Link
        href="#pricing"
        className={`${submitHeroCta} w-full sm:flex-1`}
        style={outlineCtaStyle}
      >
        <span className="text-[#0077B3]">For solo creators</span>
      </Link>
    </div>
  );
}
export default function SubmitLandingPage({
  variant = 'submit',
  aiNsfwCount,
  groupsAndBotsCount,
  totalUsers,
}: {
  variant?: 'submit' | 'ofm-agencies';
  aiNsfwCount: number;
  groupsAndBotsCount: number;
  totalUsers: number;
}) {
  const isOfmAgencies = variant === 'ofm-agencies';
  const router = useRouter();

  const startCreatorFlow = useCallback((plan: 'free' | 'boosted') => {
    saveSubmitCreatorPlan(plan);
    router.push(`/submit/join?plan=${plan}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f8ff] via-white to-[#f8fcff]">
      <Navbar variant="onlyfans" />

      <div className="pt-[68px] sm:pt-[80px]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-16 space-y-14 sm:space-y-16">
        <div className="relative left-1/2 w-[min(100vw-2rem,64rem)] max-w-5xl -translate-x-1/2">
          <SubmitErogramReachBlock
            aiNsfwCount={aiNsfwCount}
            groupsAndBotsCount={groupsAndBotsCount}
            totalUsers={totalUsers}
          />
        </div>

        {/* HERO */}
        <section className="text-center max-w-2xl mx-auto">
          <div
            className="rounded-2xl border border-[#00AFF0]/30 px-6 py-8 sm:px-9 sm:py-10 shadow-[0_16px_40px_-20px_rgba(0,40,80,0.55)] mb-8 sm:mb-9"
            style={{ background: agencyHeaderBg }}
          >
            <p className="text-[15px] sm:text-base leading-[1.75] text-white/90 max-w-xl mx-auto text-center">
              Erogram connects creators with fans actively searching for premium new accounts to subscribe to. Get discovered by high-intent visitors actively searching for creators like you while your Fanpage keeps generating visibility through our rapidly growing Google presence.
            </p>
          </div>

          {!isOfmAgencies && <AudienceSwitchCtas />}

          <div className="mt-8 sm:mt-10 overflow-hidden rounded-2xl border border-[#00AFF0]/25 shadow-[0_16px_40px_-20px_rgba(0,40,80,0.35)] ring-1 ring-black/[0.04]">
            <Image
              src="/assets/submit/creator-profile-preview.webp"
              alt="Erogram creator profile preview"
              width={1024}
              height={698}
              className="w-full h-auto"
              priority
            />
          </div>
        </section>

        {isOfmAgencies && (
        <section>
          <div className="mb-6 sm:mb-8 text-center px-1 sm:px-2">
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-[2rem] font-black uppercase tracking-tight text-gray-900 leading-snug max-w-4xl mx-auto">
              Get listed on one of the fastest-growing adult discovery hubs online.
            </h2>
          </div>
          <SubmitPromoAudienceProof />
        </section>
        )}

        {!isOfmAgencies && (
        <div className="text-center">
          <Link href="#pricing" className={submitCta} style={primaryCtaStyle}>
            SUBMIT
          </Link>
        </div>
        )}

        {isOfmAgencies && (
        <>
        {/* THE SECRET */}
        <section>
          <p className={sectionLabel}>The secret</p>
          <h2 className={h2Class}>If you want to grow on OnlyFans, you have to be found on Google.</h2>
          <div className={`${bodyClass} space-y-4`}>
            <p>
              The fans who search Google are not the tire kickers scrolling TikTok and Instagram for free. They are power users. They already have OnlyFans accounts with a card saved. They already subscribe to dozens of creators. And they are searching for something very specific.
            </p>
            <p>
              <span className="font-bold text-gray-900">Redhead. MILF. Latina. German. JOI.</span> They type the exact niche, and they subscribe to whoever shows up first.
            </p>
            <p>
              Erogram is where they land. Our <span className="font-bold text-gray-900">Top 10 ranking pages are our most visited pages from Google</span>, and they are built around those exact niche searches.
            </p>
            <p className="text-gray-900 font-semibold">
              Get on those pages, and the right fan finds you at the exact moment they are ready to pay.
            </p>
          </div>
        </section>

        {/* GOOGLE FANS vs SOCIAL FANS */}
        <section>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-center text-gray-900 mb-6 sm:mb-8 tracking-tight">
            Google fans vs social fans
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            <div className="overflow-hidden rounded-2xl border border-[#00AFF0]/30 bg-white shadow-[0_16px_40px_-20px_rgba(0,40,80,0.2)]">
              <div className="px-5 sm:px-6 py-4 border-b border-white/10" style={{ background: agencyHeaderBg }}>
                <h3 className="text-lg sm:text-xl font-black text-white">Erogram search traffic</h3>
              </div>
              <ul className="space-y-3 p-5 sm:p-6 text-sm sm:text-[15px] text-gray-700">
                <li>Already have creator-platform accounts with payment methods saved</li>
                <li>Actively searching for creators to support</li>
                <li>Know exactly what niche they want</li>
                <li>Higher purchase intent than casual social traffic</li>
              </ul>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#f8f9fb] shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
              <div className="px-5 sm:px-6 py-4 border-b border-gray-200 bg-gray-100">
                <h3 className="text-lg sm:text-xl font-black text-gray-500">TikTok / IG / Reddit / other free traffic</h3>
              </div>
              <ul className="space-y-3 p-5 sm:p-6 text-sm sm:text-[15px] text-gray-500">
                <li>Often casual scrolling</li>
                <li>Lower intent to spend</li>
                <li>Requires more attention and nurturing</li>
                <li>Less likely to convert immediately</li>
              </ul>
            </div>
          </div>
          <p className={`${bodyClass} mt-6 sm:mt-8 text-gray-900 font-semibold text-center max-w-2xl mx-auto`}>
            Why pay to reach broke scrollers when you can reach the whales who came to buy?
          </p>
        </section>
        </>
        )}

        {/* Why Erogram */}
        <section className={cardClass}>
          <p className={sectionLabel}>Why Erogram</p>
          <ul className={`${bodyClass} space-y-4 list-none`}>
            <li>
              <span className="font-semibold text-gray-900">High intent, not idle scrolling.</span>{' '}
              Our visitors are searching for creators to subscribe to, not killing time.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Top tier traffic.</span>{' '}
              Mostly US, UK, Germany, Canada, Australia. High spending markets.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Google does the work.</span>{' '}
              We rank on the exact niche searches your fans already make.
            </li>
            <li>
              <span className="font-semibold text-gray-900">You land on the top pages.</span>{' '}
              Promoted profiles go on our Top 10 ranking pages, our most visited pages from Google.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Keyword targeted by niche.</span>{' '}
              A redhead creator shows up on the redhead pages. A Latina creator on the Latina pages. Right fan, right creator.
            </li>
          </ul>
        </section>

        <div className="relative left-1/2 w-[min(100vw-1rem,64rem)] max-w-5xl -translate-x-1/2">
          <TrustedByLeaders
            variant="onlyfans"
            sponsors={ONLYFANS_TRUSTED_SPONSORS}
            title="Trusted by adult industry leaders"
            titleClassName="text-center text-lg sm:text-xl font-bold uppercase tracking-[0.16em] text-white/70 mb-5 sm:mb-6"
            subtitle={
              <>
                Even our Partners&apos; AI GFs are getting Subs. why not you 😉
              </>
            }
          />
        </div>

        {/* FOR SOLO CREATORS */}
        {!isOfmAgencies && (
        <section
          id="pricing"
          className="scroll-mt-28 relative left-1/2 w-[min(100vw-2rem,64rem)] max-w-5xl -translate-x-1/2"
        >
          <h2 className={`${mainSectionTitleClass} text-[#009AD6]`}>For solo creators</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 items-stretch">
            <div className="overflow-hidden rounded-2xl border border-[#00AFF0]/25 bg-white flex flex-col shadow-[0_12px_40px_-16px_rgba(0,175,240,0.2)]">
              <div className="border-b border-[#00AFF0]/20 bg-gradient-to-br from-[#f0f8ff] via-white to-[#f8fcff] px-6 sm:px-8 py-7 sm:py-8 text-center">
                <p className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-[0.06em] text-[#009AD6] leading-tight">Free Fanpage</p>
              </div>
              <div className="p-6 sm:p-8 flex flex-col flex-1">
              <ul className={`${bodyClass} space-y-3 mb-8 list-none flex-1`}>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Permanent free listing on Erogram</li>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Create your fanpage with all your social links</li>
                <li className="flex gap-2 items-start">
                  <span className="text-[#00AFF0] shrink-0">✓</span>
                  <span className="flex-1">
                    Appear in Erogram&apos;s creator search{' '}
                    <span className="relative inline-flex align-middle group/info">
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 sm:h-[18px] sm:w-[18px] items-center justify-center rounded-full border border-[#00AFF0]/50 bg-[#0077B3] text-[10px] font-black leading-none text-white cursor-help"
                        aria-label="Profile visits info"
                      >
                        i
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] z-30 w-[min(18rem,calc(100vw-3rem))] -translate-x-1/2 rounded-xl border border-[#00AFF0]/40 bg-[#0a2840] px-3 py-2.5 text-left text-[13px] leading-snug text-white/90 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] opacity-0 invisible transition-opacity duration-150 group-hover/info:opacity-100 group-hover/info:visible group-focus-within/info:opacity-100 group-focus-within/info:visible"
                      >
                        In average profiles on EROgram generate 500+ profile visits a month (More if they get more engagement from our community, likes, comments etc...)
                      </span>
                    </span>
                  </span>
                </li>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Post photos and videos to your Erogram feed</li>
                <li className="flex gap-2 items-start">
                  <span className="text-[#00AFF0] shrink-0">✓</span>
                  <span className="flex-1">
                    Promote up to 2 OnlyFans accounts{' '}
                    <span className="relative inline-flex align-middle group/info-listings">
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 sm:h-[18px] sm:w-[18px] items-center justify-center rounded-full border border-[#00AFF0]/50 bg-[#0077B3] text-[10px] font-black leading-none text-white cursor-help"
                        aria-label="OnlyFans listings info"
                      >
                        i
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] z-30 w-[min(18rem,calc(100vw-3rem))] -translate-x-1/2 rounded-xl border border-[#00AFF0]/40 bg-[#0a2840] px-3 py-2.5 text-left text-[13px] leading-snug text-white/90 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] opacity-0 invisible transition-opacity duration-150 group-hover/info-listings:opacity-100 group-hover/info-listings:visible group-focus-within/info-listings:opacity-100 group-focus-within/info-listings:visible"
                      >
                        / 2 Onlyfans account listings on EROgram
                      </span>
                    </span>
                  </span>
                </li>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Add niche tags to improve discoverability</li>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Eligible to appear on category and niche pages</li>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Built to help your profile get discovered over time</li>
              </ul>
              <button
                type="button"
                onClick={() => startCreatorFlow('free')}
                className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-[#0077B3] bg-white border-2 border-[#0077B3] transition-all hover:-translate-y-0.5 hover:bg-[#f0f8ff]"
              >
                Create free profile
              </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-[#00AFF0]/50 bg-white flex flex-col shadow-[0_20px_50px_-16px_rgba(0,119,179,0.45)] ring-1 ring-[#00AFF0]/20 lg:scale-[1.02]">
              <div className="px-6 sm:px-8 py-7 sm:py-8 text-center border-b border-white/10" style={{ background: agencyHeaderBg }}>
                <p className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-[0.06em] text-white leading-tight">Boosted Listing</p>
              </div>
              <div className="p-6 sm:p-8 flex flex-col flex-1 bg-gradient-to-b from-[#f4fbff] to-white">
              <ul className={`${bodyClass} space-y-3 mb-4 list-none flex-1`}>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Everything in Free</li>
                <li className="flex gap-2 items-start">
                  <span className="text-[#00AFF0] shrink-0">✓</span>
                  <span className="flex-1">
                    Featured in up to 4 high-performing category pages{' '}
                    <span className="relative inline-flex align-middle group/info-top10">
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 sm:h-[18px] sm:w-[18px] items-center justify-center rounded-full border border-[#00AFF0]/50 bg-[#0077B3] text-[10px] font-black leading-none text-white cursor-help"
                        aria-label="Top 10 ranking categories info"
                      >
                        i
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] z-30 w-[min(20rem,calc(100vw-3rem))] -translate-x-1/2 rounded-xl border border-[#00AFF0]/40 bg-[#0a2840] px-3 py-2.5 text-left text-[13px] leading-snug text-white/90 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] opacity-0 invisible transition-opacity duration-150 group-hover/info-top10:opacity-100 group-hover/info-top10:visible group-focus-within/info-top10:opacity-100 group-focus-within/info-top10:visible"
                      >
                        If your niche is &quot;Petite,&quot; &quot;Big Boobs,&quot; etc., you&apos;ll be shown in our Top 10 Ranking of the Hottest Petites on OnlyFans.
                        <span className="block mt-2 text-white/80">
                          These are by far our top-performing pages on Erogram, as they drive Google users who are actively seeking OnlyFans accounts.
                        </span>
                      </span>
                    </span>
                  </span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-[#00AFF0] shrink-0">✓</span>
                  <span className="flex-1">
                    Featured in Erogram&apos;s creator search feed{' '}
                    <span className="relative inline-flex align-middle group/info-of-feed">
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 sm:h-[18px] sm:w-[18px] items-center justify-center rounded-full border border-[#00AFF0]/50 bg-[#0077B3] text-[10px] font-black leading-none text-white cursor-help"
                        aria-label="OFsearch feed info"
                      >
                        i
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] z-30 w-[min(20rem,calc(100vw-3rem))] -translate-x-1/2 rounded-xl border border-[#00AFF0]/40 bg-[#0a2840] px-3 py-2.5 text-left text-[13px] leading-snug text-white/90 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] opacity-0 invisible transition-opacity duration-150 group-hover/info-of-feed:opacity-100 group-hover/info-of-feed:visible group-focus-within/info-of-feed:opacity-100 group-focus-within/info-of-feed:visible"
                      >
                        OFsearch feed
                        <span className="block mt-2 text-white/80">
                          When users search for Ahegao, MILF, etc., you&apos;ll appear more often than regular results, giving you higher chances of gaining new fans.
                        </span>
                      </span>
                    </span>
                  </span>
                </li>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Priority visibility across selected niche pages</li>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> Designed to increase profile views, clicks, and engagement</li>
                <li className="flex gap-2"><span className="text-[#00AFF0] shrink-0">✓</span> One-time payment for 7 days</li>
              </ul>
              <div
                className="mb-5 rounded-xl flex flex-col items-center justify-center gap-1 py-4 sm:py-5 px-4 text-center"
                style={{
                  background: 'linear-gradient(135deg, #f0f8ff 0%, #dceefb 100%)',
                  border: '2px solid rgba(0,175,240,0.45)',
                  boxShadow: '0 8px 28px -10px rgba(0,175,240,0.4)',
                }}
              >
                <span className="font-black leading-none tracking-tight text-[#0077B3] text-[2.75rem] sm:text-[3.25rem]">
                  40×
                </span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#009AD6]">
                  More Traction
                </span>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 mb-0 max-w-[18rem] leading-snug">
                  Boosted profiles can receive significantly more traction. In some cases, boosted creators have seen up to 40x more profile engagement than free listings.
                </p>
              </div>
              <div className="mb-4 rounded-xl border border-[#00AFF0]/20 bg-[#f0f8ff]/70 px-4 py-3 text-center">
                <p className="text-lg sm:text-xl font-black tabular-nums leading-none text-[#0077B3]">$197 for 1 Week.</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">one time payment</p>
              </div>
              <button
                type="button"
                onClick={() => startCreatorFlow('boosted')}
                className={`${primaryCta} w-full`}
                style={primaryCtaStyle}
              >
                Boost my profile
              </button>
              </div>
            </div>
          </div>

          <div className="mt-8 sm:mt-10">
            <SubmitContactBlock />
          </div>
        </section>
        )}

        <SubmitHowItWorks />

        {isOfmAgencies ? <OfmAgenciesPricingSection /> : null}

        {!isOfmAgencies && <AudienceSwitchCtas />}

        <SubmitContactBlock />
      </div>
      </div>

      <Footer />
    </div>
  );
}
