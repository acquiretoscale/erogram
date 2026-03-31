---
name: advertisers
description: >-
  Manages the advertising system: in-feed ads, ad campaigns, advertiser portal,
  ad tracking, and creative specs. Use when working on ads, campaigns, advertisers,
  sponsored content, ad placements, or the /advertisers portal.
---

# Advertisers & Ad System

## Architecture

| Layer | File(s) | Purpose |
|-------|---------|---------|
| **DB Model** | `lib/models/index.ts` → `Advert`, `FeedCampaign` | Ad data schemas |
| **Server actions** | `lib/actions/feedAds.ts` | Fetch active in-feed ads from Adverts |
| **Server actions** | `lib/actions/campaigns.ts` | Track clicks/impressions for campaigns |
| **Feed card** | `app/groups/AdvertCard.tsx` | Renders all ad types in the groups feed |
| **Advertiser portal** | `app/advertisers/AdvertiserPortal.tsx` | Self-serve advertiser dashboard |
| **Admin tab** | `app/admin/components/AdvertisersTab.tsx` | Admin manages advertisers |
| **Ad shop** | `app/advertise/AdShop.tsx` | Public-facing ad purchasing page |
| **Creative specs** | `app/advertise/CreativeSpecs.tsx` | Image/video requirements for advertisers |
| **Tracking API** | `app/api/advertise-stats/route.ts` | Stats endpoint for ad performance |
| **Vault tracking** | `app/api/vault/track/route.ts` | Premium vault click tracking |

## Ad Types in AdvertCard

`AdvertCard` supports multiple card styles, chosen automatically:

1. **Video Ad** — when `campaign.videoUrl` is set. Autoplays on scroll, poster fallback.
2. **Premium Mosaic** — when `campaign.adType === 'premium'` with `premiumGroups`. 2x2 grid of group images.
3. **Featured Bot** — when `campaign.adType === 'featured-bot'`. Cyan/blue theme.
4. **Native** — 50% chance. Looks identical to a GroupCard (blends in).
5. **Standard** — flashy card with gradient CTA button, badges, social proof.

## Feed Positions

In-feed ads appear at positions: `3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36`

## Key Patterns

- All ad rendering goes through `AdvertCard` — never create a second ad card component
- `seededRandom(seed)` ensures consistent rendering between server/client (no hydration mismatch)
- Social proof (`visiting now`, `Trending #N`) is controlled via `campaign.socialProof` field
- Verified badge is controlled from admin via `campaign.verified` field
- Impression tracking fires once via IntersectionObserver at 30% visibility
- Click tracking fires on card click or button click

## Rules

- Do NOT create new API routes for ads — use server actions in `lib/actions/`
- Do NOT duplicate AdvertCard — extend the existing one
- All ad images must go through R2 (never serve from external CDNs in production)
- `Promoted` label must remain visible on all ad types (legal requirement)
- Keep Telegram browser check (`isTelegram → return null`) — ads break in Telegram WebView
