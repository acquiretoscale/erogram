'use server';

import connectDB from '@/lib/db/mongodb';
import { Advertiser, Campaign, CampaignClick } from '@/lib/models';

const EROGRAM_ADVERTISER_NAME = 'EROGRAM';

// Map a destination-URL domain → advertiser name, so an article CTA that points to an
// advertiser's site is attributed to THAT advertiser (e.g. Lovescape) instead of EROGRAM.
// Add new domains here as advertisers are added. Domain match is substring on the hostname.
const DOMAIN_TO_ADVERTISER: { domain: string; advertiser: string }[] = [
  { domain: 'lovescape.com', advertiser: 'Lovescape' },
];

function advertiserForUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (const { domain, advertiser } of DOMAIN_TO_ADVERTISER) {
      if (host.includes(domain)) return advertiser;
    }
  } catch { /* not a valid absolute URL */ }
  return null;
}

/**
 * Resolve the article-link campaign for a given advertiser name (default EROGRAM).
 * Each advertiser gets ONE reusable 'article-link' campaign so article CTA clicks roll up
 * under the correct advertiser in the dashboard. Additive — never touches existing data.
 */
async function getArticleCampaignId(advertiserName: string = EROGRAM_ADVERTISER_NAME): Promise<string> {
  let advertiser = (await Advertiser.findOne({ name: advertiserName }).lean()) as any;
  if (!advertiser) {
    // Only auto-create the internal EROGRAM advertiser; for a real advertiser that doesn't
    // exist yet, fall back to EROGRAM rather than inventing a record.
    if (advertiserName !== EROGRAM_ADVERTISER_NAME) return getArticleCampaignId(EROGRAM_ADVERTISER_NAME);
    advertiser = await Advertiser.create({
      name: EROGRAM_ADVERTISER_NAME,
      email: 'internal@erogram.com',
      company: 'Erogram',
      status: 'active',
    });
  }

  let campaign = (await Campaign.findOne({
    advertiserId: advertiser._id,
    slot: 'article-link',
  }).lean()) as any;

  if (!campaign) {
    campaign = await Campaign.create({
      advertiserId: advertiser._id,
      name: advertiserName === EROGRAM_ADVERTISER_NAME ? 'Article Links' : `Article CTA — ${advertiserName}`,
      slot: 'article-link',
      creative: '',
      destinationUrl: 'https://erogram.pro/blog',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2030-12-31'),
      status: 'active',
      isVisible: true,
    });
  }

  return campaign._id.toString();
}

export async function trackArticleClick(slug: string, url?: string, type?: 'link' | 'cta') {
  if (!slug || typeof slug !== 'string') return;
  try {
    await connectDB();
    // Attribute to the advertiser whose domain the CTA/link points to (e.g. Lovescape),
    // else fall back to the internal EROGRAM advertiser. Keeps the same article-link slot.
    const advertiserName = advertiserForUrl(url) || EROGRAM_ADVERTISER_NAME;
    const campaignId = await getArticleCampaignId(advertiserName);
    const clickType = type === 'cta' ? 'cta' : 'link';
    const placement = `article:${slug}:${clickType}${url ? `:${url}` : ''}`;

    await Promise.all([
      Campaign.findByIdAndUpdate(campaignId, { $inc: { clicks: 1 } }),
      CampaignClick.create({ campaignId, clickedAt: new Date(), placement }),
    ]);
  } catch {
    // Silently fail
  }
}
