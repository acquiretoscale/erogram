import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'erogramimages';

/** Check at runtime so Vercel env vars are always read correctly. */
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_PUBLIC_URL
  );
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Upload a file buffer to Cloudflare R2.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

export function getR2PublicUrl(): string {
  return process.env.R2_PUBLIC_URL || '';
}

/**
 * Generate a presigned PUT URL so the browser can upload directly to R2.
 * Returns { uploadUrl, publicUrl }.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  return { uploadUrl, publicUrl: `${R2_PUBLIC_URL}/${key}` };
}

/**
 * List files in an R2 folder, optionally filtering by max size.
 * Returns public URLs of matching objects.
 */
export async function listR2Files(
  prefix: string,
  opts: { maxSizeMB?: number; extensions?: string[] } = {}
): Promise<string[]> {
  if (!isR2Configured()) return [];
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
  const client = getR2Client();
  const maxBytes = (opts.maxSizeMB ?? Infinity) * 1024 * 1024;
  const exts = opts.extensions ?? ['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp'];

  const urls: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key || !obj.Size) continue;
      if (obj.Size > maxBytes) continue;
      const lower = obj.Key.toLowerCase();
      if (exts.some(ext => lower.endsWith(ext))) {
        urls.push(`${R2_PUBLIC_URL}/${obj.Key}`);
      }
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return urls;
}

export async function listR2FilesWithDates(
  prefix: string,
  exts: string[] = ['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.webp'],
): Promise<{ url: string; date: string }[]> {
  if (!isR2Configured()) return [];
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
  const client = getR2Client();
  const results: { url: string; date: string }[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`, MaxKeys: 1000, ContinuationToken: continuationToken })
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key || !obj.Size) continue;
      const lower = obj.Key.toLowerCase();
      if (exts.some(ext => lower.endsWith(ext))) {
        results.push({ url: `${R2_PUBLIC_URL}/${obj.Key}`, date: obj.LastModified?.toISOString() || '' });
      }
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return results;
}

export async function deleteFromR2(publicUrl: string): Promise<void> {
  if (!isR2Configured() || !publicUrl) return;
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
  if (!publicUrl.startsWith(R2_PUBLIC_URL)) return;
  const key = publicUrl.replace(`${R2_PUBLIC_URL}/`, '');
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
}

export { R2_BUCKET_NAME };
