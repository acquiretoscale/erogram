/**
 * Fix tiny/fake group images (Telegram letter-avatar scrapes, ~1–5KB 320x320 webps).
 * Recovery: sibling good image → sourceImageUrl → public t.me og:image (reject SVG/logo/tiny).
 *
 *   node --env-file=.env.local scripts/fix-tiny-group-images.mjs --dry-run
 *   node --env-file=.env.local scripts/fix-tiny-group-images.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MongoClient } from 'mongodb';
import sharp from 'sharp';

const DRY_RUN = process.argv.includes('--dry-run');
const TINY_BYTES = 5000;

const {
  MONGODB_URI,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL,
  R2_BUCKET_NAME = 'erogramimages',
} = process.env;

if (!MONGODB_URI || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('Missing env');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractUsername(telegramLink) {
  if (!telegramLink) return null;
  if (/t\.me\/\+|joinchat/i.test(telegramLink)) return null;
  const match = String(telegramLink).match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]{3,})/);
  if (!match) return null;
  const reserved = ['joinchat', 'addstickers', 'addtheme', 'proxy', 'socks', 'setlanguage', 'share'];
  if (reserved.includes(match[1].toLowerCase())) return null;
  return match[1];
}

function slugify(name) {
  return (
    String(name || 'group')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || 'group'
  );
}

function isBadRemoteUrl(url) {
  if (!url || typeof url !== 'string') return true;
  if (url.startsWith('data:')) return true;
  if (url.includes('telegram.org/img')) return true;
  if (url.includes('placeholder')) return true;
  return false;
}

async function headSize(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return -1;
    return Number(r.headers.get('content-length') || 0);
  } catch {
    return -1;
  }
}

async function downloadImage(url) {
  if (isBadRemoteUrl(url)) return null;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ErogramBot/1.0)' },
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < TINY_BYTES) return null;
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
  const imageUrl = ogMatch?.[1];
  if (!imageUrl || isBadRemoteUrl(imageUrl)) return null;
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
  if (compressed.length < TINY_BYTES) return null;
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

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const Group = client.db().collection('groups');

  const docs = await Group.find({
    status: 'approved',
    isAdvertisement: { $ne: true },
    image: { $regex: /^https:\/\// },
  })
    .project({ name: 1, slug: 1, image: 1, telegramLink: 1, sourceImageUrl: 1 })
    .toArray();

  console.log(`Checking ${docs.length} https images for tiny fakes…`);
  const sizes = await mapPool(docs, 25, async (g) => ({ g, size: await headSize(g.image) }));
  const tiny = sizes.filter((x) => x.size >= 0 && x.size < TINY_BYTES).map((x) => x.g);
  console.log(`Found ${tiny.length} tiny images (<${TINY_BYTES}B)${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const stats = { fixedSibling: 0, fixedSource: 0, fixedTelegram: 0, failed: 0 };
  const failures = [];

  for (let i = 0; i < tiny.length; i++) {
    const g = tiny[i];
    const label = `${i + 1}/${tiny.length} ${g.slug || g.name}`;
    try {
      // Sibling with a non-tiny https image
      const siblings = await Group.find({
        _id: { $ne: g._id },
        name: g.name,
        image: { $regex: /^https:\/\// },
      })
        .project({ image: 1 })
        .toArray();
      let siblingUrl = null;
      for (const s of siblings) {
        const sz = await headSize(s.image);
        if (sz >= TINY_BYTES) {
          siblingUrl = s.image;
          break;
        }
      }
      if (siblingUrl) {
        if (!DRY_RUN) await Group.updateOne({ _id: g._id }, { $set: { image: siblingUrl } });
        stats.fixedSibling++;
        console.log(`✓ sibling ${label}`);
        continue;
      }

      let remote = null;
      let via = null;
      if (g.sourceImageUrl && String(g.sourceImageUrl).startsWith('https://') && !isBadRemoteUrl(g.sourceImageUrl)) {
        remote = g.sourceImageUrl;
        via = 'source';
      } else {
        const username = extractUsername(g.telegramLink || '');
        if (username) {
          await sleep(350);
          remote = await scrapeTelegramOg(username);
          via = 'telegram';
        }
      }

      if (!remote) {
        stats.failed++;
        failures.push({ slug: g.slug, reason: 'no recovery source' });
        console.log(`✗ ${label} — no recovery`);
        continue;
      }

      const buf = await downloadImage(remote);
      if (!buf) {
        stats.failed++;
        failures.push({ slug: g.slug, reason: 'bad/tiny remote' });
        console.log(`✗ ${label} — bad remote`);
        continue;
      }

      const url = await uploadWebp(buf, `${slugify(g.slug || g.name)}-${String(g._id).slice(-6)}`);
      if (!url) {
        stats.failed++;
        failures.push({ slug: g.slug, reason: 'upload produced tiny' });
        console.log(`✗ ${label} — upload tiny`);
        continue;
      }
      if (!DRY_RUN) await Group.updateOne({ _id: g._id }, { $set: { image: url } });
      if (via === 'source') stats.fixedSource++;
      else stats.fixedTelegram++;
      console.log(`✓ ${via} ${label}`);
    } catch (err) {
      stats.failed++;
      failures.push({ slug: g.slug, reason: err.message });
      console.log(`✗ ${label} — ${err.message}`);
    }
  }

  console.log('\nDone:', stats);
  if (failures.length) {
    console.log(`Still broken (${failures.length}):`);
    for (const f of failures.slice(0, 50)) console.log(` - ${f.slug}: ${f.reason}`);
    if (failures.length > 50) console.log(` ... +${failures.length - 50} more`);
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
