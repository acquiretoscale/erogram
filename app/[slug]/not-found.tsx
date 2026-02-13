import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Group Not Found | erogram',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center px-6">
      <div className="glass rounded-2xl p-12 backdrop-blur-lg border border-white/10 text-center max-w-md w-full">
        <div className="text-6xl mb-6">😔</div>
        <h1 className="text-3xl font-black text-[#f5f5f5] mb-4">Group Not Found</h1>
        <p className="text-[#999] mb-8">Sorry, we couldn't find this group.</p>
        <Link
          href="/groups"
          className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
        >
          Browse Groups
        </Link>
      </div>
    </div>
  );
}

