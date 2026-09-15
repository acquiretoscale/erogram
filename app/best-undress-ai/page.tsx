import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-undress-ai');
export const generateMetadata = page.generateMetadata;
export default page.Page;
