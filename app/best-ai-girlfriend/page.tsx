import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-ai-girlfriend');
export const generateMetadata = page.generateMetadata;
export default page.Page;
