'use client';

import Link from 'next/link';
import { FormEvent } from 'react';
import { Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import OFFooter from '@/components/OFFooter';
import { useLocalePath, useTranslation } from '@/lib/i18n/client';

export default function OnlyFansSearchStaticShell() {
  const { t } = useTranslation();
  const lp = useLocalePath();

  function blockSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="min-h-screen bg-[#111111] text-[#f5f5f5]">
      <Navbar variant="onlyfans" />

      <main className="pt-24 sm:pt-28">
        <section className="bg-gradient-to-b from-[#00AFF0]/10 via-[#00AFF0]/[0.04] to-[#111111] pt-6 pb-16 sm:pt-8 sm:pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/40 mb-4">
              <Link href={lp('/')} className="hover:text-[#00AFF0] transition-colors">
                {t('bestOnlyfans.breadcrumbHome')}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-white/70">{t('bestOnlyfans.breadcrumbOfSearch')}</span>
            </nav>

            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight">
                {t('ofSearch.heroTitle')}
                <span className="text-[#00AFF0]">{t('ofSearch.heroTitleAccent')}</span>
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-white/50 max-w-md mx-auto">
                {t('ofSearch.heroDesc')}
              </p>
            </div>

            <form onSubmit={blockSearch} className="relative max-w-3xl mx-auto w-full">
              <div className="relative w-full min-w-0">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#9ca3af]"
                />
                <input
                  type="search"
                  name="q"
                  readOnly
                  aria-readonly="true"
                  placeholder={t('ofSearch.searchPlaceholder')}
                  className="w-full h-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-black bg-white text-[15px] text-gray-900 placeholder:text-gray-400 shadow-[4px_4px_0_0_#000] focus:outline-none focus:ring-0 focus:border-black"
                />
                <button
                  type="submit"
                  aria-label={t('common.search')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-lg bg-[#00AFF0] text-white border-2 border-black shadow-[2px_2px_0_0_#000]"
                >
                  <Search size={18} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <OFFooter />
    </div>
  );
}
