'use server';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { User, Bookmark, BookmarkFolder } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

async function authenticateAdmin(token: string) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    await connectDB();
    const user = await User.findById(decoded.id);
    if (user && user.isAdmin) return user;
  } catch {
    return null;
  }
  return null;
}

export async function getUsers(token: string, search?: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  let query: any = {};
  if (search) {
    query = {
      $or: [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { telegramUsername: { $regex: search, $options: 'i' } },
      ],
    };
  }

  const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify(users));
}

export async function updateUser(token: string, id: string, data: Record<string, any>) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const updateData: any = { ...data };
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }
  delete updateData._id;
  delete updateData.__v;
  delete updateData.createdAt;
  updateData.updatedAt = new Date();

  const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password').lean();
  if (!user) throw new Error('User not found');
  return JSON.parse(JSON.stringify(user));
}

export async function deleteUser(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new Error('User not found');
  return { success: true };
}

export async function getBookmarkStats(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();

  const [
    totalBookmarks, totalFolders,
    usersWithBookmarks,
    groupBookmarks, botBookmarks,
  ] = await Promise.all([
    Bookmark.countDocuments(),
    BookmarkFolder.countDocuments(),
    Bookmark.distinct('userId').then(ids => ids.length),
    Bookmark.countDocuments({ itemType: 'group' }),
    Bookmark.countDocuments({ itemType: 'bot' }),
  ]);

  return {
    totalBookmarks,
    totalFolders,
    usersWithBookmarks,
    groupBookmarks,
    botBookmarks,
  };
}
