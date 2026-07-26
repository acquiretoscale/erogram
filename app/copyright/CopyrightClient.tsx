'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function CopyrightClient() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar username={username} setUsername={setUsername} />

      <main className="max-w-4xl mx-auto px-4 pt-28 pb-16 sm:pb-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-center gradient-text">
          Copyright &amp; Takedown Policy
        </h1>
        <p className="text-[#999] mb-8 text-center">Last updated: July 26, 2026</p>

        <div className="prose prose-lg prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">1. Overview</h2>
            <p className="text-[#999] leading-relaxed">
              At EROGRAM.PRO (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we respect the intellectual property rights of others
              and expect our users to do the same. This Copyright &amp; Takedown Policy explains how to submit a
              copyright infringement notice and our process for handling such requests.
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              For users in the United States, we follow the notice and takedown framework of the Digital Millennium
              Copyright Act (17 U.S.C. § 512). We also respond to valid copyright complaints from other jurisdictions in
              accordance with applicable law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">2. Nature of Our Service</h2>
            <p className="text-[#999] leading-relaxed">
              EROGRAM.PRO is a directory. We index and list Telegram groups, channels, bots, AI tools, and creator
              profiles. Listings, descriptions, and images are largely submitted by users or drawn from publicly
              available sources. We do not host the content of the Telegram communities or third-party services we
              list; those live on their own platforms.
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              We still take copyright claims seriously. If you believe any listing, image, or text on our Service
              infringes your copyright (for example, because it reproduces a copyrighted work or contains copyrighted
              assets), you may file a DMCA notice as described below.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">3. User Submissions and Responsibility</h2>
            <p className="text-[#999] leading-relaxed">
              Listings, descriptions, reviews, and images on EROGRAM.PRO may be submitted by users. Users are
              responsible for ensuring that anything they submit does not infringe third-party rights. We may
              remove or disable access to content alleged to be infringing and may terminate accounts of repeat
              infringers in appropriate circumstances.
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              Note: Users may upload images as part of their listings and submissions on EROGRAM.PRO. Uploads are
              subject to review, and material alleged to be infringing can be removed at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">4. How to Submit a DMCA Takedown Notice</h2>
            <p className="text-[#999] leading-relaxed mb-4">
              If you are a copyright owner or are authorized to act on behalf of one, and you believe content available
              on our Service infringes your copyright, please send a written DMCA notice including the following
              information:
            </p>
            <ul className="text-[#999] leading-relaxed space-y-3 list-disc pl-6">
              <li>Your physical or electronic signature.</li>
              <li>
                Identification of the copyrighted work claimed to have been infringed, or a representative list if
                multiple works are covered.
              </li>
              <li>
                Identification of the material that is claimed to be infringing or to be the subject of infringing
                activity, and information reasonably sufficient to permit us to locate the material (URL(s) and any
                relevant screenshots).
              </li>
              <li>
                Your contact information, including your name, address, telephone number, and email address.
              </li>
              <li>
                A statement that you have a good-faith belief that use of the material in the manner complained of is
                not authorized by the copyright owner, its agent, or the law.
              </li>
              <li>
                A statement that the information in the notification is accurate, and under penalty of perjury, that you
                are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
              </li>
            </ul>
            <p className="text-[#999] leading-relaxed mt-4">
              Send your notice to our designated agent at:{' '}
              <a href="mailto:support@erogram.biz" className="text-[#b31b1b] hover:underline">
                support@erogram.biz
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">5. Counter-Notification / Objection</h2>
            <p className="text-[#999] leading-relaxed mb-4">
              If you believe your content was removed or disabled as a result of mistake or misidentification, you may
              submit a counter-notification. Your counter-notification must include:
            </p>
            <ul className="text-[#999] leading-relaxed space-y-3 list-disc pl-6">
              <li>Your physical or electronic signature.</li>
              <li>
                Identification of the material that has been removed or to which access has been disabled, and the
                location where the material appeared before removal.
              </li>
              <li>
                A statement that you have a good-faith belief that the material was removed or disabled as a result of
                mistake or misidentification.
              </li>
              <li>Your name, address, and contact information.</li>
              <li>
                For US users: Pursuant to 17 U.S.C. § 512(g), your counter-notification must also include a statement
                that you consent to the jurisdiction of the federal district court for the judicial district in which
                your address is located, and that you will accept service of process from the person who provided the
                original notification.
              </li>
            </ul>
            <p className="text-[#999] leading-relaxed mt-4">
              Send your counter-notification to:{' '}
              <a href="mailto:support@erogram.biz" className="text-[#b31b1b] hover:underline">
                support@erogram.biz
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">6. Our Response to Notices</h2>
            <p className="text-[#999] leading-relaxed">
              Upon receipt of a valid DMCA notice, we will promptly remove or disable access to the allegedly infringing
              material and notify the user who posted it. Where a valid counter-notification is received, we may restore
              the material in accordance with the DMCA unless the copyright owner files an action seeking a court order.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">7. Repeat Infringer Policy</h2>
            <p className="text-[#999] leading-relaxed">
              It is our policy, in appropriate circumstances, to disable and/or terminate the accounts of users who are
              repeat infringers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">8. Depictions of Real Persons</h2>
            <p className="text-[#999] leading-relaxed">
              If you believe any listing or image on our Service falsely portrays you or another real person, was
              published without consent, or improperly uses a copyrighted asset (e.g., a copyrighted character, logo, or
              image you own), please include those details in your notice so we can investigate and remove it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">9. Subpoenas and Requests for Information</h2>
            <p className="text-[#999] leading-relaxed">
              We may disclose user information in response to valid legal requests, including subpoenas, court orders,
              or other legal processes, consistent with applicable law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">10. Misrepresentations</h2>
            <p className="text-[#999] leading-relaxed">
              Any person who knowingly and materially misrepresents that material or activity is infringing may be
              liable for damages. Under US law (17 U.S.C. § 512(f)), this includes costs and attorneys&apos; fees.
              Knowingly false claims may also give rise to civil liability under other applicable laws. Please ensure
              your statements are accurate.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">11. Updates to This Policy</h2>
            <p className="text-[#999] leading-relaxed">
              We may update this DMCA Policy from time to time. Changes will be posted on this page with an updated
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">12. Governing Law</h2>
            <p className="text-[#999] leading-relaxed">
              For US-based claimants, the DMCA provisions (17 U.S.C. § 512) apply to the extent required. Claims from
              other jurisdictions are handled in accordance with applicable copyright law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">13. Designated Agent &amp; Contact</h2>
            <p className="text-[#999] leading-relaxed">Designated Agent for Copyright Takedown Notices:</p>
            <p className="text-[#999] leading-relaxed mt-2">
              Email:{' '}
              <a href="mailto:support@erogram.biz" className="text-[#b31b1b] hover:underline">
                support@erogram.biz
              </a>
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              By using the Service, you acknowledge that you have read and understand this Copyright &amp; Takedown
              Policy.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
