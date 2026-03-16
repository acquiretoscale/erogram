/**
 * Find and restore hard-deleted groups from mongo_full/groups.bson.
 *
 * Compares slugs in the BSON dump with the live database.
 * Groups present in the dump but missing from the live DB are considered
 * hard-deleted. By default this script only prints the inventory.
 * Pass --restore to re-insert them with status='deleted'.
 *
 * Usage (from erogram-v2):
 *   node --env-file=.env.local scripts/recover-deleted-groups.mjs
 *   node --env-file=.env.local scripts/recover-deleted-groups.mjs --restore
 *   node --env-file=.env.local scripts/recover-deleted-groups.mjs --dump=../mongo_full
 */

import { MongoClient } from 'mongodb';
import { BSON } from 'bson';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const RESTORE = args.includes('--restore');
const dumpArg = args.find((a) => a.startsWith('--dump='));
const DUMP_DIR = dumpArg
  ? dumpArg.slice('--dump='.length).replace(/^["']|["']$/g, '')
  : path.join(PROJECT_ROOT, '..', 'mongo_full');
const GROUPS_BSON = path.join(DUMP_DIR, 'groups.bson');

function parseBsonFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const docs = [];
  let offset = 0;
  while (offset + 4 <= buf.length) {
    const size = buf.readInt32LE(offset);
    if (size < 5 || size > 10 * 1024 * 1024) break;
    if (offset + size > buf.length) break;
    const docBuf = buf.slice(offset, offset + size);
    docs.push(BSON.deserialize(docBuf));
    offset += size;
  }
  return docs;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI. Use --env-file=.env.local or set MONGODB_URI.');
    process.exit(1);
  }
  if (!fs.existsSync(GROUPS_BSON)) {
    console.error('Groups dump not found:', GROUPS_BSON);
    console.error('Place mongo_full next to erogram-v2 or pass --dump=/path/to/mongo_full');
    process.exit(1);
  }

  console.log('Reading', GROUPS_BSON, '...');
  const dumpDocs = parseBsonFile(GROUPS_BSON);
  console.log(`Parsed ${dumpDocs.length} groups from dump.\n`);

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    console.log('Connected to database:', db.databaseName);

    const collection = db.collection('groups');
    const liveSlugs = new Set(
      (await collection.find({}, { projection: { slug: 1 } }).toArray()).map((d) => d.slug)
    );
    console.log(`Live DB has ${liveSlugs.size} groups.\n`);

    const approvedDump = dumpDocs.filter((d) => d.status === 'approved');
    const missing = approvedDump.filter((d) => !liveSlugs.has(d.slug));

    if (missing.length === 0) {
      console.log('No hard-deleted groups found. Dump and live DB match.');
      return;
    }

    console.log(`=== ${missing.length} hard-deleted groups found ===\n`);
    const byCat = {};
    for (const g of missing) {
      const cat = g.category || 'Unknown';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(g);
    }

    for (const [cat, groups] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n--- ${cat} (${groups.length}) ---`);
      for (const g of groups) {
        console.log(`  ${g.slug}  |  ${g.name}  |  country: ${g.country}`);
      }
    }

    if (!RESTORE) {
      console.log(`\nDry run complete. Pass --restore to re-insert these ${missing.length} groups as status='deleted'.`);
      return;
    }

    console.log(`\nRestoring ${missing.length} groups with status='deleted' ...`);
    let restored = 0;
    for (const doc of missing) {
      delete doc._id;
      doc.status = 'deleted';
      doc.deletedAt = new Date();
      try {
        await collection.insertOne(doc);
        restored++;
      } catch (err) {
        if (err.code === 11000) {
          console.warn(`  Skipped (duplicate slug): ${doc.slug}`);
        } else {
          console.error(`  Error inserting ${doc.slug}:`, err.message);
        }
      }
    }
    console.log(`\nDone. Restored ${restored}/${missing.length} groups as soft-deleted.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
