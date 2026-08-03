import { Metadata } from 'next';
import { getVisitorNearMeLocation } from '@/lib/actions/nearMeCreators';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';
import NearMeClient from './NearMeClient';

const PAGE_PATH = '/onlyfanssearch/near-me';
const PAGE_URL = `${CANONICAL_BASE}${PAGE_PATH}`;

export async function generateMetadata(): Promise<Metadata> {
  const title = 'OnlyFans Near Me | Erogram';
  const description = 'Browse OnlyFans creators near your location on Erogram.';
  return {
    title,
    description,
    alternates: { canonical: PAGE_URL },
    ...buildSocialMeta({ title, description, url: PAGE_URL }),
  };
}

export default async function OnlyFansNearMePage() {
  const location = await getVisitorNearMeLocation().catch(() => ({
    countryCode: '',
    city: '',
    areaLabel: '',
  }));

  return (
    <NearMeClient
      visitorCountryCode={location.countryCode}
      visitorCity={location.city}
      visitorAreaLabel={location.areaLabel}
    />
  );
}
