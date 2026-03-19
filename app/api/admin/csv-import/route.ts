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

    const VALID_CATEGORIES = new Set([
      'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
      'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
      'Brazil', 'Brunette', 'China', 'Colombia', 'Cosplay', 'Creampie',
      'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use',
      'Germany', 'Hardcore', 'Italy',
      'Japan', 'Latina', 'Lesbian', 'Masturbation', 'Mexico', 'MILF',
      'NSFW-Telegram', 'Onlyfans', 'Onlyfans Leaks', 'Petite', 'Philippines',
      'Privacy', 'Public', 'Red Hair', 'Russian',
      'Spain', 'Telegram-Porn', 'Threesome', 'UK', 'Ukraine', 'USA', 'Vietnam',
      'Adult', 'Webcam', 'Femdom', 'Turkey', 'India', 'Ethiopia',
    ]);

    const CATEGORY_MAP: Record<string, string> = {
      'lesbicas': 'Lesbian', 'lésbicas': 'Lesbian', 'lesbica': 'Lesbian',
      'nudes-telegram': 'NSFW-Telegram', 'nudes': 'Amateur',
      'porno-amador': 'Amateur', 'amador': 'Amateur',
      'telegram-porno': 'Telegram-Porn', 'telegram-sexo': 'Telegram-Porn',
      'onlyfans-telegram': 'Onlyfans',
      'porn': 'Telegram-Porn', 'porn-telegram': 'Telegram-Porn',
      'telegram porn': 'Telegram-Porn', 'porn telegram': 'Telegram-Porn',
      'sexo': 'Telegram-Porn', 'xxx': 'Hardcore',
      'asiática': 'Asian', 'asiatica': 'Asian',
      'negra': 'Ebony', 'morena': 'Brunette', 'loira': 'Blonde', 'ruiva': 'Red Hair',
      'milf': 'MILF', 'anime': 'Anime',
      'cosplay': 'Cosplay', 'fetiche': 'Fetish', 'fetish': 'Fetish',
      'anal': 'Anal', 'bdsm': 'BDSM', 'latina': 'Latina',
      'brasil': 'Brazil', 'brazileira': 'Brazil', 'brasileira': 'Brazil',
      'colombia': 'Colombia', 'argentina': 'Argentina', 'mexico': 'Mexico',
      'alemanha': 'Germany', 'frança': 'France', 'espanha': 'Spain',
      'rusia': 'Russian', 'rusa': 'Russian', 'russa': 'Russian',
      'japão': 'Japan', 'japao': 'Japan',
      'webcam': 'Webcam', 'masturbação': 'Masturbation', 'masturbacao': 'Masturbation',
      'grande bunda': 'Big Ass', 'peitos grandes': 'Big Tits',
      'pés': 'Feet', 'pes': 'Feet',
      'cuckold': 'Cuckold', 'cornudo': 'Cuckold',
      'threesome': 'Threesome', 'menage': 'Threesome',
      'adulto': 'NSFW-Telegram', 'adult': 'NSFW-Telegram',
      'nsfw': 'NSFW-Telegram',
    };

    const validCatLower = new Map<string, string>();
    for (const c of VALID_CATEGORIES) validCatLower.set(c.toLowerCase(), c);

    const normalizeCat = (cat: string): string => {
      if (VALID_CATEGORIES.has(cat)) return cat;
      const lower = cat.toLowerCase().trim();
      if (validCatLower.has(lower)) return validCatLower.get(lower)!;
      if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
      console.log(`[CSV Import] Unknown category "${cat}" → falling back to NSFW-Telegram`);
      return 'NSFW-Telegram';
    };

    const documents = newRows.map((row) => {
      const cat = normalizeCat((row.category || '').trim() || fallbackCategory || 'NSFW-Telegram');
      const ctry = (row.country || '').trim() || fallbackCountry || 'All';
      return {
      name: (row.name || '').trim(),
      slug: getUniqueSlug(row.name),
      category: cat,
      country: ctry,
      categories: [cat, ctry].filter(c => c && c !== 'All' && c !== 'Adult-Telegram'),
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
    };
    });

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
        categories: g.categories || [],
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
