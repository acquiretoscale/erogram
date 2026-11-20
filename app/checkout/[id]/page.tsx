import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/db/mongodb';
import { CustomCheckout } from '@/lib/models';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout — Erogram',
  robots: { index: false, follow: false },
};

type CheckoutDoc = {
  description: string;
  amountUsd: number;
  status: string;
};

export default async function CheckoutStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const checkout = await CustomCheckout.findOne({ publicId: id }).lean() as CheckoutDoc | null;
  if (!checkout) notFound();

  const paid = checkout.status === 'paid';
  const amountLabel = checkout.amountUsd % 1 === 0
    ? `$${checkout.amountUsd}`
    : `$${checkout.amountUsd.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 pt-28 sm:pt-32 pb-16">
        <div className="w-full max-w-lg">
          <div
            className="bg-white p-6 sm:p-8 text-center"
            style={{ border: '3px solid #000000', boxShadow: '6px 6px 0px #000000' }}
          >
            <p className="text-black break-words">{checkout.description}</p>
            <p className="text-3xl font-black text-black mt-3">{amountLabel}</p>
            {paid ? (
              <p className="mt-6 font-bold">Payment received</p>
            ) : (
              <>
                <p className="mt-6 text-black/70">Payment not finished yet.</p>
                <Link href="/checkout" className="inline-block mt-4 font-black underline">Back to checkout</Link>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
