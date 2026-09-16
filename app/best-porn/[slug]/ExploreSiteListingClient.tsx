'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeaderBanner from '@/components/HeaderBanner';
import ShareDropdown from '@/components/ShareDropdown';
import FlameReviewSection, { type FlameReviewItem } from '@/components/FlameReviewSection';
import { getActiveCampaigns } from '@/lib/actions/campaigns';
import { getCreatorReviews, submitCreatorReview, type CreatorReviewData } from '@/lib/actions/ofCreatorProfile';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/placeholder';
import type { ExploreSiteListing, ExploreSiteListingBase } from '@/lib/explore/exploreSiteListings';
import { exploreListingRootSlug, exploreSiteListingPath, getExploreListingCategories } from '@/lib/explore/exploreSiteListings';
import { updateExploreSiteListing } from '@/lib/actions/exploreAdmin';

const ACCENT = '#c0392f';
const CATEGORY_ROOT: Record<string, string> = {
  'best-live-asian-sex-cams': 'best-asian-sex-cams',
  'best-live-sex-cams': 'best-live-sex-cam-websites',
};

function categoryHref(categorySlug: string): string {
  return `/${CATEGORY_ROOT[categorySlug] || categorySlug}`;
}

function listingDescriptionParagraphs(text: string): string[] {
  const raw = text.trim();
  if (!raw) return [];
  const existing = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (existing.length >= 2) return existing;

  const sentences = raw.split(/(?<=[.!?])\s+(?=[A-Z“"'])/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 1) return [raw];

  const n = sentences.length;
  const paraCount = n <= 2 ? n : n <= 4 ? 2 : n <= 6 ? 3 : 4;
  const paras: string[] = [];
  const base = Math.floor(n / paraCount);
  let extra = n % paraCount;
  let i = 0;
  for (let p = 0; p < paraCount; p++) {
    const take = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    paras.push(sentences.slice(i, i + take).join(' '));
    i += take;
  }
  return paras.filter(Boolean);
}

function ExploreBookmark({ siteKey }: { siteKey: string }) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    try {
      setBookmarked(localStorage.getItem(`explore_bookmark_${siteKey}`) === '1');
    } catch {}
  }, [siteKey]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !bookmarked;
        try {
          localStorage.setItem(`explore_bookmark_${siteKey}`, next ? '1' : '0');
        } catch {}
        setBookmarked(next);
      }}
      className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 hover:bg-neutral-200 flex items-center justify-center transition-colors"
      aria-label={bookmarked ? 'Remove from saved' : 'Save'}
      title={bookmarked ? 'Remove from saved' : 'Save'}
    >
      <svg width={22} height={22} viewBox="0 0 24 24" fill={bookmarked ? ACCENT : 'none'} stroke={bookmarked ? ACCENT : '#1a1a1a'} strokeWidth="1.7" strokeLinejoin="round">
        <path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v16L12 16.25 5.5 21V5A1.5 1.5 0 0 1 7 3.5z" />
      </svg>
    </button>
  );
}

export default function ExploreSiteListingClient({
  listing,
  alternatives,
}: {
  listing: ExploreSiteListing;
  alternatives: ExploreSiteListingBase[];
}) {
  const rootSlug = exploreListingRootSlug(listing.slug, listing.categorySlug);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [externalUrl, setExternalUrl] = useState(listing.externalUrl);
  const [description, setDescription] = useState(listing.description);
  const [error, setError] = useState('');
  const [heroImage, setHeroImage] = useState(listing.image || PLACEHOLDER_IMAGE_URL);
  const [liveTopBanners, setLiveTopBanners] = useState<{ _id: string; creative: string; destinationUrl: string }[]>([]);
  const [flameReviews, setFlameReviews] = useState<CreatorReviewData[]>([]);
  const [flameKey, setFlameKey] = useState(0);

  useEffect(() => {
    setExternalUrl(listing.externalUrl);
    setDescription(listing.description);
    setHeroImage(listing.image || PLACEHOLDER_IMAGE_URL);
  }, [listing.externalUrl, listing.description, listing.image]);

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

  useEffect(() => {
    getActiveCampaigns('top-banner', { page: 'join' })
      .then((banners) => {
        const b = banners as { _id: string; creative: string; destinationUrl: string }[];
        if (b.length > 0 && b[0].creative) setLiveTopBanners(b);
      })
      .catch(() => {});
  }, [listing.slug]);

  useEffect(() => {
    getCreatorReviews(rootSlug).then((data) => setFlameReviews(data.reviews)).catch(() => {});
  }, [rootSlug]);

  const flameReviewItems: FlameReviewItem[] = flameReviews.map((r) => ({
    authorName: r.authorName,
    authorAvatar: r.authorAvatar,
    rating: r.rating,
    text: r.content,
    createdAt: r.createdAt
      ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
  }));
  const reviewCount = flameReviews.length;
  const reviewAvg = reviewCount > 0
    ? Math.round((flameReviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
    : 0;
  const flameRating = Math.round(reviewAvg);
  const reviewsLabel = reviewCount === 1 ? '1 review' : `${reviewCount} reviews`;

  async function refreshFlameReviews() {
    const data = await getCreatorReviews(rootSlug);
    setFlameReviews(data.reviews);
    setFlameKey((k) => k + 1);
  }

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
    <div className="explore-page explore-bg explore-scanlines min-h-screen text-white relative overflow-x-hidden">
      <Navbar accent={ACCENT} />

      <div className="relative z-20 border-b border-[#c0392f]/15 bg-[#140404]/80 backdrop-blur-xl mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none p-0 m-0 text-xs sm:text-sm text-gray-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li aria-hidden="true" className="text-gray-600 select-none">/</li>
              <li>
                <Link href="/best-porn" className="hover:text-white transition-colors">Porn Websites</Link>
              </li>
              <li aria-hidden="true" className="text-gray-600 select-none">/</li>
              <li className="text-white font-medium truncate max-w-[50vw] sm:max-w-md" aria-current="page">
                {listing.name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-2">
        <HeaderBanner campaigns={liveTopBanners} />
      </div>

      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-110"
          onError={() => setHeroImage(PLACEHOLDER_IMAGE_URL)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#140404]/80 via-[#140404]/90 to-[#140404]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)]">
              <div className="rounded-xl overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt={listing.name}
                  className="w-full h-auto block"
                  onError={() => setHeroImage(PLACEHOLDER_IMAGE_URL)}
                />
              </div>
              <a
                href={externalUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center rounded-xl py-4 text-base font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: ACCENT }}
              >
                Visit {listing.name}
              </a>
              <button
                type="button"
                onClick={() => document.getElementById('listing-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#c0392f]/20 bg-[#c0392f]/5 hover:bg-[#c0392f]/10 transition-colors"
                aria-label={`See all ${reviewCount} reviews`}
              >
                <div className="flex items-center gap-0.5 shrink-0" aria-hidden>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      className={`w-4 h-4 ${reviewCount > 0 && s <= flameRating ? 'text-[#c0392f]' : 'text-gray-300'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-base font-bold text-[#c0392f]">{reviewsLabel}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4 mb-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-900 leading-tight tracking-tight">
                {listing.name}
              </h1>
              <div className="flex items-center gap-2 shrink-0 mt-2">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 hover:bg-neutral-200 flex items-center justify-center text-neutral-800 transition-colors"
                    title="Edit listing"
                  >
                    {editing ? '×' : '✏️'}
                  </button>
                ) : null}
                <ShareDropdown title={listing.name} slug={rootSlug} kindLabel="porn website" light />
                <ExploreBookmark siteKey={listing.slug} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              {getExploreListingCategories(listing).map((category) => (
                <Link
                  key={category.slug}
                  href={categoryHref(category.slug)}
                  className="px-4 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-200 transition-colors"
                >
                  #{category.title}
                </Link>
              ))}
              <span className="px-4 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-sm text-neutral-700">
                Porn Website
              </span>
            </div>

            {editing ? (
              <div className="space-y-4 mb-10">
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
              <div className="max-w-none mb-8 space-y-4">
                {listingDescriptionParagraphs(description).map((para, i) => (
                  <p key={i} className="text-lg text-neutral-700 leading-relaxed mb-4 last:mb-0">{para}</p>
                ))}
              </div>
            )}

            <a
              href={externalUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="mb-10 flex w-full items-center justify-center rounded-xl py-4 text-lg font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: ACCENT }}
            >
              Visit {listing.name}
            </a>

            {alternatives.length > 0 ? (
              <div>
                <div className="flex items-start justify-between gap-6 mb-6">
                  <h2 className="text-3xl font-black text-neutral-900">
                    Here are the best alternatives to {listing.name}
                  </h2>
                  <Link href="/best-porn" className="hidden sm:inline-block shrink-0 px-6 py-2 rounded-full border border-neutral-200 text-neutral-800 hover:bg-neutral-100 transition-colors font-medium">
                    View All
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {alternatives.map((site) => (
                    <Link
                      key={site.slug}
                      href={exploreSiteListingPath(site.slug, listing.categorySlug)}
                      className="group rounded-xl p-4 border border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={site.image || PLACEHOLDER_IMAGE_URL} alt={site.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-neutral-900 truncate group-hover:text-[#c0392f] transition-colors">{site.name}</h3>
                        </div>
                      </div>
                      {site.description ? (
                        <p className="mt-3 text-sm text-neutral-600 line-clamp-2">{site.description}</p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            </div>

            <div id="listing-reviews" className="mt-10 scroll-mt-28">
            <FlameReviewSection
              key={flameKey}
              entityName={listing.name}
              reviews={flameReviewItems}
              loginHref={`/login?redirect=${encodeURIComponent(`/${rootSlug}`)}`}
              onSubmit={async (rating, text) => {
                const token = localStorage.getItem('token') || '';
                await submitCreatorReview(rootSlug, rating, text, token);
                return 'Your rating is live!';
              }}
              onSubmitted={refreshFlameReviews}
              requireText={false}
              successTitle="Your rating is live!"
              successSubtitle={`Thanks for rating ${listing.name}`}
            />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
