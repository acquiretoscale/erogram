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

  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    req.headers.get('cloudfront-viewer-country') ||
    req.headers.get('x-country-code') ||
    undefined;

  const city = parseCity(req.headers.get('x-vercel-ip-city'));
  const timezone = req.headers.get('x-vercel-ip-timezone') || undefined;

  const userAgent = req.headers.get('user-agent') || undefined;
  const language =
    req.headers.get('accept-language')?.split(',')[0]?.trim() || undefined;
  const referrer = req.headers.get('referer') || undefined;

  return { ip, country, city, timezone, userAgent, language, referrer };
}

/** ISO 3166-1 alpha-2 country code from edge headers, if present. */
export function getRequestCountry(req: NextRequest): string | undefined {
  const { country } = extractGeoData(req);
  if (!country) return undefined;
  const code = country.toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

function parseCountryCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const code = value.toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

export { parseCountryCode };

/** Decode Vercel/geo city values (URL-encoded, e.g. S%C3%A3o%20Paulo). */
export function parseCity(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  let raw = value.trim().replace(/\+/g, ' ');
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(raw)) break;
    try {
      const next = decodeURIComponent(raw);
      if (next === raw) break;
      raw = next;
    } catch {
      break;
    }
  }
  const out = raw.trim();
  return out || undefined;
}

/** ISO 3166-1 alpha-2 → regional indicator flag emoji. */
export function countryCodeToFlag(code: string | undefined | null): string {
  const parsed = parseCountryCode(code);
  if (!parsed) return '';
  return String.fromCodePoint(
    ...parsed.split('').map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

/** Flag emoji for a stored or display country code (UK/GB → 🇬🇧). */
export function countryToFlagEmoji(code: string | undefined | null): string {
  if (!code?.trim()) return '';
  const upper = code.trim().toUpperCase();
  if (upper === 'UK' || upper === 'GB') return countryCodeToFlag('GB');
  const iso = parseCountryCode(upper);
  return iso ? countryCodeToFlag(iso) : '';
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
