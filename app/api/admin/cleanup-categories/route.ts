import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User, Group } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

const ALLOWED_CATEGORIES = [
  'Adult', 'AI NSFW', 'Amateur', 'Anal', 'Anime', 'Argentina',
  'Asian', 'BDSM', 'Big Ass', 'Big Tits', 'Black', 'Blonde', 'Blowjob',
  'Brazil', 'Brunette', 'China', 'Colombia', 'Cosplay', 'Creampie',
  'Cuckold', 'Ebony', 'Fantasy', 'Feet', 'Fetish', 'France', 'Free-use',
  'Germany', 'Hardcore', 'Italy',
  'Japan', 'Latina', 'Lesbian', 'Masturbation', 'Mexico', 'MILF',
  'NSFW-Telegram', 'Onlyfans', 'Onlyfans Leaks', 'Petite', 'Philippines', 'Privacy', 'Public', 'Red Hair', 'Russian',
  'Spain', 'Telegram-Porn', 'Threesome', 'UK', 'Ukraine', 'USA', 'Vietnam',
];
const ALLOWED_SET = new Set(ALLOWED_CATEGORIES.map(c => c.toLowerCase()));

function matchCat(c: string): string | null {
  return ALLOWED_CATEGORIES.find(k => k.toLowerCase() === c.trim().toLowerCase()) || null;
}

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (user?.isAdmin) return user;
  } catch { /* invalid */ }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await authenticate(req);
    if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const groups = await Group.find({}).select('name categories category').lean();

    const bulkOps: any[] = [];
    const cleaned: { name: string; before: string[]; after: string[] }[] = [];

    for (const g of groups) {
      const raw: string[] = g.categories?.length ? g.categories : (g.category ? [g.category] : []);
      const valid = raw.map((c: string) => matchCat(c)).filter(Boolean) as string[];

      const deduped: string[] = [];
      const seen = new Set<string>();
      for (const c of valid) {
        const key = c.toLowerCase();
        if (!seen.has(key)) { seen.add(key); deduped.push(c); }
      }

      const final = deduped.slice(0, 3);

      const rawNorm = raw.map(c => c.toLowerCase()).sort().join(',');
      const finalNorm = final.map(c => c.toLowerCase()).sort().join(',');

      if (rawNorm !== finalNorm) {
        bulkOps.push({
          updateOne: {
            filter: { _id: g._id },
            update: { $set: { categories: final, category: final[0] || 'Adult' } },
          },
        });
        cleaned.push({ name: g.name, before: raw, after: final });
      }
    }

    let modified = 0;
    if (bulkOps.length > 0) {
      const result = await Group.bulkWrite(bulkOps);
      modified = result.modifiedCount;
    }

    return NextResponse.json({
      totalGroups: groups.length,
      groupsCleaned: modified,
      details: cleaned.slice(0, 100),
    });
  } catch (err: any) {
    console.error('Cleanup error:', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
