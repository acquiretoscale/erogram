/**
 * READ-ONLY backup of the `trackingevents` collection.
 * Streams every document to a gzipped JSONL file. Writes nothing to MongoDB.
 *
 * Usage (run from the repo root so `mongodb` resolves):
 *   node --env-file=.env.local ../ErogramPRO-scratch/backup-trackingevents.mjs
 */
import { createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { EJSON } from 'bson';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const outPath = process.env.BACKUP_OUT
  || `/Users/themaf/Desktop/ErogramPRO-scratch/trackingevents-backup-${stamp}.jsonl.gz`;

function fmt(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const client = new MongoClient(uri);
await client.connect();
const coll = client.db().collection('trackingevents');

const expected = await coll.countDocuments();
console.log(`Backing up ${expected} documents from 'trackingevents'`);
console.log(`Destination: ${outPath}\n`);

let written = 0;
const cursor = coll.find({}).sort({ _id: 1 }).batchSize(2000);

async function* lines() {
  for await (const doc of cursor) {
    written++;
    if (written % 25000 === 0) console.log(`  ...${written}/${expected}`);
    // EJSON preserves ObjectIds, Dates and other BSON types exactly.
    yield `${EJSON.stringify(doc, { relaxed: false })}\n`;
  }
}

await pipeline(Readable.from(lines()), createGzip({ level: 9 }), createWriteStream(outPath));
await client.close();

const { statSync } = await import('node:fs');
const size = statSync(outPath).size;

console.log(`\nDone.`);
console.log(`Documents written: ${written} (expected ${expected})`);
console.log(`File size: ${fmt(size)}`);
if (written !== expected) console.warn('WARNING: count mismatch, review before relying on this backup.');
