import { Metadata } from 'next';
import { getTagIndex } from '@/lib/actions/tags';
import TagsIndexClient from './TagsIndexClient';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import { getLocale } from '@/lib/i18n/server';

export const revalidate = 3600;

const BASE = CANONICAL_BASE;
const tagsTitle = 'Tags — Browse by Category | Erogram';
const tagsDescription = 'Alphabetical index of NSFW Telegram group and OnlyFans creator tags on Erogram.';

export const metadata: Metadata = {
  title: tagsTitle,
  description: tagsDescription,
  alternates: { canonical: `${BASE}/tags` },
  ...buildSocialMeta({
    title: tagsTitle,
    description: tagsDescription,
    url: `${BASE}/tags`,
    type: 'website',
  }),
};

export default async function TagsPage() {
  const locale = await getLocale();
  const tags = await getTagIndex(locale);
  return <TagsIndexClient tags={tags} />;
}
