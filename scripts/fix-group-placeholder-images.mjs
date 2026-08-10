/**
 * Fix approved groups stuck on placeholder images.
 * 1) Prefer sourceImageUrl (tgramsearch CDN) → download → R2 → set image
 * 2) Else scrape public t.me/{username} og:image → R2 → set image
 * 3) Else copy https image from same-name sibling doc if any
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-group-placeholder-images.mjs --dry-run
 *   node --env-file=.env.local scripts/fix-group-placeholder-images.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient, ObjectId } from 'mongodb';
import sharp from 'sharp';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const a = process.argv.find((x) => x.startsWith('--limit='));
  return a ? Number(a.slice('--limit='.length)) : 0;
})();

const {
  MONGODB_URI,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL,
  R2_BUCKET_NAME = 'erogramimages',
} = process.env;

if (!MONGODB_URI || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('Missing MONGODB_URI / R2 env');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const PLACEHOLDER_RE = /placeholder|\/assets\/image\.jpg|^$/i;

function isMissingImage(stored) {
  if (!stored || typeof stored !== 'string') return true;
  if (stored.startsWith('https://')) return false;
  return true;
}

function extractUsername(telegramLink) {
  if (!telegramLink) return null;
  if (/t\.me\/\+/.test(telegramLink) || /t\.me\/joinchat\//i.test(telegramLink)) return null;
  const match = String(telegramLink).match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]{3,})/);
  if (!match) return null;
  const username = match[1];
  const reserved = ['joinchat', 'addstickers', 'addtheme', 'proxy', 'socks', 'setlanguage', 'share'];
  if (reserved.includes(username.toLowerCase())) return null;
  return username;
}

function slugify(name) {
  return String(name || 'group')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'group';
}

async function downloadImage(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ErogramBot/1.0)' },
  });
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.startsWith('image/') && !url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) return null;
  return buf;
}

async function scrapeTelegramOg(username) {
  const res = await fetch(`https://t.me/${username}`, {
    signal: AbortSignal.timeout(12000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      Accept: 'text/html',
    },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const ogMatch =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (!ogMatch?.[1]) return null;
  const imageUrl = ogMatch[1];
  if (imageUrl.includes('placeholder') || imageUrl.length < 20) return null;
  return imageUrl;
}

async function uploadWebp(buffer, keyBase) {
  let compressed = await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  if (compressed.length > 200 * 1024) {
    compressed = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 55 })
      .toBuffer();
  }
  const key = `groups/${keyBase}.webp`;
  if (!DRY_RUN) {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: compressed,
        ContentType: 'image/webp',
      }),
    );
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const Group = client.db().collection('groups');

  const filter = {
    status: 'approved',
    isAdvertisement: { $ne: true },
  };

  let docs = await Group.find(filter)
    .project({ name: 1, slug: 1, image: 1, telegramLink: 1, sourceImageUrl: 1 })
    .toArray();
  docs = docs.filter((g) => isMissingImage(g.image));
  // Prefer docs that already have a CDN source (fast path), then the rest.
  docs.sort((a, b) => {
    const as = a.sourceImageUrl && String(a.sourceImageUrl).startsWith('https://') ? 0 : 1;
    const bs = b.sourceImageUrl && String(b.sourceImageUrl).startsWith('https://') ? 0 : 1;
    return as - bs;
  });
  if (LIMIT > 0) docs = docs.slice(0, LIMIT);

  console.log(`Found ${docs.length} approved groups with missing/placeholder images${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const stats = { fixedSource: 0, fixedTelegram: 0, fixedSibling: 0, failed: 0, skipped: 0 };
  const failures = [];

  for (let i = 0; i < docs.length; i++) {
    const g = docs[i];
    const label = `${i + 1}/${docs.length} ${g.slug || g.name}`;
    try {
      // 3) sibling with https image (any status) — check early for copy without re-upload when same R2
      const sibling = await Group.findOne({
        _id: { $ne: g._id },
        name: g.name,
        image: { $regex: /^https:\/\// },
      });
      if (sibling?.image) {
        if (!DRY_RUN) await Group.updateOne({ _id: g._id }, { $set: { image: sibling.image } });
        stats.fixedSibling++;
        console.log(`✓ sibling ${label}`);
        continue;
      }

      let remoteUrl = null;
      let via = null;

      if (g.sourceImageUrl && String(g.sourceImageUrl).startsWith('https://')) {
        remoteUrl = g.sourceImageUrl;
        via = 'source';
      } else {
        const username = extractUsername(g.telegramLink || '');
        if (username) {
          if (i > 0) await sleep(400);
          remoteUrl = await scrapeTelegramOg(username);
          via = 'telegram';
        }
      }

      if (!remoteUrl) {
        stats.failed++;
        failures.push({ slug: g.slug, name: g.name, reason: 'no source / private link / no og:image' });
        console.log(`✗ ${label} — no image source`);
        continue;
      }

      const buf = await downloadImage(remoteUrl);
      if (!buf) {
        stats.failed++;
        failures.push({ slug: g.slug, name: g.name, reason: `download failed: ${remoteUrl.slice(0, 80)}` });
        console.log(`✗ ${label} — download failed`);
        continue;
      }

      const keyBase = `${slugify(g.slug || g.name)}-${String(g._id).slice(-6)}`;
      const url = await uploadWebp(buf, keyBase);
      if (!DRY_RUN) {
        await Group.updateOne({ _id: g._id }, { $set: { image: url } });
      }
      if (via === 'source') stats.fixedSource++;
      else stats.fixedTelegram++;
      console.log(`✓ ${via} ${label}`);
    } catch (err) {
      stats.failed++;
      failures.push({ slug: g.slug, name: g.name, reason: err.message });
      console.log(`✗ ${label} — ${err.message}`);
    }
  }

  console.log('\nDone:', stats);
  if (failures.length) {
    console.log(`\nStill missing (${failures.length}):`);
    for (const f of failures.slice(0, 40)) console.log(` - ${f.slug}: ${f.reason}`);
    if (failures.length > 40) console.log(` ... +${failures.length - 40} more`);
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
