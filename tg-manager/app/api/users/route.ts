import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { hashPassword, isOwner } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role') || '';
  if (!isOwner(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role') || '';
  if (!isOwner(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { username, password, userRole } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }
  const validRoles = ['owner', 'admin', 'viewer'];
  const assignedRole = validRoles.includes(userRole) ? userRole : 'viewer';

  await connectDB();
  const exists = await User.findOne({ username: username.toLowerCase().trim() });
  if (exists) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({ username: username.toLowerCase().trim(), passwordHash, role: assignedRole });
  return NextResponse.json({ user: { _id: user._id, username: user.username, role: user.role, createdAt: user.createdAt } }, { status: 201 });
}
