import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Advertiser, Campaign, CampaignClick, CampaignImpressionDaily } from '@/lib/models';

const EROGRAM_ADVERTISER_NAME = 'EROGRAM';
const VAULT_CAMPAIGN_NAME = 'Premium Vault (In-Feed)';

/**
 * Self-healing: ensures an "EROGRAM" advertiser + "Premium Vault" campaign
 * exist and returns the campaign _id. Uses upsert-style logic so it only
 * creates records on the very first call.
 */
async function getOrCreateVaultCampaignId(): Promise<string> {
  let advertiser = await Advertiser.findOne({ name: EROGRAM_ADVERTISER_NAME }).lean() as any;
  if (!advertiser) {
    advertiser = await Advertiser.create({
      name: EROGRAM_ADVERTISER_NAME,
      email: 'internal@erogram.com',
      company: 'Erogram',
      status: 'active',
    });
  }

  const advertiserId = advertiser._id;

  let campaign = await Campaign.findOne({
    advertiserId,
    slot: 'vault-premium',
  }).lean() as any;

  if (!campaign) {
    const farFuture = new Date('2030-12-31');
    campaign = await Campaign.create({
      advertiserId,
      name: VAULT_CAMPAIGN_NAME,
      slot: 'vault-premium',
      creative: '',
      destinationUrl: 'https://erogram.com/premium',
      startDate: new Date('2024-01-01'),
      endDate: farFuture,
      status: 'active',
      isVisible: true,
    });
  }

  return campaign._id.toString();
}

/** POST /api/vault/track — { type: "click" | "impression" } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body?.type === 'impression' ? 'impression' : 'click';

    await connectDB();
    const campaignId = await getOrCreateVaultCampaignId();

    if (type === 'click') {
      await Campaign.findByIdAndUpdate(campaignId, { $inc: { clicks: 1 } });
      await CampaignClick.create({ campaignId, clickedAt: new Date() });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all([
        Campaign.findByIdAndUpdate(campaignId, { $inc: { impressions: 1 } }),
        CampaignImpressionDaily.updateOne(
          { campaignId, date: today },
          { $inc: { count: 1 } },
          { upsert: true },
        ),
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
