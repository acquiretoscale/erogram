'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMyListings, type ListingItem } from '@/lib/actions/myListings';
import { getProfileListingHref } from '@/lib/profileListingUrls';
import { useProfileTheme } from './ProfileThemeContext';
import { ProfileHeading } from './ProfileTypography';

const PREVIEW_LIMIT = 4;

function listingTypeLabel(type: ListingItem['type']): string {
  if (type === 'bot') return 'Bot';
  if (type === 'onlyfans') return 'OnlyFans';
  return 'Group';
}

export default function ProfileMyListingsPreview({
  highlight = false,
  onManageListings,
}: {
  highlight?: boolean;
  onManageListings: () => void;
}) {
  const { tokens } = useProfileTheme();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoaded(true);
      return;
    }
    getMyListings(token)
      .then((result) => setListings(result.listings))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || listings.length === 0) return null;

  const preview = listings.slice(0, PREVIEW_LIMIT);
  const extraCount = listings.length - preview.length;

  return (
    <section
      className={`mb-8 rounded-2xl border p-4 sm:p-5 ${highlight ? 'ring-2 ring-[#00AFF0]/40' : ''}`}
      style={{ borderColor: tokens.border, backgroundColor: tokens.hover }}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <ProfileHeading size="md" className="!mt-0 mb-1">
            Your listings
          </ProfileHeading>
          <p className="text-sm" style={{ color: tokens.muted }}>
            Open a listing to view or edit it, or go to My Listings to manage everything.
          </p>
        </div>
        <button
          type="button"
          onClick={onManageListings}
          className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
          style={{ color: tokens.ink, backgroundColor: tokens.accent, border: `1px solid ${tokens.accent}` }}
        >
          Manage listings
        </button>
      </div>

      <ul className="space-y-2">
        {preview.map((listing) => {
          const href = getProfileListingHref(listing);
          return (
            <li key={`${listing.type}-${listing._id}`}>
              <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-opacity hover:opacity-95 no-underline"
                style={{ borderColor: tokens.border, backgroundColor: tokens.card }}
              >
                <div
                  className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border"
                  style={{ borderColor: tokens.border, backgroundColor: tokens.bg }}
                >
                  {listing.image && listing.image !== '/assets/placeholder-no-image.png' ? (
                    <img src={listing.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-sm font-black"
                      style={{ color: tokens.accent }}
                    >
                      {listing.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-bold" style={{ color: tokens.text }}>
                      {listing.name}
                    </span>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide"
                      style={{ backgroundColor: tokens.bg, color: tokens.muted, border: `1px solid ${tokens.border}` }}
                    >
                      {listingTypeLabel(listing.type)}
                    </span>
                  </div>
                  {listing.category ? (
                    <p className="mt-0.5 truncate text-xs" style={{ color: tokens.muted }}>
                      {listing.category}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs font-bold" style={{ color: tokens.accent }}>
                  Open
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {extraCount > 0 ? (
        <p className="mt-3 text-xs font-bold" style={{ color: tokens.muted }}>
          + {extraCount} more in My Listings
        </p>
      ) : null}
    </section>
  );
}
