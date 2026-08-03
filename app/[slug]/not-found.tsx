import { Metadata } from 'next';
import NotFoundPage from '../NotFoundPage';
import { buildSocialMeta, CANONICAL_BASE } from '@/lib/seo/socialMeta';

const title = 'Not Found | Erogram';
const description = 'The page you requested could not be found on Erogram.';

export const metadata: Metadata = {
  title,
  description,
  ...buildSocialMeta({
    title,
    description,
    url: CANONICAL_BASE,
    type: 'website',
  }),
};

export default NotFoundPage;
