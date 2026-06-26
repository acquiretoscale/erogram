'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { Author, User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export interface AuthorProfile {
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
  socials: { x: string; telegram: string; instagram: string; website: string };
}

// The two fictional authors Erogram ships with. Seeded once if missing — never
// overwritten, so owner edits in /admin always win.
const DEFAULT_AUTHORS: AuthorProfile[] = [
  {
    slug: 'eros',
    name: 'Enzo Delacroix',
    role: 'Chief Editor',
    bio: "Enzo Delacroix is Erogram's Chief Editor, covering AI companionship, adult tech, and the creator economy. Reporting from inside the industry since 2023, he tracks what's actually working — not what's hyped.",
    avatar: '/assets/blog/authors/eros.webp',
    socials: { x: '', telegram: '', instagram: '', website: '' },
  },
  {
    slug: 'mara-lune',
    name: 'Marla Stinger',
    role: 'Editor',
    bio: 'Marla Stinger is an Editor at Erogram covering NSFW Telegram groups, bots, and channel culture. She blends hands-on testing with data from Erogram’s research desk.',
    avatar: '/assets/blog/authors/mara.webp',
    socials: { x: '', telegram: '', instagram: '', website: '' },
  },
];

function normalize(a: any): AuthorProfile {
  return {
    slug: a.slug,
    name: a.name || 'Eros',
    role: a.role || 'Staff Writer',
    bio: a.bio || '',
    avatar: a.avatar || '',
    socials: {
      x: a?.socials?.x || '',
      telegram: a?.socials?.telegram || '',
      instagram: a?.socials?.instagram || '',
      website: a?.socials?.website || '',
    },
  };
}

async function ensureSeeded() {
  const count = await Author.estimatedDocumentCount();
  if (count > 0) return;
  for (const a of DEFAULT_AUTHORS) {
    // insert-if-missing — never clobber an existing slug
    await Author.updateOne({ slug: a.slug }, { $setOnInsert: a }, { upsert: true });
  }
}

/** All authors (seeds the 2 defaults on first run). */
export async function getAuthors(): Promise<AuthorProfile[]> {
  try {
    await connectDB();
    await ensureSeeded();
    const rows = await Author.find({}).sort({ createdAt: 1 }).lean();
    return (rows as any[]).map(normalize);
  } catch (e) {
    console.error('[authors] getAuthors failed:', e);
    return DEFAULT_AUTHORS;
  }
}

/** Single author by slug, with a safe fallback to Eros. */
export async function getAuthorBySlug(slug?: string | null): Promise<AuthorProfile> {
  try {
    await connectDB();
    await ensureSeeded();
    const a = slug ? await Author.findOne({ slug }).lean() : null;
    if (a) return normalize(a);
    const fallback = await Author.findOne({ slug: 'eros' }).lean();
    return fallback ? normalize(fallback) : DEFAULT_AUTHORS[0];
  } catch (e) {
    console.error('[authors] getAuthorBySlug failed:', e);
    return DEFAULT_AUTHORS[0];
  }
}

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

function slugify(s: string): string {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Create or update an author (admin). Updates only the fields provided (rule 13). */
export async function upsertAuthor(token: string, data: Partial<AuthorProfile> & { slug?: string }): Promise<AuthorProfile> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();

  const slug = data.slug && data.slug.trim() ? data.slug.trim() : slugify(data.name || '');
  if (!slug) throw new Error('Author name is required');

  const set: any = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.role !== undefined) set.role = data.role;
  if (data.bio !== undefined) set.bio = data.bio;
  if (data.avatar !== undefined) set.avatar = data.avatar;
  if (data.socials) {
    if (data.socials.x !== undefined) set['socials.x'] = data.socials.x;
    if (data.socials.telegram !== undefined) set['socials.telegram'] = data.socials.telegram;
    if (data.socials.instagram !== undefined) set['socials.instagram'] = data.socials.instagram;
    if (data.socials.website !== undefined) set['socials.website'] = data.socials.website;
  }

  await Author.updateOne({ slug }, { $set: set, $setOnInsert: { slug } }, { upsert: true });
  const saved = await Author.findOne({ slug }).lean();
  return normalize(saved);
}

/** Delete an author (admin). The Eros author cannot be deleted (it's the fallback). */
export async function deleteAuthor(token: string, slug: string): Promise<{ ok: boolean }> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (slug === 'eros') throw new Error('The Eros author is the default and cannot be deleted');
  await connectDB();
  await Author.deleteOne({ slug });
  return { ok: true };
}
