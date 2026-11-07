'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { LinkExchangePartner, User } from '@/lib/models';
import { LINK_EXCHANGE_PARTNERS } from '@/lib/partners/linkExchangePartners';
import {
  exploreListingOutboundRel,
  isExploreDofollowPartner,
  registerExploreDofollowPartnerSlug,
} from '@/lib/explore/exploreOutboundRel';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export type LinkExchangePartnerPublic = {
  id: string;
  name: string;
  href: string;
  logo: string;
  description: string;
  exploreListingSlug?: string;
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

function mapRow(row: Record<string, unknown>): LinkExchangePartnerPublic {
  return {
    id: String(row._id),
    name: String(row.name),
    href: String(row.href),
    logo: String(row.logo),
    description: String(row.description),
    exploreListingSlug: row.exploreListingSlug ? String(row.exploreListingSlug) : undefined,
  };
}

async function seedBuiltInPartnersIfEmpty() {
  const count = await LinkExchangePartner.countDocuments();
  if (count > 0) return;
  await LinkExchangePartner.insertMany(
    LINK_EXCHANGE_PARTNERS.map((partner, index) => ({
      name: partner.name,
      href: partner.href,
      logo: partner.logo,
      description: partner.description,
      sortOrder: index,
      hidden: false,
    })),
  );
}

export async function resolveExploreListingVisitRel(listingSlug: string): Promise<string> {
  const slug = listingSlug.trim().toLowerCase();
  if (isExploreDofollowPartner(slug)) return 'noopener noreferrer';
  try {
    await connectDB();
    const linked = await LinkExchangePartner.findOne({
      hidden: { $ne: true },
      exploreListingSlug: slug,
    })
      .select('_id')
      .lean();
    if (linked) return 'noopener noreferrer';
  } catch {
    /* ignore */
  }
  return exploreListingOutboundRel(slug);
}

export async function getLinkExchangePartnersPublic(): Promise<LinkExchangePartnerPublic[]> {
  try {
    await connectDB();
    await seedBuiltInPartnersIfEmpty();
    const rows = await LinkExchangePartner.find({ hidden: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    for (const row of rows) {
      const slug = (row as { exploreListingSlug?: string }).exploreListingSlug;
      if (slug) registerExploreDofollowPartnerSlug(slug);
    }
    return rows.map((row) => mapRow(row as Record<string, unknown>));
  } catch (e) {
    console.error('[linkExchangePartners] list failed', e);
    return LINK_EXCHANGE_PARTNERS.map((partner, index) => ({
      id: `static-${index}`,
      name: partner.name,
      href: partner.href,
      logo: partner.logo,
      description: partner.description,
    }));
  }
}

export async function createLinkExchangePartner(
  token: string,
  input: {
    name: string;
    href: string;
    logo: string;
    description: string;
    exploreListingSlug?: string;
  },
) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  const name = input.name.trim();
  const href = input.href.trim();
  const logo = input.logo.trim();
  const description = input.description.trim();
  const exploreListingSlug = (input.exploreListingSlug || '').trim();

  if (!name || !href || !logo || !description) {
    throw new Error('Name, website URL, logo, and description are required');
  }

  await connectDB();
  await seedBuiltInPartnersIfEmpty();

  const maxOrder = await LinkExchangePartner.findOne({ hidden: { $ne: true } })
    .sort({ sortOrder: -1 })
    .select('sortOrder')
    .lean<{ sortOrder?: number } | null>();
  const sortOrder = (maxOrder?.sortOrder ?? -1) + 1;

  const row = await LinkExchangePartner.create({
    name,
    href,
    logo,
    description,
    exploreListingSlug,
    sortOrder,
    hidden: false,
  });

  if (exploreListingSlug) registerExploreDofollowPartnerSlug(exploreListingSlug);

  revalidatePath('/partners');
  return { ok: true, id: String(row._id) };
}

export async function removeLinkExchangePartner(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const row = await LinkExchangePartner.findById(id).lean<{ exploreListingSlug?: string } | null>();
  if (!row) throw new Error('Partner not found');

  await LinkExchangePartner.findByIdAndUpdate(id, { hidden: true });

  revalidatePath('/partners');
  return { ok: true };
}
