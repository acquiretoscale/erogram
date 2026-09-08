'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ErogramDevilGirlFooter from '@/components/ErogramDevilGirlFooter';
import { AinsfwSubmitFaq } from '../AINSFWPricingClient';
import {
  checkoutAINSFWListing,
  getAINSFWListingDraft,
  saveAINSFWListingDraft,
  type AINSFWListingDraft,
} from '@/lib/actions/ainsfwPayment';
import {
  AINSFW_PLAN_PRICES,
  type AINSFWPlan,
} from '@/lib/ainsfw/planPrices';

const ACCENT = '#22c55e';
const BORDER = '3px solid #000000';
const SHADOW = '4px 4px 0px #000000';
const CTA = '#facc15';
const PLAN_HEADER_BG = 'linear-gradient(160deg, #04140c 0%, #0a2e1a 60%, #064e3b 100%)';

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
      <path d="M2.5 8l3.5 3.5L13.5 4" />
    </svg>
  );
}

type PackageId = 'basic' | 'boost';

const BOOSTED_BASE_FEATURES = [
  'Permanent listing',
  'Listing with tool description, pricing + Logo.',
  'Edit anytime',
  'Lifetime organic exposure',
  'Listed on up to 6 relevant categories to maximise your exposure.',
  'Featured on recently added AI NSFW for 1 month.',
] as const;

const BOOSTED_PLUS_FEATURES = [
  'Instant approval',
  'Add up to 10 screenshots',
  'Add video preview',
  'Featured on up to 6 relevant categories to maximise your exposure for 30 days.',
] as const;

function CheckoutContactBlock() {
  return (
    <section className="max-w-2xl mx-auto w-full">
      <div
        className="rounded-lg px-4 py-4 sm:px-5 sm:py-4 text-center"
        style={{
          background: PLAN_HEADER_BG,
          border: `3px solid ${ACCENT}`,
          boxShadow: `6px 6px 0px ${ACCENT}`,
        }}
      >
        <p className="text-sm text-white/70 leading-snug mb-3">
          Need help? Have a question? Don&apos;t hesitate to get in touch:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href="mailto:isabella@erogram.biz"
            className="flex items-center justify-center gap-2 rounded-md bg-white px-3 py-2.5 text-center transition-transform hover:-translate-y-0.5"
            style={{ border: BORDER, boxShadow: SHADOW }}
          >
            <span className="text-base leading-none" aria-hidden="true">✉️</span>
            <span className="text-sm font-black text-black break-all">isabella@erogram.biz</span>
          </a>
          <a
            href="https://t.me/erogramDOTpro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-center text-black transition-transform hover:-translate-y-0.5"
            style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            <span className="text-sm font-black text-black">@erogramDOTpro</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function AINSFWCheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  const [username, setUsername] = useState<string | null>(null);
  const [draft, setDraft] = useState<AINSFWListingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<PackageId | null>(null);

  useEffect(() => {
    if (!draftId) {
      router.replace('/add/ainsfw');
      return;
    }
    void (async () => {
      setLoading(true);
      const token = localStorage.getItem('token') || undefined;
      const result = await getAINSFWListingDraft(draftId, token);
      if (!result.success || !result.draft) {
        setError(result.error || 'Draft not found.');
        setLoading(false);
        return;
      }
      setDraft(result.draft);
      setLoading(false);
    })();
  }, [draftId, router]);

  const saveContact = async (plan: AINSFWPlan, token?: string) => {
    if (!draft) return { success: false as const, error: 'Draft not found.' };
    return saveAINSFWListingDraft(
      plan,
      {
        toolName: draft.toolName,
        websiteUrl: draft.websiteUrl,
        email: draft.email.trim(),
        contactTelegram: draft.contactTelegram.trim(),
        description: draft.description,
        logoUrl: draft.logoUrl,
        category: draft.categories[0] || draft.category,
        extraCategories: draft.categories,
        vendor: draft.toolName,
        tags: draft.categories.flatMap((c) => [c, c.toLowerCase()]).join(', '),
        subscription: draft.subscription,
        paymentMethods: draft.paymentMethods,
        screenshots: draft.screenshots || [],
        videoUrl: draft.videoUrl || '',
      },
      token,
      draft.submissionId,
      { requireContact: true },
    );
  };

  const handlePay = async (plan: PackageId) => {
    if (!draft) return;
    if (!draft.email.trim() || !draft.email.includes('@')) {
      setError('Please provide a contact email.');
      return;
    }
    const token = localStorage.getItem('token') || undefined;

    setPaying(plan);
    setError('');
    try {
      const saved = await saveContact(plan, token);
      if (!saved.success) {
        setError(saved.error || 'Failed to save listing.');
        return;
      }

      const result = await checkoutAINSFWListing(draft.submissionId, plan, undefined, token);
      if (result.freeApproval) {
        window.location.href = `/add/ainsfw/thank-you?plan=${plan}&slug=${result.slug}`;
      } else if (result.success && result.invoiceUrl) {
        window.location.href = result.invoiceUrl;
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setPaying(null);
    }
  };

  const cryptoBtn = (plan: 'basic' | 'boost') => (
    <button
      type="button"
      disabled={!!paying}
      onClick={() => handlePay(plan)}
      className="w-full py-3.5 sm:py-4 px-3 text-black disabled:opacity-50 flex flex-col items-center justify-center gap-1 transition-all hover:opacity-95 active:translate-x-[2px] active:translate-y-[2px]"
      style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
    >
      {paying === plan ? (
        <span className="text-base sm:text-sm font-black uppercase tracking-widest leading-none">Processing...</span>
      ) : (
        <>
          <span className="text-sm sm:text-base font-black uppercase tracking-wide text-center leading-tight">
            {plan === 'basic' ? `LIST MY TOOL for $${AINSFW_PLAN_PRICES.basic}` : `BOOST MY TOOL for $${AINSFW_PLAN_PRICES.boost}`}
          </span>
          <span className="text-[11px] sm:text-xs font-semibold leading-tight">(One-time payment - USDT/Crypto)</span>
        </>
      )}
    </button>
  );

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar username={username} setUsername={setUsername} />

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-[4.75rem] sm:pt-20 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-16">
        <div className="flex items-center gap-2 text-sm font-bold text-white/40 mb-6 uppercase tracking-widest">
          <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
          <span className="text-white/20">/</span>
          <Link href="/add/ainsfw" className="hover:text-white/70 transition-colors">Add</Link>
        </div>

        {loading ? (
          <p className="text-center text-white/50 py-20">Loading...</p>
        ) : !draft ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-red-400 font-bold">{error || 'Checkout not available.'}</p>
            <Link href="/add/ainsfw" className="text-[#22c55e] font-bold hover:underline">Back to submit</Link>
          </div>
        ) : (
          <div className="space-y-6 lg:space-y-8">
            <Link
              href={`/add/ainsfw/preview?draft=${draft.submissionId}`}
              className="text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white"
            >
              ← Back
            </Link>

            {error && (
              <div className="px-4 py-3 text-sm font-bold text-white bg-red-600" style={{ border: BORDER }}>
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7 items-stretch">
              <div
                className="relative flex flex-col bg-white overflow-hidden h-full"
                style={{ border: `3px solid ${ACCENT}`, boxShadow: `6px 6px 0px ${ACCENT}`, color: '#000' }}
              >
                <div className="px-6 py-4" style={{ background: PLAN_HEADER_BG }}>
                  <p className="font-black uppercase leading-none tracking-tight text-[1.625rem] sm:text-[1.75rem] text-white">BASIC LISTING</p>
                </div>
                <div className="px-6 pb-6 pt-4 flex flex-col flex-1">
                  <p className="text-base sm:text-sm text-black/55 leading-relaxed mb-4">
                    Perfect for small AI NSFW tools to get that initial traction.
                  </p>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {['Permanent listing', 'Listing with tool description, pricing + Logo.', 'Edit anytime', 'Listing on 1 category', 'Instant approval'].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-lg sm:text-base font-semibold text-black/80">
                        <span style={{ color: ACCENT }} className="mt-0.5 shrink-0"><CheckMark /></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {cryptoBtn('basic')}
                </div>
              </div>

              <div
                className="relative flex flex-col bg-white overflow-hidden h-full"
                style={{ border: `3px solid ${ACCENT}`, boxShadow: `6px 6px 0px ${ACCENT}`, color: '#000' }}
              >
                <div className="px-6 py-4" style={{ background: PLAN_HEADER_BG }}>
                  <p className="font-black uppercase leading-none tracking-tight text-[1.625rem] sm:text-[1.75rem] text-white">BOOSTED LISTING</p>
                </div>
                <div className="px-6 pb-6 pt-4 flex flex-col flex-1">
                  <p className="text-base sm:text-sm text-black/55 leading-relaxed mb-4">
                    Perfect for getting your AI tool indexed, discoverable, and visible to thousands of high-intent users.
                  </p>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {BOOSTED_BASE_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-lg sm:text-base font-semibold text-black/80">
                        <span style={{ color: ACCENT }} className="mt-0.5 shrink-0"><CheckMark /></span>
                        {f}
                      </li>
                    ))}
                    {BOOSTED_PLUS_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-lg sm:text-base font-semibold text-black/80">
                        <span className="inline-flex w-4 shrink-0 items-center justify-center text-xl font-black leading-none mt-0.5" style={{ color: ACCENT }}>+</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {cryptoBtn('boost')}
                </div>
              </div>
            </div>

            <CheckoutContactBlock />

            <div className="mt-10 mb-10">
              <ErogramDevilGirlFooter />
            </div>
          </div>
        )}

        <AinsfwSubmitFaq tone="green" />
      </main>

      <Footer />
    </div>
  );
}
