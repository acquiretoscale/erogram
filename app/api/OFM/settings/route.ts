import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { OFMSettings } from '@/lib/models';
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

async function getOrCreateSettings() {
  let settings = await OFMSettings.findOne({ key: 'default' });
  if (!settings) {
    const envKey = process.env.APIFY_API_TOKEN;
    settings = await OFMSettings.create({
      key: 'default',
      apifyKeys: envKey
        ? [{ label: 'Default (env)', apiKey: envKey, active: true, burned: false, usageCount: 0 }]
        : [],
      apifyActor: process.env.APIFY_ONLYFANS_ACTOR || 'igolaizola/onlyfans-scraper',
    });
  }
  return settings;
}

/** GET /api/OFM/settings — return settings (keys masked) */
export async function GET(req: NextRequest) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const settings = await getOrCreateSettings();
  const doc = settings.toObject();

  // Mask API keys for security — show first 10 + last 4 chars
  doc.apifyKeys = doc.apifyKeys.map((k: any) => ({
    ...k,
    apiKey: k.apiKey.length > 16
      ? k.apiKey.slice(0, 10) + '···' + k.apiKey.slice(-4)
      : '···',
  }));

  return NextResponse.json(doc);
}

/** POST /api/OFM/settings — add a new API key or update actor */
export async function POST(req: NextRequest) {
  if (!getAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const settings = await getOrCreateSettings();

  // Add new API key
  if (body.action === 'add_key') {
    const { label, apiKey } = body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
    }
    const exists = settings.apifyKeys.some((k: any) => k.apiKey === apiKey);
    if (exists) {
      return NextResponse.json({ error: 'This API key already exists' }, { status: 409 });
    }
    settings.apifyKeys.push({
      label: label || `Key #${settings.apifyKeys.length + 1}`,
      apiKey,
      active: true,
      burned: false,
      usageCount: 0,
      lastUsedAt: null,
      addedAt: new Date(),
    });
    await settings.save();
    return NextResponse.json({ success: true, total: settings.apifyKeys.length });
  }

  // Toggle active/burned status
  if (body.action === 'toggle_key') {
    const { keyId, field } = body;
    const key = settings.apifyKeys.id(keyId);
    if (!key) return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    if (field === 'active') key.active = !key.active;
    else if (field === 'burned') { key.burned = !key.burned; if (key.burned) key.active = false; }
    await settings.save();
    return NextResponse.json({ success: true });
  }

  // Remove a key
  if (body.action === 'remove_key') {
    const { keyId } = body;
    settings.apifyKeys.pull({ _id: keyId });
    await settings.save();
    return NextResponse.json({ success: true, total: settings.apifyKeys.length });
  }

  // Update actor name
  if (body.action === 'update_actor') {
    const { actor } = body;
    if (!actor || typeof actor !== 'string') {
      return NextResponse.json({ error: 'Invalid actor' }, { status: 400 });
    }
    settings.apifyActor = actor;
    await settings.save();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
