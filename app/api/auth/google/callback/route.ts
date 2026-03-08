import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import { notifyAdminsOfNewUser } from '@/lib/utils/notifyAdmins';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const state = req.nextUrl.searchParams.get('state') || '';
  const loginPage = `${SITE_URL}/login`;
  const callbackPage = `${SITE_URL}/auth/callback`;

  if (error) {
    return NextResponse.redirect(`${loginPage}?error=google_denied`);
  }

  if (!code || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${loginPage}?error=google_config`);
  }

  try {
    const redirectUri = `${SITE_URL}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Google token exchange failed:', err);
      return NextResponse.redirect(`${loginPage}?error=google_token&detail=${encodeURIComponent(err.slice(0, 300))}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error('Google userinfo failed');
      return NextResponse.redirect(`${loginPage}?error=google_userinfo`);
    }

    const profile = await userRes.json();
    const googleId = profile.id;
    const email = profile.email || null;
    const name = profile.name || profile.given_name || 'User';
    const picture = profile.picture || null;

    await connectDB();

    let user = await User.findOne({ googleId });

    if (!user) {
      const baseUsername = (profile.email?.split('@')[0] || name.replace(/\s+/g, '_')).slice(0, 20);
      let username = baseUsername;
      let attempts = 0;
      while (await User.findOne({ username })) {
        attempts += 1;
        username = `${baseUsername}_${attempts}`;
      }

      user = await User.create({
        username,
        email: email || undefined,
        googleId,
        firstName: name,
        photoUrl: picture,
      });
      notifyAdminsOfNewUser({ username, provider: 'google' }).catch(() => {});
    } else {
      let updated = false;
      if (email && user.email !== email) {
        user.email = email;
        updated = true;
      }
      if (name && user.firstName !== name) {
        user.firstName = name;
        updated = true;
      }
      if (picture && user.photoUrl !== picture) {
        user.photoUrl = picture;
        updated = true;
      }
      if (updated) await user.save();
    }

    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const params = new URLSearchParams({
      token,
      username: user.username,
      isAdmin: String(user.isAdmin),
    });
    if (user.firstName) params.set('firstName', user.firstName);
    if (user.photoUrl) params.set('photoUrl', user.photoUrl);
    if (state) params.set('state', state);

    return NextResponse.redirect(`${callbackPage}?${params.toString()}`);
  } catch (err: any) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(`${loginPage}?error=server&detail=${encodeURIComponent(String(err?.message || err).slice(0, 300))}`);
  }
}
