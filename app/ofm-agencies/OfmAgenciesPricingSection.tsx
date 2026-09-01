'use client';

import ErogramWordmark from '@/components/ErogramWordmark';
const OF_DARK = '#009AD6';
const OF_DARKER = '#0077B3';
const agencyHeaderBg = 'linear-gradient(160deg, #041828 0%, #0a2840 55%, #0d3550 100%)';

const primaryCtaStyle = {
  background: `linear-gradient(135deg, ${OF_DARK} 0%, ${OF_DARKER} 100%)`,
  border: `2px solid ${OF_DARKER}`,
  boxShadow: '0 6px 20px -6px rgba(0,119,179,0.45)',
} as const;

const outlineCtaStyle = {
  background: '#fff',
  border: `2px solid ${OF_DARKER}`,
} as const;

type AgencyPackage = {
  id: string;
  name: string;
  price: string;
  pricePeriod?: 'Month';
  subtitle: string;
  campaignPrimary: string;
  campaignSecondary: string;
  features: string[];
  cta: string;
  popular?: boolean;
  enterprise?: boolean;
};

const AGENCY_PACKAGES: AgencyPackage[] = [
  {
    id: 'growth',
    name: 'Growth',
    price: '$197',
    subtitle: 'Perfect for growing agencies',
    campaignPrimary: '2,800 clicks',
    campaignSecondary: 'Delivered in one week or one month',
    cta: 'Get Growth',
    features: [
      'Self-service onboarding and ad setup',
      'Run ads for up to 5 OnlyFans profiles',
      'Target up to 5 keywords and 5 locations per profile',
      'Rank in our lists at the top of Google',
      '24/7 customer support',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '$800',
    subtitle: 'Up to 30 creators',
    campaignPrimary: '10K clicks',
    campaignSecondary: 'Delivered in one week or one month',
    cta: 'Get Scale',
    popular: true,
    features: [
      'White-glove onboarding service',
      'We set your ads up for you (or you can do it yourself)',
      'Run ads for up to 30 OnlyFans profiles',
      'Target up to 25 keywords and 25 locations per profile',
      'Rank higher in our lists at the top of Google',
      '24/7 customer support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$2,800',
    pricePeriod: 'Month',
    subtitle: 'Unlimited everything',
    campaignPrimary: 'Around 45K clicks',
    campaignSecondary: 'Delivered in 1 month',
    cta: 'Get Enterprise',
    enterprise: true,
    features: [
      'White-glove onboarding service',
      'We set your ads up for you (or you can do it yourself)',
      'Run ads for unlimited OnlyFans profiles',
      'Target unlimited keywords and locations per profile',
      'Rank at the top of our lists at the top of Google',
      '24/7 customer support',
      'Performance Guarantee',
      'Split testing creator images (You can test out up to 10 image variation, to see which one converts best)',
      'Dashboard to track performance',
      'Possibility to allocate % of traffic to specific creators',
      'GEO targeting: So we only show your ads to specific countries (Limited to: US/UK/DE/NL/CA/IT)',
    ],
  },
];

const TRUST_BADGES = [
  { icon: '🔒', label: 'Secure Payment' },
  { icon: '⚡', label: 'Instant Setup' },
  { icon: '🎯', label: 'Guaranteed Results' },
  { icon: '💬', label: '24/7 Support' },
] as const;

/** Same spend → click count. Competitor clicks = spend ÷ public CPC (Aug 2026). */
const COMPETITOR_CPC = [
  { key: 'onlysearch', name: 'OnlySearch', cpc: 0.75 },
  { key: 'juicysearch', name: 'JuicySearch', cpc: 0.5 },
  { key: 'creatortraffic', name: 'CreatorTraffic', cpc: 0.5 },
  { key: 'juicyscout', name: 'JuicyScout', cpc: 0.1 },
] as const;

const CLICK_COMPARISON = [
  { tier: 'Growth', spend: 197, spendLabel: '$197', erogramClicks: 2800, popular: false },
  { tier: 'Scale', spend: 800, spendLabel: '$800', erogramClicks: 10000, popular: true },
  { tier: 'Enterprise', spend: 2800, spendLabel: '$2,800', erogramClicks: 45000, popular: false },
] as const;

function formatClicks(n: number) {
  return n.toLocaleString('en-US');
}

function competitorClicks(spend: number, cpc: number) {
  return Math.round(spend / cpc);
}

const AGENCY_FAQ = [
  {
    q: 'What is erogramx.com?',
    a: 'erogramx.com is a Google-style search engine specifically for OnlyFans. It helps people find exactly the kind of creator they\'re looking for based on niche, content type, location, or even personality type. It\'s a powerful discovery tool used by fans ready to pay, not another social platform or promotion page. It connects motivated subscribers to creators, helping models get discovered without relying on social media.',
  },
  {
    q: 'How does EROGRAMX work?',
    a: 'EROGRAMX offers an easy-to-use index for searching specific OnlyFans content using thousands of keywords. Users can search by niche, acts, demographics, and more. Creators assign hyper-specific keywords to their profiles to match subscriber searches and can block unwanted keywords. It boosts visibility on EROGRAMX, and Google. You track performance in a dashboard, and optimize profiles with bio, images, subscription price, and location targeting.',
  },
  {
    q: 'Why do agencies use EROGRAMX?',
    a: 'Agencies use EROGRAMX to scale over 30 of the top OnlyFans agencies with targeted traffic that converts.',
  },
] as const;

function packageMailto(pkg: AgencyPackage) {
  return `mailto:isabella@erogram.biz?subject=${encodeURIComponent(`${pkg.name} Agency Package`)}`;
}

export default function OfmAgenciesPricingSection() {
  return (
    <section id="agencies" className="scroll-mt-28 relative left-1/2 w-[min(100vw-2rem,72rem)] max-w-6xl -translate-x-1/2">
      <div className="text-center mb-8 sm:mb-10 px-1">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-[0.06em] text-gray-900 mb-3">
          Choose Your Agency Package
        </h2>
        <p className="text-[15px] sm:text-base leading-relaxed text-gray-600 max-w-2xl mx-auto">
          Scale your OnlyFans agency with our enterprise-grade advertising platform
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
        {AGENCY_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative flex flex-col overflow-hidden rounded-2xl bg-white ${
              pkg.popular
                ? 'border-2 border-[#00AFF0]/50 shadow-[0_20px_50px_-16px_rgba(0,119,179,0.45)] ring-1 ring-[#00AFF0]/20 lg:scale-[1.02]'
                : 'border border-[#00AFF0]/25 shadow-[0_12px_40px_-16px_rgba(0,175,240,0.2)]'
            }`}
          >
            {pkg.popular && (
              <div className="absolute top-0 inset-x-0 z-10 flex justify-center -translate-y-1/2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.16em] text-white bg-gradient-to-r from-[#009AD6] to-[#00AFF0] border border-[#0077B3] shadow-md">
                  Most Popular
                </span>
              </div>
            )}
            {pkg.enterprise && (
              <div className="px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#0077B3] bg-gradient-to-r from-[#f0f8ff] to-[#dceefb] border-b border-[#00AFF0]/20">
                👑 ENTERPRISE
              </div>
            )}

            <div
              className="px-6 py-6 sm:py-7 text-center border-b border-white/10"
              style={{ background: pkg.popular || pkg.enterprise ? agencyHeaderBg : 'linear-gradient(180deg, #f0f8ff 0%, #ffffff 100%)' }}
            >
              <p className={`text-2xl sm:text-3xl font-black uppercase tracking-[0.06em] leading-tight ${pkg.popular || pkg.enterprise ? 'text-white' : 'text-[#009AD6]'}`}>
                {pkg.name}
              </p>
              <p className={`mt-2 font-black tabular-nums leading-none ${pkg.popular || pkg.enterprise ? 'text-white' : 'text-[#0077B3]'}`}>
                <span className="text-4xl sm:text-5xl">{pkg.price}</span>
                {pkg.pricePeriod ? (
                  <span className={`ml-2 text-lg sm:text-xl font-bold uppercase tracking-[0.08em] ${pkg.popular || pkg.enterprise ? 'text-white/70' : 'text-gray-500'}`}>
                    / {pkg.pricePeriod}
                  </span>
                ) : null}
              </p>
              <p className={`mt-2 text-sm sm:text-[15px] font-semibold ${pkg.popular || pkg.enterprise ? 'text-white/80' : 'text-gray-600'}`}>
                {pkg.subtitle}
              </p>
            </div>

            <div className="p-6 sm:p-7 flex flex-col flex-1">
              <div
                className="mb-5 rounded-xl px-4 py-3 text-center"
                style={{
                  background: 'linear-gradient(135deg, #f0f8ff 0%, #dceefb 100%)',
                  border: '2px solid rgba(0,175,240,0.35)',
                }}
              >
                <p className="text-sm sm:text-base font-black text-[#0077B3]">{pkg.campaignPrimary}</p>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-gray-600">{pkg.campaignSecondary}</p>
              </div>

              <ul className="space-y-2.5 mb-6 list-none text-sm sm:text-[15px] leading-relaxed text-gray-700 flex-1">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span className="text-[#00AFF0] shrink-0">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={packageMailto(pkg)}
                className="inline-flex items-center justify-center w-full px-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-[2px]"
                style={pkg.popular ? primaryCtaStyle : outlineCtaStyle}
              >
                <span className={pkg.popular ? 'text-white' : 'text-[#0077B3]'}>{pkg.cta}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 sm:mt-10 text-center text-sm sm:text-base font-semibold text-gray-700 px-2">
        Trusted by 60 out of the top 100 OnlyFans agencies globally
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {TRUST_BADGES.map((badge) => (
          <span
            key={badge.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#00AFF0]/25 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm"
          >
            <span aria-hidden="true">{badge.icon}</span>
            {badge.label}
          </span>
        ))}
      </div>

      <div className="mt-10 sm:mt-14 max-w-5xl mx-auto">
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 text-center">
          Same money. How many clicks?
        </h3>
        <p className="text-center text-sm text-gray-500 mb-6 px-2">
          Spend the package price on competitors at their public CPC. See how many clicks you get vs{' '}
          <ErogramWordmark className="inline text-[0.95em]" textClassName="text-gray-900" />.
        </p>

        <div className="overflow-x-auto rounded-2xl border-2 border-[#00AFF0]/35 bg-white shadow-[0_12px_40px_-16px_rgba(0,175,240,0.3)]">
          <table className="w-full min-w-[720px] text-center text-sm sm:text-[15px]">
            <thead>
              <tr className="border-b border-[#00AFF0]/20 bg-[#041828] text-white">
                <th className="px-3 sm:px-4 py-3.5 text-left font-bold">Your spend</th>
                <th className="px-3 sm:px-4 py-3.5 font-bold bg-[#009AD6]/30">
                  <ErogramWordmark className="inline text-sm" textClassName="text-white" />
                </th>
                {COMPETITOR_CPC.map((c) => (
                  <th key={c.key} className="px-3 sm:px-4 py-3.5 font-semibold text-white/85">
                    <span className="block">{c.name}</span>
                    <span className="block text-[11px] font-medium text-white/55">${c.cpc.toFixed(2)}/click</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLICK_COMPARISON.map((row) => (
                <tr
                  key={row.tier}
                  className={
                    row.popular
                      ? 'border-b border-[#00AFF0]/15 bg-[#f0f8ff]'
                      : 'border-b border-gray-100 last:border-0'
                  }
                >
                  <td className="px-3 sm:px-4 py-4 text-left">
                    <span className="font-black text-gray-900 uppercase tracking-wide">{row.tier}</span>
                    <span className="block text-sm font-semibold text-gray-500">{row.spendLabel}</span>
                    {row.popular ? (
                      <span className="mt-1 inline-block text-[9px] font-black uppercase tracking-wider text-white bg-[#009AD6] px-1.5 py-0.5 rounded">
                        Popular
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 sm:px-4 py-4 bg-[#00AFF0]/8">
                    <span className="text-xl sm:text-2xl font-black tabular-nums text-[#0077B3]">
                      {formatClicks(row.erogramClicks)}
                    </span>
                    <span className="block text-xs font-semibold text-[#009AD6]">clicks</span>
                  </td>
                  {COMPETITOR_CPC.map((c) => (
                    <td key={c.key} className="px-3 sm:px-4 py-4 text-gray-500">
                      <span className="text-base sm:text-lg font-bold tabular-nums text-gray-600">
                        ~{formatClicks(competitorClicks(row.spend, c.cpc))}
                      </span>
                      <span className="block text-xs text-gray-400">clicks</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-xs text-gray-400 px-2">
          Competitor click counts = package price ÷ their public CPC (Aug 2026).
        </p>
      </div>

      <div className="mt-10 sm:mt-12 max-w-3xl mx-auto">
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-4 text-center">FAQ</h3>
        <div className="space-y-3">
          {AGENCY_FAQ.map((faq) => (
            <details key={faq.q} className="group rounded-2xl border border-[#00AFF0]/20 bg-white overflow-hidden shadow-[0_8px_30px_-12px_rgba(0,175,240,0.18)]">
              <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 text-gray-900 font-semibold text-base list-none [&::-webkit-details-marker]:hidden">
                <span>{faq.q}</span>
                <svg className="w-5 h-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </summary>
              <div className="px-5 pb-5 text-[15px] leading-relaxed text-gray-600 border-t border-[#00AFF0]/10 pt-4">
                <p>{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
