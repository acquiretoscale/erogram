import type { Metadata } from 'next';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdvertiseContactForm from './AdvertiseContactForm';

export const metadata: Metadata = {
  title: 'Advertise With Us',
  description: 'Promote your Telegram group, channel, or product on erogram.pro. Banner ads, featured listings, and more.',
};

export default function AdvertisePage() {
  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-bold mb-4 border border-blue-500/30">
            Advertising
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Advertise With{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Erogram
            </span>
          </h1>
        </div>

        {/* Stats – real analytics screenshot */}
        <div className="mb-16 rounded-2xl overflow-hidden border border-white/10 shadow-xl">
          <Image
            src="/assets/advertise-stats.png"
            alt="Erogram analytics: visitors, pageviews, and engagement metrics"
            width={1200}
            height={680}
            className="w-full h-auto object-contain"
            priority
          />
        </div>

        {/* Ad Formats */}
        <div className="mb-16">
          <h2 className="text-2xl font-black mb-8 text-center">Available Ad Formats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Banner Ads',
                desc: 'Premium banner placements at the top of the page. High visibility on every page load.',
                icon: '🖼️',
              },
              {
                title: 'Featured Listings',
                desc: 'Get your Telegram group or channel pinned at the top of the listings with a "Featured" badge.',
                icon: '⭐',
              },
              {
                title: 'In-Feed Ads',
                desc: 'Native ads placed within the groups feed. Blend naturally with the content for higher engagement.',
                icon: '📱',
              },
              {
                title: 'Custom Campaigns',
                desc: 'Need something specific? We can create a custom advertising solution tailored to your goals.',
                icon: '🎯',
              },
            ].map((format) => (
              <div
                key={format.title}
                className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="text-3xl mb-3">{format.icon}</div>
                <h3 className="text-lg font-black text-white mb-2">{format.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{format.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact form – submissions go to adilmaf.agency@gmail.com via API */}
        <div className="glass rounded-3xl p-8 sm:p-12 border border-blue-500/20 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10">
          <h2 className="text-2xl sm:text-3xl font-black mb-8 text-center">GET IN TOUCH</h2>
          <AdvertiseContactForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
