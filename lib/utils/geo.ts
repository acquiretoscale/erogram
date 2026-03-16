import { NextRequest } from 'next/server';

/**
 * Extract geo/device info from Vercel edge headers + standard headers.
 * Vercel injects x-vercel-ip-* on every request for free — no external API needed.
 * Falls back gracefully when running locally (fields will be undefined).
 */
export function extractGeoData(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined;

  const country = req.headers.get('x-vercel-ip-country') || undefined;
  const city = req.headers.get('x-vercel-ip-city') || undefined;
  const timezone = req.headers.get('x-vercel-ip-timezone') || undefined;

  const userAgent = req.headers.get('user-agent') || undefined;
  const language =
    req.headers.get('accept-language')?.split(',')[0]?.trim() || undefined;
  const referrer = req.headers.get('referer') || undefined;

  return { ip, country, city, timezone, userAgent, language, referrer };
}

/**
 * Build a $set update object from geo data, skipping undefined values
 * so we never overwrite existing data with null.
 */
export function geoUpdateFields(req: NextRequest) {
  const geo = extractGeoData(req);
  const update: Record<string, string> = {};
  for (const [key, value] of Object.entries(geo)) {
    if (value) update[key] = value;
  }
  return update;
}
