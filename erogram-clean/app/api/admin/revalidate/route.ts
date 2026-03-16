import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await authenticateUser(req);
  if (!user?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await req.json();
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ message: 'slug is required' }, { status: 400 });
  }

  revalidatePath(`/${slug}`);

  return NextResponse.json({ ok: true, revalidated: `/${slug}` });
}
