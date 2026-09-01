'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLocalePath } from '@/lib/i18n/client';
import type { CategorySitemapSection } from '../categorySitemapBrowse';

export default function CategoriesClient({
  sections,
  lastUpdated,
}: {
  sections: CategorySitemapSection[];
  lastUpdated: string;
}) {
  const lp = useLocalePath();

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <Navbar variant="onlyfans" />

      <main className="pt-20 sm:pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-xl sm:text-2xl font-black text-white mb-1">Categories Sitemap</h1>
          <p className="text-sm text-white/45 mb-8">Last updated: {lastUpdated}</p>

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="mb-10">
              <h2 className="text-base font-bold text-white/70 mb-3">{section.label}</h2>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={lp(item.href)}
                      className="text-sm text-[#00AFF0] hover:underline leading-relaxed"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
