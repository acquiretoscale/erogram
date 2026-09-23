import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { hashPassword, isOwner } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role') || '';
  const requesterId = req.headers.get('x-user-id') || '';
  if (!isOwner(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const { password, userRole } = await req.json();
  await connectDB();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Cannot demote yourself
  if (id === requesterId && userRole && userRole !== 'owner') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  if (password) user.passwordHash = await hashPassword(password);
  if (userRole && ['owner', 'admin', 'viewer'].includes(userRole)) user.role = userRole;
  await user.save();
  return NextResponse.json({ user: { _id: user._id, username: user.username, role: user.role } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get('x-user-role') || '';
  const requesterId = req.headers.get('x-user-id') || '';
  if (!isOwner(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  if (id === requesterId) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }
  await connectDB();
  await User.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
