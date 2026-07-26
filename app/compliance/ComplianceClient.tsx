'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ComplianceClient() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem('username'));
  }, []);

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar username={username} setUsername={setUsername} />

      <main className="max-w-4xl mx-auto px-4 pt-28 pb-16 sm:pb-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-center gradient-text">
          Record-Keeping &amp; Content Compliance Statement
        </h1>
        <p className="text-[#999] mb-8 text-center">Last modified: July 26, 2026</p>

        <div className="prose prose-lg prose-invert max-w-none">
          <section className="mb-8">
            <p className="text-[#999] leading-relaxed">
              This statement addresses how EROGRAM.PRO handles content record-keeping requirements, including US law
              (18 U.S.C. § 2257), and our content standards.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">US Record-Keeping Exemption (18 U.S.C. § 2257)</h2>
            <p className="text-[#999] leading-relaxed mb-4">
              EROGRAM.PRO is a directory. We index and list Telegram groups, channels, bots, AI tools, and creator
              profiles. The visual materials displayed on this website are exempt from the provisions of 18 U.S.C.
              § 2257, 18 U.S.C. § 2257A, and 28 C.F.R. Part 75 because:
            </p>
            <ul className="text-[#999] leading-relaxed space-y-3 list-disc pl-6">
              <li>
                EROGRAM.PRO is not a producer, whether primary or secondary, of any sexually explicit content. We do
                not create, film, photograph, or commission any such material.
              </li>
              <li>
                Images shown on the Service are listing thumbnails, logos, previews, and promotional materials for
                third-party communities and services. They do not portray actual human beings engaged in actual or
                simulated sexually explicit conduct.
              </li>
              <li>
                The communities, bots, and services listed in our directory are operated by third parties on their own
                platforms. Any record-keeping obligations for content hosted there rest with the respective operators
                and producers of that content.
              </li>
            </ul>
            <p className="text-[#999] leading-relaxed mt-4">
              Where user submissions include images, those images are used solely to illustrate the listing and are
              subject to moderation before and after publication.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">Content Standards and Moderation</h2>
            <p className="text-[#999] leading-relaxed">
              EROGRAM.PRO maintains a strict prohibition against any content depicting or suggesting minors, and
              against any listing that promotes illegal content. The platform employs automated and manual moderation
              to detect and prevent prohibited content, and listings found to violate these standards are removed.
              Detected violations involving child sexual abuse material are reported to the relevant authorities,
              including the National Center for Missing &amp; Exploited Children (NCMEC) and law enforcement.
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              Users are required to report any listed group, bot, or service that appears to break our rules or the
              law. Reports can be submitted through the report function on each listing or by email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-[#f5f5f5]">Contact</h2>
            <p className="text-[#999] leading-relaxed">
              For questions or clarification regarding our compliance with record-keeping regulations or content
              standards, please contact us at{' '}
              <a href="mailto:support@erogram.biz" className="text-[#b31b1b] hover:underline">
                support@erogram.biz
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
