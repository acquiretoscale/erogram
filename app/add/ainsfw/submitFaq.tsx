import Link from 'next/link';
import type { ReactNode } from 'react';

export const SUBMIT_FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'Can you list our AI tool for free or in exchange for a high affiliate commission?',
    a: (
      <>
        <p>
          We receive dozens of emails from amazing AI tools and adult websites asking for promotional opportunities in exchange for very high affiliate commissions, revenue shares, and similar offers.
        </p>
        <p className="mt-3">Unfortunately, our priority is to allocate visibility to our paying clients and partners.</p>
        <p className="mt-3">
          Our pricing is extremely competitive, even for a basic listing, and unlike many other websites, we offer a{' '}
          <strong className="text-white/90 font-semibold">lifetime placement</strong> rather than charging monthly or yearly fees.
        </p>
        <p className="mt-3">It&apos;s a small investment for long-term exposure and SEO benefits for your website.</p>
        <p className="mt-3">
          If you have any questions, feel free to reach out to us at{' '}
          <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:underline">isabella@erogram.biz</a>
          {' '}or on Telegram at{' '}
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] hover:underline">@erogramDOTpro</a>.
        </p>
      </>
    ),
  },
  {
    q: 'I\'m scaling and need a lot of traffic. What\'s the maximum traffic EROGRAMX can deliver?',
    a: (
      <>
        <p>If you&apos;re looking to scale aggressively, our custom advertising packages can deliver significantly more traffic than our standard listing plans. Visit <Link href="/promo" className="text-[#4ade80] hover:underline">Promo page</Link> for more details</p>
      </>
    ),
  },
  {
    q: 'What happens when my featured campaign ends?',
    a: (
      <>
        <p>Your permanent listing will remain live on EROGRAMX.</p>
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
    q: 'I purchased Basic or BOOST. How long before my tool is live?',
    a: (
      <>
        <p>Most listings go live in less than 24h. All listings get reviewed and optimized by our team for better result.</p>
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
        <p className="mt-3">
          For details on placements, pricing, and packages, visit our{' '}
          <Link href="/promo" className="text-[#4ade80] hover:underline">Promo page</Link>.
        </p>
        <p className="mt-3">If you want to maximize exposure, we&apos;d be happy to build a custom campaign around your goals. Feel free to reach out at{' '}
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] hover:underline">@EROGRAMDOTPRO</a>
          {' '}on Telegram or{' '}
          <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:underline">isabella@erogram.biz</a>
        </p>
      </>
    ),
  },
  {
    q: 'I can\'t find an answer to my question.',
    a: (
      <>
        <p>
          Still have questions we haven&apos;t covered? No problem! Feel free to reach out to our team on{' '}
          <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="text-[#4ade80] hover:underline">Telegram</a>
          {' '}or by email at{' '}
          <a href="mailto:isabella@erogram.biz" className="text-[#4ade80] hover:underline">isabella@erogram.biz</a>
          . We&apos;re happy to help.
        </p>
      </>
    ),
  },
  {
    q: 'My website isn\'t AI NSFW. Do you have sections for other categories?',
    a: (
      <>
        <p>
          Absolutely! We also offer listings with do-follow backlinks in our{' '}
          <Link href="/best-porn" className="text-[#4ade80] hover:underline">Porn Websites</Link>
          {' '}section, provided your website fits one of our existing categories, such as cam sites, porn sites, JAV, Asian, and more.
        </p>
      </>
    ),
  },
];

export function FaqPlainAnswer({ text, linkClassName }: { text: string; linkClassName: string }) {
  const marker = 'checkout page';
  const parts = text.split(marker);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 ? (
            <a href="/checkout" className={linkClassName}>checkout page</a>
          ) : null}
        </span>
      ))}
    </>
  );
}

export function SubmitFaqItems({
  borderClass,
}: {
  borderClass: string;
}) {
  return (
    <>
      {SUBMIT_FAQ.map((faq) => (
        <details
          key={faq.q}
          className={`group rounded-xl overflow-hidden ${borderClass}`}
        >
          <summary className="flex items-center justify-between gap-4 cursor-pointer px-5 py-4 text-white font-semibold text-base sm:text-base list-none [&::-webkit-details-marker]:hidden">
            <span>{faq.q}</span>
            <svg className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 text-white/50 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </summary>
          <div className="px-5 pb-5 text-white/70 text-base sm:text-sm leading-relaxed">{faq.a}</div>
        </details>
      ))}
    </>
  );
}
