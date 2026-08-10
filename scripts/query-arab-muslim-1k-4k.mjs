const LIKES_MIN = 1000;
const LIKES_MAX = 4000;
const nicheRegex =
  /hijab|arab|moroccan|morocco|egypt|turkish|turkey|muslim|islam|niqab|berber|persian|pakistan|lebanon|syria|iraq|jordan|tunisia|algeria|emirat|saudi|kuwait|qatar|bahrain|libya|yemen|urdu|halal|🧕|🇲🇦|🇪🇬|🇹🇷|🇱🇧|🇸🇦|🇦🇪|🇶🇦|🇰🇼|🇧🇭|🇴🇲|🇩🇿|🇹🇳|🇱🇾|🇾🇪|🇯🇴|🇮🇶|🇸🇾|🇵🇰|🇮🇷/i;
const catSlugs = [
  'hijabi',
  'arab',
  'moroccan',
  'egyptian',
  'turkish',
  'muslim',
  'persian',
  'pakistani',
  'lebanese',
  'middle-eastern',
];

async function main() {
  const connectDB = (await import('../lib/db/mongodb.js')).default;
  const { OnlyFansCreator } = await import('../lib/models/index.js');
  await connectDB();
  const q = {
    gender: 'female',
    likesCount: { $gte: LIKES_MIN, $lte: LIKES_MAX },
    $or: [
      { categories: { $in: catSlugs } },
      { username: nicheRegex },
      { name: nicheRegex },
      { bio: nicheRegex },
      { location: nicheRegex },
    ],
  };
  const rows = await OnlyFansCreator.find(q)
    .select('username name likesCount location categories bio')
    .sort({ likesCount: -1 })
    .limit(500)
    .lean();
  console.log('DB matches', rows.length);
  for (const r of rows) {
    console.log(
      `@${r.username}\t${r.likesCount}\t${(r.location || '').slice(0, 40)}\t${(r.categories || []).join(',')}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
