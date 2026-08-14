import Link from 'next/link';
import type { CommunityPage } from '@/lib/actions/communityMembers';
import { countryToFlagEmoji } from '@/lib/utils/geo';
import CommunityMemberAvatar from './CommunityMemberAvatar';

function communityPageHref(page: number): string {
  return page <= 1 ? '/community' : `/community/page/${page}`;
}

const CREAM = '#F7F4EC';
const PLUM = '#2B1B28';
const MUTED = '#6B6568';
const BORDER = 'rgba(43,27,40,0.12)';
const GOLD = '#c9973a';
const GOLD_LIGHT = '#e8ba5a';
const CREATOR_DARK = '#0d1824';
const CREATOR_BORDER = 'rgba(255,255,255,0.10)';

export default function CommunityClient({ initial }: { initial: CommunityPage }) {
  const data = initial;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 font-[family-name:var(--font-baloo)]" style={{ backgroundColor: CREAM, color: PLUM }}>
      <div className="max-w-6xl mx-auto">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none p-0 m-0 text-[11px] font-semibold" style={{ color: MUTED }}>
            <li>
              <Link href="/" className="hover:opacity-70 transition-opacity" style={{ color: MUTED }}>
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="select-none" style={{ color: 'rgba(43,27,40,0.28)' }}>/</li>
            <li className="font-bold" style={{ color: PLUM }} aria-current="page">
              Community
            </li>
          </ol>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-extrabold mb-8 tracking-tight" style={{ color: PLUM }}>
          Community
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {data.members.map((m) => {
            const darkCard = m.isCreator;

            return (
            <Link
              key={m.id}
              href={m.href}
              className="group relative flex flex-col items-center text-center rounded-2xl border px-3 py-4 min-h-[180px] overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
              style={
                darkCard
                  ? {
                      backgroundColor: CREATOR_DARK,
                      borderColor: CREATOR_BORDER,
                      boxShadow: '0 12px 32px -12px rgba(0,175,240,0.35)',
                      color: '#f5f5f5',
                    }
                  : {
                      backgroundColor: CREAM,
                      borderColor: BORDER,
                      boxShadow: '0 18px 40px -28px rgba(43,27,40,0.28)',
                      color: PLUM,
                    }
              }
            >
              <div className="relative z-[1] flex items-center justify-center h-[72px] mb-2">
                <CommunityMemberAvatar photoUrl={m.photoUrl} name={m.displayName} premium={m.isCreator} />
              </div>

              <p
                className="relative z-[1] text-[13px] font-bold truncate w-full leading-tight mb-3"
                style={{ color: darkCard ? '#f5f5f5' : PLUM }}
              >
                {m.displayName}
              </p>

              <div className="relative z-[1] mt-auto w-full flex flex-col items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide"
                  style={{ color: darkCard ? '#e8f4fa' : PLUM }}
                >
                  {m.countryCode ? (
                    <>
                      <span className="text-base leading-none" aria-hidden>{countryToFlagEmoji(m.countryCode)}</span>
                      {m.countryCode}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="text-[11px]" style={{ color: darkCard ? 'rgba(255,255,255,0.55)' : MUTED }}>
                  {m.joinedLabel ? `Joined ${m.joinedLabel}` : 'Joined —'}
                </span>
                {m.isCreator && (
                  <span
                    className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-[0.14em] uppercase"
                    style={{
                      color: '#3a2a0c',
                      background: `linear-gradient(135deg, ${GOLD_LIGHT}, ${GOLD})`,
                      boxShadow: `0 4px 10px -4px rgba(201,151,58,0.7), 0 0 0 1px rgba(255,255,255,0.25) inset`,
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
                    </svg>
                    Model
                  </span>
                )}
              </div>
            </Link>
            );
          })}
        </div>

        {(data.page > 1 || data.hasMore) && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {data.page > 1 ? (
              <Link
                href={communityPageHref(data.page - 1)}
                className="px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:opacity-90 transition-opacity"
                style={{ color: '#FDFDFD', backgroundColor: PLUM }}
              >
                Prev
              </Link>
            ) : (
              <span
                className="px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase rounded-full opacity-30"
                style={{ color: '#FDFDFD', backgroundColor: PLUM }}
              >
                Prev
              </span>
            )}
            {data.hasMore ? (
              <Link
                href={communityPageHref(data.page + 1)}
                className="px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase rounded-full hover:opacity-90 transition-opacity"
                style={{ color: '#FDFDFD', backgroundColor: PLUM }}
              >
                Next
              </Link>
            ) : (
              <span
                className="px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase rounded-full opacity-30"
                style={{ color: '#FDFDFD', backgroundColor: PLUM }}
              >
                Next
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
