'use server';

import connectDB from '@/lib/db/mongodb';
import { Advertiser, Campaign, CampaignClick } from '@/lib/models';

const EROGRAM_ADVERTISER_NAME = 'EROGRAM';

async function getOrCreateArticleCampaignId(): Promise<string> {
  let advertiser = (await Advertiser.findOne({ name: EROGRAM_ADVERTISER_NAME }).lean()) as any;
  if (!advertiser) {
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
      name: 'Article Links',
      slot: 'article-link',
      creative: '',
      destinationUrl: 'https://erogram.pro/articles',
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
    const campaignId = await getOrCreateArticleCampaignId();
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
