import { Metadata } from 'next';
import connectDB from '@/lib/db/mongodb';
import { OnlyFansCreator } from '@/lib/models';
import TopCreatorsClient from './TopCreatorsClient';
import { getLocale } from '@/lib/i18n/server';
import { topCreatorsOfMeta } from '../ofMeta';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return topCreatorsOfMeta(locale);
}

export const revalidate = 300;

export default async function TopCreatorsPage() {
  let creators: any[] = [];

  try {
    await connectDB();
    const docs = await OnlyFansCreator.find({ categories: 'top' })
      .sort({ likesCount: -1 })
      .limit(500)
      .select('-__v')
      .lean();

    creators = JSON.parse(JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to fetch top creators:', e);
  }

  return <TopCreatorsClient creators={creators} />;
}
