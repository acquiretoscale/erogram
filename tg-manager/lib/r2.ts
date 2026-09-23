import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// All TGempire files live under this prefix inside the shared bucket.
// When TGempire gets its own bucket, set this to '' in .env.local.
const NS = (process.env.R2_NAMESPACE ?? 'tgempire').replace(/\/$/, '');
const nsKey = (key: string) => NS ? `${NS}/${key}` : key;
const stripNs = (key: string) => NS ? key.replace(new RegExp(`^${NS}/`), '') : key;

export function getPublicUrl(key: string) {
  return `${PUBLIC_URL}/${key}`;
}

export async function listFolders(): Promise<string[]> {
  const prefix = NS ? `${NS}/` : '';
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, Delimiter: '/' });
  const res = await s3.send(cmd);
  return (res.CommonPrefixes || [])
    .map(p => stripNs((p.Prefix || '').replace(/\/$/, '')))
    .filter(Boolean);
}

export async function listFiles(folder: string): Promise<{ key: string; url: string; size: number }[]> {
  const fullPrefix = nsKey(folder.endsWith('/') ? folder : `${folder}/`);
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: fullPrefix, MaxKeys: 1000 });
  const res = await s3.send(cmd);
  return (res.Contents || [])
    .filter(o => o.Key && o.Key !== fullPrefix)
    .map(o => ({
      key: o.Key!,
      url: getPublicUrl(o.Key!),
      size: o.Size || 0,
    }));
}

export async function uploadFile(key: string, body: Buffer | Uint8Array, contentType: string) {
  const fullKey = nsKey(key);
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: fullKey, Body: body, ContentType: contentType }));
  return getPublicUrl(fullKey);
}

export async function deleteFile(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function slugifyGroupName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export async function ensureFolder(folder: string): Promise<void> {
  const files = await listFiles(folder);
  if (files.length > 0) return;
  const placeholderKey = nsKey(`${folder}/.keep`);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: placeholderKey,
    Body: new Uint8Array(0),
    ContentType: 'application/octet-stream',
  }));
}
