import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-ai-companion-websites');
export const generateMetadata = page.generateMetadata;
export default page.Page;
