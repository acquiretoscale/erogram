'use server';

import jwt from 'jsonwebtoken';
import { revalidatePath } from 'next/cache';
import connectDB from '@/lib/db/mongodb';
import { User, Advert } from '@/lib/models';
import { slugify } from '@/lib/utils/slugify';

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

export async function getAdverts(token: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const adverts = await Advert.find({}).sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify(adverts));
}

export async function createAdvert(token: string, data: Record<string, any>) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');
  if (!data.name || !data.category || !data.country || !data.url || !data.description || !data.image) {
    throw new Error('Name, category, country, URL, description, and image are required');
  }

  await connectDB();
  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let counter = 1;
  while (await Advert.findOne({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const advert = new Advert();
  advert.name = data.name;
  advert.slug = slug;
  advert.category = data.category;
  advert.country = data.country;
  advert.url = data.url;
  advert.description = data.description;
  advert.image = data.image;
  advert.status = data.status === 'active' ? 'active' : 'inactive';
  advert.pinned = data.pinned === true;
  advert.isPopupAdvert = data.isPopupAdvert === true;
  advert.buttonText = data.buttonText || 'Visit Site';
  advert.redirectTimer = data.redirectTimer || 7;
  advert.button2Enabled = Boolean(data.button2Enabled);
  advert.button2Text = data.button2Text || '';
  advert.button2Url = data.button2Url || '';
  advert.button3Enabled = Boolean(data.button3Enabled);
  advert.button3Text = data.button3Text || '';
  advert.button3Url = data.button3Url || '';
  advert.createdBy = admin._id;
  await advert.save();

  return JSON.parse(JSON.stringify(advert));
}

export async function updateAdvert(token: string, id: string, data: Record<string, any>) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const oldAdvert = await Advert.findById(id);
  if (!oldAdvert) throw new Error('Advert not found');

  oldAdvert.category = data.category;
  oldAdvert.country = data.country;
  oldAdvert.url = data.url;
  oldAdvert.description = data.description;
  oldAdvert.image = data.image;
  oldAdvert.status = data.status === 'active' ? 'active' : 'inactive';
  oldAdvert.pinned = data.pinned === true;
  oldAdvert.isPopupAdvert = data.isPopupAdvert === true;
  oldAdvert.buttonText = data.buttonText || 'Visit Site';
  oldAdvert.redirectTimer = data.redirectTimer || 7;
  oldAdvert.button2Enabled = Boolean(data.button2Enabled);
  oldAdvert.button2Text = data.button2Text || '';
  oldAdvert.button2Url = data.button2Url || '';
  oldAdvert.button3Enabled = Boolean(data.button3Enabled);
  oldAdvert.button3Text = data.button3Text || '';
  oldAdvert.button3Url = data.button3Url || '';
  oldAdvert.updatedAt = new Date();

  if (data.name && data.name !== oldAdvert.name) {
    oldAdvert.name = data.name;
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let counter = 1;
    while (await Advert.findOne({ slug, _id: { $ne: id } })) {
      slug = `${baseSlug}-${counter++}`;
    }
    oldAdvert.slug = slug;
  }

  const advert = await oldAdvert.save();
  revalidatePath('/groups');
  return JSON.parse(JSON.stringify(advert));
}

export async function deleteAdvert(token: string, id: string) {
  const admin = await authenticateAdmin(token);
  if (!admin) throw new Error('Unauthorized');

  await connectDB();
  const advert = await Advert.findByIdAndDelete(id);
  if (!advert) throw new Error('Advert not found');
  return { success: true };
}
