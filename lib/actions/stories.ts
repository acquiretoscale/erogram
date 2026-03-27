'use server';

import connectDB from '@/lib/db/mongodb';
import { StorySlideContent } from '@/lib/models';

export async function trackStoryClick(slideId: string) {
  if (!slideId) return;
  try {
    await connectDB();
    await StorySlideContent.findByIdAndUpdate(slideId, { $inc: { clicks: 1 } });
  } catch {
    // Silently fail — tracking should never block the user
  }
}

export async function trackStoryLike(slideId: string) {
  if (!slideId) return;
  try {
    await connectDB();
    await StorySlideContent.findByIdAndUpdate(slideId, { $inc: { likes: 1 } });
  } catch {
    // Silently fail
  }
}
