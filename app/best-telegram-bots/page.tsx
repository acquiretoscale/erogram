import { createRankingPage } from '@/lib/bestDirectory/createRankingPage';

const page = createRankingPage('best-telegram-bots');
export const generateMetadata = page.generateMetadata;
export default page.Page;
