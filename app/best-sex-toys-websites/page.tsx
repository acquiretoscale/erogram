import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-sex-toys-websites');
export const generateMetadata = page.generateMetadata;
export default page.Page;
