import type { MediaKitContent, MediaKitFaqItem, MediaKitOfferRow, MediaKitPerformancePack } from './types';
import { DEFAULT_MEDIA_KIT_CONTENT } from './defaults';

function filled(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function mergeOffer(saved: unknown, fallback: MediaKitOfferRow): MediaKitOfferRow {
  if (!saved || typeof saved !== 'object') return { ...fallback };
  const row = saved as Partial<MediaKitOfferRow>;
  return {
    num: typeof row.num === 'number' ? row.num : fallback.num,
    offerKind: row.offerKind === 'LISTING' || row.offerKind === 'BANNER' || row.offerKind === 'BLOG POST'
      ? row.offerKind
      : fallback.offerKind,
    name: filled(row.name, fallback.name),
    placement: filled(row.placement, fallback.placement),
    period: filled(row.period, fallback.period),
    included: filled(row.included, fallback.included),
    price: filled(row.price, fallback.price),
    availability: filled(row.availability, fallback.availability),
  };
}

function mergeOffers(saved: unknown, fallback: MediaKitOfferRow[]) {
  if (!Array.isArray(saved) || saved.length === 0) return fallback.map((row) => ({ ...row }));
  const count = Math.max(saved.length, fallback.length);
  return Array.from({ length: count }, (_, i) => mergeOffer(saved[i], fallback[i] ?? fallback[fallback.length - 1]));
}

function mergePack(saved: unknown, fallback: MediaKitPerformancePack): MediaKitPerformancePack {
  if (!saved || typeof saved !== 'object') {
    return { ...fallback, bullets: [...fallback.bullets], footerLines: [...fallback.footerLines] };
  }
  const raw = saved as Partial<MediaKitPerformancePack>;
  const bullets = Array.isArray(raw.bullets) && raw.bullets.length
    ? raw.bullets.map((item, i) => filled(item, fallback.bullets[i] ?? ''))
    : [...fallback.bullets];
  const footerLines =
    Array.isArray(raw.footerLines) && raw.footerLines.length
      ? raw.footerLines.map((item, i) => filled(item, fallback.footerLines[i] ?? ''))
      : [...fallback.footerLines];
  return {
    title: filled(raw.title, fallback.title),
    price: filled(raw.price, fallback.price),
    intro: typeof raw.intro === 'string' ? raw.intro : fallback.intro,
    slots: filled(raw.slots, fallback.slots),
    bullets,
    footerLines,
  };
}

function mergePerformancePacks(saved: unknown, fallback: MediaKitPerformancePack[]) {
  if (!Array.isArray(saved) || saved.length === 0) {
    return fallback.map((pack) => ({ ...pack, bullets: [...pack.bullets], footerLines: [...pack.footerLines] }));
  }
  const count = Math.max(saved.length, fallback.length);
  return Array.from({ length: count }, (_, i) => mergePack(saved[i], fallback[i] ?? fallback[fallback.length - 1]));
}

function mergeFaq(saved: unknown, fallback: MediaKitFaqItem[]): MediaKitFaqItem[] {
  if (!Array.isArray(saved) || saved.length === 0) return fallback.map((item) => ({ ...item }));
  const count = Math.max(saved.length, fallback.length);
  return Array.from({ length: count }, (_, i) => {
    const item = saved[i] as Partial<MediaKitFaqItem> | undefined;
    const def = fallback[i] ?? fallback[fallback.length - 1];
    return {
      q: filled(item?.q, def.q),
      a: filled(item?.a, def.a),
    };
  });
}

export function resolveMediaKitContent(saved: unknown): MediaKitContent {
  const base = DEFAULT_MEDIA_KIT_CONTENT;
  const raw = saved && typeof saved === 'object' ? (saved as Partial<MediaKitContent>) : {};
  return {
    listingOffers: mergeOffers(raw.listingOffers, base.listingOffers),
    otherOffers: mergeOffers(raw.otherOffers, base.otherOffers),
    performancePacks: mergePerformancePacks(raw.performancePacks, base.performancePacks),
    faq: mergeFaq(raw.faq, base.faq),
  };
}

export function setMediaKitField(content: MediaKitContent, path: string, value: string): MediaKitContent {
  const next = structuredClone(content);
  const keys = path.split('.');
  let cur: unknown = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const idx = Number(key);
    if (cur === null || cur === undefined || typeof cur !== 'object') return content;
    cur =
      Number.isInteger(idx) && key === String(idx)
        ? (cur as unknown[])[idx]
        : (cur as Record<string, unknown>)[key];
    if (cur === undefined || cur === null) return content;
  }
  const last = keys[keys.length - 1];
  const lastIdx = Number(last);
  if (cur === null || cur === undefined || typeof cur !== 'object') return content;
  if (Number.isInteger(lastIdx) && last === String(lastIdx)) {
    (cur as unknown[])[lastIdx] = value;
  } else {
    (cur as Record<string, unknown>)[last] = value;
  }
  return next;
}