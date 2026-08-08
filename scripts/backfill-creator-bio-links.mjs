/**
 * Add-only backfill: map URLs found in creator bios into empty social/website fields.
 * Usage:
 *   node --env-file=.env.local scripts/backfill-creator-bio-links.mjs
 *   node --env-file=.env.local scripts/backfill-creator-bio-links.mjs --apply
 */
import { MongoClient } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

const FIELD_KEYS = [
  'website',
  'instagramUrl',
  'instagramUsername',
  'twitterUrl',
  'tiktokUrl',
  'telegramUrl',
  'fanslyUrl',
  'fanvueUrl',
  'redditUrl',
  'patreonUrl',
  'pornhubUrl',
  'linktreeUrl',
  'allmylinksUrl',
  'beaconsUrl',
];

function cleanUrl(raw) {
  return String(raw || '').replace(/[.,;:!?)]+$/, '').trim();
}

function extractBioUrls(bio) {
  if (!bio || typeof bio !== 'string') return [];
  const out = [];
  const seen = new Set();
  for (const match of bio.match(URL_RE) || []) {
    const url = cleanUrl(match);
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function classifyBioUrl(url) {
  const u = url.toLowerCase();
  if (/instagram\.com/i.test(u)) return 'instagramUrl';
  if (/twitter\.com|x\.com/i.test(u)) return 'twitterUrl';
  if (/tiktok\.com/i.test(u)) return 'tiktokUrl';
  if (/t\.me|telegram\.me/i.test(u)) return 'telegramUrl';
  if (/fansly\.com|fans\.ly/i.test(u)) return 'fanslyUrl';
  if (/fanvue\.com/i.test(u)) return 'fanvueUrl';
  if (/reddit\.com/i.test(u)) return 'redditUrl';
  if (/patreon\.com/i.test(u)) return 'patreonUrl';
  if (/pornhub\.com/i.test(u)) return 'pornhubUrl';
  if (/linktr\.ee/i.test(u)) return 'linktreeUrl';
  if (/allmylinks\.com/i.test(u)) return 'allmylinksUrl';
  if (/beacons\.ai/i.test(u)) return 'beaconsUrl';
  if (/onlyfans\.com/i.test(u)) return null;
  return 'website';
}

function instagramUsernameFromUrl(url) {
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  if (!m) return '';
  const handle = m[1].replace(/\/$/, '');
  if (!handle || handle === 'p') return '';
  return handle;
}

function isEmpty(value) {
  return !value || (typeof value === 'string' && !value.trim());
}

function buildPatch(doc, bioUrls) {
  /** @type {Record<string, string>} */
  const patch = {};

  for (const url of bioUrls) {
    const field = classifyBioUrl(url);
    if (!field) continue;

    if (field === 'website') {
      if (!isEmpty(doc.website) || patch.website) continue;
      patch.website = url;
      continue;
    }

    if (!isEmpty(doc[field]) || patch[field]) continue;
    patch[field] = url;
  }

  if (patch.instagramUrl && isEmpty(doc.instagramUsername) && !patch.instagramUsername) {
    const handle = instagramUsernameFromUrl(patch.instagramUrl);
    if (handle) patch.instagramUsername = handle;
  }

  return patch;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('onlyfanscreators');

  let scanned = 0;
  let withBioUrls = 0;
  let wouldUpdate = 0;
  let fieldsTouched = 0;
  const samples = [];
  const bulk = [];

  for await (const doc of col.find({ deleted: { $ne: true } })) {
    scanned++;
    const bioUrls = extractBioUrls(doc.bio);
    if (!bioUrls.length) continue;
    withBioUrls++;

    const patch = buildPatch(doc, bioUrls);
    const keys = Object.keys(patch);
    if (!keys.length) continue;

    wouldUpdate++;
    fieldsTouched += keys.length;
    if (samples.length < 20) {
      samples.push({ username: doc.username, patch });
    }

    if (APPLY) {
      bulk.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: patch },
        },
      });
    }
  }

  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`scanned: ${scanned}`);
  console.log(`with_bio_urls: ${withBioUrls}`);
  console.log(`profiles_to_update: ${wouldUpdate}`);
  console.log(`fields_to_set: ${fieldsTouched}`);
  console.log('samples:', JSON.stringify(samples, null, 2));

  if (APPLY && bulk.length) {
    const chunkSize = 500;
    let applied = 0;
    for (let i = 0; i < bulk.length; i += chunkSize) {
      const chunk = bulk.slice(i, i + chunkSize);
      const res = await col.bulkWrite(chunk, { ordered: false });
      applied += res.modifiedCount;
    }
    console.log(`applied_modified: ${applied}`);
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
