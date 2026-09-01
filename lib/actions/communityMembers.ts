'use server';

import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator } from '@/lib/models';
import { ofCreatorProfileUrl } from '@/lib/ofsearch/creatorUrls';
import { SACRED_COMMUNITY_CREATORS } from '@/lib/community/sacredCreators';

export interface CommunityMember {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
  countryCode: string;
  gender: 'M' | 'F' | '';
  joinedLabel: string;
  premium: boolean;
  /** Profile path: /profiles/... or /ofsearch/... */
  href: string;
  isCreator: boolean;
}

export interface CommunityPage {
  members: CommunityMember[];
  page: number;
  hasMore: boolean;
}

type RankedMember = CommunityMember & { sortAt: number };

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  texas: 'US',
  'united kingdom': 'UK',
  uk: 'UK',
  'great britain': 'UK',
  england: 'UK',
  'the netherlands': 'NL',
  netherlands: 'NL',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  canada: 'CA',
  brazil: 'BR',
  brasil: 'BR',
  mexico: 'MX',
  australia: 'AU',
  india: 'IN',
  indonesia: 'ID',
  portugal: 'PT',
  romania: 'RO',
  belgium: 'BE',
  finland: 'FI',
  israel: 'IL',
  morocco: 'MA',
  vietnam: 'VN',
  malaysia: 'MY',
  colombia: 'CO',
  'new zealand': 'NZ',
  'north macedonia': 'MK',
  'puerto rico': 'PR',
  bahrain: 'BH',
  benin: 'BJ',
};

/** Display codes: ISO where common, UK instead of GB. India cleared site-wide. */
function normalizeCountryCode(value: string | undefined | null): string {
  if (!value?.trim()) return '';
  const raw = value.trim();
  const upper = raw.toUpperCase();
  if (upper === 'GB' || upper === 'UK') return 'UK';
  if (upper === 'IN') return '';
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  const fromName = COUNTRY_NAME_TO_CODE[raw.toLowerCase()] || '';
  if (fromName === 'IN') return '';
  if (fromName) return fromName;

  const lower = raw.toLowerCase();
  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (name.length < 3) continue;
    if (lower.includes(name)) {
      if (code === 'IN') return '';
      return code;
    }
  }
  return '';
}

const HIDDEN_COMMUNITY_COUNTRY_CODES = new Set(['DZ', 'BD']);
const HIDDEN_COMMUNITY_COUNTRY_VALUES = ['DZ', 'BD', 'dz', 'bd'];

function isHiddenCommunityCountry(code: string): boolean {
  return HIDDEN_COMMUNITY_COUNTRY_CODES.has(code);
}

function formatJoinedLabelFromDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatJoinedLabel(createdAt: unknown, id: { getTimestamp?: () => Date } | string): string {
  let d: Date | null = null;
  if (createdAt) {
    const parsed = new Date(createdAt as string | Date);
    if (!Number.isNaN(parsed.getTime())) d = parsed;
  }
  if (!d && id && typeof id === 'object' && typeof id.getTimestamp === 'function') {
    d = id.getTimestamp();
  }
  if (!d) return '';
  return formatJoinedLabelFromDate(d);
}

/** First name + last-name initial only. "Karterr Barlow" → "Karterr B". Handle untouched. */
function abbreviateDisplayName(name: string | undefined | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  const initial = parts[1].charAt(0).toUpperCase();
  if (!initial) return parts[0];
  return `${parts[0]} ${initial}`;
}

function formatGender(sex: string | undefined | null): 'M' | 'F' | '' {
  if (sex === 'female') return 'F';
  if (sex === 'male') return 'M';
  return '';
}

function isActivePremium(premium: unknown, premiumExpiresAt: unknown): boolean {
  if (premium !== true) return false;
  if (!premiumExpiresAt) return true;
  const expires = new Date(premiumExpiresAt as string | Date);
  if (Number.isNaN(expires.getTime())) return true;
  return expires.getTime() > Date.now();
}

function usernameRegex(username: string) {
  return new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

/** Stable spread across Jun 1 – Aug 31 2026 for injected users + models (not clustered on today). */
function communitySpreadDate(key: string): Date {
  const start = Date.UTC(2026, 5, 1, 8, 0, 0);
  const end = Date.UTC(2026, 7, 31, 20, 0, 0);
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const span = Math.max(1, end - start);
  return new Date(start + (h % span));
}

function monthBucket(sortAt: number): 'jun' | 'jul' | 'aug' {
  const m = new Date(sortAt).getUTCMonth();
  if (m === 5) return 'jun';
  if (m === 6) return 'jul';
  return 'aug';
}

/** Round-robin Jun / Jul / Aug so page 1 is not all late-August seeds. */
function interleaveByMonth(members: RankedMember[]): RankedMember[] {
  const buckets: Record<'jun' | 'jul' | 'aug', RankedMember[]> = { jun: [], jul: [], aug: [] };
  for (const m of members) {
    buckets[monthBucket(m.sortAt)].push(m);
  }
  for (const k of ['jun', 'jul', 'aug'] as const) {
    buckets[k].sort((a, b) => b.sortAt - a.sortAt);
  }
  const out: RankedMember[] = [];
  while (buckets.jun.length || buckets.jul.length || buckets.aug.length) {
    for (const k of ['jun', 'jul', 'aug'] as const) {
      const next = buckets[k].shift();
      if (next) out.push(next);
    }
  }
  return out;
}

function isInjectedCommunityUser(u: { email?: string | null; telegramId?: unknown }): boolean {
  if (u.telegramId != null && u.telegramId !== '') return false;
  if (typeof u.email === 'string' && u.email.trim()) return false;
  return true;
}

function toPublicMember(m: RankedMember): CommunityMember {
  return {
    id: m.id,
    username: m.username,
    displayName: m.displayName,
    photoUrl: m.photoUrl,
    countryCode: m.countryCode || 'US',
    gender: m.gender,
    joinedLabel: m.joinedLabel,
    premium: m.premium,
    href: m.href,
    isCreator: m.isCreator,
  };
}

/**
 * Feed is newest-first. Keep creator slots, rewrite each model’s joined date
 * so it sits between neighboring non-creators (no more Jun label on an Aug row).
 */
function syncCreatorDatesToNeighbors(list: RankedMember[]): RankedMember[] {
  return list.map((m, i) => {
    if (!m.isCreator) return m;

    let newer: RankedMember | null = null;
    let older: RankedMember | null = null;
    for (let j = i - 1; j >= 0; j--) {
      if (!list[j].isCreator && list[j].sortAt > 0) {
        newer = list[j];
        break;
      }
    }
    for (let j = i + 1; j < list.length; j++) {
      if (!list[j].isCreator && list[j].sortAt > 0) {
        older = list[j];
        break;
      }
    }

    let dateMs: number;
    if (newer && older) {
      dateMs = Math.round((newer.sortAt + older.sortAt) / 2);
    } else if (newer) {
      dateMs = newer.sortAt - 3_600_000;
    } else if (older) {
      dateMs = older.sortAt + 3_600_000;
    } else {
      return m;
    }

    const d = new Date(dateMs);
    return {
      ...m,
      sortAt: dateMs,
      joinedLabel: formatJoinedLabelFromDate(d),
    };
  });
}

async function loadSacredCreatorMembers(): Promise<RankedMember[]> {
  const usernames = [...SACRED_COMMUNITY_CREATORS];
  const rows = await OnlyFansCreator.find({
    username: { $in: usernames.map(usernameRegex) },
    deleted: { $ne: true },
  })
    .select('username name avatar location gender')
    .lean();

  const byUser = new Map<string, Record<string, unknown>>();
  for (const raw of rows as Record<string, unknown>[]) {
    byUser.set(String(raw.username || '').toLowerCase(), raw);
  }

  const members: RankedMember[] = [];
  usernames.forEach((username) => {
    const raw = byUser.get(username.toLowerCase());
    if (!raw) return;
    if (isHiddenCommunityCountry(normalizeCountryCode(raw.location as string))) return;
    const joinedAt = communitySpreadDate(username.toLowerCase());
    members.push({
      id: `of:${username.toLowerCase()}`,
      username: String(raw.username || username),
      displayName: String(raw.name || raw.username || username),
      photoUrl: (raw.avatar as string) || null,
      countryCode: normalizeCountryCode(raw.location as string),
      gender: formatGender(raw.gender as string),
      joinedLabel: formatJoinedLabelFromDate(joinedAt),
      premium: false,
      href: ofCreatorProfileUrl(String(raw.username || username)),
      isCreator: true,
      sortAt: joinedAt.getTime(),
    });
  });
  return members;
}

const PER_PAGE = 40;
/** Guaranteed creator slots on page 1 (0-based indexes). */
const FIRST_PAGE_CREATOR_SLOTS = [2, 8, 15, 23, 32] as const;
const USER_SELECT = 'username firstName photoUrl country sex createdAt premium premiumExpiresAt email telegramId';

const REAL_USER_FILTER = {
  isProfileVisible: { $ne: false },
  country: { $nin: HIDDEN_COMMUNITY_COUNTRY_VALUES },
  $or: [{ telegramId: { $ne: null } }, { email: { $gt: '' } }],
};

const INJECTED_USER_FILTER = {
  isProfileVisible: { $ne: false },
  country: { $nin: HIDDEN_COMMUNITY_COUNTRY_VALUES },
  $and: [
    { $or: [{ telegramId: null }, { telegramId: { $exists: false } }] },
    { $or: [{ email: null }, { email: '' }, { email: { $exists: false } }] },
  ],
};

function userToRankedMember(u: any, injected: boolean): RankedMember {
  const created = u.createdAt ? new Date(u.createdAt) : null;
  const sortAt =
    created && !Number.isNaN(created.getTime())
      ? created.getTime()
      : u._id && typeof u._id.getTimestamp === 'function'
        ? u._id.getTimestamp().getTime()
        : 0;
  const member: RankedMember = {
    id: String(u._id),
    username: u.username,
    displayName: abbreviateDisplayName(u.firstName) || u.username || 'Member',
    photoUrl: u.photoUrl || null,
    countryCode: normalizeCountryCode(u.country),
    gender: formatGender(u.sex),
    joinedLabel: formatJoinedLabel(u.createdAt, u._id),
    premium: isActivePremium(u.premium, u.premiumExpiresAt),
    href: `/profiles/${encodeURIComponent(u.username)}`,
    isCreator: false,
    sortAt,
  };
  if (injected) {
    const spread = communitySpreadDate(String(u.username).toLowerCase());
    member.sortAt = spread.getTime();
    member.joinedLabel = formatJoinedLabelFromDate(spread);
  }
  return member;
}

function assembleCommunityPage(
  mergedSlice: RankedMember[],
  pinnedCreators: RankedMember[],
  page: number,
  hasMore: boolean,
): CommunityPage {
  let feed: RankedMember[];
  if (page === 1 && pinnedCreators.length > 0) {
    feed = [];
    let ri = 0;
    for (let i = 0; i < PER_PAGE; i++) {
      const pinAt = FIRST_PAGE_CREATOR_SLOTS.findIndex((s) => s === i);
      if (pinAt >= 0 && pinnedCreators[pinAt]) {
        feed.push(pinnedCreators[pinAt]);
      } else if (mergedSlice[ri]) {
        feed.push(mergedSlice[ri++]);
      }
    }
  } else {
    feed = mergedSlice.slice(0, PER_PAGE);
  }
  feed = syncCreatorDatesToNeighbors(feed);
  return {
    members: feed.map(toPublicMember),
    page,
    hasMore,
  };
}

export async function getCommunityMembers(page = 1): Promise<CommunityPage> {
  await connectDB();
  const safePage = Math.max(1, page);
  const pinCount = FIRST_PAGE_CREATOR_SLOTS.length;
  const mergedStart = safePage === 1 ? 0 : (safePage - 1) * PER_PAGE - pinCount;
  const mergedSlots = safePage === 1 ? PER_PAGE - pinCount : PER_PAGE;
  const fetchLimit = mergedSlots + 1;

  const realDocsPromise = User.find(REAL_USER_FILTER)
    .select(USER_SELECT)
    .sort({ createdAt: -1 })
    .skip(mergedStart)
    .limit(fetchLimit)
    .lean();

  const creatorsPromise =
    safePage === 1 ? loadSacredCreatorMembers() : Promise.resolve([] as RankedMember[]);

  const [realDocs, pageCreators] = await Promise.all([realDocsPromise, creatorsPromise]);

  if (realDocs.length >= fetchLimit) {
    const realMembers = (realDocs as any[])
      .map((u) => userToRankedMember(u, false))
      .filter((m) => !isHiddenCommunityCountry(m.countryCode))
      .slice(0, mergedSlots);
    const pinned = pageCreators
      .filter((m) => !isHiddenCommunityCountry(m.countryCode))
      .slice(0, pinCount);
    return assembleCommunityPage(realMembers, pinned, safePage, true);
  }

  const [injectedDocs, allCreators, realCount] = await Promise.all([
    User.find(INJECTED_USER_FILTER).select(USER_SELECT).lean(),
    loadSacredCreatorMembers(),
    realDocs.length === 0 && mergedStart > 0
      ? User.countDocuments(REAL_USER_FILTER)
      : Promise.resolve(mergedStart + realDocs.length),
  ]);

  const injectedMembers = (injectedDocs as any[])
    .map((u) => userToRankedMember(u, true))
    .filter((m) => !isHiddenCommunityCountry(m.countryCode));
  const pinnedCreators = allCreators
    .filter((m) => !isHiddenCommunityCountry(m.countryCode))
    .slice(0, pinCount);
  const pinnedIds = new Set(pinnedCreators.map((c) => c.id));
  const timelineCreators = allCreators.filter(
    (c) => !pinnedIds.has(c.id) && !isHiddenCommunityCountry(c.countryCode),
  );
  const tail = interleaveByMonth([...injectedMembers, ...timelineCreators]);
  const tailOffset = Math.max(0, mergedStart - realCount);
  const realMembers = (realDocs as any[])
    .map((u) => userToRankedMember(u, false))
    .filter((m) => !isHiddenCommunityCountry(m.countryCode));
  const mergedWithExtra = [...realMembers, ...tail.slice(tailOffset)];
  const hasMore = mergedWithExtra.length > mergedSlots;

  return assembleCommunityPage(
    mergedWithExtra.slice(0, mergedSlots),
    safePage === 1 ? pinnedCreators : [],
    safePage,
    hasMore,
  );
}
