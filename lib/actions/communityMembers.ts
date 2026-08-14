'use server';

import connectDB from '@/lib/db/mongodb';
import { User, OnlyFansCreator } from '@/lib/models';
import { ofCreatorProfileUrl } from '@/lib/onlyfanssearch/creatorUrls';
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
  /** Profile path: /profiles/... or /onlyfanssearch/... */
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
    countryCode: m.countryCode,
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

export async function getCommunityMembers(page = 1): Promise<CommunityPage> {
  await connectDB();
  const safePage = Math.max(1, page);
  const allCreators = await loadSacredCreatorMembers();
  const pinnedCreators = allCreators.slice(0, FIRST_PAGE_CREATOR_SLOTS.length);
  const pinnedIds = new Set(pinnedCreators.map((c) => c.id));
  const timelineCreators = allCreators.filter((c) => !pinnedIds.has(c.id));

  const visibleUsers = await User.find({ isProfileVisible: { $ne: false } })
    .select('username firstName photoUrl country sex createdAt premium premiumExpiresAt email telegramId')
    .lean();

  const realMembers: RankedMember[] = [];
  const injectedMembers: RankedMember[] = [];

  for (const u of visibleUsers as any[]) {
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
      displayName: u.firstName || u.username || 'Member',
      photoUrl: u.photoUrl || null,
      countryCode: normalizeCountryCode(u.country),
      gender: formatGender(u.sex),
      joinedLabel: formatJoinedLabel(u.createdAt, u._id),
      premium: isActivePremium(u.premium, u.premiumExpiresAt),
      href: `/profiles/${encodeURIComponent(u.username)}`,
      isCreator: false,
      sortAt,
    };

    if (isInjectedCommunityUser(u)) {
      const spread = communitySpreadDate(String(u.username).toLowerCase());
      member.sortAt = spread.getTime();
      member.joinedLabel = formatJoinedLabelFromDate(spread);
      injectedMembers.push(member);
    } else {
      realMembers.push(member);
    }
  }

  realMembers.sort((a, b) => b.sortAt - a.sortAt);
  const merged = [
    ...realMembers,
    ...interleaveByMonth([...injectedMembers, ...timelineCreators]),
  ];

  // Bake page-1 pins into the full feed so later pages stay aligned, then
  // rewrite model dates to match the neighbors they sit between.
  let feed: RankedMember[];
  if (pinnedCreators.length > 0) {
    feed = [];
    let ri = 0;
    for (let i = 0; i < PER_PAGE; i++) {
      const pinAt = FIRST_PAGE_CREATOR_SLOTS.findIndex((s) => s === i);
      if (pinAt >= 0 && pinnedCreators[pinAt]) {
        feed.push(pinnedCreators[pinAt]);
      } else if (merged[ri]) {
        feed.push(merged[ri++]);
      }
    }
    while (ri < merged.length) feed.push(merged[ri++]);
  } else {
    feed = merged;
  }
  feed = syncCreatorDatesToNeighbors(feed);

  const start = (safePage - 1) * PER_PAGE;
  const slice = feed.slice(start, start + PER_PAGE + 1);
  const hasMore = slice.length > PER_PAGE;

  return {
    members: (hasMore ? slice.slice(0, PER_PAGE) : slice).map(toPublicMember),
    page: safePage,
    hasMore,
  };
}
