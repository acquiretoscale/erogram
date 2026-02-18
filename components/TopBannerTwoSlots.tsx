'use client';

export interface TopBannerCampaign {
  _id: string;
  creative: string;
  destinationUrl: string;
}

interface TopBannerTwoSlotsProps {
  slot1Campaigns?: TopBannerCampaign[];
  slot2Campaigns?: TopBannerCampaign[];
  className?: string;
}

// All sizes inline so no CSS can override. Single banner = large leaderboard (400px).
const BANNER_HEIGHT_DESKTOP = 250;
const BANNER_HEIGHT_MOBILE = 100;
const BANNER_HEIGHT_DESKTOP_SINGLE = 400;

/**
 * Top banner block for Bots & Groups.
 * - Single banner on desktop: full width, fixed 250px height (real leaderboard size).
 * - Multiple: one row, each cell min 225px wide, 250px tall.
 * All critical dimensions are inline so no parent/Tailwind can override.
 */
export default function TopBannerTwoSlots({
  slot1Campaigns = [],
  slot2Campaigns = [],
  className = '',
}: TopBannerTwoSlotsProps) {
  const list1 = (slot1Campaigns || []).filter((c) => c?.creative).slice(0, 2);
  const list2 = (slot2Campaigns || []).filter((c) => c?.creative).slice(0, 2);
  const allBanners = [...list1, ...list2];
  if (allBanners.length === 0) return null;

  const openUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // One banner = one big block. Multiple = row of big blocks.
  const singleBanner = allBanners.length === 1;

  const desktopHeight = singleBanner ? BANNER_HEIGHT_DESKTOP_SINGLE : BANNER_HEIGHT_DESKTOP;
  return (
    <div
      className={className}
      style={{
        width: '100%',
        minHeight: desktopHeight,
        flexShrink: 0,
      }}
    >
      {/* Mobile: stacked rows */}
      <div
        className="flex flex-col gap-3 md:hidden"
        style={{ width: '100%' }}
      >
        {list1.length > 0 && (
          <div style={{ display: 'flex', gap: 12, width: '100%', minHeight: BANNER_HEIGHT_MOBILE }}>
            {list1.map((c) => (
              <a
                key={c._id}
                href={c.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.preventDefault(); openUrl(c.destinationUrl); }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: BANNER_HEIGHT_MOBILE,
                  overflow: 'hidden',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.2)',
                }}
              >
                <img
                  src={c.creative}
                  alt="Banner"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  loading="eager"
                />
              </a>
            ))}
          </div>
        )}
        {list2.length > 0 && (
          <div style={{ display: 'flex', gap: 12, width: '100%', minHeight: BANNER_HEIGHT_MOBILE }}>
            {list2.map((c) => (
              <a
                key={c._id}
                href={c.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.preventDefault(); openUrl(c.destinationUrl); }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: BANNER_HEIGHT_MOBILE,
                  overflow: 'hidden',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.2)',
                }}
              >
                <img
                  src={c.creative}
                  alt="Banner"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  loading="eager"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Desktop (md+): single = one big leaderboard; multiple = one row, each cell fixed size */}
      <div className="hidden md:block" style={{ width: '100%' }}>
        {singleBanner ? (
          <a
            href={allBanners[0].destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.preventDefault(); openUrl(allBanners[0].destinationUrl); }}
            style={{
              display: 'block',
              width: '100%',
              height: BANNER_HEIGHT_DESKTOP_SINGLE,
              minHeight: BANNER_HEIGHT_DESKTOP_SINGLE,
              overflow: 'hidden',
              borderRadius: 12,
              background: 'rgba(0,0,0,0.2)',
              cursor: 'pointer',
            }}
          >
            <img
              src={allBanners[0].creative}
              alt="Banner"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              loading="eager"
            />
          </a>
        ) : (
          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              gap: 12,
              width: '100%',
              alignItems: 'stretch',
            }}
          >
            {allBanners.map((c) => (
              <a
                key={c._id}
                href={c.destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.preventDefault(); openUrl(c.destinationUrl); }}
                style={{
                  flex: '1 1 0',
                  minWidth: 220,
                  width: 0,
                  height: BANNER_HEIGHT_DESKTOP,
                  minHeight: BANNER_HEIGHT_DESKTOP,
                  overflow: 'hidden',
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={c.creative}
                  alt="Banner"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  loading="eager"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
