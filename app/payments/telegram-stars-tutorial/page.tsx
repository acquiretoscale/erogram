import type { Metadata } from 'next';
import Link from 'next/link';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const R2 = 'https://pub-5800916b33a845e4b67e2d5be553c1e3.r2.dev/premium/tutorials/stars';
const MODAL_SHELL =
  'rounded-3xl border border-[#2AABEE]/25 bg-[#17212b] shadow-[0_0_60px_rgba(42,171,238,0.18),inset_0_1px_0_rgba(42,171,238,0.14)]';
const WHITE_INSET = 'rounded-2xl bg-white';
const PREMIUM_GOLD = {
  background: 'linear-gradient(135deg, #f5d061 0%, #c9973a 45%, #a67c00 100%)',
  color: '#2a1f00',
  border: '1px solid #e8c547',
  boxShadow: '0 0 10px rgba(201,151,58,0.45)',
};

const title = 'Telegram Stars Payment Tutorial | Erogram';
const description =
  'Step-by-step guide to paying for Erogram VIP with a bank card, Apple Pay, or Google Pay through Telegram Stars.';

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: false },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/payments/telegram-stars-tutorial`,
    type: 'website',
  }),
};

const STEPS = [
  {
    title: 'Step 1 - Select your plan and click Pay',
    body: 'Go to the Erogram VIP page, pick 3 months or 1 year, and tap the Pay button. Telegram opens with your Stars invoice.',
    image: null as string | null,
  },
  {
    title: 'Step 2 - Confirm the Telegram payment popup',
    body: 'After tapping Pay on Erogram, you land in Telegram with a payment popup for your Erogram VIP subscription.',
    image: null,
  },
  {
    title: 'Step 3 - Buy Telegram Stars',
    body: 'If you do not have enough Stars yet, tap Confirm and Pay for the Star amount shown on your invoice.',
    image: `${R2}/tg-stars-variants.avif`,
  },
  {
    title: 'Step 4 - Pay with your preferred method',
    body: 'Choose how many Stars you need and pay instantly using:',
    bullets: ['Your bank card', 'Google Pay', 'Apple Pay'],
    image: `${R2}/tg-stars-apple-confirm.avif`,
  },
  {
    title: 'Step 5 - VIP activated automatically',
    body: 'Right after Telegram confirms payment, Erogram VIP unlocks on your account. Return to the site and open the Vault.',
    image: null,
  },
];

const TIPS = [
  {
    title: 'If Stars were not deducted for VIP',
    body: 'Go back to the VIP page and tap Pay again. Repeat Step 1 and Step 2. That usually fixes it.',
  },
  {
    title: 'Cannot pay with your card?',
    body: 'Try Apple Pay or Google Pay in the Telegram mobile app, or use Telegram on the web. If it still fails, contact support.',
  },
  {
    title: 'Price may vary slightly due to Telegram fees',
    body: 'The final amount can be a bit higher than shown on Erogram. We do not add markup. That is Telegram’s commission.',
  },
  {
    title: 'Did not receive VIP after payment?',
    body: 'Email support@erogram.biz with your Erogram username and plan. We will activate manually within a few minutes.',
  },
];

export default function TelegramStarsTutorialPage() {
  return (
    <div className="min-h-screen bg-[#0e1621]">
      <div className="relative z-10 max-w-[520px] mx-auto px-3 sm:px-4 pt-5 pb-16">
        <Link
          href="/premium-x"
          className="mb-4 flex w-full items-center justify-center rounded-full px-5 py-4 text-base sm:text-lg font-black uppercase tracking-wide transition-all hover:brightness-110 active:scale-95"
          style={PREMIUM_GOLD}
        >
          EROGRAMX PREMIUM checkout
        </Link>

        <section className={`mb-4 p-4 sm:p-5 ${MODAL_SHELL}`}>
          <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
            How to pay for Erogram VIP using Bank Card via Telegram
          </h1>
          <p className="mt-2 text-[12px] sm:text-[13px] leading-relaxed text-white/55">
            Buying Stars with a bank card happens inside Telegram in a few taps. Follow the steps below for screenshots and troubleshooting.
          </p>
        </section>

        <div className="space-y-4">
          {STEPS.map((step) => (
            <section key={step.title} className={`p-4 sm:p-5 ${MODAL_SHELL}`}>
              <h2 className="text-lg sm:text-xl font-black text-white">{step.title}</h2>
              <div className={`${WHITE_INSET} mt-3 p-3.5`}>
                <p className="text-[13px] leading-relaxed text-gray-800">{step.body}</p>
                {'bullets' in step && step.bullets ? (
                  <ul className="list-decimal mt-2 space-y-1.5 pl-5 text-[13px] leading-relaxed text-gray-800">
                    {step.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
                {step.image ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-[#2AABEE]/25 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={step.image} alt="" className="h-auto w-full object-contain" loading="lazy" decoding="async" />
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <section className={`mt-4 p-4 sm:p-5 ${MODAL_SHELL}`}>
          <h2 className="text-lg sm:text-xl font-black text-white text-center mb-3">Important tips</h2>
          <div className={`${WHITE_INSET} overflow-hidden divide-y divide-gray-200`}>
            {TIPS.map((tip) => (
              <div key={tip.title} className="px-3.5 py-3">
                <p className="text-[12px] sm:text-[13px] font-bold text-gray-900 leading-snug">{tip.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-gray-600">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`mt-4 p-4 sm:p-5 ${MODAL_SHELL} text-center`}>
          <h2 className="text-lg sm:text-xl font-black text-white">
            Still have questions about paying with a bank card via Telegram?
          </h2>
          <p className="mt-3 text-[12px] leading-relaxed text-white/70">
            Telegram:{' '}
            <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="font-bold text-[#2AABEE] underline">
              @erogramDOTpro
            </a>
            {' · '}
            Email:{' '}
            <a href="mailto:support@erogram.biz" className="font-bold text-[#2AABEE] underline">
              support@erogram.biz
            </a>
          </p>
          <Link
            href="/premium-x"
            className="mt-4 flex w-full items-center justify-center rounded-full px-5 py-4 text-base sm:text-lg font-black uppercase tracking-wide transition-all hover:brightness-110 active:scale-95"
            style={PREMIUM_GOLD}
          >
            EROGRAMX PREMIUM checkout
          </Link>
        </section>
      </div>
    </div>
  );
}
