import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { OF_CATEGORIES } = await import('../app/onlyfans/constants');
  const { getProfileInterestOptions } = await import('../lib/actions/userProfile');

  const ofSlugs = new Set(OF_CATEGORIES.map((c) => c.slug));
  const opts = await getProfileInterestOptions();

  const ofInList = opts.tagInterests.filter((t) => ofSlugs.has(t.slug));
  const notOf = opts.tagInterests.filter((t) => !ofSlugs.has(t.slug));

  console.log('Profile tagInterests total:', opts.tagInterests.length);
  console.log('OF categories in list:', ofInList.length, '/', OF_CATEGORIES.length);
  console.log('Non-OF tags in same picker:', notOf.length);
  console.log('Non-OF examples:', notOf.slice(0, 15).map((t) => t.name).join(', '));
  console.log('Missing OF:', OF_CATEGORIES.filter((c) => !opts.tagInterests.some((t) => t.slug === c.slug)).map((c) => c.name).join(', ') || 'none');
}

main().catch(console.error);
