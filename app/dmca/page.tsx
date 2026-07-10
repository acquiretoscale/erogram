import { Metadata } from 'next';
import Link from 'next/link';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'DMCA Notice of Copyright Infringement – erogram.pro';
const description =
  'Submit a DMCA copyright infringement notice to Erogram.pro. Learn how to report unauthorized use of copyrighted material on our website.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${CANONICAL_BASE}/dmca` },
  ...buildSocialMeta({
    title,
    description,
    url: `${CANONICAL_BASE}/dmca`,
    type: 'website',
  }),
};

export default function DmcaPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center gradient-text">
          DMCA Notice of Copyright Infringement
        </h1>

        <div className="prose prose-lg prose-invert max-w-none">
          <section className="mb-8">
            <p className="text-[#999] leading-relaxed">
              In accordance with the Digital Millennium Copyright Act of 1998 (the text of which may be found on the
              U.S. Copyright Office website at{' '}
              <a
                href="http://lcweb.loc.gov/copyright/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#b31b1b] hover:underline"
              >
                http://lcweb.loc.gov/copyright/
              </a>
              ), Erogram.pro will respond expeditiously to claims of copyright infringement that are reported to
              Erogram.pro designated copyright agent identified below. Please also note that under Section 512(f) any
              person who knowingly materially misrepresents that material or activity is infringing may be subject to
              liability. Erogram.pro reserves the right at its sole and entire discretion, to remove content and
              terminate the accounts of Erogram.pro users who infringe, or appear to infringe, the intellectual property
              or other rights of third parties.
            </p>
          </section>

          <section className="mb-8">
            <p className="text-[#999] leading-relaxed mb-4">
              If you believe that your copywriten work has been copied in a way that constitutes copyright infringement,
              please provide Erogram.pro copyright agent the following information:
            </p>
            <ul className="text-[#999] leading-relaxed space-y-3 list-disc pl-6">
              <li>
                A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive
                right that is allegedly infringed;
              </li>
              <li>
                Identification of the copyright work claimed to have been infringed, or, if multiple copyrighted works
                at a single online site are covered by a single notification, a representative list of such works at
                the Website;
              </li>
              <li>
                Identification of the material that is claimed to be infringing or to be the subject of infringing
                activity and that is to be removed or access to which is to be disabled, and information reasonably
                sufficient to permit Erogram.pro to locate the material;
              </li>
              <li>
                Information reasonably sufficient to permit Erogram.pro to contact the complaining party, including a
                name, address, telephone number and, if available, an email address at which the complaining party may
                be contacted;
              </li>
              <li>
                A statement that the complaining party has a good-faith belief that use of the material in the manner
                complained of is not authorized by the copyright owner, its agent or the law; and
              </li>
              <li>
                A statement that the information in the notification is accurate and, under penalty of perjury, that
                the complaining party is authorized to act on behalf of the owner of an exclusive right that is
                allegedly infringed.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <p className="text-[#999] leading-relaxed">
              All claims of copyright infringement on or regarding this Website should be delivered to Erogram.pro
              designated copyright agent at the following address:
            </p>
            <p className="text-[#999] leading-relaxed mt-4">
              <Link href="/contact" className="text-[#b31b1b] hover:underline font-semibold">
                Copyright Contact Form
              </Link>
            </p>
          </section>

          <section>
            <p className="text-[#999] leading-relaxed">
              We apologize for any kind of misuse of our service and promise to do our best to find and terminate
              abusive files.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
