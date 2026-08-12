import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LINK_EXCHANGE_PARTNERS } from '@/lib/partners/linkExchangePartners';

export default function PartnersClient() {
  return (
    <div className="min-h-screen bg-[#04140c] text-white">
      <Navbar />

      <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c] mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5 min-w-0">
            <Link href="/" className="shrink-0">
              Home
            </Link>
            <span className="shrink-0">/</span>
            <span className="text-white font-semibold truncate">Partners</span>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 pt-8 sm:pt-10 pb-16">
        <header className="text-center mb-8 sm:mb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Trusted Sites & Partners.
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            A curated selection  and AI tools, adult platforms, and digital experiences we believe are worth discovering.
          </p>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {LINK_EXCHANGE_PARTNERS.map((partner) => (
            <li key={partner.href} className="h-full">
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
                aria-label={partner.name}
              >
                <article className="bg-[#04140c] rounded-xl overflow-hidden h-full flex flex-col border border-[#22c55e]/20">
                  <div className="w-full h-[120px] sm:h-[132px] bg-white shrink-0 flex items-center justify-center px-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      className="h-14 sm:h-16 w-auto max-w-[260px] object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="p-4 sm:p-5 flex flex-col flex-grow bg-[#04140c]">
                    <h2 className="text-sm sm:text-base font-black text-white mb-2 leading-tight">
                      {partner.name}
                    </h2>
                    <p className="text-white/75 text-xs sm:text-sm leading-relaxed">
                      {partner.description}
                    </p>
                  </div>
                </article>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <Footer />
    </div>
  );
}
