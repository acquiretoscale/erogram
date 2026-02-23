/**
 * One-time migration: find all CPAmatica affiliate links (go.cm-trk*.com, e.g. aff_f, aff_c)
 * in the database, replace them with your link, and assign campaigns to the CPAMATICA advertiser.
 *
 * Run from erogram-v2 with MONGODB_URI in .env.local, or pass URI as first argument:
 *   npx tsx scripts/replace-cpamatica-affiliate-links.ts
 *   npx tsx scripts/replace-cpamatica-affiliate-links.ts "mongodb+srv://..."
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const cliUri = process.argv[2];
if (cliUri) process.env.MONGODB_URI = cliUri;

const NEW_URL = 'https://go.cm-trk6.com/aff_c?offer_id=11167&aff_id=93961&url_id=19191&source=erogram.pro&aff_sub=feed';

/** Match CPAmatica tracking links: go.cm-trk3.com, go.cm-trk6.com, etc. (aff_f, aff_c, any params) */
function isCpamaticaLink(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return /go\.cm-trk\d*\.com/i.test(url) || /cm-trk\d*\.com/i.test(url);
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI. Set it in erogram-v2/.env.local or pass as first argument.');
    process.exit(1);
  }

  const { default: connectDB } = await import('../lib/db/mongodb');
  const { Advertiser, Campaign, SiteConfig, Advert } = await import('../lib/models');

  await connectDB();
  console.log('Connected to MongoDB\n');

  // 1) Ensure CPAMATICA advertiser exists
  let cpamatica = await (Advertiser as any).findOne({ name: /^CPAMATICA$/i }).lean();
  if (!cpamatica) {
    const created = await (Advertiser as any).create({
      name: 'CPAMATICA',
      email: 'cpamatica@erogram.pro',
      company: 'CPAmatica',
      status: 'active',
    });
    cpamatica = created.toObject();
    console.log('Created advertiser: CPAMATICA');
  } else {
    console.log('Using existing advertiser: CPAMATICA');
  }
  const cpamaticaId = cpamatica._id;

  // 2) Campaigns: find all with CPAmatica destinationUrl, replace URL and set advertiserId
  const campaigns = await (Campaign as any)
    .find({ destinationUrl: { $regex: /go\.cm-trk\d*\.com|cm-trk\d*\.com/i } })
    .lean();
  console.log(`\nCampaigns with CPAmatica links: ${campaigns.length}`);
  for (const c of campaigns) {
    await (Campaign as any).updateOne(
      { _id: c._id },
      { $set: { destinationUrl: NEW_URL, advertiserId: cpamaticaId } }
    );
    console.log(`  Updated campaign "${c.name}" (${c.slot}) -> new URL + advertiser CPAMATICA`);
  }

  // 3) SiteConfig: update any navbar/filter/topBanner URLs that are CPAmatica
  const siteConfig = await (SiteConfig as any).findOne().lean();
  if (siteConfig) {
    const updates: Record<string, string> = {};
    const urlFields = [
      'navbarButton1.url',
      'navbarButton2.url',
      'navbarButton3.url',
      'filterBanner1.url',
      'filterBanner2.url',
      'filterBanner3.url',
      'filterButton.url',
      'topBanner.url',
    ] as const;
    for (const path of urlFields) {
      const parts = path.split('.');
      const val = parts.length === 2 ? (siteConfig[parts[0]]?.[parts[1]]) : undefined;
      if (isCpamaticaLink(val)) {
        updates[path] = NEW_URL;
        console.log(`  SiteConfig: will update ${path}`);
      }
    }
    if (Object.keys(updates).length > 0) {
      await (SiteConfig as any).updateOne({ _id: siteConfig._id }, { $set: updates });
      console.log(`  Updated SiteConfig: ${Object.keys(updates).length} URL(s)`);
    }
  }

  // 4) Adverts (legacy): replace url if it's a CPAmatica link
  const adverts = await (Advert as any)
    .find({ url: { $regex: /go\.cm-trk\d*\.com|cm-trk\d*\.com/i } })
    .lean();
  console.log(`\nAdverts with CPAmatica links: ${adverts.length}`);
  for (const a of adverts) {
    await (Advert as any).updateOne({ _id: a._id }, { $set: { url: NEW_URL } });
    console.log(`  Updated advert "${a.name}" -> new URL`);
  }

  console.log('\nDone. All CPAmatica affiliate links replaced with your link; campaigns assigned to CPAMATICA.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
