/**
 * Read-only user + interaction analytics report.
 * Usage: node --env-file=.env.local scripts/user-analytics-report.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }

await mongoose.connect(uri);
const db = mongoose.connection.db;

function pct(n, total) {
  if (!total) return '0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

function provider(u) {
  if (u.telegramId) return 'telegram';
  if (u.googleId) return 'google';
  if (u.email && /@gmail\.com$/i.test(u.email)) return 'gmail_email';
  if (u.email) return 'other_email';
  if (u.password) return 'password_no_email';
  return 'unknown';
}

const usersCol = db.collection('users');
const bookmarksCol = db.collection('bookmarks');
const postsCol = db.collection('posts');
const creatorReviewsCol = db.collection('creatorreviews');
const articleCommentsCol = db.collection('articlecomments');
const profileFeedLikesCol = db.collection('profilefeedlikes');
const profileFeedCommentsCol = db.collection('profilefeedcomments');
const votesCol = db.collection('votes');
const premiumEventsCol = db.collection('premiumevents');
const ainsfwStatsCol = db.collection('ainsfwtoolstats');
const groupsCol = db.collection('groups');
const botsCol = db.collection('bots');

const totalUsers = await usersCol.countDocuments();
const admins = await usersCol.countDocuments({ isAdmin: true });
const premiumUsers = await usersCol.countDocuments({ premium: true });
const onboardingDone = await usersCol.countDocuments({ onboardingCompleted: true });

// Auth provider breakdown
const allUsers = await usersCol.find({}, {
  projection: {
    telegramId: 1, googleId: 1, email: 1, password: 1,
    premium: 1, loginCount: 1, lastLogin: 1, createdAt: 1,
    savedCreators: 1, savedGroups: 1, joinedGroups: 1, savedLikesOrder: 1,
    interests: 1, aiInterests: 1, preferredPlatforms: 1, interestedInAI: 1,
    stats: 1, country: 1, onboardingCompleted: 1,
  },
}).toArray();

const providerCounts = {};
const providerPremium = {};
const gmailDomains = {};
const emailDomains = {};

for (const u of allUsers) {
  const p = provider(u);
  providerCounts[p] = (providerCounts[p] || 0) + 1;
  if (u.premium) providerPremium[p] = (providerPremium[p] || 0) + 1;
  if (u.email) {
    const dom = u.email.split('@')[1]?.toLowerCase() || '?';
    emailDomains[dom] = (emailDomains[dom] || 0) + 1;
    if (dom === 'gmail.com') gmailDomains.gmail = (gmailDomains.gmail || 0) + 1;
  }
}

// savedLikesOrder prefix breakdown
const likesPrefixUsers = { group: 0, bot: 0, onlyfans: 0, ainsfw: 0, other: 0 };
const likesPrefixTotals = { group: 0, bot: 0, onlyfans: 0, ainsfw: 0, other: 0 };
const usersWithAnyLike = new Set();
const usersByVertical = {
  telegram_only: 0,
  of_only: 0,
  ainsfw_only: 0,
  mixed: 0,
  none: 0,
};

for (const u of allUsers) {
  const order = u.savedLikesOrder || [];
  const savedCreators = (u.savedCreators || []).length;
  const savedGroups = (u.savedGroups || []).length;
  const joinedGroups = (u.joinedGroups || []).length;

  const verticals = new Set();
  if (savedGroups > 0 || joinedGroups > 0) verticals.add('telegram');
  if (savedCreators > 0) verticals.add('of');

  const prefixHits = { group: false, bot: false, onlyfans: false, ainsfw: false };
  for (const key of order) {
    if (typeof key !== 'string') continue;
    usersWithAnyLike.add(String(u._id));
    if (key.startsWith('group:')) { likesPrefixTotals.group++; prefixHits.group = true; verticals.add('telegram'); }
    else if (key.startsWith('bot:')) { likesPrefixTotals.bot++; prefixHits.bot = true; verticals.add('telegram'); }
    else if (key.startsWith('onlyfans:')) { likesPrefixTotals.onlyfans++; prefixHits.onlyfans = true; verticals.add('of'); }
    else if (key.startsWith('ainsfw:')) { likesPrefixTotals.ainsfw++; prefixHits.ainsfw = true; verticals.add('ainsfw'); }
    else { likesPrefixTotals.other++; }
  }
  for (const [k, v] of Object.entries(prefixHits)) {
    if (v) likesPrefixUsers[k]++;
  }

  if (verticals.size === 0) usersByVertical.none++;
  else if (verticals.size === 1) {
    if (verticals.has('telegram')) usersByVertical.telegram_only++;
    else if (verticals.has('of')) usersByVertical.of_only++;
    else if (verticals.has('ainsfw')) usersByVertical.ainsfw_only++;
  } else usersByVertical.mixed++;
}

// Users with saved creators / groups arrays
const usersWithSavedCreators = allUsers.filter(u => (u.savedCreators || []).length > 0).length;
const usersWithSavedGroups = allUsers.filter(u => (u.savedGroups || []).length > 0).length;
const usersWithJoinedGroups = allUsers.filter(u => (u.joinedGroups || []).length > 0).length;
const totalSavedCreators = allUsers.reduce((s, u) => s + (u.savedCreators || []).length, 0);
const totalSavedGroups = allUsers.reduce((s, u) => s + (u.savedGroups || []).length, 0);
const totalJoinedGroups = allUsers.reduce((s, u) => s + (u.joinedGroups || []).length, 0);

// Bookmarks
const [bookmarkByType, bookmarkUsers, totalBookmarks] = await Promise.all([
  bookmarksCol.aggregate([
    { $group: { _id: '$itemType', count: { $sum: 1 }, users: { $addToSet: '$userId' } } },
    { $project: { _id: 1, count: 1, userCount: { $size: '$users' } } },
  ]).toArray(),
  bookmarksCol.distinct('userId').then(a => a.length),
  bookmarksCol.countDocuments(),
]);

// Posts (group reviews)
const [postStats, postUsers] = await Promise.all([
  postsCol.aggregate([
    { $group: {
      _id: null,
      total: { $sum: 1 },
      withAuthor: { $sum: { $cond: [{ $ifNull: ['$author', false] }, 1, 0] } },
      approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
    }},
  ]).toArray(),
  postsCol.distinct('author').then(a => a.filter(Boolean).length),
]);

// Creator reviews (OF)
const [crStats, crUsers] = await Promise.all([
  creatorReviewsCol.aggregate([
    { $group: {
      _id: null,
      total: { $sum: 1 },
      withAuthor: { $sum: { $cond: [{ $ifNull: ['$author', false] }, 1, 0] } },
      approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
    }},
  ]).toArray(),
  creatorReviewsCol.distinct('author').then(a => a.filter(Boolean).length),
]);

// Article comments
const [acStats, acUsers] = await Promise.all([
  articleCommentsCol.aggregate([
    { $group: {
      _id: null,
      total: { $sum: 1 },
      withAuthor: { $sum: { $cond: [{ $ifNull: ['$author', false] }, 1, 0] } },
      approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
    }},
  ]).toArray(),
  articleCommentsCol.distinct('author').then(a => a.filter(Boolean).length),
]);

// Profile feed (OF social)
const [pflCount, pflUsers, pfcCount, pfcUsers] = await Promise.all([
  profileFeedLikesCol.countDocuments(),
  profileFeedLikesCol.distinct('userId').then(a => a.length),
  profileFeedCommentsCol.countDocuments(),
  profileFeedCommentsCol.distinct('author').then(a => a.filter(Boolean).length),
]);

// Vault votes
const [voteStats, voteUsers] = await Promise.all([
  votesCol.aggregate([
    { $group: { _id: '$vote', count: { $sum: 1 } } },
  ]).toArray(),
  votesCol.distinct('userId').then(a => a.length),
]);

// Premium events
const premiumEventBreakdown = await premiumEventsCol.aggregate([
  { $group: { _id: '$event', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]).toArray();
const premiumPayingUsers = await premiumEventsCol.distinct('userId', {
  event: { $in: ['payment_success', 'crypto_payment_success'] },
}).then(a => a.filter(Boolean).length);

// AINsfw reviews from embedded array
const ainsfwReviewAgg = await ainsfwStatsCol.aggregate([
  { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: false } },
  { $group: {
    _id: null,
    total: { $sum: 1 },
    withAuthor: { $sum: { $cond: [{ $ifNull: ['$reviews.author', false] }, 1, 0] } },
    approved: { $sum: { $cond: [{ $eq: ['$reviews.status', 'approved'] }, 1, 0] } },
    uniqueAuthors: { $addToSet: '$reviews.author' },
  }},
  { $project: { total: 1, withAuthor: 1, approved: 1, uniqueAuthors: { $size: '$uniqueAuthors' } } },
]).toArray();

// Interests / platforms
const interestedInAI = allUsers.filter(u => u.interestedInAI).length;
const withInterests = allUsers.filter(u => (u.interests || []).length > 0).length;
const withAiInterests = allUsers.filter(u => (u.aiInterests || []).length > 0).length;
const withPreferredPlatforms = allUsers.filter(u => (u.preferredPlatforms || []).length > 0).length;

// Platform preference counts
const platformCounts = {};
const interestCounts = {};
for (const u of allUsers) {
  for (const p of (u.preferredPlatforms || [])) {
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  }
  for (const i of (u.interests || [])) {
    interestCounts[i] = (interestCounts[i] || 0) + 1;
  }
}

// Login activity
const now = Date.now();
const active7d = allUsers.filter(u => u.lastLogin && (now - new Date(u.lastLogin).getTime()) < 7 * 86400000).length;
const active30d = allUsers.filter(u => u.lastLogin && (now - new Date(u.lastLogin).getTime()) < 30 * 86400000).length;
const active90d = allUsers.filter(u => u.lastLogin && (now - new Date(u.lastLogin).getTime()) < 90 * 86400000).length;
const neverLoggedIn = allUsers.filter(u => !u.lastLogin && (u.loginCount || 0) === 0).length;

// Signups by month (last 12 months)
const signupsByMonth = await usersCol.aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 365 * 86400000) } } },
  { $group: {
    _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
    count: { $sum: 1 },
    telegram: { $sum: { $cond: [{ $ifNull: ['$telegramId', false] }, 1, 0] } },
    google: { $sum: { $cond: [{ $ifNull: ['$googleId', false] }, 1, 0] } },
  }},
  { $sort: { '_id.y': 1, '_id.m': 1 } },
]).toArray();

// Top countries
const topCountries = await usersCol.aggregate([
  { $match: { country: { $exists: true, $nin: [null, ''] } } },
  { $group: { _id: '$country', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 20 },
]).toArray();

// Cross-tab: provider vs vertical engagement
const providerEngagement = {};
for (const u of allUsers) {
  const p = provider(u);
  if (!providerEngagement[p]) {
    providerEngagement[p] = {
      users: 0, withBookmarks: 0, withSavedCreators: 0, withGroupReview: 0,
      withCreatorReview: 0, withArticleComment: 0, withFeedLike: 0, premium: 0,
    };
  }
  providerEngagement[p].users++;
  if ((u.savedCreators || []).length > 0) providerEngagement[p].withSavedCreators++;
  if (u.premium) providerEngagement[p].premium++;
}

// Fetch user IDs per interaction type for cross-tab
const bookmarkUserIds = new Set((await bookmarksCol.distinct('userId')).map(String));
const postAuthorIds = new Set((await postsCol.distinct('author')).filter(Boolean).map(String));
const crAuthorIds = new Set((await creatorReviewsCol.distinct('author')).filter(Boolean).map(String));
const acAuthorIds = new Set((await articleCommentsCol.distinct('author')).filter(Boolean).map(String));
const pflUserIds = new Set((await profileFeedLikesCol.distinct('userId')).map(String));

for (const u of allUsers) {
  const p = provider(u);
  const id = String(u._id);
  if (bookmarkUserIds.has(id)) providerEngagement[p].withBookmarks++;
  if (postAuthorIds.has(id)) providerEngagement[p].withGroupReview++;
  if (crAuthorIds.has(id)) providerEngagement[p].withCreatorReview++;
  if (acAuthorIds.has(id)) providerEngagement[p].withArticleComment++;
  if (pflUserIds.has(id)) providerEngagement[p].withFeedLike++;
}

// Content created by users
const userCreatedGroups = await groupsCol.countDocuments({ createdBy: { $exists: true, $ne: null } });
const userCreatedBots = await botsCol.countDocuments({ createdBy: { $exists: true, $ne: null } });
const uniqueGroupCreators = (await groupsCol.distinct('createdBy')).filter(Boolean).length;
const uniqueBotCreators = (await botsCol.distinct('createdBy')).filter(Boolean).length;

// Users engaged in ANY vertical
const engagedUserIds = new Set([
  ...bookmarkUserIds,
  ...allUsers.filter(u => (u.savedCreators || []).length > 0).map(u => String(u._id)),
  ...allUsers.filter(u => (u.savedGroups || []).length > 0).map(u => String(u._id)),
  ...postAuthorIds,
  ...crAuthorIds,
  ...acAuthorIds,
  ...pflUserIds,
  ...(await profileFeedCommentsCol.distinct('author')).filter(Boolean).map(String),
  ...(await votesCol.distinct('userId')).map(String),
  ...usersWithAnyLike,
]);

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    users: totalUsers,
    admins,
    premiumUsers,
    premiumPct: pct(premiumUsers, totalUsers),
    onboardingCompleted: onboardingDone,
    engagedUsers: engagedUserIds.size,
    engagedPct: pct(engagedUserIds.size, totalUsers),
  },
  authProviders: {
    breakdown: providerCounts,
    premiumByProvider: providerPremium,
    gmailEmailOnly: providerCounts.gmail_email || 0,
    note: 'google = Google OAuth (mostly Gmail). gmail_email = email signup with @gmail.com. telegram = Telegram login.',
  },
  topEmailDomains: Object.entries(emailDomains).sort((a, b) => b[1] - a[1]).slice(0, 15),
  activity: {
    activeLast7d: active7d,
    activeLast30d: active30d,
    activeLast90d: active90d,
    neverLoggedIn,
  },
  signupsLast12Months: signupsByMonth.map(r => ({
    month: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`,
    total: r.count,
    telegram: r.telegram,
    google: r.google,
  })),
  topCountries,
  savesAndLikes: {
    usersWithSavedCreators,
    usersWithSavedGroups,
    usersWithJoinedGroups,
    totalSavedCreatorItems: totalSavedCreators,
    totalSavedGroupItems: totalSavedGroups,
    totalJoinedGroupItems: totalJoinedGroups,
    savedLikesOrderUsersByPrefix: likesPrefixUsers,
    savedLikesOrderItemsByPrefix: likesPrefixTotals,
    usersByVerticalFocus: usersByVertical,
  },
  interactions: {
    bookmarks: {
      total: totalBookmarks,
      uniqueUsers: bookmarkUsers,
      byType: bookmarkByType,
    },
    groupReviews_posts: {
      ...(postStats[0] || {}),
      uniqueAuthors: postUsers,
    },
    onlyfans_creatorReviews: {
      ...(crStats[0] || {}),
      uniqueAuthors: crUsers,
    },
    blog_articleComments: {
      ...(acStats[0] || {}),
      uniqueAuthors: acUsers,
    },
    onlyfans_profileFeedLikes: { total: pflCount, uniqueUsers: pflUsers },
    onlyfans_profileFeedComments: { total: pfcCount, uniqueAuthors: pfcUsers },
    vault_votes: { byVote: voteStats, uniqueUsers: voteUsers },
    ainsfw_reviews: ainsfwReviewAgg[0] || {},
  },
  premium: {
    payingUsersFromEvents: premiumPayingUsers,
    eventBreakdown: premiumEventBreakdown.slice(0, 15),
  },
  onboarding: {
    interestedInAI,
    withInterests,
    withAiInterests,
    withPreferredPlatforms,
    topPreferredPlatforms: Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).slice(0, 15),
    topInterests: Object.entries(interestCounts).sort((a, b) => b[1] - a[1]).slice(0, 15),
  },
  userGeneratedContent: {
    groupsSubmitted: userCreatedGroups,
    uniqueGroupSubmitters: uniqueGroupCreators,
    botsSubmitted: userCreatedBots,
    uniqueBotSubmitters: uniqueBotCreators,
  },
  providerEngagement,
};

console.log(JSON.stringify(report, null, 2));
await mongoose.disconnect();
