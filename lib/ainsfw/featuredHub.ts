/** Featured row on /ainsfw: paying clients, up to 8 at a time. */

export const AINSFW_FEATURED_SLOT_COUNT = 8;

/** Paid condition: Xmode stays in slot 1 through 13 Dec 2026 (30 days from 13 Nov 2026). */
export const AINSFW_FEATURED_PINNED_SLUG = 'xmode-ai-nsfw-image-generator';
export const AINSFW_FEATURED_PINNED_UNTIL = Date.parse('2026-12-13T23:59:59.000Z');

/** Stays in the row for good. Dropped only when paying clients fill every spot. */
export const AINSFW_FEATURED_HOUSE_SLUG = 'aislutbot-ai-nude-generator';

/** These occupied the row without a current featured booking. */
export const AINSFW_FEATURED_EXCLUDED = [
  'candy-ai-ai-girlfriend',
  'clothoff-undress-ai',
  'clothoff-net-undress-ai',
] as const;

const EXCLUDED = new Set<string>(AINSFW_FEATURED_EXCLUDED);
const DAY_MS = 24 * 60 * 60 * 1000;

export function pickFeaturedHubWindow(activeSlugs: string[], now = Date.now()): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const raw of activeSlugs) {
    if (typeof raw !== 'string') continue;
    const slug = raw.trim();
    if (!slug || seen.has(slug) || EXCLUDED.has(slug)) continue;
    seen.add(slug);
    pool.push(slug);
  }

  const pinOn = now < AINSFW_FEATURED_PINNED_UNTIL;
  const others = pool.filter(
    (slug) => slug !== AINSFW_FEATURED_PINNED_SLUG && slug !== AINSFW_FEATURED_HOUSE_SLUG,
  );
  const rotatingSlots = AINSFW_FEATURED_SLOT_COUNT - (pinOn ? 1 : 0);

  let rotating: string[];
  if (others.length <= rotatingSlots) {
    rotating = others;
  } else {
    const start = Math.floor(now / DAY_MS) % others.length;
    rotating = [];
    for (let i = 0; i < rotatingSlots; i++) {
      rotating.push(others[(start + i) % others.length]);
    }
  }

  const row = pinOn
    ? [AINSFW_FEATURED_PINNED_SLUG, ...rotating]
    : rotating.slice(0, AINSFW_FEATURED_SLOT_COUNT);

  if (row.length < AINSFW_FEATURED_SLOT_COUNT && !row.includes(AINSFW_FEATURED_HOUSE_SLUG)) {
    row.push(AINSFW_FEATURED_HOUSE_SLUG);
  }

  return row;
}

export async function resolveFeaturedHubSlugs(now = Date.now()): Promise<string[]> {
  const { getBoostFeaturedSlugs } = await import('@/lib/actions/ainsfw');
  const active = await getBoostFeaturedSlugs();

  if (now < AINSFW_FEATURED_PINNED_UNTIL && !active.includes(AINSFW_FEATURED_PINNED_SLUG)) {
    const connectDB = (await import('@/lib/db/mongodb')).default;
    const { AINsfwSubmission } = await import('@/lib/models');
    await connectDB();
    const pin = await AINsfwSubmission.findOne({
      slug: AINSFW_FEATURED_PINNED_SLUG,
      status: 'approved',
      paymentStatus: 'paid',
      unlisted: { $ne: true },
    }).select('slug').lean();
    if (pin) active.unshift(AINSFW_FEATURED_PINNED_SLUG);
  }

  return pickFeaturedHubWindow(active, now);
}
