import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-ainsfw');
export const generateMetadata = page.generateMetadata;
export default page.Page;
