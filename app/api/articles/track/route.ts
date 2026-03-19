import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Advertiser, Campaign, CampaignClick } from '@/lib/models';

const EROGRAM_ADVERTISER_NAME = 'EROGRAM';
const ARTICLE_CAMPAIGN_NAME = 'Article Links';

/**
 * Self-healing: ensures an "EROGRAM" advertiser + global "Article Links"
 * campaign exist and returns the campaign _id.
 */
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
      name: ARTICLE_CAMPAIGN_NAME,
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

/** POST /api/articles/track — { slug, url?, type: "link" | "cta" } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = body?.slug;
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const type = body?.type === 'cta' ? 'cta' : 'link';
    const url = typeof body?.url === 'string' ? body.url : '';

    await connectDB();
    const campaignId = await getOrCreateArticleCampaignId();

    const placement = `article:${slug}:${type}${url ? `:${url}` : ''}`;

    await Promise.all([
      Campaign.findByIdAndUpdate(campaignId, { $inc: { clicks: 1 } }),
      CampaignClick.create({ campaignId, clickedAt: new Date(), placement }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
