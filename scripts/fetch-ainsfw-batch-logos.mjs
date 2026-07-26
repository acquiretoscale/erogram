/**
 * Phase 3: Fetch logos, process to WebP, upload to R2. Resumable.
 * Phase 4 (gallery): node --env-file=.env.local scripts/fetch-ainsfw-batch-gallery.mjs
 * Then: node --env-file=.env.local scripts/migrate-ainsfw-gallery.js
 * Usage: node --env-file=.env.local scripts/fetch-ainsfw-batch-logos.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import {
  MANIFEST_PATH,
  IMAGES_PATH,
  R2_PUBLIC,
} from './ainsfw-batch-lib.mjs';

const TAVILY_KEY = process.env.TAVILY_API_KEY || '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';
const LOCAL_DIR = path.join(process.cwd(), 'public', 'assets', 'ainsfw', 'batch');

const r2Ready = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
const r2 = r2Ready
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;
const BUCKET = process.env.R2_BUCKET_NAME || 'erogramimages';

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
let images = {};
if (fs.existsSync(IMAGES_PATH)) {
  try { images = JSON.parse(fs.readFileSync(IMAGES_PATH, 'utf8')); } catch {}
}

fs.mkdirSync(LOCAL_DIR, { recursive: true });

async function tryFetch(url, timeout = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function toLogoWebp(buf) {
  return sharp(buf).resize(400, 400, { fit: 'cover', position: 'centre' }).webp({ quality: 85 }).toBuffer();
}

async function uploadR2(key, body) {
  if (!r2) return null;
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return `${R2_PUBLIC}/${key}`;
  } catch {
    await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: 'image/webp' }));
    return `${R2_PUBLIC}/${key}`;
  }
}

async function fetchLogo(tool) {
  const domain = tool.vendor.toLowerCase();
  const key = `ainsfw/${tool.slug}.webp`;
  if (images[tool.slug]?.image) return images[tool.slug].image;

  const strategies = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    `https://logo.clearbit.com/${domain}`,
    `https://${domain}/apple-touch-icon.png`,
    `https://${domain}/favicon.ico`,
  ];

  for (const url of strategies) {
    const buf = await tryFetch(url);
    if (!buf || buf.length < 500) continue;
    try {
      const meta = await sharp(buf).metadata();
      if (!meta.width || meta.width < 32) continue;
      const webp = await toLogoWebp(buf);
      const localPath = path.join(LOCAL_DIR, `${tool.slug}.webp`);
      fs.writeFileSync(localPath, webp);
      const r2Url = await uploadR2(key, webp);
      return r2Url || `/assets/ainsfw/batch/${tool.slug}.webp`;
    } catch {
      /* next */
    }
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: `${tool.name} ${domain} logo icon`,
        search_depth: 'basic',
        include_images: true,
        max_results: 5,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const urls = (data.images || []).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
      for (const imgUrl of urls.slice(0, 5)) {
        const buf = await tryFetch(imgUrl);
        if (!buf || buf.length < 2000) continue;
        try {
          const webp = await toLogoWebp(buf);
          const localPath = path.join(LOCAL_DIR, `${tool.slug}.webp`);
          fs.writeFileSync(localPath, webp);
          const r2Url = await uploadR2(key, webp);
          return r2Url || `/assets/ainsfw/batch/${tool.slug}.webp`;
        } catch {
          /* next */
        }
      }
    }
  } catch {}

  return '/assets/image.jpg';
}

let ok = 0;
let fail = 0;

for (let i = 0; i < manifest.length; i++) {
  const tool = manifest[i];
  if (images[tool.slug]?.image && images[tool.slug].image !== '/assets/image.jpg') {
    ok++;
    continue;
  }
  console.log(`[${i + 1}/${manifest.length}] ${tool.name}`);
  const image = await fetchLogo(tool);
  images[tool.slug] = { slug: tool.slug, image };
  if (image === '/assets/image.jpg') {
    console.log('  ⚠️ fallback');
    fail++;
  } else {
    console.log(`  ✅ ${image.slice(0, 70)}...`);
    ok++;
  }
  fs.writeFileSync(IMAGES_PATH, JSON.stringify(images, null, 2));
}

console.log(`\nLogos: ${ok} ok, ${fail} fallback`);
