'use server';

import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { SiteConfig, User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

/** Short TTL so flipping the switch takes effect within ~15s without hammering SiteConfig. */
const TTL_MS = 15_000;
let _cache: { exp: number; val: boolean } | null = null;

function bustCache() {
  _cache = null;
}

/**
 * Global Ad Network tracking kill switch (SiteConfig.generalSettings.adTrackingPaused).
 * When true: no ad click writes, no click-cap aggregates, no boost weighting on ads.
 * Ads still serve and rotate in their slots. Historical click rows are left untouched.
 */
export async function isAdTrackingPaused(): Promise<boolean> {
  if (_cache && _cache.exp > Date.now()) return _cache.val;
  try {
    await connectDB();
    const conf = (await SiteConfig.findOne({}).select('generalSettings').lean()) as {
      generalSettings?: { adTrackingPaused?: boolean };
    } | null;
    const val = Boolean(conf?.generalSettings?.adTrackingPaused);
    _cache = { exp: Date.now() + TTL_MS, val };
    return val;
  } catch {
    return _cache?.val ?? false;
  }
}

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!decoded?.id) return null;
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && (user as { isAdmin?: boolean }).isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

/** Admin read for Ad Network UI. */
export async function getAdTrackingKillSwitch(token: string): Promise<boolean> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  bustCache();
  return isAdTrackingPaused();
}

/** Admin write — flip tracking on/off sitewide. */
export async function setAdTrackingKillSwitch(
  token: string,
  paused: boolean,
): Promise<{ ok: true; paused: boolean }> {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  await connectDB();
  let config = await SiteConfig.findOne();
  if (!config) {
    config = await SiteConfig.create({ generalSettings: { adTrackingPaused: Boolean(paused) } });
  } else {
    const gs = ((config as any).generalSettings && typeof (config as any).generalSettings === 'object')
      ? { ...(config as any).generalSettings }
      : {};
    gs.adTrackingPaused = Boolean(paused);
    (config as any).generalSettings = gs;
    config.markModified('generalSettings');
    await config.save();
  }
  bustCache();
  _cache = { exp: Date.now() + TTL_MS, val: Boolean(paused) };
  return { ok: true, paused: Boolean(paused) };
}
