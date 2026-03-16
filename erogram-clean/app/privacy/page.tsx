import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy – erogram.pro',
  description: 'Learn how erogram.pro collects, uses, and protects your personal information. Our privacy policy covers data handling, cookies, and your rights.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center gradient-text">
          Privacy Policy
        </h1>

        <div className="prose prose-lg prose-invert max-w-none">
          <p className="text-[#999] mb-8 text-center">
            Last Updated: {new Date().toLocaleDateString('en-US', { timeZone: 'UTC' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">1. Introduction</h2>
            <p className="text-[#999] leading-relaxed">
              Erogram ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (erogram.pro) or use our services. By using our site, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our services.
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              All data collected through this website belongs to Eroverse.space, our parent organization.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold mb-3 text-[#f5f5f5]">Personal Information</h3>
            <p className="text-[#999] leading-relaxed mb-4">
              When you log in via Telegram, we collect your Telegram ID, username, first name, and profile photo URL. This is used solely for account creation and authentication.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-[#f5f5f5]">Usage Data</h3>
            <p className="text-[#999] leading-relaxed mb-4">
              We track interactions such as clicks on groups, channels, bots, or advertisements to improve our service and analytics. This includes IP addresses, browser type, and timestamps.
            </p>

            <h3 className="text-xl font-semibold mb-3 text-[#f5f5f5]">Cookies and Tracking Technologies</h3>
            <p className="text-[#999] leading-relaxed mb-4">
              We use cookies for consent management and session management. You can manage or disable cookies in your browser settings at any time. We ask for your consent before placing analytics cookies.
            </p>
            <h3 className="text-xl font-semibold mb-3 text-[#f5f5f5]">Analytics Services</h3>
            <p className="text-[#999] leading-relaxed mb-2">
              We use the following third-party analytics tools to understand how visitors interact with our website:
            </p>
            <ul className="text-[#999] leading-relaxed space-y-2 mb-4">
              <li>
                <strong className="text-[#f5f5f5]">Google Analytics 4 (GA4)</strong> — provided by Google LLC. GA4 collects anonymized usage data such as pages visited, session duration, and device type. Data may be transferred to and stored on Google servers in the United States. You can opt out via the{' '}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-[#b31b1b] hover:underline">Google Analytics Opt-out Browser Add-on</a>.
                Google&apos;s privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#b31b1b] hover:underline">policies.google.com/privacy</a>.
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 text-[#f5f5f5]">User-Generated Content</h3>
            <p className="text-[#999] leading-relaxed">
              Information you submit, such as reviews, reports, or articles, may be stored and displayed publicly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">3. How We Use Your Information</h2>
            <ul className="text-[#999] leading-relaxed space-y-2">
              <li>To provide and maintain our services, including user authentication and content delivery.</li>
              <li>To analyze usage trends, improve site functionality, and personalize recommendations.</li>
              <li>To serve targeted advertisements through third-party networks.</li>
              <li>To comply with legal obligations or enforce our Terms of Service.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">4. Sharing Your Information</h2>
            <p className="text-[#999] leading-relaxed mb-4">
              We do not sell your personal data. We may share information with:
            </p>
            <ul className="text-[#999] leading-relaxed space-y-2">
              <li>Third-party service providers (e.g., Telegram for authentication, Google for analytics).</li>
              <li>Law enforcement if required by law or to protect our rights.</li>
              <li>In aggregated, anonymized form for analytics purposes.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">5. Data Security</h2>
            <p className="text-[#999] leading-relaxed">
              We implement reasonable security measures to protect your data, but no method is 100% secure. Use strong passwords and report any breaches.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">6. Data Retention</h2>
            <p className="text-[#999] leading-relaxed">
              Personal data is retained as long as your account is active or as needed for legal purposes. Usage data may be kept indefinitely in anonymized form.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">7. Your Rights</h2>
            <p className="text-[#999] leading-relaxed mb-4">
              Under GDPR and applicable laws:
            </p>
            <ul className="text-[#999] leading-relaxed space-y-2">
              <li>Access, correct, or delete your data.</li>
              <li>Withdraw consent for processing.</li>
              <li>Object to data use for marketing.</li>
            </ul>
            <p className="text-[#999] leading-relaxed">
              Contact us at <a href="mailto:erogrampro@gmail.com" className="text-[#b31b1b] hover:underline">erogrampro@gmail.com</a> to exercise rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">8. Children's Privacy</h2>
            <p className="text-[#999] leading-relaxed">
              Our services are not intended for users under 18. We do not knowingly collect data from minors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">9. International Data Transfers</h2>
            <p className="text-[#999] leading-relaxed">
              Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">10. Changes to This Policy</h2>
            <p className="text-[#999] leading-relaxed">
              We may update this policy periodically. Continued use constitutes acceptance. We will notify users of significant changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">11. Contact Us</h2>
            <p className="text-[#999] leading-relaxed">
              For questions or to exercise your rights, email <a href="mailto:erogrampro@gmail.com" className="text-[#b31b1b] hover:underline">erogrampro@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}