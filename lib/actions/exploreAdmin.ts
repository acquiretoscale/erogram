'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { ExploreCategoryOrder, ExploreSiteOverride, User } from '@/lib/models';
import { getExploreSiteListing, getExploreSiteListingByRootSlug, exploreListingRootSlug, exploreSiteListingPath } from '@/lib/explore/exploreSiteListings';
import { customRowToListing, slugifyExploreSiteKey } from '@/lib/explore/exploreCustomSites';
import type { ExploreSiteListing } from '@/lib/explore/exploreSiteListings';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

type OverrideRow = {
  categorySlug: string;
  siteKey: string;
  name?: string;
  externalUrl?: string;
  description?: string;
  image?: string;
  hidden?: boolean;
  isCustom?: boolean;
};

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user?.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

function mapOverrideRow(row: Record<string, unknown>): OverrideRow {
  return {
    categorySlug: String(row.categorySlug),
    siteKey: String(row.siteKey),
    name: row.name ? String(row.name) : undefined,
    externalUrl: row.externalUrl ? String(row.externalUrl) : undefined,
    description: row.description ? String(row.description) : undefined,
    image: row.image ? String(row.image) : undefined,
    hidden: Boolean(row.hidden),
    isCustom: Boolean(row.isCustom),
  };
}

async function appendSiteKeyToOrder(categorySlug: string, siteKey: string) {
  const doc = await ExploreCategoryOrder.findOne({ categorySlug });
  const siteKeys = Array.isArray(doc?.siteKeys) ? [...doc.siteKeys.map(String)] : [];
  if (!siteKeys.includes(siteKey)) siteKeys.push(siteKey);
  await ExploreCategoryOrder.findOneAndUpdate(
    { categorySlug },
    { $set: { siteKeys } },
    { upsert: true },
  );
}

async function removeSiteKeyFromOrder(categorySlug: string, siteKey: string) {
  const doc = await ExploreCategoryOrder.findOne({ categorySlug });
  if (!doc?.siteKeys?.length) return;
  await ExploreCategoryOrder.findOneAndUpdate(
    { categorySlug },
    { siteKeys: doc.siteKeys.map(String).filter((key: string) => key !== siteKey) },
  );
}

export async function getExploreAdminSnapshot() {
  try {
    await connectDB();
    const [overrides, orders] = await Promise.all([
      ExploreSiteOverride.find({})
        .select('categorySlug siteKey name externalUrl description image hidden isCustom')
        .lean(),
      ExploreCategoryOrder.find({}).select('categorySlug siteKeys listed').lean(),
    ]);

    const listed: Record<string, boolean> = {};
    for (const row of orders) {
      if (typeof (row as { listed?: boolean }).listed === 'boolean') {
        listed[String(row.categorySlug)] = Boolean((row as { listed?: boolean }).listed);
      }
    }

    return {
      overrides: overrides.map((row) => mapOverrideRow(row as Record<string, unknown>)),
      orders: orders.map((row) => ({
        categorySlug: String(row.categorySlug),
        siteKeys: Array.isArray(row.siteKeys) ? row.siteKeys.map(String) : [],
      })),
      listed,
    };
  } catch (e) {
    console.error('[exploreAdmin] snapshot failed', e);
    return { overrides: [], orders: [], listed: {} };
  }
}

export async function getExploreSiteOverride(categorySlug: string, siteKey: string) {
  try {
    await connectDB();
    const row = await ExploreSiteOverride.findOne({ categorySlug, siteKey })
      .select('name externalUrl description image hidden isCustom')
      .lean();
    if (!row) return null;
    return mapOverrideRow(row as Record<string, unknown>);
  } catch (e) {
    console.error('[exploreAdmin] get override failed', e);
    return null;
  }
}

export async function getCustomExploreListing(slug: string): Promise<ExploreSiteListing | null> {
  try {
    await connectDB();
    const row = await ExploreSiteOverride.findOne({
      siteKey: slug,
      isCustom: true,
      hidden: { $ne: true },
    }).lean();
    if (!row) return null;
    return customRowToListing(mapOverrideRow(row as Record<string, unknown>));
  } catch (e) {
    console.error('[exploreAdmin] custom listing failed', e);
    return null;
  }
}

export async function resolveExploreListing(slug: string): Promise<ExploreSiteListing | null> {
  const staticListing = getExploreSiteListing(slug);
  if (staticListing) {
    const override = await getExploreSiteOverride(staticListing.categorySlug, slug);
    if (override?.hidden) return null;
    return override ? { ...staticListing, ...mergeStaticOverride(staticListing, override) } : staticListing;
  }
  return getCustomExploreListing(slug);
}

export async function resolveExploreListingByRootSlug(rootSlug: string): Promise<ExploreSiteListing | null> {
  const hit = getExploreSiteListingByRootSlug(rootSlug);
  if (hit) {
    const resolved = await resolveExploreListing(hit.slug);
    if (!resolved) return null;
    return {
      ...resolved,
      categorySlug: hit.categorySlug,
      categoryTitle: hit.categoryTitle,
    };
  }
  const sep = '-porn-';
  const i = rootSlug.lastIndexOf(sep);
  if (i <= 0) return null;
  const siteSlug = rootSlug.slice(0, i);
  const resolved = await resolveExploreListing(siteSlug);
  if (!resolved) return null;
  if (exploreListingRootSlug(resolved.slug, resolved.categorySlug) !== rootSlug) return null;
  return resolved;
}

function mergeStaticOverride(
  listing: ExploreSiteListing,
  override: OverrideRow,
): Partial<ExploreSiteListing> {
  return {
    externalUrl: override.externalUrl || listing.externalUrl,
    description: override.description ?? listing.description,
  };
}

export async function updateExploreSiteListing(
  token: string,
  input: {
    categorySlug: string;
    siteKey: string;
    externalUrl: string;
    description: string;
  },
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await ExploreSiteOverride.findOneAndUpdate(
    { categorySlug: input.categorySlug, siteKey: input.siteKey },
    {
      externalUrl: input.externalUrl.trim(),
      description: input.description.trim(),
    },
    { upsert: true },
  );

  revalidatePath('/best-porn');
  revalidatePath(`/best-porn/${input.siteKey}`);
  revalidatePath(exploreSiteListingPath(input.siteKey, input.categorySlug));
  return { ok: true };
}

export async function saveExploreCategoryOrder(
  token: string,
  categorySlug: string,
  siteKeys: string[],
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await ExploreCategoryOrder.findOneAndUpdate(
    { categorySlug },
    { $set: { siteKeys } },
    { upsert: true },
  );

  revalidatePath('/best-porn');
  return { ok: true };
}

export async function setExploreCategoryListed(
  token: string,
  categorySlug: string,
  listed: boolean,
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  await ExploreCategoryOrder.findOneAndUpdate(
    { categorySlug },
    { $set: { listed } },
    { upsert: true },
  );

  revalidatePath('/best-porn');
  return { ok: true };
}

export async function loadExploreCategoriesForAdmin(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  const { loadExplorePageCategories } = await import('@/lib/explore/loadExplorePageCategories');
  return loadExplorePageCategories();
}

export async function addExploreSite(
  token: string,
  input: {
    categorySlug: string;
    name: string;
    externalUrl: string;
    description?: string;
  },
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  const name = input.name.trim();
  const externalUrl = input.externalUrl.trim();
  if (!name || !externalUrl) throw new Error('Name and link are required');

  await connectDB();

  let siteKey = slugifyExploreSiteKey(name);
  if (!siteKey) throw new Error('Invalid name');

  let suffix = 0;
  while (
    getExploreSiteListing(siteKey) ||
    (await ExploreSiteOverride.findOne({ siteKey, hidden: { $ne: true } }).lean())
  ) {
    suffix += 1;
    siteKey = `${slugifyExploreSiteKey(name)}-${suffix}`;
  }

  await ExploreSiteOverride.create({
    categorySlug: input.categorySlug,
    siteKey,
    name,
    externalUrl,
    description: (input.description || '').trim(),
    isCustom: true,
    hidden: false,
  });

  await appendSiteKeyToOrder(input.categorySlug, siteKey);

  revalidatePath('/best-porn');
  revalidatePath(`/best-porn/${siteKey}`);
  revalidatePath(exploreSiteListingPath(siteKey, input.categorySlug));
  return { ok: true, siteKey };
}

export async function removeExploreSite(
  token: string,
  categorySlug: string,
  siteKey: string,
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const row = await ExploreSiteOverride.findOne({ categorySlug, siteKey }).lean<{ isCustom?: boolean } | null>();

  if (row?.isCustom) {
    await ExploreSiteOverride.deleteOne({ categorySlug, siteKey });
  } else {
    await ExploreSiteOverride.findOneAndUpdate(
      { categorySlug, siteKey },
      { hidden: true },
      { upsert: true },
    );
  }

  await removeSiteKeyFromOrder(categorySlug, siteKey);

  revalidatePath('/best-porn');
  revalidatePath(`/best-porn/${siteKey}`);
  revalidatePath(exploreSiteListingPath(siteKey, categorySlug));
  return { ok: true };
}
