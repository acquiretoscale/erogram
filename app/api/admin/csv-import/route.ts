import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';


const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch { /* invalid token */ }
  return null;
}

interface CsvRow {
  name: string;
  telegramLink: string;
  description: string;
  profilePictureUrl?: string;
  totalUsers?: string | number;
  category?: string;
  country?: string;
}

/**
 * POST /api/admin/csv-import
 *
 * Bulk import groups from parsed CSV data as `pending`.
 * Category/country can be per-row (from CSV) or use a global fallback.
 *
 * Body: {
 *   rows: CsvRow[],
 *   fallbackCategory?: string,
 *   fallbackCountry?: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const admin = await authenticate(req);
    if (!admin) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { rows, fallbackCategory, fallbackCountry } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { message: 'No rows provided' },
        { status: 400 }
      );
    }

    const seenLinks = new Set<string>();
    const uniqueRows: CsvRow[] = [];
    let csvDuplicates = 0;

    for (const row of rows) {
      const link = (row.telegramLink || '').trim();
      if (!link || seenLinks.has(link)) {
        csvDuplicates++;
        continue;
      }
      seenLinks.add(link);
      uniqueRows.push(row);
    }

    const allLinks = uniqueRows.map(r => r.telegramLink.trim());
    const existingGroups = await Group.find({
      telegramLink: { $in: allLinks },
    })
      .select('telegramLink')
      .lean();
    const existingSet = new Set(
      existingGroups.map((g: any) => g.telegramLink)
    );

    const newRows = uniqueRows.filter(
      r => !existingSet.has(r.telegramLink.trim())
    );
    const dbDuplicates = uniqueRows.length - newRows.length;

    if (newRows.length === 0) {
      return NextResponse.json({
        imported: 0,
        csvDuplicates,
        dbDuplicates,
        batchId: null,
        message: 'All rows are duplicates — nothing to import.',
      });
    }

    const batchId = randomUUID();

    const baseSlugs = newRows.map(r => slugify(r.name));
    const existingSlugs = await Group.find({
      slug: { $in: baseSlugs.map(s => new RegExp(`^${s}`)) },
    })
      .select('slug')
      .lean();
    const existingSlugSet = new Set(
      existingSlugs.map((g: any) => g.slug)
    );
    const batchSlugSet = new Set<string>();

    function getUniqueSlug(baseName: string): string {
      let slug = slugify(baseName);
      let counter = 1;
      while (existingSlugSet.has(slug) || batchSlugSet.has(slug)) {
        slug = `${slugify(baseName)}-${counter++}`;
      }
      batchSlugSet.add(slug);
      return slug;
    }

    const normalizeCat = (cat: string) => {
      const l = cat.toLowerCase();
      if (l === 'porn' || l === 'porn-telegram' || l === 'telegram porn' || l === 'porn telegram') return 'Telegram-Porn';
      return cat;
    };

    const documents = newRows.map((row) => ({
      name: (row.name || '').trim(),
      slug: getUniqueSlug(row.name),
      category: normalizeCat((row.category || '').trim() || fallbackCategory || 'Adult'),
      country: (row.country || '').trim() || fallbackCountry || 'All',
      telegramLink: row.telegramLink.trim(),
      description: (row.description || '').trim() || `Join ${(row.name || '').trim()} on Telegram`,
      image: '/assets/image.jpg',
      memberCount: parseInt(String(row.totalUsers)) || 0,
      status: 'pending' as const,
      importBatchId: batchId,
      importSource: 'csv-import',
      sourceImageUrl: (row.profilePictureUrl || '').trim() || null,
      views: 0,
      clickCount: 0,
      pinned: false,
      verified: false,
    }));

    const created = await Group.insertMany(documents, { ordered: false });

    console.log(
      `[CSV Import] Batch ${batchId}: imported ${created.length} groups as pending, ` +
      `${csvDuplicates} CSV dupes, ${dbDuplicates} DB dupes.`
    );

    return NextResponse.json({
      imported: created.length,
      csvDuplicates,
      dbDuplicates,
      batchId,
      groups: created.map((g: any) => ({
        _id: g._id.toString(),
        name: g.name,
        slug: g.slug,
        category: g.category,
        country: g.country,
        description: g.description,
        memberCount: g.memberCount,
        image: g.image,
        sourceImageUrl: g.sourceImageUrl,
        premiumOnly: g.premiumOnly || false,
        status: g.status,
      })),
    });
  } catch (error: any) {
    console.error('[CSV Import] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to import groups' },
      { status: 500 }
    );
  }
}
