'use client';

import Link from 'next/link';
import type { MediaKitOfferRow } from '@/lib/mediakit/types';
import EditableText from '@/components/mediakit/EditableText';
import { useMediaKitEdit } from '@/components/mediakit/MediaKitEditProvider';

const BORDER = '3px solid #000000';
const SHADOW = '4px 4px 0px #000000';
const LISTING_ACCENT = '#22c55e';
const LISTING_SHADOW = `6px 6px 0px ${LISTING_ACCENT}`;

type OfferRowsKey = 'listingOffers' | 'otherOffers';

function offerPath(rowsKey: OfferRowsKey, index: number, field: keyof MediaKitOfferRow) {
  return `${rowsKey}.${index}.${field}`;
}

function ListingAddButton() {
  return (
    <Link
      href="/add/ainsfw"
      className="mt-2 inline-block px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-black"
      style={{ background: '#facc15', border: BORDER, boxShadow: SHADOW }}
    >
      Get listed
    </Link>
  );
}

function stripBulletPrefix(line: string) {
  return line.replace(/^\s*-\s*/, '');
}

function IncludedLine({ line }: { line: string }) {
  const stripped = stripBulletPrefix(line);
  const bodyClass = 'text-[11px] font-medium leading-[1.45] text-black/88 sm:text-xs sm:leading-relaxed';

  return (
    <li className="flex gap-2.5 border-b border-black/[0.06] pb-2.5 last:border-b-0 last:pb-0 sm:gap-3">
      <span
        className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e] ring-2 ring-[#bbf7d0]/80"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className={bodyClass}>{stripped}</p>
      </div>
    </li>
  );
}

function IncludedContent({ text, editPath }: { text: string; editPath?: string }) {
  const { canEdit, editMode } = useMediaKitEdit();
  const lines = text.split('\n').filter(Boolean);
  const looksLikeList = lines.some((l) => /^\s*-\s/.test(l));

  if (!looksLikeList) {
    if (editPath && canEdit && editMode) {
      return <EditableText path={editPath} fallback={text} multiline className="block w-full text-[11px] sm:text-xs" />;
    }
    return <p className="text-[11px] font-medium leading-relaxed text-black/88 sm:text-xs">{text}</p>;
  }

  if (editPath && canEdit && editMode) {
    return <EditableText path={editPath} fallback={text} multiline className="block w-full text-[11px] sm:text-xs" />;
  }

  return (
    <ul className="m-0 list-none space-y-0 p-0">
      {lines.map((line, index) => (
        <IncludedLine key={`${index}-${line.slice(0, 28)}`} line={line} />
      ))}
    </ul>
  );
}

const COLUMNS: { label: string; minW: string }[] = [
  { label: '#', minW: '2.5rem' },
  { label: 'Type', minW: '7.5rem' },
  { label: 'Placement', minW: '10rem' },
  { label: 'Period', minW: '5.5rem' },
  { label: "What's included", minW: '14rem' },
  { label: 'Price', minW: '9rem' },
  { label: 'Availability', minW: '6.5rem' },
];

function OfferMobileCard({
  row,
  rowIndex,
  rowsKey,
  highlight,
  showAvailability = true,
  hideType = false,
  showListButton = false,
}: {
  row: MediaKitOfferRow;
  rowIndex: number;
  rowsKey: OfferRowsKey;
  highlight?: boolean;
  showAvailability?: boolean;
  hideType?: boolean;
  showListButton?: boolean;
}) {
  return (
    <article
      className={`border-b border-black/10 bg-white px-3 py-3 last:border-b-0 sm:hidden ${highlight ? '' : ''}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-black uppercase tracking-tight text-black ${hideType ? 'text-2xl leading-none' : highlight ? 'text-base' : 'text-sm'}`}>
            {hideType ? null : <span className="text-black/45">{row.num}. </span>}
            <EditableText path={offerPath(rowsKey, rowIndex, 'name')} fallback={row.name} />
          </p>
          {hideType ? null : (
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-black/50">{row.offerKind}</p>
          )}
        </div>
        <EditableText
          path={offerPath(rowsKey, rowIndex, 'price')}
          fallback={row.price}
          className={`shrink-0 text-right font-black tabular-nums text-[#16a34a] ${highlight ? 'text-base sm:text-lg' : 'text-sm'}`}
        />
      </div>
      <dl className="space-y-1.5 text-xs font-semibold leading-snug text-black/75">
        <div>
          <dt className="text-[10px] font-black uppercase tracking-wide text-black/40">Placement</dt>
          <dd>
            <EditableText path={offerPath(rowsKey, rowIndex, 'placement')} fallback={row.placement} />
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-black uppercase tracking-wide text-black/40">Period</dt>
          <dd>
            <EditableText path={offerPath(rowsKey, rowIndex, 'period')} fallback={row.period} />
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-black uppercase tracking-wide text-black/40">What&apos;s included</dt>
          <dd>
            <IncludedContent
              text={row.included}
              editPath={offerPath(rowsKey, rowIndex, 'included')}
            />
          </dd>
        </div>
        {showAvailability ? (
          <div>
            <dt className="text-[10px] font-black uppercase tracking-wide text-black/40">Availability</dt>
            <dd>
              <EditableText path={offerPath(rowsKey, rowIndex, 'availability')} fallback={row.availability} />
            </dd>
          </div>
        ) : null}
      </dl>
      {showListButton ? <ListingAddButton /> : null}
    </article>
  );
}

function OffersTable({
  rows,
  rowsKey,
  highlight,
  minTableWidth,
  showAvailability = true,
  hideType = false,
  showListButton = false,
}: {
  rows: MediaKitOfferRow[];
  rowsKey: OfferRowsKey;
  highlight?: boolean;
  minTableWidth: string;
  showAvailability?: boolean;
  hideType?: boolean;
  showListButton?: boolean;
}) {
  const columns = (showAvailability ? COLUMNS : COLUMNS.filter((col) => col.label !== 'Availability'))
    .filter((col) => !(hideType && col.label === 'Type'))
    .map((col) => (col.label === 'Price' && !showAvailability ? { ...col, minW: '12rem' } : col));

  return (
    <>
      <div className={`overflow-hidden bg-white sm:hidden ${highlight ? '' : ''}`} style={{ color: '#000' }}>
        {rows.map((row, index) => (
          <OfferMobileCard
            key={row.num}
            row={row}
            rowIndex={index}
            rowsKey={rowsKey}
            highlight={highlight}
            showAvailability={showAvailability}
            hideType={hideType}
            showListButton={showListButton}
          />
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table
          className="w-full border-collapse bg-white text-left text-black"
          style={{ minWidth: minTableWidth, color: '#000', fontSize: highlight ? '12px' : '11px' }}
        >
          <thead>
            <tr className="border-b border-black/15 bg-white text-[10px] font-black uppercase tracking-wide text-black sm:text-[11px]">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className="border-r border-black/10 px-2 py-2.5 align-bottom last:border-r-0 sm:px-3"
                  style={{ minWidth: col.minW }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {rows.map((row, index) => (
              <tr key={row.num} className="align-top bg-white">
                <td className="px-2 py-2.5 font-black tabular-nums text-black/55 sm:px-3">{row.num}</td>
                {hideType ? null : (
                  <td className="px-2 py-2.5 font-black uppercase tracking-wide text-black sm:px-3">{row.offerKind}</td>
                )}
                <td className="px-2 py-2.5 font-semibold leading-snug text-black/85 sm:px-3">
                  <EditableText
                    path={offerPath(rowsKey, index, 'name')}
                    fallback={row.name}
                    className={hideType ? 'block text-2xl font-black uppercase leading-none tracking-tight text-black sm:text-3xl' : 'block font-black text-black'}
                  />
                  <EditableText
                    path={offerPath(rowsKey, index, 'placement')}
                    fallback={row.placement}
                    className="mt-1 block text-black/80"
                  />
                </td>
                <td className="px-2 py-2.5 font-semibold text-black/85 sm:px-3">
                  <EditableText path={offerPath(rowsKey, index, 'period')} fallback={row.period} />
                </td>
                <td className="px-2 py-2.5 font-semibold leading-snug text-black/80 sm:px-3">
                  <IncludedContent
                    text={row.included}
                    editPath={offerPath(rowsKey, index, 'included')}
                  />
                </td>
                <td
                  className={`px-2 py-2.5 font-black leading-snug text-[#16a34a] sm:px-3 ${highlight ? 'text-sm' : ''} ${!showAvailability ? 'min-w-[12rem] text-sm sm:text-base' : ''}`}
                >
                  <EditableText path={offerPath(rowsKey, index, 'price')} fallback={row.price} />
                  {showListButton ? (
                    <div>
                      <ListingAddButton />
                    </div>
                  ) : null}
                </td>
                {showAvailability ? (
                  <td className="px-2 py-2.5 font-semibold text-black/85 sm:px-3">
                    <EditableText path={offerPath(rowsKey, index, 'availability')} fallback={row.availability} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function BasicBoostedListingComparison() {
  const { content } = useMediaKitEdit();

  return (
    <section className="mx-auto mb-6 w-full max-w-6xl" aria-labelledby="listing-offers-title">
      <h2
        id="listing-offers-title"
        className="mb-5 scroll-mt-28 text-center text-xl font-black uppercase tracking-tight text-white sm:mb-6 sm:text-2xl md:text-3xl"
      >
        Our Listing offers
      </h2>

      <div
        id="listing-offers"
        className="mb-14 scroll-mt-28 overflow-hidden sm:mb-16"
        style={{ border: `3px solid ${LISTING_ACCENT}`, boxShadow: LISTING_SHADOW }}
      >
        <OffersTable
          rows={content.listingOffers}
          rowsKey="listingOffers"
          highlight
          minTableWidth="880px"
          showAvailability={false}
          hideType
          showListButton
        />
      </div>

      <h2
        id="advertising-offers-title"
        className="mb-5 scroll-mt-28 text-center text-xl font-black uppercase tracking-tight text-white sm:mb-6 sm:text-2xl md:text-3xl"
      >
        Our Advertising Offers
      </h2>
      <div id="advertising-offers" className="scroll-mt-28 overflow-hidden bg-white" style={{ border: BORDER, boxShadow: SHADOW }}>
        <OffersTable rows={content.otherOffers} rowsKey="otherOffers" minTableWidth="920px" />
      </div>
    </section>
  );
}