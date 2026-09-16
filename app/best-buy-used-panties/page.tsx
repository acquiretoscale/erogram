import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-buy-used-panties');
export const generateMetadata = page.generateMetadata;
export default page.Page;
