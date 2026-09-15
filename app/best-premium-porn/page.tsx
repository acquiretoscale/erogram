import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-premium-porn');
export const generateMetadata = page.generateMetadata;
export default page.Page;
