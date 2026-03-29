'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createAINsfwInvoice, type AINSFWPlan } from '@/lib/actions/ainsfwSubmission';

const AINSFW_CATEGORIES = ['AI Girlfriend', 'Undress AI', 'AI Chat', 'AI Image', 'AI Roleplay'] as const;

interface PlanConfig {
  plan: AINSFWPlan;
  label: string;
  price: number | null;
  badge: string | null;
  perks: string[];
  highlight: boolean;
  icon: string;
  gradient: string;
  border: string;
  accent: string;
}

const PLANS: PlanConfig[] = [
  {
    plan: 'platinum',
    label: 'PLATINUM',
    price: 499,
    badge: 'BEST VALUE',
    perks: [
      '1 Month featured across Erogram',
      'AI NSFW, Groups & Bots: 400+ clicks/day',
      'Instant approval',
      'Multiple categories listing',
    ],
    highlight: true,
    icon: '\u{1F451}',
    gradient: 'linear-gradient(135deg, rgba(201,151,58,0.30), rgba(180,130,40,0.15))',
    border: '#c9973a',
    accent: '#d4a84b',
  },
  {
    plan: 'boost',
    label: 'BOOST + Instant',
    price: 97,
    badge: 'POPULAR',
    perks: [
      'Get approved instantly',
      '7 days featured in AI NSFW',
      'Multiple category listings',
      'Get found fast',
    ],
    highlight: false,
    icon: '\u{1F680}',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.30), rgba(234,88,12,0.15))',
    border: '#f97316',
    accent: '#fb923c',
  },
  {
    plan: 'instant',
    label: 'INSTANT Approval',
    price: 39,
    badge: null,
    perks: [
      'Skip the moderation queue',
      'Goes live immediately',
      'Basic listing position',
    ],
    highlight: false,
    icon: '\u{26A1}',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.30), rgba(20,184,166,0.15))',
    border: '#06b6d4',
    accent: '#22d3ee',
  },
  {
    plan: 'free',
    label: 'Basic Listing',
    price: null,
    badge: null,
    perks: [
      'Manual review (up to 7 days)',
      'Standard listing position',
    ],
    highlight: false,
    icon: '\u{1F4CB}',
    gradient: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.12)',
    accent: '#666',
  },
];

export default function AddAINsfwClient() {
  const [username, setUsername] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AINSFWPlan>('boost');
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    category: 'AI Girlfriend' as string,
    vendor: '',
    websiteUrl: '',
    description: '',
    contactEmail: '',
  });

  if (typeof window !== 'undefined' && !username) {
    const stored = localStorage.getItem('username');
    if (stored) setUsername(stored);
  }

  const isFormFilled =
    form.name.trim().length > 0 &&
    form.websiteUrl.trim().length > 0 &&
    form.description.trim().length >= 30 &&
    form.contactEmail.trim().includes('@');

  const handleSubmit = async () => {
    setError('');

    if (!form.name.trim() || !form.websiteUrl.trim() || !form.description.trim() || !form.contactEmail.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.description.trim().length < 30) {
      setError('Description must be at least 30 characters.');
      return;
    }
    if (!form.contactEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      new URL(form.websiteUrl);
    } catch {
      setError('Please enter a valid website URL.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedPlan === 'free') {
        setStep('done');
        return;
      }

      const result = await createAINsfwInvoice(
        selectedPlan,
        form.name.trim(),
        form.websiteUrl.trim(),
        form.contactEmail.trim(),
        form.category,
      );

      if (!result.success) {
        setError(result.error || 'Payment creation failed.');
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const planInfo = PLANS.find((p) => p.plan === selectedPlan)!;

  if (step === 'done') {
    return (
      <>
        <Navbar username={username} setUsername={setUsername} />
        <main className="pt-28 pb-16 px-4 max-w-lg mx-auto text-center">
          <div className="text-6xl mb-6">{'\u2705'}</div>
          <h1 className="text-2xl font-black text-white mb-2">Thank You!</h1>
          <p className="text-[#ccc] mb-8">
            Your AI NSFW tool <span className="text-white font-bold">{form.name}</span> has been submitted for review.
            {selectedPlan === 'free' && " We'll review it within 7 days."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setStep('form');
                setForm({ name: '', category: 'AI Girlfriend', vendor: '', websiteUrl: '', description: '', contactEmail: '' });
                setSelectedPlan('boost');
              }}
              className="px-6 py-3 rounded-full font-bold text-white text-sm bg-gradient-to-r from-emerald-600 to-green-500"
            >
              Add Another Tool
            </button>
            <Link href="/ainsfw" className="px-6 py-3 rounded-full font-bold text-white text-sm bg-white/10 hover:bg-white/20 no-underline">
              Browse AI NSFW
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar username={username} setUsername={setUsername} />
      <main className="pt-28 pb-16 px-4 max-w-5xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#06b6d4] mb-3">AI NSFW Directory</p>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            List Your AI Tool on Erogram
          </h1>
          <p className="text-[#999] max-w-xl mx-auto">
            Get discovered by thousands of users daily searching for AI NSFW tools.
            Choose your plan and submit below.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mb-12">
          <p className="text-sm font-bold text-[#999] mb-5 text-center uppercase tracking-wider">Choose Your Plan</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((p) => {
              const isSelected = selectedPlan === p.plan;
              return (
                <motion.button
                  key={p.plan}
                  type="button"
                  onClick={() => setSelectedPlan(p.plan)}
                  whileTap={{ scale: 0.97 }}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                    p.highlight && isSelected ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0a]' : ''
                  }`}
                  style={{
                    background: p.gradient,
                    borderColor: isSelected ? p.border : 'rgba(255,255,255,0.08)',
                    ...(p.highlight && isSelected ? { ringColor: p.border } : {}),
                  }}
                >
                  {p.badge && (
                    <span
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-0.5 rounded-full text-white whitespace-nowrap"
                      style={{ background: p.accent }}
                    >
                      {p.badge}
                    </span>
                  )}

                  <div className="text-center mb-3 pt-1">
                    <div className="text-3xl mb-2">{p.icon}</div>
                    <div className="font-black text-white text-sm tracking-wide">{p.label}</div>
                  </div>

                  <div className="text-center mb-4">
                    {p.price !== null ? (
                      <>
                        <span className="text-3xl font-black text-white">${p.price}</span>
                        <span className="text-xs text-[#888] ml-1">one-time</span>
                      </>
                    ) : (
                      <span className="text-2xl font-black text-[#666]">Free</span>
                    )}
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {p.perks.map((perk) => (
                      <li key={perk} className="text-xs flex items-start gap-1.5 text-white/70">
                        <span className="mt-0.5 shrink-0" style={{ color: p.accent }}>{'\u2713'}</span>
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <div
                    className="flex items-center justify-center gap-2 py-2 rounded-full text-xs font-bold transition-all"
                    style={{
                      background: isSelected ? p.accent : 'rgba(255,255,255,0.06)',
                      color: isSelected ? (p.plan === 'free' ? '#fff' : '#000') : '#666',
                    }}
                  >
                    {isSelected ? '\u2713 Selected' : 'Select'}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {selectedPlan !== 'free' && (
            <p className="mt-4 text-center text-xs text-[#666] flex items-center justify-center gap-1.5">
              <span className="text-base">{'\u20BF'}</span>
              Payment in cryptocurrency via NowPayments &mdash; USDT, BTC, ETH &amp; more
            </p>
          )}
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
            <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              {'\u{1F9E0}'} AI NSFW Tool Details
            </h2>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">Tool Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((d) => ({ ...d, name: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  placeholder="e.g. DreamGF, Clothoff, CrushOn..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((d) => ({ ...d, category: e.target.value }))}
                  className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white"
                >
                  {AINSFW_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">Vendor / Company</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) => setForm((d) => ({ ...d, vendor: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  placeholder="Your company or brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">Website URL *</label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => setForm((d) => ({ ...d, websiteUrl: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  placeholder="https://your-tool.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">Contact Email *</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((d) => ({ ...d, contactEmail: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500"
                  placeholder="you@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#ccc] mb-1">Description * <span className="text-[#666] font-normal">(min 30 characters)</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((d) => ({ ...d, description: e.target.value }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 resize-none"
                  placeholder="Describe your AI NSFW tool &mdash; what it does, key features, what makes it unique..."
                  rows={4}
                />
                <p className="text-xs text-[#666] mt-1">{form.description.length}/30 min</p>
              </div>
            </motion.div>

            {/* Rules */}
            <div className="mt-6 mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5">
              <p className="text-xs font-bold text-red-400 mb-1.5">Submission Rules</p>
              <ul className="text-[11px] text-[#999] space-y-1">
                <li className="flex items-start gap-1.5"><span className="text-red-400 shrink-0">{'\u2715'}</span> No illicit activities or scams of any kind</li>
                <li className="flex items-start gap-1.5"><span className="text-red-400 shrink-0">{'\u2715'}</span> Violations result in removal without refund</li>
              </ul>
            </div>

            {/* Submit */}
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormFilled}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-full font-black text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all text-base"
              style={{
                background: !isFormFilled
                  ? '#333'
                  : selectedPlan === 'free'
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : `linear-gradient(135deg, ${planInfo.accent}, ${planInfo.border})`,
                color: selectedPlan !== 'free' && isFormFilled && selectedPlan !== 'platinum' ? '#000' : '#fff',
              }}
            >
              {isSubmitting
                ? 'Processing...'
                : selectedPlan === 'free'
                  ? 'Submit for Review'
                  : `Submit & Pay $${PLANS.find((p) => p.plan === selectedPlan)?.price} in Crypto`}
            </motion.button>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm text-center font-semibold">
                {error}
              </div>
            )}

            {selectedPlan !== 'free' && (
              <p className="mt-3 text-center text-xs text-[#555]">
                After submission, you&apos;ll be redirected to a secure crypto payment page.
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <p className="mt-8 text-center text-[#666] text-sm">
          <Link href="/add" className="text-[#0088cc] hover:underline">Add Group / Bot</Link>
          {' \u00B7 '}
          <Link href="/ainsfw" className="text-[#0088cc] hover:underline">Browse AI NSFW</Link>
          {' \u00B7 '}
          <Link href="/groups" className="text-[#0088cc] hover:underline">Browse Groups</Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
