import type { Metadata } from 'next';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CheckoutForm from './CheckoutForm';
import CheckoutTrust from './CheckoutTrust';

export const metadata: Metadata = {
  title: 'CHECKOUT',
  robots: { index: false, follow: false },
};

const BORDER = '3px solid #000000';
const SHADOW = '6px 6px 0px #000000';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col text-white" style={{ backgroundColor: '#0B1220' }}>
      <Navbar />
      <main className="flex-1 px-4 pt-28 sm:pt-32 pb-10">
        <div className="mx-auto w-full max-w-md text-center">
          <Image
            src="/assets/erogram-gold-mascot.webp"
            alt=""
            width={530}
            height={502}
            priority
            className="mx-auto mb-3 h-auto w-32 bg-transparent sm:w-40"
          />
          <p className="mt-4 text-base font-black text-white">Thanks for choosing EROGRAMX! 🚀</p>
          <p className="mt-2 text-sm leading-snug text-white">
            You&apos;re one step away from getting your tool in front of EROGRAM&apos;s audience ;)
          </p>
          <div className="mt-5 bg-white p-4 text-left text-black sm:p-5" style={{ border: BORDER, boxShadow: SHADOW }}>
            <h1 className="mb-4 text-xl font-black text-black">CHECKOUT</h1>
            <CheckoutForm />
          </div>
          <CheckoutTrust />
          <div className="mx-auto mt-6 max-w-md text-sm leading-snug text-white">
            <h2 className="text-sm font-black">How it works</h2>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-left">
              <li>Enter your tool name</li>
              <li>Enter the total amount</li>
              <li>Add your contact email so we can send your confirmation and live link.</li>
              <li>Pay in the crypto of your choice. Fast, secure and private.</li>
            </ol>
            <h2 className="mt-3 text-sm font-black">What happens next</h2>
            <p className="mt-1">
              As soon as your payment is confirmed, our team gets to work on your order.
            </p>
            <h2 className="mt-3 text-sm font-black">Need Assistance?</h2>
            <p className="mt-1">
              Drop us an Email to{' '}
              <a href="mailto:isabella@erogram.biz" className="font-black underline">isabella@erogram.biz</a>
              {' '}or message our Team on Telegram at{' '}
              <a href="https://t.me/erogramDOTpro" target="_blank" rel="noopener noreferrer" className="font-black underline">@erogramDOTpro</a>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
