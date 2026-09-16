import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-male-enhancement');
export const generateMetadata = page.generateMetadata;
export default page.Page;
