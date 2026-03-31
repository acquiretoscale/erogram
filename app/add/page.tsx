import { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getLocale, getPathname } from '@/lib/i18n/server';
import { getDictionary, LOCALES, localePath } from '@/lib/i18n';

const canonicalBase = 'https://erogram.pro';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const pathname = await getPathname();
  const dict = await getDictionary(locale);
  return {
    title: dict.meta.addTitle,
    description: dict.meta.addDesc,
    alternates: {
      canonical: `${canonicalBase}${pathname}`,
      languages: Object.fromEntries(LOCALES.map(l => [l, `${canonicalBase}${localePath('/add', l)}`])),
    },
  };
}

const GroupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
    <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
  </svg>
);

const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="9" cy="16" r="1" />
    <circle cx="15" cy="16" r="1" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const AINsfwIcon = () => (
  <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border border-current/35 bg-white/10 text-[8px] font-black leading-none tracking-tight">
    18+
  </span>
);

export default function AddPage() {
  const btnClass = "flex items-center justify-center gap-2 w-full px-5 py-4 rounded-xl text-base font-bold text-[#4ab3f4] bg-[#0088cc]/[0.10] border border-[#0088cc]/25 hover:bg-[#0088cc]/[0.18] hover:text-[#6ec6f7] transition-all no-underline";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-4 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Get Listed on Erogram</h1>
          <p className="text-[#888] text-sm">Get listed on the largest NSFW hub and reach thousands of new users.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/add/group" className={btnClass}><GroupIcon /> Submit your Telegram Group</Link>
          <Link href="/add/bot" className={btnClass}><BotIcon /> Submit your Telegram Bot</Link>
          <Link href="/add/ainsfw" className={btnClass}><AINsfwIcon /> Submit your AI NSFW Tool</Link>
          <Link href="/submit" className="flex items-center justify-center gap-2 w-full px-5 py-4 rounded-xl text-base font-bold text-[#00AFF0] bg-[#00AFF0]/[0.10] border border-[#00AFF0]/25 hover:bg-[#00AFF0]/[0.18] hover:text-[#3dc4f7] transition-all no-underline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            Submit OnlyFans Creator
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
