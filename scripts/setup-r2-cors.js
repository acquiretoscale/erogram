/**
 * One-time script to configure CORS on the R2 bucket.
 * This allows the browser to upload directly to R2 via presigned URLs.
 *
 * Usage: node scripts/setup-r2-cors.js
 *
 * Requires env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME || 'erogramimages';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2 env vars. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function main() {
  await client.send(new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ['https://erogram.pro', 'https://www.erogram.pro', 'http://localhost:3000'],
          AllowedMethods: ['PUT', 'GET', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 86400,
        },
      ],
    },
  }));
  console.log(`CORS configured on bucket "${bucket}" — browser uploads enabled.`);
}

main().catch(err => {
  console.error('Failed to set CORS:', err.message);
  process.exit(1);
});
