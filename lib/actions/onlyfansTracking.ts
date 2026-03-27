'use server';

import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator, TrendingOFCreator, TrendingClickDaily } from '@/lib/models';

const CLICK_CAP = 10_000;

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function trackCreatorClick(slug: string) {
  if (!slug || typeof slug !== 'string') return;
  try {
    await connectDB();
    await OnlyFansCreator.findOneAndUpdate(
      { slug, clicks: { $lt: CLICK_CAP } },
      { $inc: { clicks: 1 } },
    );
  } catch {}
}

export async function trackTrendingClick(id: string) {
  if (!id) return;
  try {
    await connectDB();
    const creator = await TrendingOFCreator.findById(id, 'clicks clickBudget dailyClickCap active').lean() as any;
    if (!creator || !creator.active) return;

    // Budget exhausted → auto-pause
    if (creator.clickBudget > 0 && creator.clicks >= creator.clickBudget) {
      await TrendingOFCreator.findByIdAndUpdate(id, { $set: { active: false } });
      return;
    }

    // Daily cap check
    const date = todayStr();
    if (creator.dailyClickCap > 0) {
      const daily = await TrendingClickDaily.findOne({ creatorId: id, date }).lean() as any;
      if (daily && daily.clicks >= creator.dailyClickCap) return;
    }

    // Increment lifetime total
    const updated = await TrendingOFCreator.findByIdAndUpdate(id, { $inc: { clicks: 1 } }, { new: true }).lean() as any;

    // Log daily click
    await TrendingClickDaily.findOneAndUpdate(
      { creatorId: id, date },
      { $inc: { clicks: 1 } },
      { upsert: true },
    );

    // Auto-pause if budget just hit
    if (updated && updated.clickBudget > 0 && updated.clicks >= updated.clickBudget) {
      await TrendingOFCreator.findByIdAndUpdate(id, { $set: { active: false } });
    }
  } catch {}
}
