'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { ExploreSiteListing, ExploreSiteListingBase } from '@/lib/explore/exploreSiteListings';
import { exploreSiteListingPath } from '@/lib/explore/exploreSiteListings';
import { exploreFaviconUrl } from '@/lib/explore/siteIconDomain';
import { updateExploreSiteListing } from '@/lib/actions/exploreAdmin';

const ACCENT = '#c0392f';

function AlternativeCard({ site }: { site: ExploreSiteListingBase }) {
  const favicon = exploreFaviconUrl(site.name, site.externalUrl);

  return (
    <Link
      href={exploreSiteListingPath(site.slug)}
      className="flex items-center gap-3 rounded-xl border border-[#c0392f]/15 bg-white px-3 py-2.5 hover:border-[#c0392f]/40 hover:bg-red-50 transition-colors"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={favicon || site.image}
        alt=""
        width={40}
        height={40}
        className="shrink-0 w-10 h-10 rounded-md border border-gray-200 bg-white object-contain"
      />
      <span className="min-w-0 text-[15px] font-semibold leading-tight text-gray-900 truncate">{site.name}</span>
    </Link>
  );
}

export default function ExploreSiteListingClient({
  listing,
  alternatives,
}: {
  listing: ExploreSiteListing;
  alternatives: ExploreSiteListingBase[];
}) {
  const favicon = exploreFaviconUrl(listing.name, listing.externalUrl);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [externalUrl, setExternalUrl] = useState(listing.externalUrl);
  const [description, setDescription] = useState(listing.description);
  const [error, setError] = useState('');

  useEffect(() => {
    setExternalUrl(listing.externalUrl);
    setDescription(listing.description);
  }, [listing.externalUrl, listing.description]);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.isAdmin) {
          setIsAdmin(true);
          localStorage.setItem('isAdmin', 'true');
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await updateExploreSiteListing(token, {
        categorySlug: listing.categorySlug,
        siteKey: listing.slug,
        externalUrl,
        description,
      });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="explore-page explore-bg explore-scanlines min-h-screen text-white relative">
      <Navbar accent={ACCENT} />

      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#c0392f]/15 bg-[#140404]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-5xl mx-auto">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5 min-w-0 flex-wrap">
            <Link href="/" className="hover:text-white transition-colors shrink-0">
              Home
            </Link>
            <span className="shrink-0">/</span>
            <Link href="/porn-websites" className="hover:text-white transition-colors shrink-0">
              Porn Websites
            </Link>
            <span className="shrink-0">/</span>
            <Link href={`/porn-websites#${listing.categorySlug}`} className="hover:text-white transition-colors shrink-0">
              {listing.categoryTitle}
            </Link>
            <span className="shrink-0">/</span>
            <span className="text-white font-semibold truncate">{listing.name}</span>
          </nav>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10 pb-16">
        <article className="rounded-2xl border border-[#c0392f]/20 bg-white overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]">
          <div className="px-5 py-4 border-b border-[#c0392f]/20 bg-[#1a0808] flex items-center gap-3">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="" width={32} height={32} className="w-8 h-8 rounded-md border border-white/10 bg-white object-contain" />
            ) : null}
            <h1 className="text-xl sm:text-2xl font-black tracking-[0.04em] uppercase text-white flex-1 min-w-0 truncate">
              {listing.name}
            </h1>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="shrink-0 text-[10px] font-black tracking-[0.12em] uppercase px-3 py-1.5 rounded-lg border border-white/20 text-white hover:bg-white/10"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            ) : null}
          </div>

          <div className="flex flex-col md:flex-row">
            <div className="md:w-[42%] shrink-0 bg-[#0f0f0f] border-b md:border-b-0 md:border-r border-[#c0392f]/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.image}
                alt={listing.name}
                className="w-full h-full min-h-[220px] object-cover block"
                loading="eager"
              />
            </div>

            <div className="flex-1 px-5 py-5 sm:px-6 sm:py-6 bg-white flex flex-col justify-center">
              {editing ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-[11px] font-black tracking-[0.12em] uppercase text-gray-500">Website link</span>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black tracking-[0.12em] uppercase text-gray-500">Description</span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={6}
                      className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                    />
                  </label>
                  {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-black tracking-[0.12em] uppercase text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: ACCENT }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[15px] leading-relaxed text-gray-700 font-medium">{description}</p>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="mt-6 inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black tracking-[0.12em] uppercase text-white hover:opacity-90 transition-opacity"
                    style={{ background: ACCENT }}
                  >
                    Visit {listing.name}
                  </a>
                </>
              )}
            </div>
          </div>
        </article>

        {alternatives.length > 0 ? (
          <section className="mt-8 sm:mt-10">
            <h2 className="text-lg sm:text-xl font-black tracking-[0.04em] uppercase text-white mb-4">
              Here are the best alternatives to {listing.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alternatives.map((site) => (
                <AlternativeCard key={site.slug} site={site} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Footer />
    </div>
  );
}
