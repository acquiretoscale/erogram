import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/models';
import EnzoGonzoClient from './EnzoGonzoClient';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const ALLOWED_USERNAME = 'eros';

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  title: 'Onlygram Beta',
};

async function verifyOwner(token: string): Promise<boolean> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id).select('isAdmin username').lean() as any;
    return user?.isAdmin === true && user?.username === ALLOWED_USERNAME;
  } catch {
    return false;
  }
}

export default async function EnzoGonzoPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    return <EnzoGonzoClient requireAuth slug="enzogonzo" />;
  }

  const allowed = await verifyOwner(token);
  if (!allowed) {
    return <EnzoGonzoClient requireAuth slug="enzogonzo" />;
  }

  return <EnzoGonzoClient requireAuth={false} slug="enzogonzo" />;
}
