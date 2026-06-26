'use server';

import connectDB from '@/lib/db/mongodb';
import { Coupon, CouponUsage } from '@/lib/models';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

function verifyAdmin(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return !!decoded.isAdmin;
  } catch { return false; }
}

// Admin: list all coupons
export async function getCoupons(token: string) {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  return { coupons: JSON.parse(JSON.stringify(coupons)) };
}

// Admin: create coupon
export async function createCoupon(token: string, data: {
  code: string;
  discountType: 'percent' | 'fixed_stars';
  discountValue: number;
  appliesTo: string[];
  maxUses: number;
  expiresAt: string | null;
}) {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const exists = await Coupon.findOne({ code: data.code.toUpperCase().trim() });
  if (exists) return { error: 'Code already exists' };
  const coupon = await Coupon.create({
    code: data.code.toUpperCase().trim(),
    discountType: data.discountType,
    discountValue: data.discountValue,
    appliesTo: data.appliesTo.length ? data.appliesTo : ['groups', 'bots', 'premium', 'ainsfw', 'of_advertising'],
    maxUses: data.maxUses || -1,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  });
  return { success: true, coupon: JSON.parse(JSON.stringify(coupon)) };
}

// Admin: toggle active
export async function toggleCoupon(token: string, couponId: string) {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const c = await Coupon.findById(couponId);
  if (!c) return { error: 'Not found' };
  c.active = !c.active;
  await c.save();
  return { success: true };
}

// Admin: delete coupon
export async function deleteCoupon(token: string, couponId: string) {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  await Coupon.findByIdAndDelete(couponId);
  return { success: true };
}

// Admin: get coupon usage history
export async function getCouponUsage(token: string, couponId?: string) {
  if (!verifyAdmin(token)) return { error: 'Unauthorized' };
  await connectDB();
  const filter = couponId ? { couponId } : {};
  const usage = await CouponUsage.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return { usage: JSON.parse(JSON.stringify(usage)) };
}

// Public: validate a coupon code for a specific service
export async function validateCoupon(code: string, service: string, originalStars: number) {
  if (!code || !service) return { valid: false, error: 'Missing code or service' };
  await connectDB();
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), active: true }).lean() as any;
  if (!coupon) return { valid: false, error: 'Invalid coupon code' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { valid: false, error: 'Coupon expired' };
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return { valid: false, error: 'Coupon fully redeemed' };
  if (!coupon.appliesTo.includes(service) && !coupon.appliesTo.includes('all'))
    return { valid: false, error: `Coupon not valid for ${service}` };

  let discountedStars = originalStars;
  if (coupon.discountType === 'percent') {
    discountedStars = Math.round(originalStars * (1 - coupon.discountValue / 100));
  } else {
    discountedStars = Math.max(0, originalStars - coupon.discountValue);
  }

  return {
    valid: true,
    couponId: coupon._id.toString(),
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    originalStars,
    discountedStars,
    savedStars: originalStars - discountedStars,
  };
}

// Record coupon usage (called after successful payment or free approval)
export async function recordCouponUsage(couponId: string, data: {
  userId?: string;
  service: string;
  entityId?: string;
  originalStars: number;
  discountedStars: number;
  savedStars: number;
  couponCode: string;
}) {
  await connectDB();
  await CouponUsage.create({ couponId, ...data });
  await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
}
