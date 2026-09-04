'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { submitAbuseReport } from '@/lib/actions/reportAbuse';

const VIOLATION_TYPES = [
  { id: 'Illegal Content', desc: 'Content that violates laws' },
  { id: 'Minor Depiction', desc: 'Content depicting or suggesting minors' },
  { id: 'Non-Consensual Content', desc: 'Content shared without consent' },
  { id: 'Impersonation', desc: 'Listing or content impersonating a real person' },
  { id: 'Identity Misuse', desc: "Someone's identity or photos used without permission" },
  { id: 'Copyright Infringement', desc: 'Copyrighted material used without authorization' },
  { id: 'Harassment', desc: 'Harassing or threatening content' },
  { id: 'Scam or Spam', desc: 'Fake, fraudulent, or spammy listing' },
  { id: 'Other', desc: 'Other policy violation' },
];

const CONTENT_TYPES = ['Telegram Group', 'Telegram Bot', 'AI NSFW Tool', 'OnlyFans Creator Page', 'Image', 'User', 'Other'];

const INFO_CARDS = [
  { title: 'Confidential', desc: 'Reports can be anonymous. Your identity is protected.' },
  { title: 'Reviewed Promptly', desc: 'Reports are reviewed and resolved within 5 business days.' },
  { title: 'Documented', desc: 'Every report is logged, tracked, and actioned.' },
];

export default function ReportAbuseClient() {
  const [username, setUsername] = useState<string | null>(null);
  const [violationType, setViolationType] = useState('');
  const [contentType, setContentType] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await submitAbuseReport({ violationType, contentType, url, description, email });
      if (res.success) {
        setDone(true);
      } else {
        setError(res.error || 'Failed to submit report. Please try again.');
      }
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar username={username} setUsername={setUsername} />

      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16 sm:pb-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-center gradient-text">Report Abuse</h1>
        <p className="text-[#999] mb-10 text-center max-w-xl mx-auto">
          Help us maintain a safe platform. Report policy violations, illegal content, or abuse. All reports are
          confidential and reviewed promptly.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {INFO_CARDS.map((c) => (
            <div key={c.title} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <p className="text-sm font-bold text-white mb-1">{c.title}</p>
              <p className="text-xs text-[#999] leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {done ? (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
            <p className="text-xl font-bold text-white mb-2">Report submitted</p>
            <p className="text-sm text-[#999]">
              Thank you for helping keep Erogram safe. Our team will review your report promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm font-bold text-white mb-3">
                What type of violation are you reporting? <span className="text-[#b31b1b]">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VIOLATION_TYPES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setViolationType(v.id)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      violationType === v.id
                        ? 'border-[#b31b1b] bg-[#b31b1b]/10'
                        : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{v.id}</p>
                    <p className="text-xs text-[#999]">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-3">
                What are you reporting? <span className="text-[#b31b1b]">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setContentType(c)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                      contentType === c
                        ? 'border-[#b31b1b] bg-[#b31b1b]/10 text-white'
                        : 'border-white/[0.08] bg-white/[0.03] text-[#b8b2ab] hover:bg-white/[0.06]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">URL of the content (if applicable)</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://erogramx.com/..."
                className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">
                Description <span className="text-[#b31b1b]">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
                rows={6}
                required
                placeholder="Please describe the issue in detail. Include any relevant context, usernames, or specific content details..."
                className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none resize-none"
              />
              <p className="text-xs text-[#666] mt-1 text-right">{description.length}/5000</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">Your email (optional, for follow-up)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[#f5f5f5] placeholder:text-gray-500 focus:ring-2 focus:ring-[#b31b1b] focus:border-transparent outline-none"
              />
            </div>

            {error && <p className="text-sm text-[#e0245e] font-semibold">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !violationType || !contentType || !description.trim()}
              className="w-full bg-[#b31b1b] hover:bg-[#c0392f] text-white font-bold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>

            <p className="text-xs text-[#666] text-center">
              False reports may result in action against the reporter.
            </p>
            <p className="text-xs text-[#666] text-center">
              For DMCA takedown requests, see our{' '}
              <Link href="/copyright" className="text-[#b31b1b] hover:underline">
                Copyright &amp; Takedown Policy
              </Link>
              . For general inquiries, email{' '}
              <a href="mailto:support@erogram.biz" className="text-[#b31b1b] hover:underline">
                support@erogram.biz
              </a>
              .
            </p>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
