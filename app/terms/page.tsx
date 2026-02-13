import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service – erogram.pro',
  description: 'Read the terms of service for erogram.pro. Understand user responsibilities, content guidelines, and service limitations.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center gradient-text">
          Terms of Service
        </h1>

        <div className="prose prose-lg prose-invert max-w-none">
          <p className="text-[#999] mb-8 text-center">
            Last Updated: {new Date().toLocaleDateString('en-US', { timeZone: 'UTC' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">1. Acceptance of Terms</h2>
            <p className="text-[#999] leading-relaxed">
              By accessing or using Erogram (erogram.pro), you agree to these Terms of Service ("Terms"). If you disagree, do not use the site. We reserve the right to modify these Terms at any time; continued use implies acceptance.
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              All services and data are provided by Eroverse.space.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">2. Description of Service</h2>
            <p className="text-[#999] leading-relaxed">
              Erogram is a directory for NSFW Telegram groups, channels, and AI companion bots. Services include browsing, joining groups, submitting reviews/reports, and viewing articles/ads. Content is user-generated and not endorsed by us.
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              We are not responsible for the content in channels posted on the directory site. We occasionally check their content to ensure they are obeying laws. Users are responsible and required to report any group that is breaking our rules or laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">3. Eligibility</h2>
            <p className="text-[#999] leading-relaxed">
              You must be at least 18 years old and capable of forming a binding contract. By using our site, you represent that you meet these requirements. NSFW content is intended for adults only.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">4. User Accounts</h2>
            <ul className="text-[#999] leading-relaxed space-y-2">
              <li>Registration requires Telegram authentication.</li>
              <li>You are responsible for maintaining account security and all activities under your account.</li>
              <li>We may suspend or terminate accounts for violations.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">5. User Conduct</h2>
            <p className="text-[#999] leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="text-[#999] leading-relaxed space-y-2">
              <li>Post illegal, harmful, offensive, or copyrighted content.</li>
              <li>Engage in harassment, spam, or unauthorized access.</li>
              <li>Use the site for commercial purposes without permission.</li>
              <li>Violate Telegram's terms or applicable laws.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">6. Content Ownership and Rights</h2>
            <ul className="text-[#999] leading-relaxed space-y-2">
              <li>User-generated content (reviews, reports, articles) remains your property but grants us a license to display and distribute it.</li>
              <li>We own site content; unauthorized use is prohibited.</li>
              <li>Report violations via our reporting tools.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">7. Advertisements and Third Parties</h2>
            <p className="text-[#999] leading-relaxed">
              Ads are served by third parties. We are not responsible for their content or practices. Clicking ads may redirect you or open popunders.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">8. Disclaimers and Limitation of Liability</h2>
            <ul className="text-[#999] leading-relaxed space-y-2">
              <li>Services are provided "as is" without warranties.</li>
              <li>We disclaim liability for damages from use, including loss of data or exposure to NSFW content.</li>
              <li>We are not responsible for content in Telegram groups or channels listed on our directory.</li>
              <li>Total liability is limited to the amount paid for services (if any).</li>
              <li>Adult content may be disturbing; use at your own risk.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">9. Indemnification</h2>
            <p className="text-[#999] leading-relaxed">
              You agree to indemnify us against claims arising from your use or violations of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">10. Termination</h2>
            <p className="text-[#999] leading-relaxed">
              We may terminate access for any reason. Upon termination, your rights cease, but provisions survive.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">11. Governing Law</h2>
            <p className="text-[#999] leading-relaxed">
              These Terms are governed by applicable international laws. Disputes will be resolved through binding arbitration.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">12. Contact Information</h2>
            <p className="text-[#999] leading-relaxed">
              For questions, email <a href="mailto:contact@eroverse.space" className="text-[#b31b1b] hover:underline">contact@eroverse.space</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}