/** Featured row: prime slot + 3 rotating featured bookings. */

export const AINSFW_FEATURED_SLOT_COUNT = 4;
export const AINSFW_FEATURED_ROTATING_COUNT = 3;

/** Shown in the 3 rotating spots while this booking is still featured. */
export const AINSFW_FEATURED_MUST_SHOW_SLUG = 'ai-smut-writer-ai-chat';

/** Paid condition: Xmode stays in slot 1 through 13 Dec 2026 (30 days from 13 Nov 2026). */
export const AINSFW_FEATURED_PINNED_SLUG = 'xmode-ai-nsfw-image-generator';
export const AINSFW_FEATURED_PINNED_UNTIL = Date.parse('2026-12-13T23:59:59.000Z');

/** House listing. Kept out of the paid featured seats. */
export const AINSFW_FEATURED_HOUSE_SLUG = 'aislutbot-ai-nude-generator';

/** These occupied the row without a current featured booking. */
export const AINSFW_FEATURED_EXCLUDED = [
  'candy-ai-ai-girlfriend',
  'clothoff-undress-ai',
  'clothoff-net-undress-ai',
] as const;

const EXCLUDED = new Set<string>(AINSFW_FEATURED_EXCLUDED);

function shuffleSlugs(slugs: string[], seed: number): string[] {
  const arr = [...slugs];
  let state = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const swap = arr[i];
    arr[i] = arr[j];
    arr[j] = swap;
  }
  return arr;
}

function pickRotating(others: string[], count: number, seed: number): string[] {
  if (others.length <= count) return shuffleSlugs(others, seed);
  const must = others.includes(AINSFW_FEATURED_MUST_SHOW_SLUG)
    ? AINSFW_FEATURED_MUST_SHOW_SLUG
    : '';
  const rest = shuffleSlugs(others.filter((slug) => slug !== must), seed);
  const picked = must ? [must, ...rest.slice(0, count - 1)] : rest.slice(0, count);
  return shuffleSlugs(picked, seed + 1);
}

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
  const seed = Math.floor(now / (5 * 60 * 1000));

  if (pinOn) {
    return [AINSFW_FEATURED_PINNED_SLUG, ...pickRotating(others, AINSFW_FEATURED_ROTATING_COUNT, seed)];
  }

  const shared = pool.filter((slug) => slug !== AINSFW_FEATURED_HOUSE_SLUG);
  return pickRotating(shared, AINSFW_FEATURED_SLOT_COUNT, seed);
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
