import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import jwt from 'jsonwebtoken';

function getAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret') as any;
    return decoded.isAdmin ? decoded : null;
  } catch {
    return null;
  }
}

const BLOCK_KEYWORDS = [
  'gay', 'male model', 'boy/boy', 'guy/guy', 'm4m', 'men only',
  'lgbt', 'lgbtq', 'lgbtq+', 'queer', 'bi male', 'bicurious',
  'bisexual', 'pansexual', 'bi 🏳️‍🌈', '🏳️‍🌈',
  'trans', 'trans girl', 'transgirl', 'tgirl', 't-girl', 'transgender',
  'shemale', 'she-male', 'tranny', 'ladyboy', 'lady boy',
  'femboy', 'fem boy', 'femboi', 'sissy', 'twink', 'bear',
  'crossdress', 'crossdresser', 'cross dresser', 'drag queen',
  'ftm', 'f2m', 'mtf', 'm2f', 'nonbinary', 'non-binary', 'enby', 'genderfluid',
  'boyfriend', 'husband', 'him', 'his', 'he/him', 'he / him',
  'he/they', 'he / they', 'they/them', 'they / them', 'him/they', 'him / they',
  'king', 'daddy', 'daddydom', 'alpha male',
  'cock', 'dick', 'bbc', 'bwc', 'hung',
  'male stripper', 'male escort', 'gay porn', 'gay for pay',
  'manly', 'muscleman', 'muscle man', 'jock', 'fratboy', 'frat boy',
  'boy next door', 'college boy', 'college guy', 'male content',
  'man on man', 'guy on guy', 'men on men', 'boy on boy',
  'for the ladies', 'for women', 'for her',
  'cuckold', 'bull', 'hotwife husband',
  'bi couple', 'gay couple', 'male couple',
  'prince', 'zaddy', 'sugar daddy',
];

const BLOCK_USERNAME_PREFIXES = [
  'gay', 'trans', 'femboy', 'sissy', 'twink', 'daddy',
  'king', 'prince', 'boy', 'guy', 'man', 'male', 'dude', 'bro',
];

/**
 * POST /api/OFM/creators/purge
 * Deletes all non-female creators + any creators whose bio/name/username
 * contain blocked keywords. Also removes avatar-less garbage entries.
 */
export async function POST(req: NextRequest) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  // 1. Delete all non-female gender entries
  const genderResult = await OnlyFansCreator.deleteMany({
    gender: { $nin: ['female'] },
  });

  // 2. Delete creators whose bio or name contains a blocked keyword
  const regexPattern = BLOCK_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const blockRegex = new RegExp(regexPattern, 'i');

  const bioResult = await OnlyFansCreator.deleteMany({
    $or: [
      { bio: { $regex: blockRegex } },
      { name: { $regex: blockRegex } },
    ],
  });

  // 3. Delete creators whose username exactly matches or starts/ends with a blocked prefix
  const usernameRegex = new RegExp(
    `^(${BLOCK_USERNAME_PREFIXES.join('|')})$|^(${BLOCK_USERNAME_PREFIXES.join('|')})_|_(${BLOCK_USERNAME_PREFIXES.join('|')})$`,
    'i',
  );
  const usernameResult = await OnlyFansCreator.deleteMany({
    username: { $regex: usernameRegex },
  });

  // 4. Delete creators with no avatar (garbage data)
  const noAvatarResult = await OnlyFansCreator.deleteMany({
    $or: [
      { avatar: '' },
      { avatar: { $exists: false } },
    ],
  });

  const total =
    genderResult.deletedCount +
    bioResult.deletedCount +
    usernameResult.deletedCount +
    noAvatarResult.deletedCount;

  return NextResponse.json({
    success: true,
    deleted: {
      nonFemaleGender: genderResult.deletedCount,
      blockedKeywordsInBioOrName: bioResult.deletedCount,
      blockedUsername: usernameResult.deletedCount,
      noAvatar: noAvatarResult.deletedCount,
      total,
    },
  });
}
