import connectDB from '@/lib/db/mongodb';
import { OFMSettings } from '@/lib/models';

/**
 * Get the next active (non-burned) Apify API key from the DB rotation pool.
 * Picks the key with the oldest lastUsedAt (round-robin).
 * Increments usageCount and updates lastUsedAt.
 * Falls back to APIFY_API_TOKEN env var if no keys in DB.
 *
 * Returns { token, actor } or null if nothing available.
 */
export async function getApifyCredentials(): Promise<{ token: string; actor: string } | null> {
  await connectDB();

  let settings = await OFMSettings.findOne({ key: 'default' });

  if (!settings) {
    const envKey = process.env.APIFY_API_TOKEN;
    if (!envKey) return null;
    return {
      token: envKey,
      actor: process.env.APIFY_ONLYFANS_ACTOR || 'igolaizola/onlyfans-scraper',
    };
  }

  const actor = settings.apifyActor || process.env.APIFY_ONLYFANS_ACTOR || 'igolaizola/onlyfans-scraper';
  const activeKeys = settings.apifyKeys.filter((k: any) => k.active && !k.burned);

  if (activeKeys.length === 0) {
    const envKey = process.env.APIFY_API_TOKEN;
    if (!envKey) return null;
    return { token: envKey, actor };
  }

  // Round-robin: pick the one with oldest lastUsedAt (or never used)
  activeKeys.sort((a: any, b: any) => {
    if (!a.lastUsedAt) return -1;
    if (!b.lastUsedAt) return 1;
    return new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime();
  });

  const chosen = activeKeys[0];

  // Update usage stats
  await OFMSettings.updateOne(
    { key: 'default', 'apifyKeys._id': chosen._id },
    {
      $inc: { 'apifyKeys.$.usageCount': 1 },
      $set: { 'apifyKeys.$.lastUsedAt': new Date() },
    },
  );

  return { token: chosen.apiKey, actor };
}

/**
 * Mark an API key as burned (e.g. when Apify returns 402/403).
 */
export async function markKeyBurned(token: string): Promise<void> {
  await connectDB();
  await OFMSettings.updateOne(
    { key: 'default', 'apifyKeys.apiKey': token },
    {
      $set: {
        'apifyKeys.$.burned': true,
        'apifyKeys.$.active': false,
      },
    },
  );
}
